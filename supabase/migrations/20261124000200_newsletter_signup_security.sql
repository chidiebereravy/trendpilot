
-- ============================================================
-- TrendPilot Newsletter Signup Security
-- Adds persistent rate limiting and atomic signup handling.
-- Existing newsletter tables are intentionally unchanged.
-- ============================================================

-- 1. Persistent rate-limit storage.
-- Only keyed HMAC fingerprints are stored, never raw IPs/emails.

CREATE TABLE IF NOT EXISTS public.email_signup_rate_limits (
  key_type text NOT NULL
    CHECK (key_type IN ('ip', 'email')),
  key_hash text NOT NULL
    CHECK (key_hash ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0
    CHECK (attempts >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (key_type, key_hash)
);

ALTER TABLE public.email_signup_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.email_signup_rate_limits
  FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.email_signup_rate_limits
  TO service_role;


-- 2. Atomic public-signup operation.
-- The function is callable only by service_role.
-- Limits: 5 attempts per IP/hour and 3 per email/hour.

CREATE OR REPLACE FUNCTION public.register_newsletter_signup(
  p_email text,
  p_display_name text,
  p_ip_hash text,
  p_email_hash text,
  p_policy_version text DEFAULT 'v1'
)
RETURNS TABLE (
  outcome text,
  subscriber_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_email text;
  v_ip_attempts integer;
  v_email_attempts integer;
  v_subscriber_id uuid;
  v_subscriber_status text;
BEGIN
  v_email := lower(btrim(p_email));

  IF v_email IS NULL
    OR length(v_email) > 254
    OR v_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  THEN
    RAISE EXCEPTION 'Invalid newsletter email address'
      USING ERRCODE = '22023';
  END IF;

  IF p_ip_hash IS NULL
    OR p_ip_hash !~ '^[a-f0-9]{64}$'
    OR p_email_hash IS NULL
    OR p_email_hash !~ '^[a-f0-9]{64}$'
  THEN
    RAISE EXCEPTION 'Invalid signup fingerprint'
      USING ERRCODE = '22023';
  END IF;

  IF p_policy_version IS NULL
    OR length(p_policy_version) > 40
  THEN
    RAISE EXCEPTION 'Invalid consent policy version'
      USING ERRCODE = '22023';
  END IF;

    IF p_display_name IS NOT NULL
    AND length(btrim(p_display_name)) > 80
  THEN
    RAISE EXCEPTION 'Invalid newsletter display name'
      USING ERRCODE = '22023';
  END IF;

  IF length(btrim(p_policy_version)) = 0 THEN
    RAISE EXCEPTION 'Invalid consent policy version'
      USING ERRCODE = '22023';
  END IF;

  -- Serialize attempts for this email to avoid concurrent duplicates.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_email, 731904));

  -- IP rate limit: 5 attempts per rolling one-hour window.
  INSERT INTO public.email_signup_rate_limits AS current_limit (
    key_type,
    key_hash,
    window_started_at,
    attempts,
    updated_at
  )
  VALUES ('ip', p_ip_hash, now(), 1, now())
  ON CONFLICT (key_type, key_hash)
  DO UPDATE SET
    window_started_at = CASE
      WHEN current_limit.window_started_at <= now() - interval '1 hour'
      THEN now()
      ELSE current_limit.window_started_at
    END,
    attempts = CASE
      WHEN current_limit.window_started_at <= now() - interval '1 hour'
      THEN 1
      ELSE current_limit.attempts + 1
    END,
    updated_at = now()
  RETURNING attempts INTO v_ip_attempts;

  -- Email rate limit: 3 attempts per rolling one-hour window.
  INSERT INTO public.email_signup_rate_limits AS current_limit (
    key_type,
    key_hash,
    window_started_at,
    attempts,
    updated_at
  )
  VALUES ('email', p_email_hash, now(), 1, now())
  ON CONFLICT (key_type, key_hash)
  DO UPDATE SET
    window_started_at = CASE
      WHEN current_limit.window_started_at <= now() - interval '1 hour'
      THEN now()
      ELSE current_limit.window_started_at
    END,
    attempts = CASE
      WHEN current_limit.window_started_at <= now() - interval '1 hour'
      THEN 1
      ELSE current_limit.attempts + 1
    END,
    updated_at = now()
  RETURNING attempts INTO v_email_attempts;

  IF v_ip_attempts > 5 OR v_email_attempts > 3 THEN
    RETURN QUERY SELECT 'rate_limited'::text, NULL::uuid;
    RETURN;
  END IF;

  -- Never silently reactivate an address on the suppression list.
  IF EXISTS (
    SELECT 1
    FROM public.email_suppressions s
    WHERE lower(btrim(s.email)) = v_email
  ) THEN
    RETURN QUERY SELECT 'blocked'::text, NULL::uuid;
    RETURN;
  END IF;

  -- Create a pending subscriber, or refresh consent for an existing
  -- pending subscriber. Other statuses are deliberately not changed.
  INSERT INTO public.email_subscribers (
    email,
    display_name,
    status,
    consent_source,
    consent_at
  )
  VALUES (
    v_email,
    NULLIF(btrim(p_display_name), ''),
    'pending',
    'website_newsletter_form',
    now()
  )
  ON CONFLICT ((lower(btrim(email))))
  DO UPDATE SET
    display_name = COALESCE(
      NULLIF(btrim(EXCLUDED.display_name), ''),
      email_subscribers.display_name
    ),
    consent_source = 'website_newsletter_form',
    consent_at = now(),
    updated_at = now()
  WHERE email_subscribers.status = 'pending'
  RETURNING id, status
  INTO v_subscriber_id, v_subscriber_status;

  IF v_subscriber_id IS NULL THEN
    SELECT s.id, s.status
    INTO v_subscriber_id, v_subscriber_status
    FROM public.email_subscribers s
    WHERE lower(btrim(s.email)) = v_email;

    IF v_subscriber_status = 'subscribed' THEN
      RETURN QUERY SELECT 'already_subscribed'::text, NULL::uuid;
    ELSE
      RETURN QUERY SELECT 'blocked'::text, NULL::uuid;
    END IF;

    RETURN;
  END IF;

  -- Record explicit consent in the same transaction.
  INSERT INTO public.email_consent_events (
    subscriber_id,
    event_type,
    consent_source,
    policy_version
  )
  VALUES (
    v_subscriber_id,
    'consent_granted',
    'website_newsletter_form',
    p_policy_version
  );

  RETURN QUERY SELECT 'pending'::text, v_subscriber_id;
END;
$$;


-- 3. Restrict function execution to the trusted server role.

REVOKE ALL ON FUNCTION public.register_newsletter_signup(
  text, text, text, text, text
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.register_newsletter_signup(
  text, text, text, text, text
) TO service_role;





-- ============================================================
-- 4. Atomic newsletter subscription confirmation.
-- Only a valid server-verified confirmation token should reach
-- this operation. The function never reactivates unsubscribed
-- or suppressed subscribers.
-- ============================================================

CREATE OR REPLACE FUNCTION public.confirm_newsletter_subscription(
  p_subscriber_id uuid,
  p_policy_version text DEFAULT 'v1'
)
RETURNS TABLE (outcome text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_confirmed_id uuid;
  v_status text;
BEGIN
  IF p_subscriber_id IS NULL THEN
    RAISE EXCEPTION 'Invalid subscriber identifier'
      USING ERRCODE = '22023';
  END IF;

  IF p_policy_version IS NULL
    OR length(btrim(p_policy_version)) = 0
    OR length(btrim(p_policy_version)) > 40
  THEN
    RAISE EXCEPTION 'Invalid consent policy version'
      USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_subscriber_id::text, 731905)
  );

  UPDATE public.email_subscribers AS subscriber
  SET
    status = 'subscribed',
    confirmed_at = now(),
    consent_at = COALESCE(subscriber.consent_at, now()),
    updated_at = now()
  WHERE subscriber.id = p_subscriber_id
    AND subscriber.status = 'pending'
    AND NOT EXISTS (
      SELECT 1
      FROM public.email_suppressions AS suppression
      WHERE lower(btrim(suppression.email)) =
            lower(btrim(subscriber.email))
    )
  RETURNING subscriber.id INTO v_confirmed_id;

  IF v_confirmed_id IS NOT NULL THEN
    INSERT INTO public.email_consent_events (
      subscriber_id,
      event_type,
      consent_source,
      policy_version
    )
    VALUES (
      v_confirmed_id,
      'consent_confirmed',
      'website_newsletter_confirmation',
      btrim(p_policy_version)
    );

    RETURN QUERY SELECT 'confirmed'::text;
    RETURN;
  END IF;

  SELECT subscriber.status
  INTO v_status
  FROM public.email_subscribers AS subscriber
  WHERE subscriber.id = p_subscriber_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'not_found'::text;
  ELSIF v_status = 'subscribed' THEN
    RETURN QUERY SELECT 'already_confirmed'::text;
  ELSE
    RETURN QUERY SELECT 'blocked'::text;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_newsletter_subscription(
  uuid, text
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.confirm_newsletter_subscription(
  uuid, text
) TO service_role;