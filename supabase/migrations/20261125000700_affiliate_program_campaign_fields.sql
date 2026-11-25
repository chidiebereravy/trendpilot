
-- Add campaign presentation fields to affiliate programs.
-- Existing program identity and commission configuration remain unchanged.

BEGIN;

ALTER TABLE public.affiliate_programs
    ADD COLUMN description TEXT,
    ADD COLUMN commission_details TEXT,
    ADD COLUMN eligibility_details TEXT,
    ADD COLUMN cover_image_id UUID
        REFERENCES public.media_assets(id)
        ON DELETE RESTRICT;

ALTER TABLE public.affiliate_programs
    ADD CONSTRAINT affiliate_programs_description_length
        CHECK (
            description IS NULL
            OR LENGTH(BTRIM(description)) BETWEEN 1 AND 5000
        ),
    ADD CONSTRAINT affiliate_programs_commission_details_length
        CHECK (
            commission_details IS NULL
            OR LENGTH(BTRIM(commission_details)) BETWEEN 1 AND 500
        ),
    ADD CONSTRAINT affiliate_programs_eligibility_details_length
        CHECK (
            eligibility_details IS NULL
            OR LENGTH(BTRIM(eligibility_details)) BETWEEN 1 AND 3000
        );

CREATE INDEX affiliate_programs_cover_image_idx
    ON public.affiliate_programs (cover_image_id)
    WHERE cover_image_id IS NOT NULL;

COMMENT ON COLUMN public.affiliate_programs.description
    IS 'Promotional description displayed on the affiliate campaign.';

COMMENT ON COLUMN public.affiliate_programs.commission_details
    IS 'Human-readable commission offer displayed on the affiliate campaign.';

COMMENT ON COLUMN public.affiliate_programs.eligibility_details
    IS 'Eligibility requirements displayed to prospective affiliates.';

COMMENT ON COLUMN public.affiliate_programs.cover_image_id
    IS 'Published affiliate-purpose Media Library asset used as the campaign cover.';


-- Validate affiliate campaign cover images.
CREATE OR REPLACE FUNCTION public.validate_affiliate_program_cover_image()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    asset_status TEXT;
    asset_bucket TEXT;
    asset_purpose TEXT;
BEGIN
    IF NEW.cover_image_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT
        ma.status,
        ma.bucket_id,
        ma.purpose
    INTO
        asset_status,
        asset_bucket,
        asset_purpose
    FROM public.media_assets AS ma
    WHERE ma.id = NEW.cover_image_id
    FOR SHARE;

    IF NOT FOUND
        OR asset_status <> 'published'
        OR asset_bucket <> 'trendpilot-media'
        OR asset_purpose <> 'affiliate'
    THEN
        RAISE EXCEPTION
            'Campaign covers must use a published affiliate-purpose Media Library image.'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER affiliate_programs_validate_cover_image
BEFORE INSERT OR UPDATE OF cover_image_id
ON public.affiliate_programs
FOR EACH ROW
EXECUTE FUNCTION public.validate_affiliate_program_cover_image();

REVOKE ALL ON FUNCTION public.validate_affiliate_program_cover_image()
FROM PUBLIC, anon, authenticated;


-- Prevent archiving images currently used as affiliate campaign covers.
CREATE OR REPLACE FUNCTION public.prevent_archiving_affiliate_media()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NEW.status = 'archived'
        AND OLD.status IS DISTINCT FROM 'archived'
        AND EXISTS (
            SELECT 1
            FROM public.affiliate_programs AS ap
            WHERE ap.cover_image_id = OLD.id
        )
    THEN
        RAISE EXCEPTION
            'Media used as an affiliate campaign cover cannot be archived. Select a replacement first.'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_archiving_affiliate_media()
FROM PUBLIC, anon, authenticated;

CREATE TRIGGER media_assets_prevent_affiliate_archive
BEFORE UPDATE OF status
ON public.media_assets
FOR EACH ROW
EXECUTE FUNCTION public.prevent_archiving_affiliate_media();

COMMIT;
