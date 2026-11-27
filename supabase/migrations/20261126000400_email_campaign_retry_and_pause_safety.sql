
BEGIN;

-- Explicitly retry failed deliveries only.
CREATE OR REPLACE FUNCTION public.admin_retry_failed_email_campaign(
    p_campaign_id UUID,
    p_actor_id UUID
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
    v_status TEXT;
    v_queued_count BIGINT;
BEGIN
    IF p_campaign_id IS NULL OR p_actor_id IS NULL THEN
        RAISE EXCEPTION 'Campaign and actor are required'
            USING ERRCODE = '22023';
    END IF;

    SELECT status
    INTO v_status
    FROM public.email_campaigns
    WHERE id = p_campaign_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Campaign not found'
            USING ERRCODE = 'P0002';
    END IF;

    IF v_status <> 'failed' THEN
        RAISE EXCEPTION 'Only failed campaigns can be retried'
            USING ERRCODE = '22023';
    END IF;

    -- Suppress failed deliveries whose subscribers are no longer eligible.
    UPDATE public.email_campaign_deliveries AS d
    SET
        status = 'suppressed',
        failure_reason = NULL,
        processing_started_at = NULL,
        processing_token = NULL
    FROM public.email_subscribers AS s
    WHERE d.campaign_id = p_campaign_id
      AND d.subscriber_id = s.id
      AND d.status = 'failed'
      AND (
          s.status <> 'subscribed'
          OR s.consent_at IS NULL
          OR s.confirmed_at IS NULL
          OR EXISTS (
              SELECT 1
              FROM public.email_suppressions AS suppression
              WHERE LOWER(BTRIM(suppression.email)) =
                    LOWER(BTRIM(s.email))
          )
      );

    -- Only explicitly retry eligible failed deliveries.
    UPDATE public.email_campaign_deliveries AS d
    SET
        status = 'queued',
        failed_at = NULL,
        failure_reason = NULL,
        processing_started_at = NULL,
        processing_token = NULL
    FROM public.email_subscribers AS s
    WHERE d.campaign_id = p_campaign_id
      AND d.subscriber_id = s.id
      AND d.status = 'failed'
      AND s.status = 'subscribed'
      AND s.consent_at IS NOT NULL
      AND s.confirmed_at IS NOT NULL
      AND NOT EXISTS (
          SELECT 1
          FROM public.email_suppressions AS suppression
          WHERE LOWER(BTRIM(suppression.email)) =
                LOWER(BTRIM(s.email))
      );

    GET DIAGNOSTICS v_queued_count = ROW_COUNT;

    UPDATE public.email_campaigns
    SET
        status = 'sending',
        completed_at = NULL,
        updated_by = p_actor_id
    WHERE id = p_campaign_id;

    -- If nothing remains eligible, complete the campaign immediately.
    IF v_queued_count = 0 THEN
        PERFORM public.admin_complete_email_campaign(p_campaign_id);
    END IF;

    RETURN v_queued_count;
END;
$$;

-- Prevent delivery workers from claiming anything unless the campaign
-- is currently in the sending state.
CREATE OR REPLACE FUNCTION public.admin_claim_email_campaign_deliveries(
    p_campaign_id UUID,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    delivery_id UUID,
    subscriber_id UUID,
    email TEXT,
    display_name TEXT,
    processing_token UUID,
    attempt_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
    v_campaign_status TEXT;
BEGIN
    IF p_campaign_id IS NULL
       OR p_limit IS NULL
       OR p_limit < 1
       OR p_limit > 50 THEN
        RAISE EXCEPTION 'Invalid campaign or batch size'
            USING ERRCODE = '22023';
    END IF;

    SELECT c.status
    INTO v_campaign_status
    FROM public.email_campaigns AS c
    WHERE c.id = p_campaign_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Campaign not found'
            USING ERRCODE = 'P0002';
    END IF;

    -- Paused, cancelled, failed and completed campaigns cannot claim work.
    IF v_campaign_status <> 'sending' THEN
        RETURN;
    END IF;

    UPDATE public.email_campaign_deliveries AS d
    SET
        status = 'suppressed',
        processing_started_at = NULL,
        processing_token = NULL
    FROM public.email_subscribers AS s
    WHERE d.campaign_id = p_campaign_id
      AND d.subscriber_id = s.id
      AND (
          d.status = 'queued'
          OR (
              d.status = 'processing'
              AND d.processing_started_at <
                  NOW() - INTERVAL '10 minutes'
          )
      )
      AND (
          s.status <> 'subscribed'
          OR s.consent_at IS NULL
          OR s.confirmed_at IS NULL
          OR EXISTS (
              SELECT 1
              FROM public.email_suppressions AS suppression
              WHERE LOWER(BTRIM(suppression.email)) =
                    LOWER(BTRIM(s.email))
          )
      );

    RETURN QUERY
    WITH candidates AS (
        SELECT d.id
        FROM public.email_campaign_deliveries AS d
        JOIN public.email_subscribers AS s
          ON s.id = d.subscriber_id
        WHERE d.campaign_id = p_campaign_id
          AND (
              d.status = 'queued'
              OR (
                  d.status = 'processing'
                  AND d.processing_started_at <
                      NOW() - INTERVAL '10 minutes'
              )
          )
          AND s.status = 'subscribed'
          AND s.consent_at IS NOT NULL
          AND s.confirmed_at IS NOT NULL
          AND NOT EXISTS (
              SELECT 1
              FROM public.email_suppressions AS suppression
              WHERE LOWER(BTRIM(suppression.email)) =
                    LOWER(BTRIM(s.email))
          )
        ORDER BY d.created_at, d.id
        FOR UPDATE OF d SKIP LOCKED
        LIMIT p_limit
    ),
    claimed AS (
        UPDATE public.email_campaign_deliveries AS d
        SET
            status = 'processing',
            processing_started_at = NOW(),
            processing_token = gen_random_uuid(),
            attempt_count = d.attempt_count + 1
        FROM candidates
        WHERE d.id = candidates.id
        RETURNING
            d.id,
            d.subscriber_id,
            d.processing_token,
            d.attempt_count
    )
    SELECT
        claimed.id,
        s.id,
        s.email,
        s.display_name,
        claimed.processing_token,
        claimed.attempt_count
    FROM claimed
    JOIN public.email_subscribers AS s
      ON s.id = claimed.subscriber_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_retry_failed_email_campaign(UUID, UUID)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_retry_failed_email_campaign(UUID, UUID)
TO service_role;

REVOKE ALL ON FUNCTION public.admin_claim_email_campaign_deliveries(UUID, INTEGER)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_claim_email_campaign_deliveries(UUID, INTEGER)
TO service_role;

COMMIT;
