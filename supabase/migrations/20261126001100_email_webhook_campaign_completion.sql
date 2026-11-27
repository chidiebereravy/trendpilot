-- Preserve the already-verified webhook implementation.
ALTER FUNCTION public.admin_process_resend_webhook_event(
  TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ
)
RENAME TO admin_process_resend_webhook_event_v009;

-- Keep the preserved implementation restricted to the service role.
REVOKE ALL ON FUNCTION public.admin_process_resend_webhook_event_v009(
  TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_process_resend_webhook_event_v009(
  TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ
) TO service_role;

-- Wrap the existing implementation with campaign completion handling.
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
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_campaign_id UUID;
  v_processed BOOLEAN;
  v_provider_message_id TEXT;
BEGIN
  v_provider_message_id := NULLIF(BTRIM(p_provider_message_id), '');

  -- Lock affected campaigns before the original function updates deliveries.
  -- This preserves the campaign-before-delivery lock order used by the
  -- campaign processing and uncertain-delivery resolution functions.
  IF v_provider_message_id IS NOT NULL THEN
    FOR v_campaign_id IN
      SELECT DISTINCT d.campaign_id
      FROM public.email_campaign_deliveries AS d
      WHERE d.provider_message_id = v_provider_message_id
      ORDER BY d.campaign_id
    LOOP
      PERFORM 1
      FROM public.email_campaigns AS c
      WHERE c.id = v_campaign_id
      FOR UPDATE;
    END LOOP;
  END IF;

  -- Retain all existing validation, idempotency, status progression,
  -- suppression and webhook audit behavior.
  v_processed := public.admin_process_resend_webhook_event_v009(
    p_event_id,
    p_event_type,
    p_provider_message_id,
    p_recipient_email,
    p_occurred_at
  );

  -- Recalculate campaigns even for duplicate events. This can repair a
  -- campaign whose delivery was updated before this wrapper was installed.
  IF v_provider_message_id IS NOT NULL THEN
    FOR v_campaign_id IN
      SELECT DISTINCT d.campaign_id
      FROM public.email_campaign_deliveries AS d
      WHERE d.provider_message_id = v_provider_message_id
      ORDER BY d.campaign_id
    LOOP
      PERFORM public.admin_complete_email_campaign(v_campaign_id);
    END LOOP;
  END IF;

  RETURN v_processed;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_process_resend_webhook_event(
  TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_process_resend_webhook_event(
  TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ
) TO service_role;
