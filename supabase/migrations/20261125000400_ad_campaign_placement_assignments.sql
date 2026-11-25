CREATE OR REPLACE FUNCTION public.replace_ad_campaign_placements(
    p_campaign_id UUID,
    p_placement_ids UUID[]
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
    v_campaign_id UUID;
    v_requested_count INTEGER;
    v_available_count INTEGER;
BEGIN
    IF p_campaign_id IS NULL THEN
        RAISE EXCEPTION 'A valid campaign ID is required.';
    END IF;

    IF p_placement_ids IS NULL THEN
        RAISE EXCEPTION 'Placement IDs must be provided.';
    END IF;

    v_requested_count := COALESCE(CARDINALITY(p_placement_ids), 0);

    IF v_requested_count > 50 THEN
        RAISE EXCEPTION 'A campaign cannot have more than 50 placements.';
    END IF;

    IF ARRAY_POSITION(p_placement_ids, NULL) IS NOT NULL THEN
        RAISE EXCEPTION 'Placement IDs cannot contain null values.';
    END IF;

    IF (
        SELECT COUNT(DISTINCT placement_id)
        FROM UNNEST(p_placement_ids) AS requested(placement_id)
    ) <> v_requested_count THEN
        RAISE EXCEPTION 'Duplicate placement IDs are not allowed.';
    END IF;

    SELECT id
    INTO v_campaign_id
    FROM public.ad_campaigns
    WHERE id = p_campaign_id
    FOR UPDATE;

    IF v_campaign_id IS NULL THEN
        RAISE EXCEPTION 'The requested campaign was not found.';
    END IF;

    IF v_requested_count > 0 THEN
        PERFORM id
        FROM public.ad_placements
        WHERE id = ANY(p_placement_ids)
        ORDER BY id
        FOR UPDATE;

        SELECT COUNT(*)
        INTO v_available_count
        FROM public.ad_placements
        WHERE id = ANY(p_placement_ids)
          AND status = 'active';

        IF v_available_count <> v_requested_count THEN
            RAISE EXCEPTION 'One or more placements are unavailable or inactive.';
        END IF;
    END IF;

    DELETE FROM public.ad_campaign_placements
    WHERE campaign_id = p_campaign_id;

    INSERT INTO public.ad_campaign_placements (
        campaign_id,
        placement_id
    )
    SELECT
        p_campaign_id,
        placement_id
    FROM UNNEST(p_placement_ids) AS requested(placement_id);

    RETURN v_requested_count;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_ad_campaign_placements(UUID, UUID[])
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.replace_ad_campaign_placements(UUID, UUID[])
TO service_role;

COMMENT ON FUNCTION public.replace_ad_campaign_placements(UUID, UUID[])
IS 'Atomically replaces campaign placement assignments after validating active placements.';

