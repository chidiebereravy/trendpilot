
BEGIN;

-- Process one verified Resend webhook event atomically.
-- Duplicate event IDs remain successful no-ops.
-- Provider events can resolve uncertain deliveries because a
-- matching provider message ID is evidence of provider acceptance.

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
       OR p_event_type NOT IN (
           'email.sent',
           'email.delivered',
           'email.opened',
           'email.clicked',
           'email.bounced',
           'email.complained',
           'email.failed'
       ) THEN
        RAISE EXCEPTION 'Invalid webhook event'
            USING ERRCODE = '22023';
    END IF;

    v_email := NULLIF(LOWER(BTRIM(p_recipient_email)), '');

    IF v_email IS NOT NULL AND LENGTH(v_email) > 254 THEN
        RAISE EXCEPTION 'Invalid recipient email'
            USING ERRCODE = '22023';
    END IF;

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
                        WHEN d.status IN (
                            'bounced',
                            'complained',
                            'clicked'
                        ) THEN d.status
                        ELSE 'opened'
                    END

                WHEN p_event_type = 'email.delivered'
                    THEN CASE
                        WHEN d.status IN (
                            'bounced',
                            'complained',
                            'clicked',
                            'opened'
                        ) THEN d.status
                        ELSE 'delivered'
                    END

                WHEN p_event_type = 'email.sent'
                    THEN CASE
                        WHEN d.status IN (
                            'bounced',
                            'complained',
                            'clicked',
                            'opened',
                            'delivered'
                        ) THEN d.status
                        ELSE 'sent'
                    END

                WHEN p_event_type = 'email.failed'
                    THEN CASE
                        WHEN d.status IN (
                            'sent',
                            'delivered',
                            'opened',
                            'clicked',
                            'bounced',
                            'complained'
                        ) THEN d.status
                        ELSE 'failed'
                    END

                ELSE d.status
            END,

            sent_at = CASE
                WHEN p_event_type IN (
                    'email.sent',
                    'email.delivered',
                    'email.opened',
                    'email.clicked',
                    'email.bounced',
                    'email.complained'
                )
                    THEN COALESCE(d.sent_at, p_occurred_at, NOW())
                ELSE d.sent_at
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
                    THEN COALESCE(
                        d.failure_reason,
                        'Resend reported email.failed'
                    )
                WHEN p_event_type IN (
                    'email.sent',
                    'email.delivered',
                    'email.opened',
                    'email.clicked',
                    'email.bounced',
                    'email.complained'
                )
                    THEN NULL
                ELSE d.failure_reason
            END,

            -- A verified provider event resolves any stale worker lease.
            processing_started_at = NULL,
            processing_token = NULL

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

        -- Do not overwrite uncertain deliveries here: their provider
        -- outcome must be resolved using their own provider message ID.
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
