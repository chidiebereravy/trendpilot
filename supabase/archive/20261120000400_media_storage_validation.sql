BEGIN;

-- =========================================================
-- 1. ROLE HELPER
-- =========================================================

CREATE OR REPLACE FUNCTION public.is_media_editor_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = (SELECT auth.uid())
          AND role IN ('editor', 'admin')
    );
$$;

REVOKE ALL ON FUNCTION public.is_media_editor_or_admin()
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.is_media_editor_or_admin()
TO authenticated;


-- =========================================================
-- 2. MEDIA ASSETS TABLE
-- =========================================================

CREATE TABLE public.media_assets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    owner_id uuid NOT NULL
        REFERENCES public.profiles(id) ON DELETE RESTRICT,

    created_by uuid NOT NULL
        REFERENCES public.profiles(id) ON DELETE RESTRICT,

    bucket_id text NOT NULL
        CHECK (
            bucket_id IN (
                'trendpilot-media-staging',
                'trendpilot-media'
            )
        ),

    object_path text NOT NULL
        CHECK (
            length(object_path) BETWEEN 1 AND 1024
            AND object_path !~ '(^/|//|(^|/)\.\.?(/|$))'
        ),

    original_filename text NOT NULL
        CHECK (
            length(btrim(original_filename)) BETWEEN 1 AND 255
        ),

    mime_type text NOT NULL
        CHECK (
            mime_type IN (
                'image/jpeg',
                'image/png',
                'image/webp',
                'image/avif'
            )
        ),

    file_size_bytes bigint NOT NULL
        CHECK (
            file_size_bytes > 0
            AND file_size_bytes <= 10485760
        ),

    width integer,
    height integer,

    alt_text text NOT NULL DEFAULT ''
        CHECK (length(alt_text) <= 500),

    caption text NOT NULL DEFAULT ''
        CHECK (length(caption) <= 1000),

    status text NOT NULL DEFAULT 'staged'
        CHECK (
            status IN ('staged', 'published', 'archived')
        ),

    reviewed_by uuid
        REFERENCES public.profiles(id) ON DELETE RESTRICT,

    reviewed_at timestamptz,

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT media_assets_bucket_status_check
        CHECK (
            (status = 'staged'
                AND bucket_id = 'trendpilot-media-staging')
            OR
            (status = 'published'
                AND bucket_id = 'trendpilot-media')
            OR
            status = 'archived'
        ),

    CONSTRAINT media_assets_dimensions_check
        CHECK (
            (width IS NULL AND height IS NULL)
            OR
            (
                width BETWEEN 1 AND 30000
                AND height BETWEEN 1 AND 30000
            )
        ),

    CONSTRAINT media_assets_bucket_path_unique
        UNIQUE (bucket_id, object_path)
);

CREATE INDEX media_assets_owner_created_idx
    ON public.media_assets (owner_id, created_at DESC);

CREATE INDEX media_assets_status_created_idx
    ON public.media_assets (status, created_at DESC);

CREATE INDEX media_assets_mime_type_idx
    ON public.media_assets (mime_type);


-- =========================================================
-- 3. MEDIA WRITE VALIDATION
-- =========================================================

CREATE OR REPLACE FUNCTION public.validate_media_asset_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    actor_id uuid;
    actor_role text;
BEGIN
    actor_id := (SELECT auth.uid());

    IF actor_id IS NULL THEN
        RAISE EXCEPTION 'Authenticated user required.'
            USING ERRCODE = '42501';
    END IF;

    SELECT role
    INTO actor_role
    FROM public.profiles
    WHERE id = actor_id;

    IF actor_role IS NULL THEN
        RAISE EXCEPTION 'Valid user profile required.'
            USING ERRCODE = '42501';
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF NEW.owner_id <> actor_id
            OR NEW.created_by <> actor_id THEN
            RAISE EXCEPTION 'Media ownership must match the authenticated user.'
                USING ERRCODE = '42501';
        END IF;

        IF NEW.object_path NOT LIKE actor_id::text || '/%' THEN
            RAISE EXCEPTION 'Media object path must belong to its owner.'
                USING ERRCODE = '42501';
        END IF;

        IF actor_role NOT IN ('author', 'editor', 'admin') THEN
            RAISE EXCEPTION 'Your role cannot upload media.'
                USING ERRCODE = '42501';
        END IF;

        IF NEW.status <> 'staged'
            OR NEW.bucket_id <> 'trendpilot-media-staging'
            OR NEW.reviewed_by IS NOT NULL
            OR NEW.reviewed_at IS NOT NULL THEN
            RAISE EXCEPTION 'New media must enter staging.'
                USING ERRCODE = '42501';
        END IF;

        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF NEW.owner_id IS DISTINCT FROM OLD.owner_id
            OR NEW.created_by IS DISTINCT FROM OLD.created_by
            OR NEW.id IS DISTINCT FROM OLD.id
            OR NEW.object_path IS DISTINCT FROM OLD.object_path THEN
            RAISE EXCEPTION 'Media identity and ownership cannot be changed.'
                USING ERRCODE = '42501';
        END IF;

        IF actor_role IN ('editor', 'admin') THEN
            IF NEW.status = 'published'
                AND (
                    NEW.bucket_id <> 'trendpilot-media'
                    OR NEW.reviewed_by IS DISTINCT FROM actor_id
                    OR NEW.reviewed_at IS NULL
                ) THEN
                RAISE EXCEPTION 'Publishing requires editor approval metadata and the public bucket.'
                    USING ERRCODE = '42501';
            END IF;

            IF NEW.status = 'staged'
                AND NEW.bucket_id <> 'trendpilot-media-staging' THEN
                RAISE EXCEPTION 'Staged media must use the private bucket.'
                    USING ERRCODE = '42501';
            END IF;

            IF NEW.status = 'archived'
                AND OLD.status IS DISTINCT FROM 'archived'
                AND EXISTS (
                    SELECT 1
                    FROM public.media_asset_usages
                    WHERE media_asset_id = OLD.id
                ) THEN
                RAISE EXCEPTION 'Media referenced by articles cannot be archived.'
                    USING ERRCODE = '23514';
            END IF;

            IF NEW.status = 'archived'
                AND NEW.reviewed_by IS NULL THEN
                NEW.reviewed_by := actor_id;
                NEW.reviewed_at := now();
            END IF;

            RETURN NEW;
        END IF;

        IF actor_role = 'author'
            AND OLD.owner_id = actor_id
            AND OLD.status = 'staged'
            AND NEW.status = 'staged'
            AND NEW.bucket_id = 'trendpilot-media-staging'
            AND NEW.object_path = OLD.object_path
            AND NEW.mime_type = OLD.mime_type
            AND NEW.file_size_bytes = OLD.file_size_bytes
            AND NEW.original_filename = OLD.original_filename
            AND NEW.width IS NOT DISTINCT FROM OLD.width
            AND NEW.height IS NOT DISTINCT FROM OLD.height
            AND NEW.reviewed_by IS NOT DISTINCT FROM OLD.reviewed_by
            AND NEW.reviewed_at IS NOT DISTINCT FROM OLD.reviewed_at THEN
            RETURN NEW;
        END IF;

        RAISE EXCEPTION 'You cannot modify this media asset.'
            USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$;


-- =========================================================
-- 4. MEDIA DELETE PROTECTION
-- =========================================================

CREATE TABLE public.media_asset_usages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    media_asset_id uuid NOT NULL
        REFERENCES public.media_assets(id) ON DELETE RESTRICT,

    article_id uuid NOT NULL
        REFERENCES public.articles(id) ON DELETE CASCADE,

    usage_role text NOT NULL
        CHECK (
            usage_role IN (
                'featured_image',
                'article_content'
            )
        ),

    created_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT media_asset_usage_unique
        UNIQUE (media_asset_id, article_id, usage_role)
);

CREATE INDEX media_asset_usages_article_idx
    ON public.media_asset_usages (article_id);

CREATE INDEX media_asset_usages_asset_idx
    ON public.media_asset_usages (media_asset_id);


CREATE OR REPLACE FUNCTION public.validate_media_asset_usage_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    actor_id uuid;
    actor_role text;
    asset_status text;
    article_status text;
BEGIN
    actor_id := (SELECT auth.uid());

    IF actor_id IS NULL THEN
        RAISE EXCEPTION 'Authenticated user required.'
            USING ERRCODE = '42501';
    END IF;

    SELECT role
    INTO actor_role
    FROM public.profiles
    WHERE id = actor_id;

    IF actor_role IS NULL
        OR actor_role NOT IN ('editor', 'admin') THEN
        RAISE EXCEPTION 'Only editors and administrators can manage media usage records.'
            USING ERRCODE = '42501';
    END IF;

    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        SELECT status
        INTO asset_status
        FROM public.media_assets
        WHERE id = NEW.media_asset_id
        FOR SHARE;

        IF asset_status IS NULL OR asset_status = 'archived' THEN
            RAISE EXCEPTION 'The selected media asset is unavailable.'
                USING ERRCODE = '23514';
        END IF;

        SELECT status
        INTO article_status
        FROM public.articles
        WHERE id = NEW.article_id;

        IF article_status IS NULL THEN
            RAISE EXCEPTION 'The selected article is unavailable.'
                USING ERRCODE = '23514';
        END IF;

        IF article_status = 'published'
            AND asset_status <> 'published' THEN
            RAISE EXCEPTION 'Published articles require published media.'
                USING ERRCODE = '23514';
        END IF;

        RETURN NEW;
    END IF;

    RETURN OLD;
END;
$$;


CREATE OR REPLACE FUNCTION public.validate_article_media_publication()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NEW.status = 'published'
        AND (
            TG_OP = 'INSERT'
            OR OLD.status IS DISTINCT FROM 'published'
        ) THEN

        -- Lock every referenced asset to prevent concurrent
        -- archiving while this article is being published.
        PERFORM ma.id
        FROM public.media_assets AS ma
        JOIN public.media_asset_usages AS mau
            ON mau.media_asset_id = ma.id
        WHERE mau.article_id = NEW.id
        FOR SHARE OF ma;

        IF EXISTS (
            SELECT 1
            FROM public.media_asset_usages AS mau
            JOIN public.media_assets AS ma
                ON ma.id = mau.media_asset_id
            WHERE mau.article_id = NEW.id
              AND ma.status <> 'published'
        ) THEN
            RAISE EXCEPTION 'Articles cannot be published with staged or archived media.'
                USING ERRCODE = '23514';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER media_assets_validate_write
BEFORE INSERT OR UPDATE ON public.media_assets
FOR EACH ROW
EXECUTE FUNCTION public.validate_media_asset_write();

CREATE TRIGGER media_assets_set_updated_at
BEFORE UPDATE ON public.media_assets
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER media_asset_usages_validate_write
BEFORE INSERT OR UPDATE ON public.media_asset_usages
FOR EACH ROW
EXECUTE FUNCTION public.validate_media_asset_usage_write();
CREATE TRIGGER articles_validate_published_media
BEFORE INSERT OR UPDATE OF status ON public.articles
FOR EACH ROW
EXECUTE FUNCTION public.validate_article_media_publication();


-- =========================================================
-- 5. ROW LEVEL SECURITY
-- =========================================================

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_asset_usages ENABLE ROW LEVEL SECURITY;

CREATE POLICY media_assets_public_read
ON public.media_assets
FOR SELECT
TO anon, authenticated
USING (status = 'published');

CREATE POLICY media_assets_owner_read
ON public.media_assets
FOR SELECT
TO authenticated
USING (owner_id = (SELECT auth.uid()));

CREATE POLICY media_assets_editor_read
ON public.media_assets
FOR SELECT
TO authenticated
USING ((SELECT public.is_media_editor_or_admin()));

CREATE POLICY media_assets_author_insert
ON public.media_assets
FOR INSERT
TO authenticated
WITH CHECK (
    owner_id = (SELECT auth.uid())
    AND created_by = (SELECT auth.uid())
    AND status = 'staged'
    AND bucket_id = 'trendpilot-media-staging'
    AND EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = (SELECT auth.uid())
          AND role IN ('author', 'editor', 'admin')
    )
);

CREATE POLICY media_assets_owner_update
ON public.media_assets
FOR UPDATE
TO authenticated
USING (
    owner_id = (SELECT auth.uid())
    AND status = 'staged'
)
WITH CHECK (
    owner_id = (SELECT auth.uid())
    AND status = 'staged'
);

CREATE POLICY media_assets_editor_update
ON public.media_assets
FOR UPDATE
TO authenticated
USING ((SELECT public.is_media_editor_or_admin()))
WITH CHECK ((SELECT public.is_media_editor_or_admin()));

CREATE POLICY media_asset_usages_editor_read
ON public.media_asset_usages
FOR SELECT
TO authenticated
USING ((SELECT public.is_media_editor_or_admin()));

CREATE POLICY media_asset_usages_editor_insert
ON public.media_asset_usages
FOR INSERT
TO authenticated
WITH CHECK ((SELECT public.is_media_editor_or_admin()));

CREATE POLICY media_asset_usages_editor_update
ON public.media_asset_usages
FOR UPDATE
TO authenticated
USING ((SELECT public.is_media_editor_or_admin()))
WITH CHECK ((SELECT public.is_media_editor_or_admin()));

CREATE POLICY media_asset_usages_editor_delete
ON public.media_asset_usages
FOR DELETE
TO authenticated
USING ((SELECT public.is_media_editor_or_admin()));


-- =========================================================
-- 6. TABLE PERMISSIONS
-- =========================================================

REVOKE ALL ON TABLE public.media_assets
FROM PUBLIC, anon, authenticated;

-- Anonymous visitors may read only public-facing media metadata.
-- Ownership, original filenames and review information remain private.
GRANT SELECT (
    id,
    bucket_id,
    object_path,
    mime_type,
    width,
    height,
    alt_text,
    caption,
    status,
    created_at,
    updated_at
)
ON TABLE public.media_assets
TO anon;

-- Authenticated users retain full column access, subject to RLS.
GRANT SELECT ON TABLE public.media_assets
TO authenticated;

GRANT INSERT, UPDATE ON TABLE public.media_assets
TO authenticated;

REVOKE ALL ON TABLE public.media_asset_usages
FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.media_asset_usages
TO authenticated;


-- =========================================================
-- 7. STORAGE BUCKETS
-- =========================================================

INSERT INTO storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
VALUES
(
    'trendpilot-media-staging',
    'trendpilot-media-staging',
    false,
    10485760,
    ARRAY[
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/avif'
    ]
),
(
    'trendpilot-media',
    'trendpilot-media',
    true,
    10485760,
    ARRAY[
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/avif'
    ]
)
ON CONFLICT (id)
DO UPDATE SET
    name = EXCLUDED.name,
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;


-- =========================================================
-- 8. PRIVATE STAGING STORAGE POLICIES
-- =========================================================

CREATE POLICY trendpilot_staging_read
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'trendpilot-media-staging'
    AND (
        (storage.foldername(name))[1] = (SELECT auth.uid())::text
        OR (SELECT public.is_media_editor_or_admin())
    )
);

CREATE POLICY trendpilot_staging_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'trendpilot-media-staging'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    AND EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = (SELECT auth.uid())
          AND role IN ('author', 'editor', 'admin')
    )
);


-- =========================================================
-- 9. FUNCTION PRIVILEGE HARDENING
-- =========================================================

REVOKE ALL ON FUNCTION public.validate_media_asset_write()
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.validate_media_asset_usage_write()
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_article_media_publication()
FROM PUBLIC, anon, authenticated;


-- =========================================================
-- 10. PUBLIC BUCKET STORAGE POLICY
-- =========================================================

-- Public bucket objects are publicly readable through Supabase Storage.
-- No direct authenticated INSERT, UPDATE or DELETE policy is created.
-- Publication and removal will use a protected server-side workflow.
ROLLBACK;
