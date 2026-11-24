BEGIN;

-- =========================================================
-- TRENDPILOT: GENERAL PLATFORM SETTINGS
-- Migration: 20261123000100
-- =========================================================
-- Security:
-- - Administrators only can read and update these settings.
-- - Authors, editors and ordinary users have no access.
-- - The singleton settings row cannot be deleted by clients.
-- - Branding assets must be published Media Library assets.
-- - Selected branding assets cannot be archived.
-- =========================================================

-- ---------------------------------------------------------
-- 1. GENERAL SETTINGS
-- ---------------------------------------------------------

CREATE TABLE public.general_settings (
    id SMALLINT PRIMARY KEY DEFAULT 1
        CHECK (id = 1),

    -- Brand identity
    tagline TEXT NOT NULL DEFAULT
        'Navigate Ideas. Discover Opportunities.',

    logo_media_asset_id UUID
        REFERENCES public.media_assets(id)
        ON DELETE RESTRICT,

    favicon_media_asset_id UUID
        REFERENCES public.media_assets(id)
        ON DELETE RESTRICT,

    -- Public contact information
    public_email TEXT,
    support_email TEXT,
    contact_phone TEXT,
    contact_address TEXT,

    -- Official social profiles
    facebook_url TEXT,
    instagram_url TEXT,
    x_url TEXT,
    youtube_url TEXT,
    linkedin_url TEXT,

    -- Audit fields
    updated_by UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT general_settings_tagline_length
        CHECK (LENGTH(BTRIM(tagline)) BETWEEN 1 AND 160),

    CONSTRAINT general_settings_public_email_format
        CHECK (
            public_email IS NULL
            OR (
                public_email = BTRIM(public_email)
                AND LENGTH(public_email) <= 254
                AND public_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
            )
        ),

    CONSTRAINT general_settings_support_email_format
        CHECK (
            support_email IS NULL
            OR (
                support_email = BTRIM(support_email)
                AND LENGTH(support_email) <= 254
                AND support_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
            )
        ),

    CONSTRAINT general_settings_phone_length
        CHECK (
            contact_phone IS NULL
            OR LENGTH(BTRIM(contact_phone)) BETWEEN 3 AND 40
        ),

    CONSTRAINT general_settings_address_length
        CHECK (
            contact_address IS NULL
            OR LENGTH(BTRIM(contact_address)) <= 500
        ),

    CONSTRAINT general_settings_social_urls_https
        CHECK (
            (facebook_url IS NULL OR (
                facebook_url = BTRIM(facebook_url)
                AND LENGTH(facebook_url) <= 2048
                AND facebook_url ~ '^https://[^/[:space:]][^[:space:]]*$'
            ))
            AND
            (instagram_url IS NULL OR (
                instagram_url = BTRIM(instagram_url)
                AND LENGTH(instagram_url) <= 2048
                AND instagram_url ~ '^https://[^/[:space:]][^[:space:]]*$'
            ))
            AND
            (x_url IS NULL OR (
                x_url = BTRIM(x_url)
                AND LENGTH(x_url) <= 2048
                AND x_url ~ '^https://[^/[:space:]][^[:space:]]*$'
            ))
            AND
            (youtube_url IS NULL OR (
                youtube_url = BTRIM(youtube_url)
                AND LENGTH(youtube_url) <= 2048
                AND youtube_url ~ '^https://[^/[:space:]][^[:space:]]*$'
            ))
            AND
            (linkedin_url IS NULL OR (
                linkedin_url = BTRIM(linkedin_url)
                AND LENGTH(linkedin_url) <= 2048
                AND linkedin_url ~ '^https://[^/[:space:]][^[:space:]]*$'
            ))
        )
);

COMMENT ON TABLE public.general_settings IS
    'Singleton configuration for TrendPilot brand identity, public contact details and official social profiles. SEO metadata remains managed separately in seo_settings.';

COMMENT ON COLUMN public.general_settings.logo_media_asset_id IS
    'Optional published Media Library asset used as the public site logo.';

COMMENT ON COLUMN public.general_settings.favicon_media_asset_id IS
    'Optional published Media Library asset used as the site favicon.';

CREATE INDEX general_settings_logo_media_asset_idx
    ON public.general_settings (logo_media_asset_id)
    WHERE logo_media_asset_id IS NOT NULL;

CREATE INDEX general_settings_favicon_media_asset_idx
    ON public.general_settings (favicon_media_asset_id)
    WHERE favicon_media_asset_id IS NOT NULL;

-- ---------------------------------------------------------
-- 2. UPDATED_AT AND AUDIT TRIGGERS
-- ---------------------------------------------------------

CREATE TRIGGER general_settings_set_updated_at
BEFORE UPDATE ON public.general_settings
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.set_general_settings_audit_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF (SELECT auth.uid()) IS NOT NULL THEN
        NEW.updated_by := (SELECT auth.uid());
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_general_settings_audit_fields()
FROM PUBLIC, anon, authenticated;

CREATE TRIGGER general_settings_set_audit_fields
BEFORE INSERT OR UPDATE ON public.general_settings
FOR EACH ROW
EXECUTE FUNCTION public.set_general_settings_audit_fields();

-- ---------------------------------------------------------
-- 3. BRANDING MEDIA VALIDATION
-- ---------------------------------------------------------

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
        FOR KEY SHARE;

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
        FOR KEY SHARE;

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

REVOKE ALL ON FUNCTION public.validate_general_settings_branding()
FROM PUBLIC, anon, authenticated;

CREATE TRIGGER general_settings_validate_branding
BEFORE INSERT OR UPDATE OF
    logo_media_asset_id,
    favicon_media_asset_id
ON public.general_settings
FOR EACH ROW
EXECUTE FUNCTION public.validate_general_settings_branding();

-- ---------------------------------------------------------
-- 4. PREVENT ARCHIVING ACTIVE BRANDING ASSETS
-- ---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prevent_archiving_branding_media()
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
            FROM public.general_settings AS gs
            WHERE gs.logo_media_asset_id = OLD.id
               OR gs.favicon_media_asset_id = OLD.id
        )
    THEN
        RAISE EXCEPTION 'Media selected as the site logo or favicon cannot be archived. Select a replacement first.'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_archiving_branding_media()
FROM PUBLIC, anon, authenticated;

CREATE TRIGGER media_assets_prevent_branding_archive
BEFORE UPDATE OF status ON public.media_assets
FOR EACH ROW
EXECUTE FUNCTION public.prevent_archiving_branding_media();

-- ---------------------------------------------------------
-- 5. INITIAL SETTINGS
-- ---------------------------------------------------------

INSERT INTO public.general_settings (
    id,
    tagline
)
VALUES (
    1,
    'Navigate Ideas. Discover Opportunities.'
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------
-- 6. ROW LEVEL SECURITY
-- ---------------------------------------------------------

ALTER TABLE public.general_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY general_settings_admin_select
ON public.general_settings
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles AS p
        WHERE p.id = (SELECT auth.uid())
          AND p.role = 'admin'
    )
);

CREATE POLICY general_settings_admin_update
ON public.general_settings
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles AS p
        WHERE p.id = (SELECT auth.uid())
          AND p.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.profiles AS p
        WHERE p.id = (SELECT auth.uid())
          AND p.role = 'admin'
    )
);

-- No client INSERT or DELETE policy is provided.

-- ---------------------------------------------------------
-- 7. EXPLICIT TABLE PRIVILEGES
-- ---------------------------------------------------------

REVOKE ALL ON public.general_settings
FROM PUBLIC, anon, authenticated;

GRANT SELECT
ON public.general_settings
TO authenticated;

GRANT UPDATE (
    tagline,
    logo_media_asset_id,
    favicon_media_asset_id,
    public_email,
    support_email,
    contact_phone,
    contact_address,
    facebook_url,
    instagram_url,
    x_url,
    youtube_url,
    linkedin_url
)
ON public.general_settings
TO authenticated;

GRANT ALL
ON public.general_settings
TO service_role;

COMMIT;
