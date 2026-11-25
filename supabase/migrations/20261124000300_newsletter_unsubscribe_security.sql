CREATE OR REPLACE FUNCTION public.unsubscribe_newsletter(
    p_token_hash TEXT
)
RETURNS TABLE (
    outcome TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
    v_subscriber_id UUID;
    v_email TEXT;
    v_token_expiry TIMESTAMPTZ;
    v_token_used_at TIMESTAMPTZ;
    v_status TEXT;
BEGIN
    IF p_token_hash IS NULL
       OR p_token_hash !~ '^[a-f0-9]{64}$' THEN
        RETURN QUERY SELECT 'invalid_token'::TEXT;
        RETURN;
    END IF;

    SELECT
        t.subscriber_id,
        t.expires_at,
        t.used_at
    INTO
        v_subscriber_id,
        v_token_expiry,
        v_token_used_at
    FROM public.email_unsubscribe_tokens AS t
    WHERE t.token_hash = p_token_hash
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'invalid_token'::TEXT;
        RETURN;
    END IF;

    IF v_token_used_at IS NOT NULL THEN
        RETURN QUERY SELECT 'already_processed'::TEXT;
        RETURN;
    END IF;

    IF v_token_expiry <= NOW() THEN
        RETURN QUERY SELECT 'expired_token'::TEXT;
        RETURN;
    END IF;

    SELECT
        s.email,
        s.status
    INTO
        v_email,
        v_status
    FROM public.email_subscribers AS s
    WHERE s.id = v_subscriber_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'invalid_token'::TEXT;
        RETURN;
    END IF;

    UPDATE public.email_unsubscribe_tokens
    SET used_at = NOW()
    WHERE token_hash = p_token_hash;

    IF v_status <> 'suppressed' AND v_status <> 'unsubscribed' THEN
    UPDATE public.email_subscribers
    SET
        status = 'unsubscribed',
        unsubscribed_at = COALESCE(unsubscribed_at, NOW())
    WHERE id = v_subscriber_id;
    END IF;

    IF v_status <> 'unsubscribed' THEN
        INSERT INTO public.email_consent_events (
            subscriber_id,
            event_type,
            consent_source,
            policy_version
        )
        VALUES (
            v_subscriber_id,
            'consent_withdrawn',
            'email_unsubscribe_link',
            'v1'
        );
    END IF;

    INSERT INTO public.email_suppressions (
        email,
        reason,
        source
    )
    VALUES (
        v_email,
        'unsubscribe',
        'email_unsubscribe_link'
    )
    ON CONFLICT (LOWER(BTRIM(email))) DO NOTHING;

    RETURN QUERY SELECT 'unsubscribed'::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.unsubscribe_newsletter(TEXT)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.unsubscribe_newsletter(TEXT)
TO service_role;