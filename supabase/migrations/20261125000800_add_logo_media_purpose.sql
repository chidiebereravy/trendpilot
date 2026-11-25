BEGIN;

-- Replace the purpose constraint to include the distinct logo purpose.
ALTER TABLE public.media_assets
    DROP CONSTRAINT IF EXISTS media_assets_purpose_valid;

ALTER TABLE public.media_assets
    ADD CONSTRAINT media_assets_purpose_valid
    CHECK (
        purpose IS NULL
        OR purpose IN (
            'article',
            'affiliate',
            'advertisement',
            'avatar',
            'favicon',
            'logo'
        )
    );

COMMENT ON COLUMN public.media_assets.purpose
    IS 'Intended purpose of the media asset: article, affiliate, advertisement, avatar, favicon, or logo.';

-- Backfill existing website logos only when they have no conflicting article usage.
-- Do not overwrite an existing purpose.
DROP TRIGGER IF EXISTS media_assets_validate_purpose
ON public.media_assets;

ALTER TABLE public.media_assets
    DISABLE TRIGGER media_assets_validate_write;

UPDATE public.media_assets AS ma
SET purpose = 'logo'
WHERE ma.purpose IS NULL
  AND EXISTS (
      SELECT 1
      FROM public.general_settings AS gs
      WHERE gs.logo_media_asset_id = ma.id
  )
  AND NOT EXISTS (
      SELECT 1
      FROM public.media_asset_usages AS mau
      WHERE mau.media_asset_id = ma.id
  )
  AND NOT EXISTS (
      SELECT 1
      FROM public.general_settings AS gs
      WHERE gs.favicon_media_asset_id = ma.id
  );

ALTER TABLE public.media_assets
    ENABLE TRIGGER media_assets_validate_write;

-- Restore the purpose immutability safeguard.
CREATE TRIGGER media_assets_validate_purpose
BEFORE INSERT OR UPDATE OF purpose
ON public.media_assets
FOR EACH ROW
EXECUTE FUNCTION public.validate_media_asset_purpose();

COMMIT;