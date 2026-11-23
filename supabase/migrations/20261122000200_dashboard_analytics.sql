BEGIN;

CREATE OR REPLACE FUNCTION public.admin_get_dashboard_analytics(
    p_range TEXT DEFAULT '30d'
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_unit TEXT;
    v_step INTERVAL;
    v_start TIMESTAMPTZ;
    v_result JSONB;
BEGIN
    IF auth.uid() IS NULL OR NOT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = (SELECT auth.uid())
          AND role IN ('admin', 'editor')
    ) THEN
        RAISE EXCEPTION 'You are not authorized to view platform analytics.'
            USING ERRCODE = '42501';
    END IF;

    IF p_range NOT IN ('7d', '30d', '90d', 'all') THEN
        RAISE EXCEPTION 'Invalid analytics date range.'
            USING ERRCODE = '22023';
    END IF;

    IF p_range = '7d' THEN
        v_unit := 'day';
        v_step := INTERVAL '1 day';
        v_start := date_trunc('day', NOW()) - INTERVAL '6 days';
    ELSIF p_range = '30d' THEN
        v_unit := 'day';
        v_step := INTERVAL '1 day';
        v_start := date_trunc('day', NOW()) - INTERVAL '29 days';
    ELSIF p_range = '90d' THEN
        v_unit := 'day';
        v_step := INTERVAL '1 day';
        v_start := date_trunc('day', NOW()) - INTERVAL '89 days';
    ELSE
        v_unit := 'month';
        v_step := INTERVAL '1 month';
        v_start := date_trunc('month', NOW()) - INTERVAL '11 months';
    END IF;

    WITH overview AS (
        SELECT
            (SELECT COUNT(*) FROM public.articles)::INTEGER AS total_articles,
            (SELECT COUNT(*) FROM public.articles WHERE status = 'published')::INTEGER AS published_articles,
            (SELECT COUNT(*) FROM public.articles WHERE status = 'draft')::INTEGER AS drafts,
            (SELECT COUNT(*) FROM public.articles WHERE status = 'in_review')::INTEGER AS in_review,
            (SELECT COUNT(*) FROM public.articles WHERE status = 'scheduled')::INTEGER AS scheduled,
            (SELECT COUNT(*) FROM public.articles WHERE status = 'archived')::INTEGER AS archived,
            (SELECT COUNT(*) FROM public.profiles)::INTEGER AS registered_users,
            (SELECT COUNT(*) FROM public.profiles WHERE role = 'author')::INTEGER AS authors,
            (SELECT COUNT(*) FROM public.comments WHERE deleted_at IS NULL)::INTEGER AS active_comments
    ),
    status_breakdown AS (
        SELECT COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'status', statuses.status,
                    'count', statuses.article_count
                )
                ORDER BY statuses.sort_order
            ),
            '[]'::JSONB
        ) AS items
        FROM (
            SELECT
                status_values.status,
                status_values.sort_order,
                COUNT(articles.id)::INTEGER AS article_count
            FROM (
                VALUES
                    ('published', 1),
                    ('draft', 2),
                    ('in_review', 3),
                    ('scheduled', 4),
                    ('archived', 5)
            ) AS status_values(status, sort_order)
            LEFT JOIN public.articles AS articles
                ON articles.status = status_values.status
            GROUP BY status_values.status, status_values.sort_order
        ) AS statuses
    ),
    niche_breakdown AS (
        SELECT COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'name', niches.name,
                    'count', niches.article_count
                )
                ORDER BY niches.article_count DESC, niches.name ASC
            ),
            '[]'::JSONB
        ) AS items
        FROM (
            SELECT
                broad.name,
                (
                    SELECT COUNT(*)::INTEGER
                    FROM public.articles AS article
                    INNER JOIN public.categories AS micro
                        ON micro.id = article.category_id
                       AND micro.level = 'micro'
                    INNER JOIN public.categories AS subcategory
                        ON subcategory.id = micro.parent_id
                       AND subcategory.level = 'subcategory'
                       AND subcategory.parent_id = broad.id
                    WHERE article.status = 'published'
                ) AS article_count
            FROM public.categories AS broad
            WHERE broad.level = 'broad'
              AND broad.status = 'published'
        ) AS niches
    ),
    publication_trend AS (
        SELECT COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'date', buckets.bucket_start,
                    'count', (
                        SELECT COUNT(*)::INTEGER
                        FROM public.articles AS article
                        WHERE article.status = 'published'
                          AND article.published_at >= buckets.bucket_start
                          AND article.published_at < buckets.bucket_start + v_step
                    )
                )
                ORDER BY buckets.bucket_start
            ),
            '[]'::JSONB
        ) AS items
        FROM generate_series(
            date_trunc(v_unit, v_start),
            date_trunc(v_unit, NOW()),
            v_step
        ) AS buckets(bucket_start)
    ),
    recent_publications AS (
        SELECT COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', recent.id,
                    'title', recent.title,
                    'publishedAt', recent.published_at,
                    'author', COALESCE(recent.author_name, 'Unknown author'),
                    'niche', recent.niche_name
                )
                ORDER BY recent.published_at DESC
            ),
            '[]'::JSONB
        ) AS items
        FROM (
            SELECT
                article.id,
                article.title,
                article.published_at,
                profile.display_name AS author_name,
                broad.name AS niche_name
            FROM public.articles AS article
            LEFT JOIN public.profiles AS profile
                ON profile.id = article.author_id
            INNER JOIN public.categories AS micro
                ON micro.id = article.category_id
               AND micro.level = 'micro'
            INNER JOIN public.categories AS subcategory
                ON subcategory.id = micro.parent_id
               AND subcategory.level = 'subcategory'
            INNER JOIN public.categories AS broad
                ON broad.id = subcategory.parent_id
               AND broad.level = 'broad'
            WHERE article.status = 'published'
              AND article.published_at IS NOT NULL
              AND article.published_at <= NOW()
            ORDER BY article.published_at DESC
            LIMIT 6
        ) AS recent
    )
    SELECT jsonb_build_object(
        'range', p_range,
        'overview', (
            SELECT jsonb_build_object(
                'totalArticles', total_articles,
                'publishedArticles', published_articles,
                'drafts', drafts,
                'inReview', in_review,
                'scheduled', scheduled,
                'archived', archived,
                'registeredUsers', registered_users,
                'authors', authors,
                'activeComments', active_comments
            )
            FROM overview
        ),
        'status', (SELECT items FROM status_breakdown),
        'niches', (SELECT items FROM niche_breakdown),
        'trend', (SELECT items FROM publication_trend),
        'recentPublications', (SELECT items FROM recent_publications)
    )
    INTO v_result;

    RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_dashboard_analytics(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_get_dashboard_analytics(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_get_dashboard_analytics(TEXT) TO authenticated;

COMMIT;
