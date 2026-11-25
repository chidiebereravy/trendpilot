CREATE OR REPLACE FUNCTION public.record_public_ad_click(
    p_campaign_id UUID,
    p_placement_key TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
    v_destination_url TEXT;
    v_channel TEXT;
    v_placement_id UUID;
    v_metric_date DATE;
BEGIN
    IF p_campaign_id IS NULL
       OR p_placement_key IS NULL
       OR p_placement_key !~ '^[a-z0-9][a-z0-9_-]{1,79}$'
    THEN
        RETURN NULL;
    END IF;

    SELECT
        c.destination_url,
        c.channel,
        p.id
    INTO
        v_destination_url,
        v_channel,
        v_placement_id
    FROM public.ad_campaigns AS c
    INNER JOIN public.ad_campaign_placements AS cp
        ON cp.campaign_id = c.id
    INNER JOIN public.ad_placements AS p
        ON p.id = cp.placement_id
    LEFT JOIN public.advertisers AS a
        ON a.id = c.advertiser_id
    WHERE c.id = p_campaign_id
      AND p.placement_key = p_placement_key
      AND p.status = 'active'
      AND c.status = 'active'
      AND c.campaign_type IN ('direct', 'sponsored', 'house')
      AND c.channel IN ('display', 'native')
      AND NULLIF(BTRIM(c.headline), '') IS NOT NULL
      AND c.destination_url ~* '^https?://[^[:space:]/?#]+([/?#]|$)'
      AND (
          c.starts_at IS NULL
          OR c.starts_at <= NOW()
      )
      AND (
          c.ends_at IS NULL
          OR c.ends_at > NOW()
      )
      AND (
          c.advertiser_id IS NULL
          OR a.status = 'active'
      )
    FOR UPDATE OF c, cp, p;

    IF v_destination_url IS NULL THEN
        RETURN NULL;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.ad_campaigns AS c
        WHERE c.id = p_campaign_id
          AND c.advertiser_id IS NOT NULL
    ) THEN
        PERFORM 1
        FROM public.advertisers AS a
        INNER JOIN public.ad_campaigns AS c
            ON c.advertiser_id = a.id
        WHERE c.id = p_campaign_id
          AND a.status = 'active'
        FOR UPDATE OF a;

        IF NOT FOUND THEN
            RETURN NULL;
        END IF;
    END IF;

    v_metric_date := (NOW() AT TIME ZONE 'Africa/Lagos')::DATE;

    INSERT INTO public.advertising_daily_metrics (
        metric_date,
        channel,
        campaign_id,
        placement_id,
        network_connection_id,
        clicks,
        currency
    )
    VALUES (
        v_metric_date,
        v_channel,
        p_campaign_id,
        v_placement_id,
        NULL,
        1,
        'USD'
    )
    ON CONFLICT (
        metric_date,
        channel,
        campaign_id,
        placement_id,
        network_connection_id,
        currency
    )
    DO UPDATE SET
        clicks = public.advertising_daily_metrics.clicks + 1;

    RETURN v_destination_url;
END;
$$;

REVOKE ALL ON FUNCTION public.record_public_ad_click(UUID, TEXT)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.record_public_ad_click(UUID, TEXT)
TO service_role;

COMMENT ON FUNCTION public.record_public_ad_click(UUID, TEXT)
IS 'Validates a public advertisement click and atomically increments its daily Nigeria-timezone click metric.';



