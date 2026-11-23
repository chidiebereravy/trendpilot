BEGIN;

-- =========================================================
-- TRENDPILOT: SEO SETTINGS AND SEARCH INDEXING
-- Migration: 20261122000400
-- =========================================================
-- Security:
-- - Editors and administrators can read and update settings.
-- - Authors and ordinary users have no access.
-- - Service role is reserved for trusted server-side work.
-- - The singleton settings row cannot be deleted by clients.
-- - The canonical site origin remains environment-controlled.
-- =========================================================

-- ---------------------------------------------------------
-- 1. SEO SETTINGS
-- ---------------------------------------------------------

CREATE TABLE public.seo_settings (
    id SMALLINT PRIMARY KEY DEFAULT 1
        CHECK (id = 1),

    site_name TEXT NOT NULL DEFAULT 'TrendPilot',
    default_title TEXT NOT NULL
        DEFAULT 'TrendPilot - Navigate Ideas. Discover Opportunities.',
    title_template TEXT NOT NULL
        DEFAULT '%s | TrendPilot',
    default_description TEXT NOT NULL
        DEFAULT 'Explore insightful articles, practical guides and fresh perspectives on business, technology, finance, education and lifestyle.',

    -- Absolute HTTPS URL or a root-relative public image path.
    -- The canonical site origin is supplied by NEXT_PUBLIC_APP_URL.
    default_social_image_url TEXT,

    -- Global search visibility.
    search_indexing_enabled BOOLEAN NOT NULL DEFAULT TRUE,

    -- Sitemap configuration.
    sitemap_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    include_articles BOOLEAN NOT NULL DEFAULT TRUE,
    include_categories BOOLEAN NOT NULL DEFAULT TRUE,

    updated_by UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT seo_settings_site_name_length
        CHECK (
            LENGTH(BTRIM(site_name)) BETWEEN 1 AND 80
        ),

    CONSTRAINT seo_settings_default_title_length
        CHECK (
            LENGTH(BTRIM(default_title)) BETWEEN 1 AND 70
        ),

    CONSTRAINT seo_settings_title_template_length
        CHECK (
            LENGTH(BTRIM(title_template)) BETWEEN 1 AND 120
        ),

    CONSTRAINT seo_settings_description_length
        CHECK (
            LENGTH(BTRIM(default_description)) BETWEEN 1 AND 170
        ),

    CONSTRAINT seo_settings_social_image_format
        CHECK (
            default_social_image_url IS NULL
            OR (
                LENGTH(BTRIM(default_social_image_url)) <= 2048
                AND default_social_image_url = BTRIM(default_social_image_url)
                AND default_social_image_url !~ '[[:space:]]'
                AND (
                    default_social_image_url ~ '^https://[^/[:space:]][^[:space:]]*$'
                    OR (
                        default_social_image_url ~ '^/[^/]'
                        AND LEFT(default_social_image_url, 2) <> '//'
                    )
                )
            )
        )
);

COMMENT ON TABLE public.seo_settings IS
    'Singleton configuration for public-site SEO metadata, search visibility and sitemap generation.';

COMMENT ON COLUMN public.seo_settings.id IS
    'Singleton row identifier. Only the value 1 is permitted.';

COMMENT ON COLUMN public.seo_settings.default_social_image_url IS
    'Optional HTTPS image URL or root-relative public image path.';

COMMENT ON COLUMN public.seo_settings.search_indexing_enabled IS
    'When false, public pages should emit noindex,nofollow and the sitemap should contain no URLs.';

COMMENT ON COLUMN public.seo_settings.sitemap_enabled IS
    'Controls whether the public sitemap is generated.';

COMMENT ON COLUMN public.seo_settings.updated_by IS
    'Profile of the editor or administrator who last changed these settings.';

-- ---------------------------------------------------------
-- 2. UPDATED_AT TRIGGER
-- ---------------------------------------------------------

CREATE TRIGGER seo_settings_set_updated_at
BEFORE UPDATE ON public.seo_settings
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Keep the audit actor tied to the authenticated database session.
CREATE OR REPLACE FUNCTION public.set_seo_settings_audit_fields()
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

REVOKE ALL ON FUNCTION public.set_seo_settings_audit_fields()
FROM PUBLIC, anon, authenticated;

CREATE TRIGGER seo_settings_set_audit_fields
BEFORE INSERT OR UPDATE ON public.seo_settings
FOR EACH ROW
EXECUTE FUNCTION public.set_seo_settings_audit_fields();

-- ---------------------------------------------------------
-- 3. INITIAL SETTINGS
-- ---------------------------------------------------------

INSERT INTO public.seo_settings (
    id,
    site_name,
    default_title,
    title_template,
    default_description,
    search_indexing_enabled,
    sitemap_enabled,
    include_articles,
    include_categories
)
VALUES (
    1,
    'TrendPilot',
    'TrendPilot - Navigate Ideas. Discover Opportunities.',
    '%s | TrendPilot',
    'Explore insightful articles, practical guides and fresh perspectives on business, technology, finance, education and lifestyle.',
    TRUE,
    TRUE,
    TRUE,
    TRUE
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------
-- 4. ROW LEVEL SECURITY
-- ---------------------------------------------------------

ALTER TABLE public.seo_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY seo_settings_editor_admin_select
ON public.seo_settings
FOR SELECT
TO authenticated
USING (
    (SELECT public.is_admin_or_editor())
);


CREATE POLICY seo_settings_editor_admin_update
ON public.seo_settings
FOR UPDATE
TO authenticated
USING (
    (SELECT public.is_admin_or_editor())
)
WITH CHECK (
    (SELECT public.is_admin_or_editor())
);

-- No client DELETE policy is intentionally provided.

-- ---------------------------------------------------------
-- 5. EXPLICIT TABLE PRIVILEGES
-- ---------------------------------------------------------

REVOKE ALL ON public.seo_settings
FROM PUBLIC, anon, authenticated;

GRANT SELECT
ON public.seo_settings
TO authenticated;

GRANT UPDATE (
    site_name,
    default_title,
    title_template,
    default_description,
    default_social_image_url,
    search_indexing_enabled,
    sitemap_enabled,
    include_articles,
    include_categories
)
ON public.seo_settings
TO authenticated;

GRANT ALL
ON public.seo_settings
TO service_role;

COMMIT;

