BEGIN;

ALTER TABLE public.ad_campaigns
    ADD COLUMN image_media_asset_id UUID
        REFERENCES public.media_assets(id)
        ON DELETE RESTRICT;

ALTER TABLE public.ad_campaigns
    ADD CONSTRAINT ad_campaigns_creative_source_exclusive
        CHECK (
            image_media_asset_id IS NULL
            OR image_url IS NULL
        );

CREATE INDEX ad_campaigns_image_media_asset_idx
    ON public.ad_campaigns (image_media_asset_id)
    WHERE image_media_asset_id IS NOT NULL;

COMMENT ON COLUMN public.ad_campaigns.image_media_asset_id
    IS 'Published advertisement-purpose Media Library asset used as the campaign creative.';

-- Validate campaign creative images.
CREATE OR REPLACE FUNCTION public.validate_ad_campaign_media_asset()
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
    IF NEW.image_media_asset_id IS NULL THEN
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
    WHERE ma.id = NEW.image_media_asset_id
    FOR SHARE;

    IF NOT FOUND
        OR asset_status IS DISTINCT FROM 'published'
        OR asset_bucket IS DISTINCT FROM 'trendpilot-media'
        OR asset_purpose IS DISTINCT FROM 'advertisement'
    THEN
        RAISE EXCEPTION
            'Advertisement creatives must use a published advertisement-purpose Media Library image.'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER ad_campaigns_validate_media_asset
BEFORE INSERT OR UPDATE OF image_media_asset_id
ON public.ad_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.validate_ad_campaign_media_asset();

REVOKE ALL ON FUNCTION public.validate_ad_campaign_media_asset()
FROM PUBLIC, anon, authenticated;


-- Prevent archiving images currently used by advertisement campaigns.
CREATE OR REPLACE FUNCTION public.prevent_archiving_advertisement_media()
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
            FROM public.ad_campaigns AS ac
            WHERE ac.image_media_asset_id = OLD.id
        )
    THEN
        RAISE EXCEPTION
            'Media used by an advertisement campaign cannot be archived. Select a replacement first.'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_archiving_advertisement_media()
FROM PUBLIC, anon, authenticated;

CREATE TRIGGER media_assets_prevent_advertisement_archive
BEFORE UPDATE OF status
ON public.media_assets
FOR EACH ROW
EXECUTE FUNCTION public.prevent_archiving_advertisement_media();

COMMIT;

