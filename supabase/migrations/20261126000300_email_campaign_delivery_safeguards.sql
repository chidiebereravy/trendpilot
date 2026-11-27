
-- TrendPilot: resumable email campaign delivery safeguards.
-- Existing subscriber, campaign, delivery and unsubscribe tables are reused.

BEGIN;

-- Add a processing state and lease metadata to existing deliveries.
ALTER TABLE public.email_campaign_deliveries
    ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS processing_token UUID;

ALTER TABLE public.email_campaign_deliveries
    DROP CONSTRAINT IF EXISTS email_campaign_deliveries_status_check;

ALTER TABLE public.email_campaign_deliveries
    ADD CONSTRAINT email_campaign_deliveries_status_check
    CHECK (status IN (
        'queued',
        'processing',
        'sent',
        'delivered',
        'opened',
        'clicked',
        'bounced',
        'complained',
        'failed',
        'suppressed'
    ));

ALTER TABLE public.email_campaign_deliveries
    ADD CONSTRAINT email_campaign_deliveries_attempt_count_check
    CHECK (attempt_count >= 0);

CREATE INDEX IF NOT EXISTS email_deliveries_processing_lease_idx
ON public.email_campaign_deliveries (
    campaign_id,
    processing_started_at
)
WHERE status = 'processing';

-- Prepare an eligible campaign and queue its recipients.
-- This function is service-role-only. The API must authenticate an admin
-- before calling it.

CREATE OR REPLACE FUNCTION public.admin_prepare_email_campaign(
    p_campaign_id UUID,
    p_actor_id UUID
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
    v_campaign_status TEXT;
    v_queued_count BIGINT;
BEGIN
    IF p_campaign_id IS NULL OR p_actor_id IS NULL THEN
        RAISE EXCEPTION 'Campaign and actor are required'
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

    IF v_campaign_status NOT IN (
        'draft',
        'pending_review',
        'scheduled',
        'sending',
        'paused',
        'failed'
    ) THEN
        RAISE EXCEPTION 'Campaign cannot be started in its current state'
            USING ERRCODE = '22023';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.email_campaigns AS c
        WHERE c.id = p_campaign_id
          AND (
              NULLIF(BTRIM(c.html_content), '') IS NOT NULL
              OR NULLIF(BTRIM(c.text_content), '') IS NOT NULL
          )
    ) THEN
        RAISE EXCEPTION 'Campaign content is required'
            USING ERRCODE = '22023';
    END IF;

    -- Queue only confirmed, consented, non-suppressed subscribers.
    INSERT INTO public.email_campaign_deliveries (
        campaign_id,
        subscriber_id,
        status
    )
    SELECT
        p_campaign_id,
        s.id,
        'queued'
    FROM public.email_subscribers AS s
    WHERE s.status = 'subscribed'
      AND s.consent_at IS NOT NULL
      AND s.confirmed_at IS NOT NULL
      AND NOT EXISTS (
          SELECT 1
          FROM public.email_suppressions AS suppression
          WHERE LOWER(BTRIM(suppression.email)) =
                LOWER(BTRIM(s.email))
      )
    ON CONFLICT (campaign_id, subscriber_id) DO NOTHING;

    -- Remove recipients from the queue if their eligibility has changed.
    UPDATE public.email_campaign_deliveries AS d
    SET
        status = 'suppressed',
        processing_started_at = NULL,
        processing_token = NULL
    FROM public.email_subscribers AS s
    WHERE d.campaign_id = p_campaign_id
      AND d.subscriber_id = s.id
      AND d.status = 'queued'
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

    UPDATE public.email_campaigns
    SET
        status = 'sending',
        started_at = COALESCE(started_at, NOW()),
        completed_at = NULL,
        updated_by = p_actor_id
    WHERE id = p_campaign_id;

    SELECT COUNT(*)
    INTO v_queued_count
    FROM public.email_campaign_deliveries
    WHERE campaign_id = p_campaign_id
      AND status = 'queued';

    RETURN v_queued_count;
END;
$$;

-- Claim a bounded batch. SKIP LOCKED prevents concurrent workers from
-- claiming the same delivery. Expired processing leases can be reclaimed.

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
BEGIN
    IF p_campaign_id IS NULL
       OR p_limit IS NULL
       OR p_limit < 1
       OR p_limit > 50 THEN
        RAISE EXCEPTION 'Invalid campaign or batch size'
            USING ERRCODE = '22023';
    END IF;

    -- Recheck eligibility before claiming, including previously claimed
    -- deliveries whose processing lease expired.
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

-- Record a result only if the worker still owns the processing lease.
-- This prevents a stale worker from overwriting a newer worker's result.

CREATE OR REPLACE FUNCTION public.admin_record_email_delivery_result(
    p_delivery_id UUID,
    p_processing_token UUID,
    p_status TEXT,
    p_provider_message_id TEXT DEFAULT NULL,
    p_failure_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
    v_updated INTEGER;
BEGIN
    IF p_delivery_id IS NULL
       OR p_processing_token IS NULL
       OR p_status NOT IN ('sent', 'failed', 'suppressed') THEN
        RAISE EXCEPTION 'Invalid delivery result'
            USING ERRCODE = '22023';
    END IF;

    UPDATE public.email_campaign_deliveries
    SET
        status = p_status,
        provider_message_id = CASE
            WHEN p_status = 'sent' THEN p_provider_message_id
            ELSE provider_message_id
        END,
        sent_at = CASE
            WHEN p_status = 'sent' THEN NOW()
            ELSE sent_at
        END,
        failed_at = CASE
            WHEN p_status = 'failed' THEN NOW()
            ELSE failed_at
        END,
        failure_reason = CASE
            WHEN p_status = 'failed'
                THEN LEFT(COALESCE(p_failure_reason, 'Delivery failed'), 1000)
            ELSE NULL
        END,
        processing_started_at = NULL,
        processing_token = NULL
    WHERE id = p_delivery_id
      AND status = 'processing'
      AND processing_token = p_processing_token;

    GET DIAGNOSTICS v_updated = ROW_COUNT;

    RETURN v_updated = 1;
END;
$$;

-- Mark a campaign complete only when no queued or processing deliveries remain.
-- Failed deliveries remain visible in the report.

CREATE OR REPLACE FUNCTION public.admin_complete_email_campaign(
    p_campaign_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
    v_status TEXT;
    v_has_pending BOOLEAN;
    v_has_failures BOOLEAN;
BEGIN
    SELECT c.status
    INTO v_status
    FROM public.email_campaigns AS c
    WHERE c.id = p_campaign_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Campaign not found'
            USING ERRCODE = 'P0002';
    END IF;

    IF v_status IN ('paused', 'cancelled') THEN
        RETURN v_status;
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.email_campaign_deliveries
        WHERE campaign_id = p_campaign_id
          AND status IN ('queued', 'processing')
    )
    INTO v_has_pending;

    IF v_has_pending THEN
        RETURN 'sending';
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.email_campaign_deliveries
        WHERE campaign_id = p_campaign_id
          AND status = 'failed'
    )
    INTO v_has_failures;

    v_status := CASE WHEN v_has_failures THEN 'failed' ELSE 'sent' END;

    UPDATE public.email_campaigns
    SET
        status = v_status,
        completed_at = NOW()
    WHERE id = p_campaign_id;

    RETURN v_status;
END;
$$;

-- No direct execution by public, anonymous or authenticated clients.
REVOKE ALL ON FUNCTION public.admin_prepare_email_campaign(UUID, UUID)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.admin_claim_email_campaign_deliveries(UUID, INTEGER)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.admin_record_email_delivery_result(
    UUID, UUID, TEXT, TEXT, TEXT
)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.admin_complete_email_campaign(UUID)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_prepare_email_campaign(UUID, UUID)
TO service_role;

GRANT EXECUTE ON FUNCTION public.admin_claim_email_campaign_deliveries(UUID, INTEGER)
TO service_role;

GRANT EXECUTE ON FUNCTION public.admin_record_email_delivery_result(
    UUID, UUID, TEXT, TEXT, TEXT
)
TO service_role;

GRANT EXECUTE ON FUNCTION public.admin_complete_email_campaign(UUID)
TO service_role;

COMMIT;
