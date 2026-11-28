BEGIN;

-- =========================================================
-- 1. SYNCHRONIZE ARTICLE BODY IMAGE USAGE
-- =========================================================

CREATE OR REPLACE FUNCTION public.sync_article_body_media_usage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    image_record RECORD;
    asset_id uuid;
    asset_owner_id uuid;
    asset_bucket_id text;
    asset_status text;
    asset_purpose text;
BEGIN
    -- Remove only body-image relationships.
    -- Featured-image relationships are managed separately.
    DELETE FROM public.media_asset_usages
    WHERE article_id = NEW.id
      AND usage_role = 'article_content';

    -- Walk the complete TipTap document recursively.
    FOR image_record IN
        WITH RECURSIVE document_nodes(node) AS (
            SELECT NEW.content

            UNION ALL

            SELECT child.node
            FROM document_nodes AS parent
            CROSS JOIN LATERAL jsonb_array_elements(
                CASE
                    WHEN jsonb_typeof(parent.node->'content') = 'array'
                    THEN parent.node->'content'
                    ELSE '[]'::jsonb
                END
            ) AS child(node)
        )
        SELECT DISTINCT
            node->'attrs'->>'mediaId' AS media_id,
            node->'attrs'->>'objectPath' AS object_path
        FROM document_nodes
        WHERE node->>'type' = 'image'
        ORDER BY media_id, object_path
    LOOP
        IF image_record.media_id IS NULL
           OR image_record.media_id = ''
           OR image_record.object_path IS NULL
           OR image_record.object_path = '' THEN
            RAISE EXCEPTION
                'An article image is missing its media reference.'
                USING ERRCODE = '23514';
        END IF;

        SELECT
            ma.id,
            ma.owner_id,
            ma.bucket_id,
            ma.status,
            ma.purpose
        INTO
            asset_id,
            asset_owner_id,
            asset_bucket_id,
            asset_status,
            asset_purpose
        FROM public.media_assets AS ma
        WHERE ma.id::text = image_record.media_id
          AND ma.object_path = image_record.object_path
        FOR SHARE;

        IF NOT FOUND
           OR asset_purpose IS DISTINCT FROM 'article'
           OR asset_status = 'archived' THEN
            RAISE EXCEPTION
                'An article image references unavailable or invalid media.'
                USING ERRCODE = '23514';
        END IF;

        IF asset_status = 'staged'
           AND asset_bucket_id <> 'trendpilot-media-staging' THEN
            RAISE EXCEPTION
                'Staged article media must be stored in the staging bucket.'
                USING ERRCODE = '23514';
        END IF;

        IF asset_status = 'published'
           AND asset_bucket_id <> 'trendpilot-media' THEN
            RAISE EXCEPTION
                'Published article media must be stored in the public bucket.'
                USING ERRCODE = '23514';
        END IF;

        IF asset_status NOT IN ('staged', 'published') THEN
            RAISE EXCEPTION
                'The article image has an unsupported media status.'
                USING ERRCODE = '23514';
        END IF;

        IF NEW.status = 'published'
           AND (
               asset_status <> 'published'
               OR asset_bucket_id <> 'trendpilot-media'
           ) THEN
            RAISE EXCEPTION
                'Published articles require approved public body images.'
                USING ERRCODE = '23514';
        END IF;

        -- The existing usage-validation trigger still runs here.
        -- It enforces the authenticated user's role, ownership,
        -- article status and media locking rules.
        INSERT INTO public.media_asset_usages (
            media_asset_id,
            article_id,
            usage_role
        )
        VALUES (
            asset_id,
            NEW.id,
            'article_content'
        )
        ON CONFLICT (media_asset_id, article_id, usage_role)
        DO NOTHING;
    END LOOP;

    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS articles_sync_body_media_usage
ON public.articles;

CREATE TRIGGER articles_sync_body_media_usage
AFTER INSERT OR UPDATE OF content
ON public.articles
FOR EACH ROW
EXECUTE FUNCTION public.sync_article_body_media_usage();

-- =========================================================
-- 2. VALIDATE EXISTING BODY IMAGE REFERENCES
-- =========================================================

DO $backfill_validation$
BEGIN
    IF EXISTS (
        WITH RECURSIVE document_nodes(article_id, node) AS (
            SELECT a.id, a.content
            FROM public.articles AS a

            UNION ALL

            SELECT parent.article_id, child.node
            FROM document_nodes AS parent
            CROSS JOIN LATERAL jsonb_array_elements(
                CASE
                    WHEN jsonb_typeof(parent.node->'content') = 'array'
                    THEN parent.node->'content'
                    ELSE '[]'::jsonb
                END
            ) AS child(node)
        ),
        image_refs AS (
            SELECT
                article_id,
                node->'attrs'->>'mediaId' AS media_id,
                node->'attrs'->>'objectPath' AS object_path
            FROM document_nodes
            WHERE node->>'type' = 'image'
        )
        SELECT 1
        FROM image_refs AS image
        LEFT JOIN public.media_assets AS ma
          ON ma.id::text = image.media_id
         AND ma.object_path = image.object_path
        JOIN public.articles AS a
          ON a.id = image.article_id
        WHERE image.media_id IS NULL
           OR image.media_id = ''
           OR image.object_path IS NULL
           OR image.object_path = ''
           OR ma.id IS NULL
           OR ma.purpose IS DISTINCT FROM 'article'
           OR ma.status NOT IN ('staged', 'published')
           OR (
               ma.status = 'staged'
               AND ma.bucket_id <> 'trendpilot-media-staging'
           )
           OR (
               ma.status = 'published'
               AND ma.bucket_id <> 'trendpilot-media'
           )
           OR (
               a.status = 'published'
               AND (
                   ma.status <> 'published'
                   OR ma.bucket_id <> 'trendpilot-media'
               )
           )
    ) THEN
        RAISE EXCEPTION
            'Existing article body images contain invalid or unavailable media references. Resolve them before applying this migration.';
    END IF;

    IF EXISTS (
        WITH RECURSIVE document_nodes(article_id, node) AS (
            SELECT a.id, a.content
            FROM public.articles AS a

            UNION ALL

            SELECT parent.article_id, child.node
            FROM document_nodes AS parent
            CROSS JOIN LATERAL jsonb_array_elements(
                CASE
                    WHEN jsonb_typeof(parent.node->'content') = 'array'
                    THEN parent.node->'content'
                    ELSE '[]'::jsonb
                END
            ) AS child(node)
        ),
        image_refs AS (
            SELECT
                article_id,
                node->'attrs'->>'mediaId' AS media_id,
                node->'attrs'->>'objectPath' AS object_path
            FROM document_nodes
            WHERE node->>'type' = 'image'
        )
        SELECT 1
        FROM image_refs
        GROUP BY article_id, media_id
        HAVING COUNT(DISTINCT object_path) > 1
    ) THEN
        RAISE EXCEPTION
            'An article references the same media ID with conflicting object paths.';
    END IF;
END;
$backfill_validation$;

-- =========================================================
-- 3. BACKFILL EXISTING ARTICLE BODY IMAGE USAGES
-- =========================================================

-- The existing validation trigger requires auth.uid().
-- This one-time backfill runs as the migration database role.
-- References have already been explicitly validated above.
-- Disable only this trigger during the backfill.

ALTER TABLE public.media_asset_usages
DISABLE TRIGGER media_asset_usages_validate_write;

WITH RECURSIVE document_nodes(article_id, node) AS (
    SELECT a.id, a.content
    FROM public.articles AS a

    UNION ALL

    SELECT parent.article_id, child.node
    FROM document_nodes AS parent
    CROSS JOIN LATERAL jsonb_array_elements(
        CASE
            WHEN jsonb_typeof(parent.node->'content') = 'array'
            THEN parent.node->'content'
            ELSE '[]'::jsonb
        END
    ) AS child(node)
),
image_refs AS (
    SELECT DISTINCT
        article_id,
        node->'attrs'->>'mediaId' AS media_id,
        node->'attrs'->>'objectPath' AS object_path
    FROM document_nodes
    WHERE node->>'type' = 'image'
)
INSERT INTO public.media_asset_usages (
    media_asset_id,
    article_id,
    usage_role
)
SELECT DISTINCT
    ma.id,
    image.article_id,
    'article_content'
FROM image_refs AS image
JOIN public.media_assets AS ma
  ON ma.id::text = image.media_id
 AND ma.object_path = image.object_path
ON CONFLICT (media_asset_id, article_id, usage_role)
DO NOTHING;

ALTER TABLE public.media_asset_usages
ENABLE TRIGGER media_asset_usages_validate_write;

-- =========================================================
-- 4. FUNCTION PERMISSIONS
-- =========================================================

REVOKE ALL ON FUNCTION public.sync_article_body_media_usage()
FROM PUBLIC, anon, authenticated;

COMMIT;
