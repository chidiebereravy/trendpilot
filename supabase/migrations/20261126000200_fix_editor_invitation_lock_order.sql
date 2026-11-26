
CREATE OR REPLACE FUNCTION public.accept_editor_invitation(
    p_token_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_user_id UUID;
    v_email TEXT;
    v_email_confirmed_at TIMESTAMPTZ;
    v_invitation public.editor_invitations%ROWTYPE;
    v_current_role TEXT;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required'
            USING ERRCODE = '42501';
    END IF;

    IF p_token_hash IS NULL OR p_token_hash !~ '^[a-f0-9]{64}$' THEN
        RAISE EXCEPTION 'Invalid invitation token'
            USING ERRCODE = '22023';
    END IF;

    -- Acquire the shared lock before locking any invitation or profile row.
    -- This keeps lock ordering consistent with the other role-changing RPCs.
    PERFORM pg_catalog.pg_advisory_xact_lock(7419202601);

    IF auth.uid() IS DISTINCT FROM v_user_id THEN
        RAISE EXCEPTION 'Authentication required'
            USING ERRCODE = '42501';
    END IF;

    SELECT
        lower(u.email),
        u.email_confirmed_at
    INTO
        v_email,
        v_email_confirmed_at
    FROM auth.users AS u
    WHERE u.id = v_user_id;

    IF NOT FOUND OR v_email_confirmed_at IS NULL THEN
        RAISE EXCEPTION 'A confirmed account email is required'
            USING ERRCODE = '42501';
    END IF;

    SELECT *
    INTO v_invitation
    FROM public.editor_invitations
    WHERE token_hash = p_token_hash
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or expired invitation'
            USING ERRCODE = 'P0002';
    END IF;

    -- Repeated acceptance by the same account is idempotent.
    IF v_invitation.status = 'accepted'
        AND v_invitation.accepted_by = v_user_id THEN
        RETURN jsonb_build_object(
            'invitationId', v_invitation.id,
            'status', 'accepted',
            'role', 'editor'
        );
    END IF;

    IF v_invitation.status <> 'pending'
        OR v_invitation.expires_at <= now() THEN
        RAISE EXCEPTION 'This invitation is no longer valid'
            USING ERRCODE = 'P0001';
    END IF;

    IF v_invitation.email <> v_email THEN
        RAISE EXCEPTION 'This invitation belongs to a different email address'
            USING ERRCODE = '42501';
    END IF;

    SELECT role
    INTO v_current_role
    FROM public.profiles
    WHERE id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User profile not found'
            USING ERRCODE = 'P0002';
    END IF;

    IF v_current_role NOT IN ('user', 'author', 'editor') THEN
        RAISE EXCEPTION 'This account cannot accept an editor invitation'
            USING ERRCODE = '42501';
    END IF;

    IF v_current_role <> 'editor' THEN
        PERFORM pg_catalog.set_config(
            'app.role_change_source',
            'editor_invitation',
            true
        );

        PERFORM pg_catalog.set_config(
            'app.role_change_source_id',
            v_invitation.id::TEXT,
            true
        );

        UPDATE public.profiles
        SET role = 'editor'
        WHERE id = v_user_id;
    END IF;

    UPDATE public.editor_invitations
    SET
        status = 'accepted',
        accepted_by = v_user_id,
        accepted_at = now()
    WHERE id = v_invitation.id;

    RETURN jsonb_build_object(
        'invitationId', v_invitation.id,
        'status', 'accepted',
        'role', 'editor'
    );
END;
$function$;
