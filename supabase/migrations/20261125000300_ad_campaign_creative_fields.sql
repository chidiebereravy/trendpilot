-- Add advertiser-facing creative fields to ad campaigns.
-- Existing internal campaign name and objective remain unchanged.

ALTER TABLE public.ad_campaigns
    ADD COLUMN headline TEXT,
    ADD COLUMN description TEXT,
    ADD COLUMN image_url TEXT,
    ADD COLUMN image_alt_text TEXT,
    ADD COLUMN call_to_action_text TEXT;

ALTER TABLE public.ad_campaigns
    ADD CONSTRAINT ad_campaigns_headline_length
        CHECK (headline IS NULL OR (
            LENGTH(BTRIM(headline)) BETWEEN 1 AND 160
        )),
    ADD CONSTRAINT ad_campaigns_description_length
        CHECK (description IS NULL OR (
            LENGTH(BTRIM(description)) BETWEEN 1 AND 1000
        )),
    ADD CONSTRAINT ad_campaigns_image_url_https
        CHECK (image_url IS NULL OR (
            LENGTH(BTRIM(image_url)) <= 2048
            AND image_url ~* '^https://'
        )),
    ADD CONSTRAINT ad_campaigns_image_alt_text_length
        CHECK (image_alt_text IS NULL OR (
            LENGTH(BTRIM(image_alt_text)) BETWEEN 1 AND 300
        )),
    ADD CONSTRAINT ad_campaigns_cta_text_length
        CHECK (call_to_action_text IS NULL OR (
            LENGTH(BTRIM(call_to_action_text)) BETWEEN 1 AND 40
        ));

COMMENT ON COLUMN public.ad_campaigns.headline
    IS 'Advertiser-facing headline displayed in the public advertisement.';

COMMENT ON COLUMN public.ad_campaigns.description
    IS 'Advertiser-facing supporting copy displayed in the public advertisement.';

COMMENT ON COLUMN public.ad_campaigns.image_url
    IS 'HTTPS image URL for the public advertisement creative.';

COMMENT ON COLUMN public.ad_campaigns.image_alt_text
    IS 'Accessible alternative text for the advertisement image.';

COMMENT ON COLUMN public.ad_campaigns.call_to_action_text
    IS 'Advertiser-facing call-to-action button text.';
