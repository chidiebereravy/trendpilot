
BEGIN;

-- =========================================================
-- 1. COMMENTS TABLE
-- =========================================================

CREATE TABLE public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    article_id UUID NOT NULL
        REFERENCES public.articles(id)
        ON DELETE CASCADE,

    author_id UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    author_display_name TEXT NOT NULL,

    parent_id UUID,
    root_id UUID NOT NULL,
    depth INTEGER NOT NULL DEFAULT 0,

    content TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    deleted_at TIMESTAMPTZ,
    deleted_by UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    CONSTRAINT comments_content_length_check
        CHECK (
            char_length(BTRIM(content)) BETWEEN 1 AND 5000
        ),

    CONSTRAINT comments_depth_check
        CHECK (depth >= 0),

    CONSTRAINT comments_display_name_check
        CHECK (char_length(BTRIM(author_display_name)) BETWEEN 1 AND 120),

    CONSTRAINT comments_deleted_fields_check
        CHECK (
            (deleted_at IS NULL AND deleted_by IS NULL)
            OR deleted_at IS NOT NULL
        ),

    CONSTRAINT comments_id_article_unique
        UNIQUE (id, article_id),

    CONSTRAINT comments_parent_same_article_fk
        FOREIGN KEY (parent_id, article_id)
        REFERENCES public.comments(id, article_id)
        ON DELETE RESTRICT,

    CONSTRAINT comments_root_same_article_fk
        FOREIGN KEY (root_id, article_id)
        REFERENCES public.comments(id, article_id)
        ON DELETE RESTRICT,

    CONSTRAINT comments_root_depth_check
        CHECK (
            (parent_id IS NULL AND root_id = id AND depth = 0)
            OR
            (parent_id IS NOT NULL AND root_id <> id AND depth > 0)
        )
);

COMMENT ON TABLE public.comments IS
    'Public article discussions with deeply nested replies and soft deletion.';

COMMENT ON COLUMN public.comments.parent_id IS
    'Direct parent comment. NULL identifies a top-level comment.';

COMMENT ON COLUMN public.comments.root_id IS
    'Top-level comment ID for the entire discussion thread.';

COMMENT ON COLUMN public.comments.depth IS
    'Nesting depth. Top-level comments have depth zero.';

COMMENT ON COLUMN public.comments.author_display_name IS
    'Display-name snapshot captured when the comment is created.';


-- =========================================================
-- 2. INDEXES FOR SCALABLE DISCUSSION QUERIES
-- =========================================================

CREATE INDEX comments_article_top_level_cursor_idx
    ON public.comments (article_id, created_at DESC, id DESC)
    WHERE parent_id IS NULL;

CREATE INDEX comments_parent_replies_cursor_idx
    ON public.comments (parent_id, created_at ASC, id ASC)
    WHERE parent_id IS NOT NULL;

CREATE INDEX comments_root_thread_cursor_idx
    ON public.comments (root_id, created_at ASC, id ASC);

CREATE INDEX comments_author_cursor_idx
    ON public.comments (author_id, created_at DESC, id DESC)
    WHERE author_id IS NOT NULL;

CREATE INDEX comments_deleted_at_idx
    ON public.comments (deleted_at)
    WHERE deleted_at IS NOT NULL;


-- =========================================================
-- 3. COMMENT INSERTION AND UPDATE VALIDATION
-- =========================================================

CREATE OR REPLACE FUNCTION public.prepare_comment_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_parent_root_id UUID;
    v_parent_depth INTEGER;
    v_author_display_name TEXT;
    v_article_is_published BOOLEAN;
BEGIN

    -- -----------------------------------------------------
    -- INSERT
    -- -----------------------------------------------------

    IF TG_OP = 'INSERT' THEN

        IF auth.uid() IS NULL
           OR NEW.author_id IS DISTINCT FROM auth.uid() THEN
            RAISE EXCEPTION 'A signed-in user must create the comment.'
                USING ERRCODE = '42501';
        END IF;

        IF NEW.id IS NULL THEN
            NEW.id := gen_random_uuid();
        END IF;

        SELECT
            a.status = 'published'
            AND a.published_at IS NOT NULL
            AND a.published_at <= NOW()
        INTO v_article_is_published
        FROM public.articles AS a
        WHERE a.id = NEW.article_id;

        IF COALESCE(v_article_is_published, FALSE) = FALSE THEN
            RAISE EXCEPTION 'Comments are only available on published articles.'
                USING ERRCODE = '23514';
        END IF;

        SELECT
            COALESCE(
                NULLIF(BTRIM(p.display_name), ''),
                'Member'
            )
        INTO v_author_display_name
        FROM public.profiles AS p
        WHERE p.id = auth.uid();

        IF v_author_display_name IS NULL THEN
            RAISE EXCEPTION 'The commenting account profile is unavailable.'
                USING ERRCODE = '23503';
        END IF;

        NEW.author_display_name := v_author_display_name;

        IF NEW.parent_id IS NULL THEN

            NEW.root_id := NEW.id;
            NEW.depth := 0;

        ELSE

            SELECT
                c.root_id,
                c.depth
            INTO
                v_parent_root_id,
                v_parent_depth
            FROM public.comments AS c
            WHERE c.id = NEW.parent_id
              AND c.article_id = NEW.article_id;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'The parent comment does not exist in this article.'
                    USING ERRCODE = '23503';
            END IF;

            NEW.root_id := v_parent_root_id;
            NEW.depth := v_parent_depth + 1;

        END IF;

        NEW.content := BTRIM(NEW.content);
        NEW.created_at := NOW();
        NEW.updated_at := NOW();
        NEW.deleted_at := NULL;
        NEW.deleted_by := NULL;

        RETURN NEW;
    END IF;


    -- -----------------------------------------------------
    -- UPDATE
    -- -----------------------------------------------------

    IF TG_OP = 'UPDATE' THEN

        -- Discussion structure must never be changed.
        IF NEW.id IS DISTINCT FROM OLD.id
           OR NEW.article_id IS DISTINCT FROM OLD.article_id
           OR NEW.parent_id IS DISTINCT FROM OLD.parent_id
           OR NEW.root_id IS DISTINCT FROM OLD.root_id
           OR NEW.depth IS DISTINCT FROM OLD.depth
           OR NEW.created_at IS DISTINCT FROM OLD.created_at
           OR NEW.author_display_name IS DISTINCT FROM OLD.author_display_name THEN

            RAISE EXCEPTION 'Comment discussion structure is immutable.'
                USING ERRCODE = '42501';
        END IF;

        -- Permit profile deletion to set author_id to NULL.
       IF NEW.author_id IS DISTINCT FROM OLD.author_id THEN

    IF NEW.author_id IS NOT NULL
       OR EXISTS (
           SELECT 1
           FROM public.profiles AS p
           WHERE p.id = OLD.author_id
       ) THEN

        RAISE EXCEPTION 'Comment authorship cannot be changed.'
            USING ERRCODE = '42501';

    END IF;

END IF;

        -- A deleted comment cannot be edited or restored.
        IF OLD.deleted_at IS NOT NULL THEN

            IF NEW.content IS DISTINCT FROM OLD.content
               OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN

                RAISE EXCEPTION 'Deleted comments cannot be edited or restored.'
                    USING ERRCODE = '42501';
            END IF;

        END IF;

        -- Only the original commenter may edit comment content.
        IF NEW.content IS DISTINCT FROM OLD.content THEN

            IF OLD.deleted_at IS NOT NULL
               OR auth.uid() IS DISTINCT FROM OLD.author_id THEN

                RAISE EXCEPTION 'You cannot edit this comment.'
                    USING ERRCODE = '42501';
            END IF;

            NEW.content := BTRIM(NEW.content);

        END IF;

        -- Only authorized users may soft-delete a comment.
        IF OLD.deleted_at IS NULL
           AND NEW.deleted_at IS NOT NULL THEN

            IF NOT (
                auth.uid() = OLD.author_id

                OR EXISTS (
                    SELECT 1
                    FROM public.articles AS a
                    WHERE a.id = OLD.article_id
                      AND a.author_id = auth.uid()
                )

                OR public.is_editor_or_admin()
            ) THEN

                RAISE EXCEPTION 'You cannot delete this comment.'
                    USING ERRCODE = '42501';
            END IF;

            NEW.deleted_at := NOW();
            NEW.deleted_by := auth.uid();

        ELSIF NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN

            RAISE EXCEPTION 'Comment deletion cannot be reversed.'
                USING ERRCODE = '42501';

        ELSIF NEW.deleted_by IS DISTINCT FROM OLD.deleted_by THEN

            RAISE EXCEPTION 'Comment deletion metadata cannot be changed.'
                USING ERRCODE = '42501';

        END IF;

        NEW.updated_at := NOW();

        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER comments_prepare_write
    BEFORE INSERT OR UPDATE ON public.comments
    FOR EACH ROW
    EXECUTE FUNCTION public.prepare_comment_write();


-- =========================================================
-- 4. ROW LEVEL SECURITY
-- =========================================================

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;


-- Public visitors and authenticated users can read
-- discussions belonging to publicly visible articles.

CREATE POLICY comments_public_read
    ON public.comments
    FOR SELECT
    TO anon, authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.articles AS a
            WHERE a.id = comments.article_id
              AND a.status = 'published'
              AND a.published_at IS NOT NULL
              AND a.published_at <= NOW()
        )
    );


-- Only signed-in users may create comments.
-- The trigger independently verifies the author identity.

CREATE POLICY comments_authenticated_insert
    ON public.comments
    FOR INSERT
    TO authenticated
    WITH CHECK (
        author_id = (SELECT auth.uid())
    );


-- Comment authors can edit their own comments.
-- Article authors and editors/admins can manage discussions.

CREATE POLICY comments_authorized_update
    ON public.comments
    FOR UPDATE
    TO authenticated
    USING (
        author_id = (SELECT auth.uid())

        OR EXISTS (
            SELECT 1
            FROM public.articles AS a
            WHERE a.id = comments.article_id
              AND a.author_id = (SELECT auth.uid())
        )

        OR public.is_editor_or_admin()
    )
    WITH CHECK (
        author_id = (SELECT auth.uid())

        OR EXISTS (
            SELECT 1
            FROM public.articles AS a
            WHERE a.id = comments.article_id
              AND a.author_id = (SELECT auth.uid())
        )

        OR public.is_editor_or_admin()
    );


-- =========================================================
-- 5. TABLE PRIVILEGES
-- =========================================================

GRANT SELECT ON public.comments TO anon, authenticated;

GRANT INSERT, UPDATE ON public.comments TO authenticated;

REVOKE DELETE ON public.comments FROM anon, authenticated;


-- =========================================================
-- 6. FUNCTION PRIVILEGES
-- =========================================================

REVOKE ALL ON FUNCTION public.prepare_comment_write()
    FROM PUBLIC, anon, authenticated;


COMMIT;
