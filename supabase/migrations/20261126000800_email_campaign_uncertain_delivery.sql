
BEGIN;

-- ---------------------------------------------------------
-- 1. ADD UNCERTAIN CAMPAIGN AND DELIVERY STATES
-- ---------------------------------------------------------

ALTER TABLE public.email_campaigns
    DROP CONSTRAINT IF EXISTS email_campaigns_status_check;

ALTER TABLE public.email_campaigns
    ADD CONSTRAINT email_campaigns_status_check
    CHECK (status IN (
        'draft',
        'pending_review',
        'scheduled',
        'sending',
        'sent',
        'paused',
        'cancelled',
        'failed',
        'needs_review'
    ));

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
        'suppressed',
        'uncertain'
    ));

-- ---------------------------------------------------------
-- 2. AUDIT MANUAL DELIVERY RESOLUTIONS
-- ---------------------------------------------------------

CREATE TABLE public.email_delivery_resolution_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    delivery_id UUID NOT NULL
        REFERENCES public.email_campaign_deliveries(id)
        ON DELETE RESTRICT,

    campaign_id UUID NOT NULL
        REFERENCES public.email_campaigns(id)
        ON DELETE RESTRICT,

    actor_id UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    previous_status TEXT NOT NULL,
    new_status TEXT NOT NULL,

    resolution_note TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT email_delivery_resolution_note_check
        CHECK (
            LENGTH(BTRIM(resolution_note)) >= 10
            AND LENGTH(resolution_note) <= 1000
        ),

    CONSTRAINT email_delivery_resolution_status_check
        CHECK (
            previous_status = 'uncertain'
            AND new_status = 'failed'
        )
);

CREATE INDEX email_delivery_resolution_campaign_idx
ON public.email_delivery_resolution_events (
    campaign_id,
    created_at DESC
);

CREATE INDEX email_delivery_resolution_delivery_idx
ON public.email_delivery_resolution_events (
    delivery_id,
    created_at DESC
);

ALTER TABLE public.email_delivery_resolution_events
    ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.email_delivery_resolution_events
FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT ON public.email_delivery_resolution_events
TO service_role;

-- ---------------------------------------------------------
-- 3. PREVENT AUDIT HISTORY MODIFICATION
-- ---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prevent_email_delivery_resolution_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
    RAISE EXCEPTION 'Delivery resolution history is immutable'
        USING ERRCODE = '42501';
END;
$$;

CREATE TRIGGER email_delivery_resolution_immutable
BEFORE UPDATE OR DELETE
ON public.email_delivery_resolution_events
FOR EACH ROW
EXECUTE FUNCTION public.prevent_email_delivery_resolution_mutation();

-- ---------------------------------------------------------
-- 4. UPDATE DELIVERY RESULT RECORDING
-- ---------------------------------------------------------

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
       OR p_status NOT IN (
           'sent',
           'failed',
           'suppressed',
           'uncertain'
       ) THEN
        RAISE EXCEPTION 'Invalid delivery result'
            USING ERRCODE = '22023';
    END IF;

    UPDATE public.email_campaign_deliveries
    SET
        status = p_status,

        provider_message_id = CASE
            WHEN p_status IN ('sent', 'uncertain')
                 AND NULLIF(BTRIM(p_provider_message_id), '') IS NOT NULL
                THEN BTRIM(p_provider_message_id)
            ELSE provider_message_id
        END,

        sent_at = CASE
            WHEN p_status = 'sent'
                THEN COALESCE(sent_at, NOW())
            ELSE sent_at
        END,

        failed_at = CASE
            WHEN p_status = 'failed'
                THEN NOW()
            ELSE failed_at
        END,

        failure_reason = CASE
            WHEN p_status IN ('failed', 'uncertain')
                THEN LEFT(
                    COALESCE(
                        p_failure_reason,
                        'Delivery outcome requires review.'
                    ),
                    1000
                )
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

-- ---------------------------------------------------------
-- 5. UPDATE CAMPAIGN COMPLETION
-- ---------------------------------------------------------

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
    v_has_uncertain BOOLEAN;
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
          AND status = 'uncertain'
    )
    INTO v_has_uncertain;

    IF v_has_uncertain THEN
        UPDATE public.email_campaigns
        SET
            status = 'needs_review',
            completed_at = NOW()
        WHERE id = p_campaign_id;

        RETURN 'needs_review';
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.email_campaign_deliveries
        WHERE campaign_id = p_campaign_id
          AND status = 'failed'
    )
    INTO v_has_failures;

    v_status := CASE
        WHEN v_has_failures THEN 'failed'
        ELSE 'sent'
    END;

    UPDATE public.email_campaigns
    SET
        status = v_status,
        completed_at = NOW()
    WHERE id = p_campaign_id;

    RETURN v_status;
END;
$$;

-- ---------------------------------------------------------
-- 6. CHANGE EXPIRED PROCESSING LEASES TO UNCERTAIN
-- ---------------------------------------------------------

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

    IF v_campaign_status <> 'sending' THEN
        RETURN;
    END IF;

    -- An expired worker lease is NOT proof that Resend
    -- rejected the request. Never automatically resend it.
    UPDATE public.email_campaign_deliveries
    SET
        status = 'uncertain',
        failure_reason =
            'Processing lease expired. Provider acceptance could not be confirmed.',
        processing_started_at = NULL,
        processing_token = NULL
    WHERE campaign_id = p_campaign_id
      AND status = 'processing'
      AND processing_started_at <
          NOW() - INTERVAL '10 minutes';

    -- Suppress queued deliveries whose subscribers are no longer eligible.
    UPDATE public.email_campaign_deliveries AS d
    SET status = 'suppressed'
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

    -- Only genuinely queued, eligible deliveries may be claimed.
    RETURN QUERY
    WITH candidates AS (
        SELECT d.id
        FROM public.email_campaign_deliveries AS d
        JOIN public.email_subscribers AS s
          ON s.id = d.subscriber_id
        WHERE d.campaign_id = p_campaign_id
          AND d.status = 'queued'
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

-- ---------------------------------------------------------
-- 7. ADMIN RESOLUTION OF UNCERTAIN DELIVERIES
-- ---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_resolve_uncertain_email_delivery(
    p_delivery_id UUID,
    p_actor_id UUID,
    p_resolution_note TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
    v_campaign_id UUID;
    v_delivery_status TEXT;
    v_campaign_status TEXT;
BEGIN
    IF p_delivery_id IS NULL
       OR p_actor_id IS NULL
       OR p_resolution_note IS NULL
       OR LENGTH(BTRIM(p_resolution_note)) < 10
       OR LENGTH(p_resolution_note) > 1000 THEN
        RAISE EXCEPTION 'Invalid delivery resolution'
            USING ERRCODE = '22023';
    END IF;

    -- Determine the campaign before acquiring locks.
    SELECT d.campaign_id
    INTO v_campaign_id
    FROM public.email_campaign_deliveries AS d
    WHERE d.id = p_delivery_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Delivery not found'
            USING ERRCODE = 'P0002';
    END IF;

    -- Preserve campaign-before-delivery lock ordering.
    PERFORM 1
    FROM public.email_campaigns AS c
    WHERE c.id = v_campaign_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Campaign not found'
            USING ERRCODE = 'P0002';
    END IF;

    SELECT d.status
    INTO v_delivery_status
    FROM public.email_campaign_deliveries AS d
    WHERE d.id = p_delivery_id
    FOR UPDATE;

    IF v_delivery_status <> 'uncertain' THEN
        RAISE EXCEPTION 'Delivery is not awaiting resolution'
            USING ERRCODE = '55000';
    END IF;

    -- This resolution means an administrator has verified
    -- that Resend did not accept the original request.
    UPDATE public.email_campaign_deliveries
    SET
        status = 'failed',
        failed_at = NOW(),
        failure_reason = LEFT(BTRIM(p_resolution_note), 1000),
        processing_started_at = NULL,
        processing_token = NULL
    WHERE id = p_delivery_id;

    INSERT INTO public.email_delivery_resolution_events (
        delivery_id,
        campaign_id,
        actor_id,
        previous_status,
        new_status,
        resolution_note
    )
    VALUES (
        p_delivery_id,
        v_campaign_id,
        p_actor_id,
        'uncertain',
        'failed',
        BTRIM(p_resolution_note)
    );

    v_campaign_status :=
        public.admin_complete_email_campaign(v_campaign_id);

    RETURN v_campaign_status;
END;
$$;

-- ---------------------------------------------------------
-- 8. RESTRICT PRIVILEGED FUNCTIONS
-- ---------------------------------------------------------

REVOKE ALL ON FUNCTION public.admin_record_email_delivery_result(
    UUID, UUID, TEXT, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.admin_complete_email_campaign(UUID)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.admin_claim_email_campaign_deliveries(
    UUID, INTEGER
) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.admin_resolve_uncertain_email_delivery(
    UUID, UUID, TEXT
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_record_email_delivery_result(
    UUID, UUID, TEXT, TEXT, TEXT
) TO service_role;

GRANT EXECUTE ON FUNCTION public.admin_complete_email_campaign(UUID)
TO service_role;

GRANT EXECUTE ON FUNCTION public.admin_claim_email_campaign_deliveries(
    UUID, INTEGER
) TO service_role;

GRANT EXECUTE ON FUNCTION public.admin_resolve_uncertain_email_delivery(
    UUID, UUID, TEXT
) TO service_role;

COMMIT;
