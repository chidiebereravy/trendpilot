BEGIN;

-- =========================================================
-- 1. EDITORIAL AUTHORIZATION
-- =========================================================

CREATE OR REPLACE FUNCTION public.is_editor_or_admin()
RETURNS BOOLEAN
LANGUAGE SQL
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

REVOKE ALL ON FUNCTION public.is_editor_or_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_editor_or_admin() TO authenticated;

-- =========================================================
-- 2. ARTICLES TABLE
-- =========================================================

CREATE TABLE public.articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,

    excerpt TEXT,

    content JSONB NOT NULL DEFAULT '{"type":"doc","content":[]}'::jsonb,

    category_id UUID NOT NULL
        REFERENCES public.categories(id)
        ON DELETE RESTRICT,

    author_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE RESTRICT,

    created_by UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (
            status IN (
                'draft',
                'in_review',
                'scheduled',
                'published',
                'archived'
            )
        ),

    featured_image_path TEXT,

    seo_title TEXT,
    seo_description TEXT,
    focus_keyword TEXT,
    canonical_url TEXT,
    no_index BOOLEAN NOT NULL DEFAULT FALSE,

    published_at TIMESTAMPTZ,
    scheduled_at TIMESTAMPTZ,

    reviewed_by UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    reviewed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT articles_title_not_empty
        CHECK (LENGTH(BTRIM(title)) > 0),

    CONSTRAINT articles_title_length
        CHECK (LENGTH(title) <= 200),

    CONSTRAINT articles_slug_format
        CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),

    CONSTRAINT articles_excerpt_length
        CHECK (excerpt IS NULL OR LENGTH(excerpt) <= 320),

    CONSTRAINT articles_content_object
        CHECK (jsonb_typeof(content) = 'object'),

    CONSTRAINT articles_featured_image_path_length
        CHECK (
            featured_image_path IS NULL
            OR LENGTH(featured_image_path) <= 1024
        ),

    CONSTRAINT articles_seo_title_length
        CHECK (seo_title IS NULL OR LENGTH(seo_title) <= 70),

    CONSTRAINT articles_seo_description_length
        CHECK (
            seo_description IS NULL
            OR LENGTH(seo_description) <= 170
        ),

    CONSTRAINT articles_focus_keyword_length
        CHECK (focus_keyword IS NULL OR LENGTH(focus_keyword) <= 100),

    CONSTRAINT articles_canonical_url_format
        CHECK (
            canonical_url IS NULL
            OR (
                LENGTH(canonical_url) <= 2048
                AND canonical_url ~ '^https?://'
            )
        )
);

COMMENT ON TABLE public.articles IS
    'Editorial articles with authorship, publishing workflow and SEO metadata.';

COMMENT ON COLUMN public.articles.content IS
    'Structured JSON document for the article editor. Rendered content must be safely sanitized.';

COMMENT ON COLUMN public.articles.category_id IS
    'Must reference a micro niche, not a Broad Niche or subcategory.';

COMMENT ON COLUMN public.articles.featured_image_path IS
    'Storage object path, not an arbitrary public image URL.';

-- =========================================================
-- 3. ARTICLE INDEXES
-- =========================================================

CREATE INDEX articles_author_status_idx
ON public.articles (author_id, status, updated_at DESC);

CREATE INDEX articles_category_status_idx
ON public.articles (category_id, status);

CREATE INDEX articles_published_at_idx
ON public.articles (published_at DESC)
WHERE status = 'published';

CREATE INDEX articles_scheduled_at_idx
ON public.articles (scheduled_at)
WHERE status = 'scheduled';

CREATE INDEX articles_created_at_idx
ON public.articles (created_at DESC);

-- =========================================================
-- 4. ARTICLE VALIDATION AND WORKFLOW ENFORCEMENT
-- =========================================================

CREATE OR REPLACE FUNCTION public.validate_article_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    actor_id UUID;
    actor_role TEXT;
    article_author_role TEXT;
    category_level TEXT;
    category_status TEXT;
BEGIN
    actor_id := auth.uid();

    IF actor_id IS NULL THEN
        RAISE EXCEPTION 'An authenticated user is required.';
    END IF;

    SELECT role
    INTO actor_role
    FROM public.profiles
    WHERE id = actor_id;

    IF actor_role IS NULL THEN
        RAISE EXCEPTION 'A valid application profile is required.';
    END IF;

    SELECT level, status
    INTO category_level, category_status
    FROM public.categories
    WHERE id = NEW.category_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'The selected article category does not exist.';
    END IF;

    IF category_level <> 'micro' THEN
        RAISE EXCEPTION 'Articles must belong to a micro niche.';
    END IF;

    SELECT role
    INTO article_author_role
    FROM public.profiles
    WHERE id = NEW.author_id;

    IF article_author_role IS NULL
       OR article_author_role NOT IN ('author', 'editor', 'admin') THEN
        RAISE EXCEPTION 'The selected author does not have an eligible editorial role.';
    END IF;

    IF NEW.status IN ('published', 'scheduled')
       AND category_status <> 'published' THEN
        RAISE EXCEPTION 'Articles cannot be published or scheduled in an unpublished micro niche.';
    END IF;

    IF TG_OP = 'INSERT' THEN

        NEW.created_by := actor_id;

        IF actor_role = 'author' THEN
            IF NEW.author_id <> actor_id THEN
                RAISE EXCEPTION 'Authors can only create articles under their own profile.';
            END IF;

            IF NEW.status NOT IN ('draft', 'in_review') THEN
                RAISE EXCEPTION 'Authors can only create drafts or submit articles for review.';
            END IF;

        ELSIF actor_role NOT IN ('editor', 'admin') THEN
            RAISE EXCEPTION 'You do not have permission to create articles.';
        END IF;

    ELSE

        -- Preserve the original creator.
        NEW.created_by := OLD.created_by;

        IF actor_role = 'author' THEN

            IF OLD.author_id <> actor_id
               OR NEW.author_id <> OLD.author_id THEN
                RAISE EXCEPTION 'Authors can only edit their own articles.';
            END IF;

            IF NEW.status NOT IN ('draft', 'in_review') THEN
                RAISE EXCEPTION 'Authors cannot publish, schedule or archive articles.';
            END IF;

            -- Authors cannot assign themselves editorial approval.
            NEW.reviewed_by := OLD.reviewed_by;
            NEW.reviewed_at := OLD.reviewed_at;

        ELSIF actor_role NOT IN ('editor', 'admin') THEN
            RAISE EXCEPTION 'You do not have permission to modify articles.';
        END IF;

    END IF;

    -- Editorial approval information.
    IF NEW.status IN ('published', 'scheduled') THEN

        IF TG_OP = 'INSERT'
           OR OLD.status NOT IN ('published', 'scheduled') THEN
            NEW.reviewed_by := actor_id;
            NEW.reviewed_at := NOW();
        END IF;

    END IF;

    -- Publication timestamp management.
    IF NEW.status = 'published' THEN

        IF TG_OP = 'INSERT' THEN
            NEW.published_at := COALESCE(NEW.published_at, NOW());
        ELSIF OLD.status <> 'published' THEN
            NEW.published_at := NOW();
        ELSE
            NEW.published_at := COALESCE(NEW.published_at, NOW());
        END IF;

        NEW.scheduled_at := NULL;

    ELSIF NEW.status = 'scheduled' THEN

        IF NEW.scheduled_at IS NULL
           OR NEW.scheduled_at <= NOW() THEN
            RAISE EXCEPTION 'A scheduled article must have a future publication time.';
        END IF;

        NEW.published_at := NULL;

    ELSIF NEW.status IN ('draft', 'in_review') THEN

        NEW.published_at := NULL;
        NEW.scheduled_at := NULL;

    ELSIF NEW.status = 'archived' THEN

        NEW.scheduled_at := NULL;

    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER articles_validate_write
BEFORE INSERT OR UPDATE ON public.articles
FOR EACH ROW
EXECUTE FUNCTION public.validate_article_write();

-- =========================================================
-- 5. ARTICLE UPDATED_AT TRIGGER
-- =========================================================

CREATE TRIGGER articles_set_updated_at
BEFORE UPDATE ON public.articles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 6. ROW LEVEL SECURITY
-- =========================================================

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- Public visitors see only published articles whose publication
-- timestamp has arrived and whose complete category hierarchy
-- is published.
CREATE POLICY articles_public_read
ON public.articles
FOR SELECT
TO anon, authenticated
USING (
    status = 'published'
    AND published_at IS NOT NULL
    AND published_at <= NOW()
    AND (SELECT public.is_category_public(category_id))
);

-- Authors can read their own articles, including drafts.
CREATE POLICY articles_author_read_own
ON public.articles
FOR SELECT
TO authenticated
USING (
    author_id = (SELECT auth.uid())
);

-- Editors and administrators can read every article.
CREATE POLICY articles_editor_read_all
ON public.articles
FOR SELECT
TO authenticated
USING (
    (SELECT public.is_editor_or_admin())
);

-- Authors may create their own drafts or submit articles for review.
CREATE POLICY articles_author_insert
ON public.articles
FOR INSERT
TO authenticated
WITH CHECK (
    author_id = (SELECT auth.uid())
    AND status IN ('draft', 'in_review')
    AND EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = (SELECT auth.uid())
          AND role = 'author'
    )
);

-- Editors and administrators may create articles.
CREATE POLICY articles_editor_insert
ON public.articles
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT public.is_editor_or_admin())
);

-- Authors may update their own drafts and in-review articles.
CREATE POLICY articles_author_update_own
ON public.articles
FOR UPDATE
TO authenticated
USING (
    author_id = (SELECT auth.uid())
    AND status IN ('draft', 'in_review')
)
WITH CHECK (
    author_id = (SELECT auth.uid())
    AND status IN ('draft', 'in_review')
);

-- Editors and administrators can update every article.
CREATE POLICY articles_editor_update_all
ON public.articles
FOR UPDATE
TO authenticated
USING (
    (SELECT public.is_editor_or_admin())
)
WITH CHECK (
    (SELECT public.is_editor_or_admin())
);

-- Only editors and administrators can delete articles.
CREATE POLICY articles_editor_delete
ON public.articles
FOR DELETE
TO authenticated
USING (
    (SELECT public.is_editor_or_admin())
);

-- =========================================================
-- 7. TABLE PRIVILEGES
-- =========================================================

REVOKE ALL ON public.articles FROM anon, authenticated;

GRANT SELECT ON public.articles TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE
ON public.articles
TO authenticated;

COMMIT;

