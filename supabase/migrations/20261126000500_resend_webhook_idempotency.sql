
BEGIN;

-- Store minimal webhook metadata. Do not store full provider payloads,
-- which may contain unnecessary personal information.
CREATE TABLE IF NOT EXISTS public.email_provider_webhook_events (
    event_id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    provider_message_id TEXT,
    recipient_email TEXT,
    occurred_at TIMESTAMPTZ,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.email_provider_webhook_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.email_provider_webhook_events
FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.email_provider_webhook_events
TO service_role;

CREATE INDEX IF NOT EXISTS email_provider_webhook_message_idx
ON public.email_provider_webhook_events (provider_message_id)
WHERE provider_message_id IS NOT NULL;

-- Process one verified Resend webhook event atomically.
-- The API must verify the Resend signature before calling this function.
CREATE OR REPLACE FUNCTION public.admin_process_resend_webhook_event(
    p_event_id TEXT,
    p_event_type TEXT,
    p_provider_message_id TEXT DEFAULT NULL,
    p_recipient_email TEXT DEFAULT NULL,
    p_occurred_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
    v_inserted_event_id TEXT;
    v_email TEXT;
    v_suppression_reason TEXT;
BEGIN
    IF p_event_id IS NULL
       OR LENGTH(BTRIM(p_event_id)) < 1
       OR LENGTH(p_event_id) > 255
       OR p_event_type IS NULL
       OR LENGTH(BTRIM(p_event_type)) < 1
       OR LENGTH(p_event_type) > 100 THEN
        RAISE EXCEPTION 'Invalid webhook event'
            USING ERRCODE = '22023';
    END IF;

    v_email := NULLIF(LOWER(BTRIM(p_recipient_email)), '');

    IF v_email IS NOT NULL AND LENGTH(v_email) > 254 THEN
        RAISE EXCEPTION 'Invalid recipient email'
            USING ERRCODE = '22023';
    END IF;

    -- Event IDs are unique. A duplicate event is a successful no-op.
    INSERT INTO public.email_provider_webhook_events (
        event_id,
        event_type,
        provider_message_id,
        recipient_email,
        occurred_at
    )
    VALUES (
        p_event_id,
        p_event_type,
        NULLIF(BTRIM(p_provider_message_id), ''),
        v_email,
        p_occurred_at
    )
    ON CONFLICT (event_id) DO NOTHING
    RETURNING event_id INTO v_inserted_event_id;

    IF v_inserted_event_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Map provider events to delivery status without allowing
    -- delayed events to overwrite a more advanced delivery state.
    IF NULLIF(BTRIM(p_provider_message_id), '') IS NOT NULL THEN
        UPDATE public.email_campaign_deliveries AS d
        SET
            status = CASE
                WHEN p_event_type = 'email.complained'
                    THEN 'complained'
                WHEN p_event_type = 'email.bounced'
                    THEN CASE
                        WHEN d.status = 'complained' THEN 'complained'
                        ELSE 'bounced'
                    END
                WHEN p_event_type = 'email.clicked'
                    THEN CASE
                        WHEN d.status IN ('bounced', 'complained')
                            THEN d.status
                        ELSE 'clicked'
                    END
                WHEN p_event_type = 'email.opened'
                    THEN CASE
                        WHEN d.status IN ('bounced', 'complained', 'clicked')
                            THEN d.status
                        ELSE 'opened'
                    END
                WHEN p_event_type = 'email.delivered'
                    THEN CASE
                        WHEN d.status IN ('bounced', 'complained', 'clicked', 'opened')
                            THEN d.status
                        ELSE 'delivered'
                    END
                WHEN p_event_type = 'email.sent'
                    THEN CASE
                        WHEN d.status IN ('bounced', 'complained', 'clicked', 'opened', 'delivered')
                            THEN d.status
                        ELSE 'sent'
                    END
                WHEN p_event_type = 'email.failed'
                    THEN CASE
                        WHEN d.status IN ('bounced', 'complained', 'clicked', 'opened', 'delivered')
                            THEN d.status
                        ELSE 'failed'
                    END
                ELSE d.status
            END,
            delivered_at = CASE
                WHEN p_event_type = 'email.delivered'
                    THEN COALESCE(d.delivered_at, p_occurred_at, NOW())
                ELSE d.delivered_at
            END,
            opened_at = CASE
                WHEN p_event_type = 'email.opened'
                    THEN COALESCE(d.opened_at, p_occurred_at, NOW())
                ELSE d.opened_at
            END,
            clicked_at = CASE
                WHEN p_event_type = 'email.clicked'
                    THEN COALESCE(d.clicked_at, p_occurred_at, NOW())
                ELSE d.clicked_at
            END,
            failed_at = CASE
                WHEN p_event_type = 'email.failed'
                    THEN COALESCE(d.failed_at, p_occurred_at, NOW())
                ELSE d.failed_at
            END,
            failure_reason = CASE
                WHEN p_event_type = 'email.failed'
                    THEN COALESCE(d.failure_reason, 'Resend reported email.failed')
                ELSE d.failure_reason
            END
        WHERE d.provider_message_id = BTRIM(p_provider_message_id);
    END IF;

    -- Hard bounces and complaints must suppress the recipient.
    IF p_event_type IN ('email.bounced', 'email.complained')
       AND v_email IS NOT NULL THEN

        v_suppression_reason := CASE
            WHEN p_event_type = 'email.complained'
                THEN 'spam_complaint'
            ELSE 'hard_bounce'
        END;

        INSERT INTO public.email_suppressions (
            email,
            reason,
            source
        )
        VALUES (
            v_email,
            v_suppression_reason,
            'resend_webhook'
        )
        ON CONFLICT (LOWER(BTRIM(email))) DO NOTHING;

        UPDATE public.email_subscribers
        SET
            status = 'suppressed',
            updated_at = NOW()
        WHERE LOWER(BTRIM(email)) = v_email
          AND status <> 'unsubscribed';

        -- Prevent future batches from sending to this recipient.
        -- Any already-submitted provider request cannot be recalled.
        UPDATE public.email_campaign_deliveries AS d
        SET
            status = 'suppressed',
            processing_started_at = NULL,
            processing_token = NULL
        FROM public.email_subscribers AS s
        WHERE d.subscriber_id = s.id
          AND LOWER(BTRIM(s.email)) = v_email
          AND d.status IN ('queued', 'processing');
    END IF;

    RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_process_resend_webhook_event(
    TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ
)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_process_resend_webhook_event(
    TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ
)
TO service_role;

COMMIT;
