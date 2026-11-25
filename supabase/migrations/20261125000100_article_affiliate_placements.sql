-- =========================================================
-- Article affiliate placements
-- Atomically replace an article's affiliate link placements.
-- The API authenticates the user and enforces article permissions.
-- =========================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.replace_article_affiliate_placements(
    p_article_id UUID,
    p_created_by UUID,
    p_placements JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
    v_article_content JSONB;
    v_article_status TEXT;
    v_placement_count INTEGER;
    v_invalid_count INTEGER;
BEGIN
    IF p_article_id IS NULL OR p_created_by IS NULL THEN
        RAISE EXCEPTION 'Article and editor IDs are required.'
            USING ERRCODE = '22023';
    END IF;

    IF p_placements IS NULL
       OR jsonb_typeof(p_placements) <> 'array' THEN
        RAISE EXCEPTION 'Placements must be a JSON array.'
            USING ERRCODE = '22023';
    END IF;

    IF jsonb_array_length(p_placements) > 100 THEN
        RAISE EXCEPTION 'An article cannot have more than 100 affiliate placements.'
            USING ERRCODE = '22023';
    END IF;

    v_placement_count := jsonb_array_length(p_placements);

    -- Lock the article first to keep concurrent placement updates ordered.
    SELECT a.content, a.status
    INTO v_article_content, v_article_status
    FROM public.articles AS a
    WHERE a.id = p_article_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'The selected article is unavailable.'
            USING ERRCODE = 'P0002';
    END IF;

    IF v_article_status = 'archived' THEN
        RAISE EXCEPTION 'Affiliate placements cannot be managed on archived articles.'
            USING ERRCODE = '23514';
    END IF;

    -- Every placement must contain exactly one UUID block ID and link ID.
    IF EXISTS (
        SELECT 1
        FROM jsonb_array_elements(p_placements) AS item(value)
        WHERE jsonb_typeof(item.value) <> 'object'
           OR NOT (item.value ? 'blockId')
           OR NOT (item.value ? 'affiliateLinkId')
           OR (item.value - 'blockId' - 'affiliateLinkId') <> '{}'::jsonb
           OR jsonb_typeof(item.value -> 'blockId') <> 'string'
           OR jsonb_typeof(item.value -> 'affiliateLinkId') <> 'string'
           OR (item.value ->> 'blockId') !~
                '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
           OR (item.value ->> 'affiliateLinkId') !~
                '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    ) THEN
        RAISE EXCEPTION 'Each placement must contain valid blockId and affiliateLinkId UUIDs only.'
            USING ERRCODE = '22023';
    END IF;

    -- A block can have only one placement per article.
    IF (
        SELECT COUNT(DISTINCT item.value ->> 'blockId')
        FROM jsonb_array_elements(p_placements) AS item(value)
    ) <> v_placement_count THEN
        RAISE EXCEPTION 'An article block cannot have more than one affiliate link.'
            USING ERRCODE = '23505';
    END IF;

    -- Validate the saved content structure before inspecting its blocks.
    IF v_placement_count > 0
       AND jsonb_typeof(v_article_content -> 'content') IS DISTINCT FROM 'array' THEN
        RAISE EXCEPTION 'The article content is not in a valid block format.'
            USING ERRCODE = '22023';
    END IF;

    -- Every selected block ID must exist in the saved article content.
    SELECT COUNT(*)
    INTO v_invalid_count
    FROM jsonb_array_elements(p_placements) AS item(value)
    WHERE NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(
            COALESCE(v_article_content -> 'content', '[]'::jsonb)
        ) AS block(value)
        WHERE block.value ->> 'id' = item.value ->> 'blockId'
    );

    IF v_invalid_count > 0 THEN
        RAISE EXCEPTION 'One or more selected block IDs do not exist in the article.'
            USING ERRCODE = '22023';
    END IF;

    -- Lock selected links in deterministic order.
    PERFORM l.id
    FROM public.affiliate_links AS l
    WHERE l.id IN (
        SELECT (item.value ->> 'affiliateLinkId')::UUID
        FROM jsonb_array_elements(p_placements) AS item(value)
    )
    ORDER BY l.id
    FOR SHARE OF l;

    -- Lock their programs separately in deterministic order.
    PERFORM p.id
    FROM public.affiliate_programs AS p
    WHERE p.id IN (
        SELECT l.program_id
        FROM public.affiliate_links AS l
        WHERE l.id IN (
            SELECT (item.value ->> 'affiliateLinkId')::UUID
            FROM jsonb_array_elements(p_placements) AS item(value)
        )
    )
    ORDER BY p.id
    FOR SHARE OF p;

    SELECT COUNT(*)
    INTO v_invalid_count
    FROM jsonb_array_elements(p_placements) AS item(value)
    WHERE NOT EXISTS (
        SELECT 1
        FROM public.affiliate_links AS l
        JOIN public.affiliate_programs AS p
            ON p.id = l.program_id
        WHERE l.id = (item.value ->> 'affiliateLinkId')::UUID
          AND l.status = 'active'
          AND p.status = 'active'
          AND (l.expires_at IS NULL OR l.expires_at > NOW())
    );

    IF v_invalid_count > 0 THEN
        RAISE EXCEPTION 'One or more selected affiliate links are unavailable or expired.'
            USING ERRCODE = '23514';
    END IF;

    -- Replace all placements in this transaction.
    DELETE FROM public.affiliate_link_articles
    WHERE article_id = p_article_id;

    INSERT INTO public.affiliate_link_articles (
        article_id,
        affiliate_link_id,
        block_id,
        created_by
    )
    SELECT
        p_article_id,
        (item.value ->> 'affiliateLinkId')::UUID,
        (item.value ->> 'blockId')::UUID,
        p_created_by
    FROM jsonb_array_elements(p_placements) AS item(value);

    RETURN v_placement_count;
END;
$function$;

REVOKE ALL ON FUNCTION
    public.replace_article_affiliate_placements(UUID, UUID, JSONB)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
    public.replace_article_affiliate_placements(UUID, UUID, JSONB)
TO service_role;

COMMIT;



