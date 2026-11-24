BEGIN;

CREATE OR REPLACE FUNCTION public.validate_general_settings_branding()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    asset_status TEXT;
    asset_bucket TEXT;
BEGIN
    IF NEW.logo_media_asset_id IS NOT NULL THEN
        SELECT ma.status, ma.bucket_id
        INTO asset_status, asset_bucket
        FROM public.media_assets AS ma
        WHERE ma.id = NEW.logo_media_asset_id
        FOR SHARE;

        IF NOT FOUND
            OR asset_status <> 'published'
            OR asset_bucket <> 'trendpilot-media'
        THEN
            RAISE EXCEPTION 'The selected logo must be a published Media Library asset.'
                USING ERRCODE = '23514';
        END IF;
    END IF;

    IF NEW.favicon_media_asset_id IS NOT NULL THEN
        SELECT ma.status, ma.bucket_id
        INTO asset_status, asset_bucket
        FROM public.media_assets AS ma
        WHERE ma.id = NEW.favicon_media_asset_id
        FOR SHARE;

        IF NOT FOUND
            OR asset_status <> 'published'
            OR asset_bucket <> 'trendpilot-media'
        THEN
            RAISE EXCEPTION 'The selected favicon must be a published Media Library asset.'
                USING ERRCODE = '23514';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

COMMIT;
