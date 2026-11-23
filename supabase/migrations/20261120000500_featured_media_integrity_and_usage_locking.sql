BEGIN;

-- ============================================================
-- 1. Replace article publication media validation.
--    Lock referenced media assets and validate the featured
--    image independently of media usage records.
-- ============================================================

CREATE OR REPLACE FUNCTION public.validate_article_media_publication()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    featured_asset_id uuid;
BEGIN
    IF NEW.status = 'published' THEN

        -- A featured image must resolve to an approved public asset.
        IF NEW.featured_image_path IS NOT NULL THEN

            SELECT ma.id
            INTO featured_asset_id
            FROM public.media_assets AS ma
            WHERE ma.bucket_id = 'trendpilot-media'
              AND ma.object_path = NEW.featured_image_path
              AND ma.status = 'published'
            FOR SHARE;

            IF featured_asset_id IS NULL THEN
                RAISE EXCEPTION
                    'Published articles require an approved public featured image.'
                    USING ERRCODE = '23514';
            END IF;
        END IF;

        -- Lock all assets referenced by this article in a
        -- deterministic order. The article row is already
        -- locked by PostgreSQL during its INSERT or UPDATE.
        PERFORM ma.id
        FROM public.media_assets AS ma
        JOIN public.media_asset_usages AS mau
            ON mau.media_asset_id = ma.id
        WHERE mau.article_id = NEW.id
        ORDER BY ma.id
        FOR SHARE OF ma;

        -- Every recorded usage on a published article must
        -- reference an approved asset in the public bucket.
        IF EXISTS (
            SELECT 1
            FROM public.media_asset_usages AS mau
            JOIN public.media_assets AS ma
                ON ma.id = mau.media_asset_id
            WHERE mau.article_id = NEW.id
              AND (
                  ma.status <> 'published'
                  OR ma.bucket_id <> 'trendpilot-media'
              )
        ) THEN
            RAISE EXCEPTION
                'Published articles cannot use staged or archived media.'
                USING ERRCODE = '23514';
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;


DROP TRIGGER IF EXISTS articles_validate_published_media
ON public.articles;

CREATE TRIGGER articles_validate_published_media
BEFORE INSERT OR UPDATE OF status, featured_image_path
ON public.articles
FOR EACH ROW
EXECUTE FUNCTION public.validate_article_media_publication();


-- ============================================================
-- 2. Replace media usage validation.
--    Lock article first, then media asset.
--    Authors may attach only their own staged media to their
--    own draft or in-review articles through trusted triggers.
--    Direct RLS policies remain unchanged.
-- ============================================================

CREATE OR REPLACE FUNCTION public.validate_media_asset_usage_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    actor_id uuid;
    actor_role text;
    asset_owner_id uuid;
    asset_status text;
    asset_bucket_id text;
    article_status text;
    article_author_id uuid;
BEGIN
    actor_id := (SELECT auth.uid());

    IF actor_id IS NULL THEN
        RAISE EXCEPTION 'Authenticated user required.'
            USING ERRCODE = '42501';
    END IF;

    SELECT p.role
    INTO actor_role
    FROM public.profiles AS p
    WHERE p.id = actor_id;

    IF actor_role IS NULL
        OR actor_role NOT IN ('author', 'editor', 'admin') THEN
        RAISE EXCEPTION 'Insufficient permissions to manage media usage.'
            USING ERRCODE = '42501';
    END IF;

    -- Usage identity changes must use DELETE + INSERT.
    -- This keeps locking order predictable.
    IF TG_OP = 'UPDATE' AND (
        NEW.media_asset_id IS DISTINCT FROM OLD.media_asset_id
        OR NEW.article_id IS DISTINCT FROM OLD.article_id
        OR NEW.usage_role IS DISTINCT FROM OLD.usage_role
    ) THEN
        RAISE EXCEPTION
            'Media usage identity cannot be changed. Delete and recreate the usage record.'
            USING ERRCODE = '23514';
    END IF;

    -- Lock order: article first.
    SELECT a.status, a.author_id
    INTO article_status, article_author_id
    FROM public.articles AS a
    WHERE a.id = NEW.article_id
    FOR UPDATE;

    IF article_status IS NULL THEN
        RAISE EXCEPTION 'The selected article is unavailable.'
            USING ERRCODE = '23514';
    END IF;

    -- Lock order: media asset second.
    SELECT ma.owner_id, ma.status, ma.bucket_id
    INTO asset_owner_id, asset_status, asset_bucket_id
    FROM public.media_assets AS ma
    WHERE ma.id = NEW.media_asset_id
    FOR SHARE;

    IF asset_status IS NULL OR asset_status = 'archived' THEN
        RAISE EXCEPTION 'The selected media asset is unavailable.'
            USING ERRCODE = '23514';
    END IF;

    IF actor_role = 'author' THEN

        IF article_author_id <> actor_id
            OR article_status NOT IN ('draft', 'in_review') THEN
            RAISE EXCEPTION
                'Authors may only attach media to their own draft or in-review articles.'
                USING ERRCODE = '42501';
        END IF;

        IF asset_owner_id <> actor_id
            OR asset_bucket_id <> 'trendpilot-media-staging'
            OR asset_status <> 'staged' THEN
            RAISE EXCEPTION
                'Authors may only attach their own staged media.'
                USING ERRCODE = '42501';
        END IF;
    END IF;

    IF article_status = 'published'
        AND (
            asset_status <> 'published'
            OR asset_bucket_id <> 'trendpilot-media'
        ) THEN
        RAISE EXCEPTION
            'Published articles require approved public media.'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$function$;


-- ============================================================
-- 3. Automatically synchronize featured-image usage records.
--    This keeps the archive protection and publication checks
--    aware of every featured image.
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_article_featured_media_usage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    asset_id uuid;
BEGIN
    IF TG_OP = 'UPDATE'
        AND OLD.featured_image_path
            IS NOT DISTINCT FROM NEW.featured_image_path THEN
        RETURN NEW;
    END IF;

    -- Remove the previous featured-image relationship.
    DELETE FROM public.media_asset_usages
    WHERE article_id = NEW.id
      AND usage_role = 'featured_image';

    IF NEW.featured_image_path IS NULL THEN
        RETURN NEW;
    END IF;

    -- Resolve the path to a real staging or public media asset.
    -- Prefer the approved public asset if both buckets happen
    -- to contain the same object path.
    SELECT ma.id
    INTO asset_id
    FROM public.media_assets AS ma
    WHERE ma.object_path = NEW.featured_image_path
      AND ma.bucket_id IN (
          'trendpilot-media-staging',
          'trendpilot-media'
      )
      AND ma.status <> 'archived'
    ORDER BY
        CASE
            WHEN ma.bucket_id = 'trendpilot-media'
                AND ma.status = 'published' THEN 0
            ELSE 1
        END,
        ma.id
    LIMIT 1;

    IF asset_id IS NULL THEN
        RAISE EXCEPTION
            'The featured image path does not reference an available TrendPilot media asset.'
            USING ERRCODE = '23514';
    END IF;

    -- The media usage validation trigger independently checks
    -- article ownership, media ownership and publication state.
    INSERT INTO public.media_asset_usages (
        media_asset_id,
        article_id,
        usage_role
    )
    VALUES (
        asset_id,
        NEW.id,
        'featured_image'
    );

    RETURN NEW;
END;
$function$;


DROP TRIGGER IF EXISTS articles_sync_featured_media_usage
ON public.articles;

CREATE TRIGGER articles_sync_featured_media_usage
AFTER INSERT OR UPDATE OF featured_image_path
ON public.articles
FOR EACH ROW
EXECUTE FUNCTION public.sync_article_featured_media_usage();


-- ============================================================
-- 4. Restrict trigger function execution.
--    PostgreSQL invokes these functions through their triggers.
--    They are not intended as directly callable API functions.
-- ============================================================

REVOKE ALL ON FUNCTION
    public.validate_article_media_publication()
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION
    public.validate_media_asset_usage_write()
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION
    public.sync_article_featured_media_usage()
FROM PUBLIC, anon, authenticated;


COMMIT;
