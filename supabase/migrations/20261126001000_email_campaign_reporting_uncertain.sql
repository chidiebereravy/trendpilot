CREATE OR REPLACE FUNCTION public.admin_get_email_campaign_report(
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to TIMESTAMPTZ DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'Invalid report limit';
  END IF;

  IF p_offset < 0 THEN
    RAISE EXCEPTION 'Invalid report offset';
  END IF;

  IF p_from IS NOT NULL AND p_to IS NOT NULL AND p_from >= p_to THEN
    RAISE EXCEPTION 'Invalid report date range';
  END IF;

  RETURN (
    WITH filtered_campaigns AS (
      SELECT
        id,
        name,
        subject,
        status,
        created_at,
        started_at,
        completed_at
      FROM public.email_campaigns
      WHERE (p_from IS NULL OR created_at >= p_from)
        AND (p_to IS NULL OR created_at < p_to)
    ),
    delivery_metrics AS (
      SELECT
        d.campaign_id,
        COUNT(*)::BIGINT AS total_recipients,

        COUNT(*) FILTER (
          WHERE d.sent_at IS NOT NULL
             OR d.status IN (
               'sent', 'delivered', 'opened', 'clicked',
               'bounced', 'complained'
             )
        )::BIGINT AS sent,

        COUNT(*) FILTER (
          WHERE d.delivered_at IS NOT NULL
             OR d.status IN (
               'delivered', 'opened', 'clicked', 'complained'
             )
        )::BIGINT AS delivered,

        COUNT(*) FILTER (
          WHERE d.opened_at IS NOT NULL
             OR d.status IN ('opened', 'clicked')
        )::BIGINT AS opened,

        COUNT(*) FILTER (
          WHERE d.clicked_at IS NOT NULL
             OR d.status = 'clicked'
        )::BIGINT AS clicked,

        COUNT(*) FILTER (
          WHERE d.status = 'bounced'
        )::BIGINT AS bounced,

        COUNT(*) FILTER (
          WHERE d.status = 'complained'
        )::BIGINT AS complained,

        COUNT(*) FILTER (
          WHERE d.status = 'failed'
        )::BIGINT AS failed,

        COUNT(*) FILTER (
          WHERE d.status = 'uncertain'
        )::BIGINT AS uncertain,

        COUNT(*) FILTER (
          WHERE d.status = 'suppressed'
        )::BIGINT AS suppressed,

        COUNT(*) FILTER (
          WHERE d.status IN ('queued', 'processing')
        )::BIGINT AS pending

      FROM public.email_campaign_deliveries d
      INNER JOIN filtered_campaigns fc
        ON fc.id = d.campaign_id
      GROUP BY d.campaign_id
    ),
    campaign_rows AS (
      SELECT
        fc.id,
        fc.name,
        fc.subject,
        fc.status,
        fc.created_at,
        fc.started_at,
        fc.completed_at,
        COALESCE(dm.total_recipients, 0) AS total_recipients,
        COALESCE(dm.sent, 0) AS sent,
        COALESCE(dm.delivered, 0) AS delivered,
        COALESCE(dm.opened, 0) AS opened,
        COALESCE(dm.clicked, 0) AS clicked,
        COALESCE(dm.bounced, 0) AS bounced,
        COALESCE(dm.complained, 0) AS complained,
        COALESCE(dm.failed, 0) AS failed,
        COALESCE(dm.uncertain, 0) AS uncertain,
        COALESCE(dm.suppressed, 0) AS suppressed,
        COALESCE(dm.pending, 0) AS pending
      FROM filtered_campaigns fc
      LEFT JOIN delivery_metrics dm
        ON dm.campaign_id = fc.id
    ),
    summary AS (
      SELECT
        COUNT(*)::BIGINT AS total_campaigns,
        COALESCE(SUM(total_recipients), 0)::BIGINT AS total_recipients,
        COALESCE(SUM(sent), 0)::BIGINT AS sent,
        COALESCE(SUM(delivered), 0)::BIGINT AS delivered,
        COALESCE(SUM(opened), 0)::BIGINT AS opened,
        COALESCE(SUM(clicked), 0)::BIGINT AS clicked,
        COALESCE(SUM(bounced), 0)::BIGINT AS bounced,
        COALESCE(SUM(complained), 0)::BIGINT AS complained,
        COALESCE(SUM(failed), 0)::BIGINT AS failed,
        COALESCE(SUM(uncertain), 0)::BIGINT AS uncertain,
        COALESCE(SUM(suppressed), 0)::BIGINT AS suppressed,
        COALESCE(SUM(pending), 0)::BIGINT AS pending
      FROM campaign_rows
    ),
    paged_campaigns AS (
      SELECT *
      FROM campaign_rows
      ORDER BY created_at DESC, id DESC
      LIMIT p_limit
      OFFSET p_offset
    )
    SELECT jsonb_build_object(
      'summary',
      (
        SELECT jsonb_build_object(
          'total_campaigns', total_campaigns,
          'total_recipients', total_recipients,
          'sent', sent,
          'delivered', delivered,
          'opened', opened,
          'clicked', clicked,
          'bounced', bounced,
          'complained', complained,
          'failed', failed,
          'uncertain', uncertain,
          'suppressed', suppressed,
          'pending', pending,
          'delivery_rate', ROUND(
            delivered::NUMERIC * 100 / NULLIF(sent, 0), 2
          ),
          'open_rate', ROUND(
            opened::NUMERIC * 100 / NULLIF(delivered, 0), 2
          ),
          'click_rate', ROUND(
            clicked::NUMERIC * 100 / NULLIF(delivered, 0), 2
          )
        )
        FROM summary
      ),
      'campaigns',
      (
        SELECT COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id', id,
              'name', name,
              'subject', subject,
              'status', status,
              'created_at', created_at,
              'started_at', started_at,
              'completed_at', completed_at,
              'total_recipients', total_recipients,
              'sent', sent,
              'delivered', delivered,
              'opened', opened,
              'clicked', clicked,
              'bounced', bounced,
              'complained', complained,
              'failed', failed,
              'uncertain', uncertain,
              'suppressed', suppressed,
              'pending', pending,
              'delivery_rate', ROUND(
                delivered::NUMERIC * 100 / NULLIF(sent, 0), 2
              ),
              'open_rate', ROUND(
                opened::NUMERIC * 100 / NULLIF(delivered, 0), 2
              ),
              'click_rate', ROUND(
                clicked::NUMERIC * 100 / NULLIF(delivered, 0), 2
              )
            )
            ORDER BY created_at DESC, id DESC
          ),
          '[]'::JSONB
        )
        FROM paged_campaigns
      ),
      'pagination',
      (
        SELECT jsonb_build_object(
          'total', total_campaigns,
          'limit', p_limit,
          'offset', p_offset
        )
        FROM summary
      )
    )
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_get_email_campaign_report(TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_get_email_campaign_report(TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER)
  TO service_role;
