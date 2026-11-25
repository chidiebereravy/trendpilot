
-- Add explicit purpose classification to Media Library assets.
-- Safe to resume if an earlier attempt partially applied the migration.

BEGIN;

ALTER TABLE public.media_assets
    ADD COLUMN IF NOT EXISTS purpose TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.media_assets'::regclass
          AND conname = 'media_assets_purpose_valid'
    ) THEN
        ALTER TABLE public.media_assets
            ADD CONSTRAINT media_assets_purpose_valid
            CHECK (
                purpose IS NULL
                OR purpose IN (
                    'article',
                    'affiliate',
                    'advertisement',
                    'avatar',
                    'favicon'
                )
            );
    END IF;
END;
$$;

COMMENT ON COLUMN public.media_assets.purpose
    IS 'Intended purpose of the media asset: article, affiliate, advertisement, avatar, or favicon.';


-- Remove the purpose trigger temporarily so existing unclassified
-- assets can be safely backfilled.
DROP TRIGGER IF EXISTS media_assets_validate_purpose
ON public.media_assets;

-- Temporarily disable the authenticated-user write safeguard
-- only for these controlled migration updates.
ALTER TABLE public.media_assets
    DISABLE TRIGGER media_assets_validate_write;

-- Backfill article images only when they are not also used for branding.
UPDATE public.media_assets AS ma
SET purpose = 'article'
WHERE ma.purpose IS NULL
  AND EXISTS (
      SELECT 1
      FROM public.media_asset_usages AS mau
      WHERE mau.media_asset_id = ma.id
  )
  AND NOT EXISTS (
      SELECT 1
      FROM public.general_settings AS gs
      WHERE gs.logo_media_asset_id = ma.id
         OR gs.favicon_media_asset_id = ma.id
  );

-- Backfill favicon assets only when they have no conflicting usage.
UPDATE public.media_assets AS ma
SET purpose = 'favicon'
WHERE ma.purpose IS NULL
  AND EXISTS (
      SELECT 1
      FROM public.general_settings AS gs
      WHERE gs.favicon_media_asset_id = ma.id
  )
  AND NOT EXISTS (
      SELECT 1
      FROM public.media_asset_usages AS mau
      WHERE mau.media_asset_id = ma.id
  )
  AND NOT EXISTS (
      SELECT 1
      FROM public.general_settings AS gs
      WHERE gs.logo_media_asset_id = ma.id
  );

-- Restore the original application safeguard.
ALTER TABLE public.media_assets
    ENABLE TRIGGER media_assets_validate_write;


-- Require a valid purpose on new uploads and prevent purpose changes.
CREATE OR REPLACE FUNCTION public.validate_media_asset_purpose()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.purpose IS NULL THEN
            RAISE EXCEPTION 'An image purpose is required.'
                USING ERRCODE = '23514';
        END IF;

        RETURN NEW;
    END IF;

    IF NEW.purpose IS DISTINCT FROM OLD.purpose THEN
        RAISE EXCEPTION 'An image purpose cannot be changed after upload.'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_media_asset_purpose()
FROM PUBLIC, anon, authenticated;

CREATE TRIGGER media_assets_validate_purpose
BEFORE INSERT OR UPDATE OF purpose
ON public.media_assets
FOR EACH ROW
EXECUTE FUNCTION public.validate_media_asset_purpose();

COMMIT;
