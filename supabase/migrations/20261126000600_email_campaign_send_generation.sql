
BEGIN;

-- Distinguish automatic recovery from an intentional failed-delivery retry.
ALTER TABLE public.email_campaign_deliveries
ADD COLUMN IF NOT EXISTS send_generation INTEGER NOT NULL DEFAULT 1;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'email_campaign_delivery_send_generation_positive'
          AND conrelid = 'public.email_campaign_deliveries'::regclass
    ) THEN
        ALTER TABLE public.email_campaign_deliveries
        ADD CONSTRAINT email_campaign_delivery_send_generation_positive
        CHECK (send_generation >= 1);
    END IF;
END;
$$;

-- Link a verified Resend webhook to its delivery even if the provider
-- message ID has not yet been saved by the sender.
CREATE OR REPLACE FUNCTION public.admin_link_email_delivery_provider_message(
    p_delivery_id UUID,
    p_provider_message_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
    v_updated_count INTEGER;
BEGIN
    IF p_delivery_id IS NULL
       OR p_provider_message_id IS NULL
       OR LENGTH(BTRIM(p_provider_message_id)) < 1
       OR LENGTH(BTRIM(p_provider_message_id)) > 255 THEN
        RAISE EXCEPTION 'Invalid delivery or provider message ID'
            USING ERRCODE = '22023';
    END IF;

    UPDATE public.email_campaign_deliveries
    SET
        provider_message_id = COALESCE(
            provider_message_id,
            BTRIM(p_provider_message_id)
        )
    WHERE id = p_delivery_id
      AND (
          provider_message_id IS NULL
          OR provider_message_id = BTRIM(p_provider_message_id)
      );

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    RETURN v_updated_count = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_link_email_delivery_provider_message(
    UUID, TEXT
)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_link_email_delivery_provider_message(
    UUID, TEXT
)
TO service_role;

-- Explicit retry increments the generation, producing a fresh provider
-- idempotency key. Eligibility and suppression rules remain unchanged.
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

    UPDATE public.email_campaign_deliveries AS d
    SET
        status = 'queued',
        send_generation = d.send_generation + 1,
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

    IF v_queued_count = 0 THEN
        PERFORM public.admin_complete_email_campaign(p_campaign_id);
    END IF;

    RETURN v_queued_count;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_retry_failed_email_campaign(UUID, UUID)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_retry_failed_email_campaign(UUID, UUID)
TO service_role;

COMMIT;
