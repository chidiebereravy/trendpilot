BEGIN;

-- =========================================================
-- 1. ADMIN-ONLY USER DIRECTORY
-- =========================================================

CREATE OR REPLACE FUNCTION public.admin_list_users(
    p_search TEXT DEFAULT NULL,
    p_role TEXT DEFAULT NULL,
    p_cursor_created_at TIMESTAMPTZ DEFAULT NULL,
    p_cursor_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    user_id UUID,
    display_name TEXT,
    email TEXT,
    user_role TEXT,
    registered_at TIMESTAMPTZ,
    email_confirmed_at TIMESTAMPTZ,
    last_sign_in_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_search TEXT := NULLIF(BTRIM(p_search), '');
BEGIN
    IF auth.uid() IS NULL OR NOT public.is_admin() THEN
        RAISE EXCEPTION 'Administrator access is required.'
            USING ERRCODE = '42501';
    END IF;

    IF p_role IS NOT NULL
       AND p_role NOT IN ('user', 'author', 'editor', 'admin') THEN
        RAISE EXCEPTION 'Invalid user role filter.'
            USING ERRCODE = '22023';
    END IF;

    IF p_limit IS NULL OR p_limit < 1 OR p_limit > 50 THEN
        RAISE EXCEPTION 'User page size must be between 1 and 50.'
            USING ERRCODE = '22023';
    END IF;

    IF (p_cursor_created_at IS NULL) <> (p_cursor_id IS NULL) THEN
        RAISE EXCEPTION 'Both pagination cursor values are required.'
            USING ERRCODE = '22023';
    END IF;

    RETURN QUERY
    SELECT
        profile.id,
        profile.display_name,
        auth_user.email::TEXT,
        profile.role,
        profile.created_at,
        auth_user.email_confirmed_at,
        auth_user.last_sign_in_at
    FROM auth.users AS auth_user
    INNER JOIN public.profiles AS profile
        ON profile.id = auth_user.id
    WHERE
        (p_role IS NULL OR profile.role = p_role)
        AND (
            v_search IS NULL
            OR POSITION(
                LOWER(v_search)
                IN LOWER(
                    COALESCE(profile.display_name, '')
                    || ' '
                    || COALESCE(auth_user.email, '')
                )
            ) > 0
        )
        AND (
            p_cursor_created_at IS NULL
            OR (profile.created_at, profile.id)
                < (p_cursor_created_at, p_cursor_id)
        )
    ORDER BY
        profile.created_at DESC,
        profile.id DESC
    LIMIT p_limit + 1;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_users(
    TEXT, TEXT, TIMESTAMPTZ, UUID, INTEGER
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.admin_list_users(
    TEXT, TEXT, TIMESTAMPTZ, UUID, INTEGER
) FROM anon;

GRANT EXECUTE ON FUNCTION public.admin_list_users(
    TEXT, TEXT, TIMESTAMPTZ, UUID, INTEGER
) TO authenticated;

COMMENT ON FUNCTION public.admin_list_users(
    TEXT, TEXT, TIMESTAMPTZ, UUID, INTEGER
) IS
    'Returns a cursor-paginated user directory for administrators only.';


-- =========================================================
-- 2. SAFE, ATOMIC ROLE MANAGEMENT
-- =========================================================

CREATE OR REPLACE FUNCTION public.admin_update_user_role(
    p_user_id UUID,
    p_new_role TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_current_role TEXT;
    v_admin_count BIGINT;
BEGIN
    IF v_actor_id IS NULL OR NOT public.is_admin() THEN
        RAISE EXCEPTION 'Administrator access is required.'
            USING ERRCODE = '42501';
    END IF;

    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'A valid user ID is required.'
            USING ERRCODE = '22023';
    END IF;

    IF p_new_role IS NULL
       OR p_new_role NOT IN ('user', 'author', 'editor', 'admin') THEN
        RAISE EXCEPTION 'The selected role is invalid.'
            USING ERRCODE = '22023';
    END IF;

    -- Serialize role changes to protect the last administrator.
    PERFORM pg_advisory_xact_lock(7419202601::BIGINT);

    -- Recheck authorization after acquiring the lock.
    IF auth.uid() IS NULL OR NOT public.is_admin() THEN
        RAISE EXCEPTION 'Administrator access is required.'
            USING ERRCODE = '42501';
    END IF;

    -- Prevent accidental changes to the acting administrator.
    IF p_user_id = v_actor_id THEN
        RAISE EXCEPTION 'You cannot change your own account role.'
            USING ERRCODE = 'P0001';
    END IF;

    SELECT profile.role
    INTO v_current_role
    FROM public.profiles AS profile
    WHERE profile.id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'The requested user was not found.'
            USING ERRCODE = 'P0002';
    END IF;

    IF v_current_role = 'admin' AND p_new_role <> 'admin' THEN
        SELECT COUNT(*)
        INTO v_admin_count
        FROM public.profiles AS profile
        WHERE profile.role = 'admin';

        IF v_admin_count <= 1 THEN
            RAISE EXCEPTION 'The last administrator cannot be demoted.'
                USING ERRCODE = 'P0001';
        END IF;
    END IF;

    UPDATE public.profiles AS profile
    SET role = p_new_role
    WHERE profile.id = p_user_id;

    RETURN p_new_role;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_user_role(UUID, TEXT)
FROM PUBLIC;

REVOKE ALL ON FUNCTION public.admin_update_user_role(UUID, TEXT)
FROM anon;

GRANT EXECUTE ON FUNCTION public.admin_update_user_role(UUID, TEXT)
TO authenticated;

COMMENT ON FUNCTION public.admin_update_user_role(UUID, TEXT) IS
    'Changes a user role for administrators while protecting self-access and the last administrator.';

COMMIT;

