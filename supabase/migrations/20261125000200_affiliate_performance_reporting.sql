BEGIN;

CREATE OR REPLACE FUNCTION public.get_affiliate_performance(
  p_user_id uuid,
  p_is_admin boolean,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'A valid user ID is required.'
      USING ERRCODE = '22023';
  END IF;

  IF p_is_admin IS NULL THEN
    RAISE EXCEPTION 'A valid admin scope is required.'
      USING ERRCODE = '22023';
  END IF;

  IF p_start_date IS NOT NULL
     AND p_end_date IS NOT NULL
     AND p_start_date >= p_end_date THEN
    RAISE EXCEPTION 'The start date must be earlier than the end date.'
      USING ERRCODE = '22023';
  END IF;

  WITH scoped_links AS (
    SELECT l.id
    FROM public.affiliate_links AS l
    WHERE p_is_admin IS TRUE
       OR l.created_by = p_user_id
  ),
  click_metrics AS (
    SELECT
      COUNT(*)::bigint AS total_clicks,
      COUNT(*) FILTER (
        WHERE e.article_id IS NOT NULL
      )::bigint AS article_clicks
    FROM public.affiliate_click_events AS e
    INNER JOIN scoped_links AS l
      ON l.id = e.affiliate_link_id
    WHERE (p_start_date IS NULL OR e.clicked_at >= p_start_date)
      AND (p_end_date IS NULL OR e.clicked_at < p_end_date)
  ),
  conversion_metrics AS (
    SELECT
      COUNT(*)::bigint AS total_conversions,
      COUNT(*) FILTER (WHERE c.status = 'pending')::bigint AS pending,
      COUNT(*) FILTER (WHERE c.status = 'confirmed')::bigint AS confirmed,
      COUNT(*) FILTER (WHERE c.status = 'rejected')::bigint AS rejected,
      COUNT(*) FILTER (WHERE c.status = 'reversed')::bigint AS reversed
    FROM public.affiliate_conversions AS c
    INNER JOIN scoped_links AS l
      ON l.id = c.affiliate_link_id
    WHERE (p_start_date IS NULL OR c.occurred_at >= p_start_date)
      AND (p_end_date IS NULL OR c.occurred_at < p_end_date)
  ),
  commission_metrics AS (
    SELECT
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'currency', totals.currency,
            'status', totals.status,
            'record_count', totals.record_count,
            'total_amount', totals.total_amount
          )
          ORDER BY totals.currency, totals.status
        ),
        '[]'::jsonb
      ) AS totals
    FROM (
      SELECT
        cr.currency,
        cr.status,
        COUNT(*)::bigint AS record_count,
        SUM(cr.amount) AS total_amount
      FROM public.affiliate_commission_records AS cr
      INNER JOIN public.affiliate_conversions AS c
        ON c.id = cr.conversion_id
      INNER JOIN scoped_links AS l
        ON l.id = c.affiliate_link_id
      WHERE (p_start_date IS NULL OR c.occurred_at >= p_start_date)
        AND (p_end_date IS NULL OR c.occurred_at < p_end_date)
      GROUP BY cr.currency, cr.status
    ) AS totals
  )
  SELECT jsonb_build_object(
    'clicks', jsonb_build_object(
      'total', click_metrics.total_clicks,
      'article', click_metrics.article_clicks,
      'other', click_metrics.total_clicks - click_metrics.article_clicks
    ),
    'conversions', jsonb_build_object(
      'total', conversion_metrics.total_conversions,
      'pending', conversion_metrics.pending,
      'confirmed', conversion_metrics.confirmed,
      'rejected', conversion_metrics.rejected,
      'reversed', conversion_metrics.reversed
    ),
    'commissions', commission_metrics.totals
  )
  INTO v_result
  FROM click_metrics
  CROSS JOIN conversion_metrics
  CROSS JOIN commission_metrics;

  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_affiliate_performance(
  uuid, boolean, timestamptz, timestamptz
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_affiliate_performance(
  uuid, boolean, timestamptz, timestamptz
) TO service_role;

COMMIT;