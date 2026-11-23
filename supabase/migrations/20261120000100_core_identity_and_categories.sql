BEGIN;

-- =========================================================
-- 1. USER PROFILES AND APPLICATION ROLES
-- =========================================================

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    role TEXT NOT NULL DEFAULT 'user'
        CHECK (role IN ('user', 'author', 'editor', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.profiles IS
    'Application profiles linked to Supabase Auth users.';

COMMENT ON COLUMN public.profiles.role IS
    'Application role. New users always receive the user role.';

-- Automatically update updated_at.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Create profiles automatically after Auth signup.
-- IMPORTANT: Never derive the application role from user metadata.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        display_name,
        role
    )
    VALUES (
        NEW.id,
        COALESCE(
            NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'display_name'), ''),
            NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'full_name'), '')
        ),
        'user'
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- 2. ADMINISTRATOR AUTHORIZATION FUNCTION
-- =========================================================

CREATE OR REPLACE FUNCTION public.is_admin()
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
          AND role = 'admin'
    );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- =========================================================
-- 3. CATEGORY HIERARCHY
-- =========================================================

CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    parent_id UUID
        REFERENCES public.categories(id)
        ON DELETE RESTRICT,

    name TEXT NOT NULL,
    slug TEXT NOT NULL,

    level TEXT NOT NULL
        CHECK (level IN ('broad', 'subcategory', 'micro')),

    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'archived')),

    description TEXT,

    seo_title TEXT,
    seo_description TEXT,

    display_order INTEGER NOT NULL DEFAULT 0,

    created_by UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT categories_name_not_empty
        CHECK (LENGTH(BTRIM(name)) > 0),

    CONSTRAINT categories_slug_format
        CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),

    CONSTRAINT categories_seo_title_length
        CHECK (seo_title IS NULL OR LENGTH(seo_title) <= 70),

    CONSTRAINT categories_seo_description_length
        CHECK (seo_description IS NULL OR LENGTH(seo_description) <= 170)
);

COMMENT ON TABLE public.categories IS
    'Three-level publishing taxonomy: broad niches, subcategories and micro niches.';

CREATE UNIQUE INDEX categories_root_slug_unique
ON public.categories (slug)
WHERE parent_id IS NULL;

CREATE UNIQUE INDEX categories_child_slug_unique
ON public.categories (parent_id, slug)
WHERE parent_id IS NOT NULL;

CREATE INDEX categories_parent_id_idx
ON public.categories (parent_id);

CREATE INDEX categories_status_level_idx
ON public.categories (status, level);

CREATE TRIGGER categories_set_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Enforce the fixed six Broad Niches and exactly three taxonomy levels.
CREATE OR REPLACE FUNCTION public.validate_category_hierarchy()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    parent_level TEXT;
    parent_status TEXT;
    expected_name TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.level = 'broad' THEN
            RAISE EXCEPTION 'The six TrendPilot Broad Niches cannot be deleted.';
        END IF;

        RETURN OLD;
    END IF;

    IF NEW.parent_id IS NULL THEN
        IF NEW.level <> 'broad' THEN
            RAISE EXCEPTION 'Top-level categories must be Broad Niches.';
        END IF;

        expected_name := CASE NEW.slug
            WHEN 'business' THEN 'Business'
            WHEN 'technology' THEN 'Technology'
            WHEN 'finance' THEN 'Finance'
            WHEN 'education' THEN 'Education'
            WHEN 'lifestyle' THEN 'Lifestyle'
            WHEN 'innovation' THEN 'Innovation'
            ELSE NULL
        END;

        IF expected_name IS NULL THEN
            RAISE EXCEPTION 'Only the six approved TrendPilot Broad Niches are allowed at the top level.';
        END IF;

        IF NEW.name <> expected_name THEN
            RAISE EXCEPTION 'The name of a Broad Niche must match its approved identity.';
        END IF;

        IF TG_OP = 'UPDATE'
           AND OLD.level = 'broad'
           AND (
               NEW.slug <> OLD.slug
               OR NEW.name <> OLD.name
               OR NEW.level <> OLD.level
           ) THEN
            RAISE EXCEPTION 'The identity of a Broad Niche cannot be changed.';
        END IF;

    ELSE
        IF NEW.id = NEW.parent_id THEN
            RAISE EXCEPTION 'A category cannot be its own parent.';
        END IF;

        SELECT level, status
        INTO parent_level, parent_status
        FROM public.categories
        WHERE id = NEW.parent_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'The selected parent category does not exist.';
        END IF;

        IF NEW.level = 'subcategory' AND parent_level <> 'broad' THEN
            RAISE EXCEPTION 'A subcategory must belong to a Broad Niche.';
        END IF;

        IF NEW.level = 'micro' AND parent_level <> 'subcategory' THEN
            RAISE EXCEPTION 'A micro niche must belong to a subcategory.';
        END IF;

        IF NEW.level = 'broad' THEN
            RAISE EXCEPTION 'Broad Niches cannot have a parent category.';
        END IF;

        IF NEW.status = 'published' AND parent_status <> 'published' THEN
            RAISE EXCEPTION 'A category cannot be published while its parent is unpublished.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER categories_validate_hierarchy
BEFORE INSERT OR UPDATE OR DELETE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.validate_category_hierarchy();

-- =========================================================
-- 4. PUBLIC CATEGORY VISIBILITY
-- =========================================================

CREATE OR REPLACE FUNCTION public.is_category_public(
    target_category_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    WITH RECURSIVE category_chain AS (
        SELECT
            id,
            parent_id,
            level,
            status
        FROM public.categories
        WHERE id = target_category_id

        UNION ALL

        SELECT
            parent.id,
            parent.parent_id,
            parent.level,
            parent.status
        FROM public.categories AS parent
        INNER JOIN category_chain AS child
            ON child.parent_id = parent.id
    )
    SELECT COALESCE(
        BOOL_AND(status = 'published')
        AND BOOL_OR(parent_id IS NULL AND level = 'broad'),
        FALSE
    )
    FROM category_chain;
$$;

REVOKE ALL ON FUNCTION public.is_category_public(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_category_public(UUID) TO anon, authenticated;

-- =========================================================
-- 5. ROW LEVEL SECURITY
-- =========================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read their own profile.
-- Administrators can read all profiles.
-- Profile mutations will go through protected server-side operations.
CREATE POLICY profiles_select_own_or_admin
ON public.profiles
FOR SELECT
TO authenticated
USING (
    id = (SELECT auth.uid())
    OR (SELECT public.is_admin())
);

-- Public visitors can read published categories whose entire
-- parent hierarchy is also published.
CREATE POLICY categories_public_read
ON public.categories
FOR SELECT
TO anon, authenticated
USING (
    (SELECT public.is_category_public(id))
);

-- Administrators can also read unpublished and archived categories.
CREATE POLICY categories_admin_read
ON public.categories
FOR SELECT
TO authenticated
USING (
    (SELECT public.is_admin())
);

CREATE POLICY categories_admin_insert
ON public.categories
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT public.is_admin())
);

CREATE POLICY categories_admin_update
ON public.categories
FOR UPDATE
TO authenticated
USING (
    (SELECT public.is_admin())
)
WITH CHECK (
    (SELECT public.is_admin())
);

CREATE POLICY categories_admin_delete
ON public.categories
FOR DELETE
TO authenticated
USING (
    (SELECT public.is_admin())
);

-- Explicit table privileges.
REVOKE ALL ON public.profiles FROM anon, authenticated;
GRANT SELECT ON public.profiles TO authenticated;

REVOKE ALL ON public.categories FROM anon, authenticated;
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;

-- =========================================================
-- 6. SEED THE SIX FIXED BROAD NICHES
-- =========================================================

INSERT INTO public.categories (
    name,
    slug,
    level,
    status,
    description,
    display_order
)
SELECT
    seed.name,
    seed.slug,
    'broad',
    'published',
    seed.description,
    seed.display_order
FROM (
    VALUES
        (
            'Business',
            'business',
            'Business strategy, entrepreneurship, leadership and market opportunities.',
            1
        ),
        (
            'Technology',
            'technology',
            'Technology trends, software, digital tools and emerging technologies.',
            2
        ),
        (
            'Finance',
            'finance',
            'Personal finance, financial literacy, investing and money management.',
            3
        ),
        (
            'Education',
            'education',
            'Learning, professional development, skills and educational opportunities.',
            4
        ),
        (
            'Lifestyle',
            'lifestyle',
            'Lifestyle, productivity, wellness, culture and everyday living.',
            5
        ),
        (
            'Innovation',
            'innovation',
            'New ideas, disruptive solutions, research and future-facing developments.',
            6
        )
) AS seed(name, slug, description, display_order)
WHERE NOT EXISTS (
    SELECT 1
    FROM public.categories AS existing
    WHERE existing.parent_id IS NULL
      AND existing.slug = seed.slug
);

COMMIT;
