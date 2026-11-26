BEGIN;
-- ============================================================
-- TrendPilot: Admin User & Role Management
-- Migration: 20261126000100_admin_user_role_management.sql
-- ============================================================

-- ------------------------------------------------------------
-- 1. Author applications
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.author_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    motivation TEXT NOT NULL
        CHECK (char_length(trim(motivation)) BETWEEN 50 AND 5000),

    experience TEXT NOT NULL
        CHECK (char_length(trim(experience)) BETWEEN 20 AND 5000),

    portfolio_url TEXT
        CHECK (
            portfolio_url IS NULL
            OR (
                char_length(portfolio_url) <= 2048
                AND portfolio_url ~* '^https?://'
            )
        ),

    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),

    review_note TEXT
        CHECK (review_note IS NULL OR char_length(review_note) <= 2000),

    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CHECK (
        (status = 'pending' AND reviewed_at IS NULL)
        OR
        (status IN ('approved', 'rejected') AND reviewed_at IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS author_applications_one_pending_per_user_idx
    ON public.author_applications (user_id)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS author_applications_status_submitted_idx
    ON public.author_applications (status, submitted_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS author_applications_user_submitted_idx
    ON public.author_applications (user_id, submitted_at DESC);


-- ------------------------------------------------------------
-- 2. Editor invitations
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.editor_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    email TEXT NOT NULL
        CHECK (
            char_length(trim(email)) BETWEEN 3 AND 320
            AND email = lower(trim(email))
        ),

    token_hash TEXT NOT NULL UNIQUE
        CHECK (token_hash ~ '^[a-f0-9]{64}$'),

    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (
            status IN ('pending', 'accepted', 'revoked', 'expired')
        ),

    invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    accepted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    accepted_at TIMESTAMPTZ,

    revoked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    revoked_at TIMESTAMPTZ,

    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CHECK (
        (status = 'accepted' AND accepted_at IS NOT NULL AND accepted_by IS NOT NULL)
        OR
        (status <> 'accepted' AND accepted_at IS NULL)
    ),

    CHECK (
        (status = 'revoked' AND revoked_at IS NOT NULL)
        OR
        (status <> 'revoked' AND revoked_at IS NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS editor_invitations_one_pending_per_email_idx
    ON public.editor_invitations (email)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS editor_invitations_status_created_idx
    ON public.editor_invitations (status, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS editor_invitations_expires_idx
    ON public.editor_invitations (expires_at)
    WHERE status = 'pending';


-- ------------------------------------------------------------
-- 3. Role-change history
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_role_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Intentionally no foreign keys: audit records survive account deletion.
    user_id UUID NOT NULL,
    user_name TEXT,
    user_email TEXT,

    changed_by UUID,
    changed_by_name TEXT,
    changed_by_email TEXT,

    previous_role TEXT NOT NULL
        CHECK (previous_role IN ('user', 'author', 'editor', 'admin')),

    new_role TEXT NOT NULL
        CHECK (new_role IN ('user', 'author', 'editor', 'admin')),

    source TEXT NOT NULL DEFAULT 'admin'
        CHECK (
            source IN (
                'admin',
                'author_application',
                'editor_invitation'
            )
        ),

    source_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CHECK (previous_role <> new_role)
);

CREATE INDEX IF NOT EXISTS user_role_history_user_created_idx
    ON public.user_role_history (user_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS user_role_history_created_idx
    ON public.user_role_history (created_at DESC, id DESC);


-- ------------------------------------------------------------
-- 4. Row-level security
-- ------------------------------------------------------------

ALTER TABLE public.author_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editor_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_role_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS author_applications_select_own
    ON public.author_applications;

CREATE POLICY author_applications_select_own
    ON public.author_applications
    FOR SELECT
    TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- Applications are submitted and reviewed through SECURITY DEFINER RPCs.
-- Invitations and role history are accessed through admin RPCs only.

REVOKE ALL ON TABLE public.author_applications
    FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.author_applications
    TO authenticated;

REVOKE ALL ON TABLE public.editor_invitations
    FROM PUBLIC, anon, authenticated;

REVOKE ALL ON TABLE public.user_role_history
    FROM PUBLIC, anon, authenticated;


-- ------------------------------------------------------------
-- 5. Immutable role-history protection
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prevent_role_history_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RAISE EXCEPTION 'Role history records are immutable'
        USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS user_role_history_immutable
    ON public.user_role_history;

CREATE TRIGGER user_role_history_immutable
    BEFORE UPDATE OR DELETE ON public.user_role_history
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_role_history_mutation();

REVOKE ALL ON FUNCTION public.prevent_role_history_mutation()
    FROM PUBLIC, anon, authenticated;


-- ------------------------------------------------------------
-- 6. Automatic role-change audit trigger
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.audit_profile_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_source TEXT;
    v_source_id UUID;
    v_actor_id UUID;
    v_actor_name TEXT;
    v_actor_email TEXT;
    v_user_email TEXT;
BEGIN
    IF OLD.role IS NOT DISTINCT FROM NEW.role THEN
        RETURN NEW;
    END IF;

    v_source := COALESCE(
        NULLIF(current_setting('app.role_change_source', true), ''),
        'admin'
    );

    IF v_source NOT IN (
        'admin',
        'author_application',
        'editor_invitation'
    ) THEN
        v_source := 'admin';
    END IF;

    BEGIN
        v_source_id := NULLIF(
            current_setting('app.role_change_source_id', true),
            ''
        )::UUID;
    EXCEPTION
        WHEN invalid_text_representation THEN
            v_source_id := NULL;
    END;

    v_actor_id := auth.uid();

    SELECT u.email
    INTO v_user_email
    FROM auth.users AS u
    WHERE u.id = NEW.id;

    IF v_actor_id IS NOT NULL THEN
        SELECT p.display_name, u.email
        INTO v_actor_name, v_actor_email
        FROM public.profiles AS p
        LEFT JOIN auth.users AS u ON u.id = p.id
        WHERE p.id = v_actor_id;
    END IF;

    INSERT INTO public.user_role_history (
        user_id,
        user_name,
        user_email,
        changed_by,
        changed_by_name,
        changed_by_email,
        previous_role,
        new_role,
        source,
        source_id
    )
    VALUES (
        NEW.id,
        NEW.display_name,
        v_user_email,
        v_actor_id,
        v_actor_name,
        v_actor_email,
        OLD.role,
        NEW.role,
        v_source,
        v_source_id
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_role_change_audit
    ON public.profiles;

CREATE TRIGGER profiles_role_change_audit
    AFTER UPDATE OF role ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_profile_role_change();

REVOKE ALL ON FUNCTION public.audit_profile_role_change()
    FROM PUBLIC, anon, authenticated;


-- ------------------------------------------------------------
-- 7. Submit an author application
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.submit_author_application(
    p_motivation TEXT,
    p_experience TEXT,
    p_portfolio_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_role TEXT;
    v_application_id UUID;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required'
            USING ERRCODE = '42501';
    END IF;

    IF p_motivation IS NULL
        OR char_length(trim(p_motivation)) NOT BETWEEN 50 AND 5000 THEN
        RAISE EXCEPTION 'Motivation must contain between 50 and 5000 characters'
            USING ERRCODE = '22023';
    END IF;

    IF p_experience IS NULL
        OR char_length(trim(p_experience)) NOT BETWEEN 20 AND 5000 THEN
        RAISE EXCEPTION 'Experience must contain between 20 and 5000 characters'
            USING ERRCODE = '22023';
    END IF;

    IF p_portfolio_url IS NOT NULL
        AND (
            char_length(p_portfolio_url) > 2048
            OR p_portfolio_url !~* '^https?://'
        ) THEN
        RAISE EXCEPTION 'Invalid portfolio URL'
            USING ERRCODE = '22023';
    END IF;

    PERFORM pg_catalog.pg_advisory_xact_lock(7419202601);

    SELECT role
    INTO v_role
    FROM public.profiles
    WHERE id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User profile not found'
            USING ERRCODE = 'P0002';
    END IF;

    IF v_role <> 'user' THEN
        RAISE EXCEPTION 'Only regular users can apply to become authors'
            USING ERRCODE = '42501';
    END IF;

    INSERT INTO public.author_applications (
        user_id,
        motivation,
        experience,
        portfolio_url
    )
    VALUES (
        v_user_id,
        trim(p_motivation),
        trim(p_experience),
        NULLIF(trim(p_portfolio_url), '')
    )
    RETURNING id INTO v_application_id;

    RETURN jsonb_build_object(
        'applicationId', v_application_id,
        'status', 'pending'
    );
END;
$$;


-- ------------------------------------------------------------
-- 8. Admin: list author applications
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_list_author_applications(
    p_status TEXT DEFAULT 'pending',
    p_search TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    application_id UUID,
    user_id UUID,
    display_name TEXT,
    email TEXT,
    motivation TEXT,
    experience TEXT,
    portfolio_url TEXT,
    application_status TEXT,
    review_note TEXT,
    submitted_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF auth.uid() IS NULL OR NOT public.is_admin() THEN
        RAISE EXCEPTION 'Administrator access required'
            USING ERRCODE = '42501';
    END IF;

    IF p_status IS NULL
    OR p_status NOT IN ('pending', 'approved', 'rejected', 'all') THEN
        RAISE EXCEPTION 'Invalid application status'
            USING ERRCODE = '22023';
    END IF;

    IF p_limit NOT BETWEEN 1 AND 50 OR p_offset < 0 THEN
        RAISE EXCEPTION 'Invalid pagination parameters'
            USING ERRCODE = '22023';
    END IF;

    RETURN QUERY
    SELECT
        a.id,
        a.user_id,
        p.display_name::TEXT,
        u.email::TEXT,
        a.motivation,
        a.experience,
        a.portfolio_url,
        a.status,
        a.review_note,
        a.submitted_at,
        a.reviewed_at,
        a.reviewed_by
    FROM public.author_applications AS a
    INNER JOIN public.profiles AS p
        ON p.id = a.user_id
    INNER JOIN auth.users AS u
        ON u.id = a.user_id
    WHERE
        (p_status = 'all' OR a.status = p_status)
        AND (
            NULLIF(trim(p_search), '') IS NULL
            OR p.display_name ILIKE '%' || trim(p_search) || '%'
            OR u.email ILIKE '%' || trim(p_search) || '%'
        )
    ORDER BY a.submitted_at DESC, a.id DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;


-- ------------------------------------------------------------
-- 9. Admin: approve or reject an author application
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_review_author_application(
    p_application_id UUID,
    p_decision TEXT,
    p_review_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_admin_id UUID;
    v_application public.author_applications%ROWTYPE;
    v_current_role TEXT;
BEGIN
    v_admin_id := auth.uid();

    IF v_admin_id IS NULL OR NOT public.is_admin() THEN
        RAISE EXCEPTION 'Administrator access required'
            USING ERRCODE = '42501';
    END IF;

    IF p_application_id IS NULL
    OR p_decision IS NULL
    OR p_decision NOT IN ('approved', 'rejected') THEN
        RAISE EXCEPTION 'Invalid application review request'
            USING ERRCODE = '22023';
    END IF;

    IF p_review_note IS NOT NULL
        AND char_length(p_review_note) > 2000 THEN
        RAISE EXCEPTION 'Review note is too long'
            USING ERRCODE = '22023';
    END IF;

    PERFORM pg_catalog.pg_advisory_xact_lock(7419202601);

    IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Administrator access required'
        USING ERRCODE = '42501';
    END IF;

    SELECT *
    INTO v_application
    FROM public.author_applications
    WHERE id = p_application_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Author application not found'
            USING ERRCODE = 'P0002';
    END IF;

    IF v_application.status <> 'pending' THEN
        RAISE EXCEPTION 'This application has already been reviewed'
            USING ERRCODE = 'P0001';
    END IF;

    IF p_decision = 'approved' THEN
        SELECT role
        INTO v_current_role
        FROM public.profiles
        WHERE id = v_application.user_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Applicant profile not found'
                USING ERRCODE = 'P0002';
        END IF;

        IF v_current_role = 'user' THEN
            PERFORM pg_catalog.set_config(
                'app.role_change_source',
                'author_application',
                true
            );

            PERFORM pg_catalog.set_config(
                'app.role_change_source_id',
                v_application.id::TEXT,
                true
            );

            UPDATE public.profiles
            SET role = 'author'
            WHERE id = v_application.user_id;
        END IF;
    END IF;

    UPDATE public.author_applications
    SET
        status = p_decision,
        review_note = NULLIF(trim(p_review_note), ''),
        reviewed_by = v_admin_id,
        reviewed_at = now(),
        updated_at = now()
    WHERE id = p_application_id;

    RETURN jsonb_build_object(
        'applicationId', p_application_id,
        'userId', v_application.user_id,
        'status', p_decision
    );
END;
$$;


-- ------------------------------------------------------------
-- 10. Admin: create an editor invitation
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_create_editor_invitation(
    p_email TEXT,
    p_token_hash TEXT,
    p_expires_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_admin_id UUID;
    v_email TEXT;
    v_invitation_id UUID;
BEGIN
    v_admin_id := auth.uid();

    IF v_admin_id IS NULL OR NOT public.is_admin() THEN
        RAISE EXCEPTION 'Administrator access required'
            USING ERRCODE = '42501';
    END IF;

    v_email := lower(trim(p_email));

    IF v_email IS NULL OR char_length(v_email) NOT BETWEEN 3 AND 320 THEN
        RAISE EXCEPTION 'Invalid email address'
            USING ERRCODE = '22023';
    END IF;

    IF p_token_hash IS NULL OR p_token_hash !~ '^[a-f0-9]{64}$' THEN
        RAISE EXCEPTION 'Invalid invitation token hash'
            USING ERRCODE = '22023';
    END IF;

    IF p_expires_at IS NULL
        OR p_expires_at <= now()
        OR p_expires_at > now() + interval '30 days' THEN
        RAISE EXCEPTION 'Invitation expiry must be within the next 30 days'
            USING ERRCODE = '22023';
    END IF;

    PERFORM pg_catalog.pg_advisory_xact_lock(7419202601);

    IF auth.uid() IS NULL OR NOT public.is_admin() THEN
        RAISE EXCEPTION 'Administrator access required'
            USING ERRCODE = '42501';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM auth.users AS u
        INNER JOIN public.profiles AS p ON p.id = u.id
        WHERE lower(u.email) = v_email
            AND p.role IN ('editor', 'admin')
    ) THEN
        RAISE EXCEPTION 'This account already has editor or administrator access'
            USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.editor_invitations
    SET status = 'expired'
    WHERE email = v_email
        AND status = 'pending'
        AND expires_at <= now();

    IF EXISTS (
        SELECT 1
        FROM public.editor_invitations
        WHERE email = v_email
            AND status = 'pending'
    ) THEN
        RAISE EXCEPTION 'A pending invitation already exists for this email'
            USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO public.editor_invitations (
        email,
        token_hash,
        invited_by,
        expires_at
    )
    VALUES (
        v_email,
        p_token_hash,
        v_admin_id,
        p_expires_at
    )
    RETURNING id INTO v_invitation_id;

    RETURN jsonb_build_object(
        'invitationId', v_invitation_id,
        'email', v_email,
        'expiresAt', p_expires_at
    );
END;
$$;


-- ------------------------------------------------------------
-- 11. Admin: list editor invitations
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_list_editor_invitations(
    p_status TEXT DEFAULT 'pending',
    p_search TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    invitation_id UUID,
    email TEXT,
    invitation_status TEXT,
    invited_by UUID,
    invited_by_name TEXT,
    accepted_by UUID,
    accepted_at TIMESTAMPTZ,
    revoked_by UUID,
    revoked_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF auth.uid() IS NULL OR NOT public.is_admin() THEN
        RAISE EXCEPTION 'Administrator access required'
            USING ERRCODE = '42501';
    END IF;

    IF p_status IS NULL
    OR p_status NOT IN ('pending', 'accepted', 'revoked', 'expired', 'all') THEN
        RAISE EXCEPTION 'Invalid invitation status'
            USING ERRCODE = '22023';
    END IF;

    IF p_limit NOT BETWEEN 1 AND 50 OR p_offset < 0 THEN
        RAISE EXCEPTION 'Invalid pagination parameters'
            USING ERRCODE = '22023';
    END IF;

    RETURN QUERY
    SELECT
        i.id,
        i.email,
        CASE
            WHEN i.status = 'pending' AND i.expires_at <= now()
                THEN 'expired'
            ELSE i.status
        END::TEXT,
        i.invited_by,
        inviter.display_name::TEXT,
        i.accepted_by,
        i.accepted_at,
        i.revoked_by,
        i.revoked_at,
        i.expires_at,
        i.created_at
    FROM public.editor_invitations AS i
    LEFT JOIN public.profiles AS inviter
        ON inviter.id = i.invited_by
    WHERE
        (
            p_status = 'all'
            OR (
                p_status = 'expired'
                AND (i.status = 'expired' OR (i.status = 'pending' AND i.expires_at <= now()))
            )
            OR (
                p_status <> 'expired'
                AND i.status = p_status
                AND NOT (p_status = 'pending' AND i.expires_at <= now())
            )
        )
        AND (
            NULLIF(trim(p_search), '') IS NULL
            OR i.email ILIKE '%' || trim(p_search) || '%'
        )
    ORDER BY i.created_at DESC, i.id DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;


-- ------------------------------------------------------------
-- 12. Admin: revoke an editor invitation
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_revoke_editor_invitation(
    p_invitation_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_admin_id UUID;
    v_invitation public.editor_invitations%ROWTYPE;
BEGIN
    v_admin_id := auth.uid();

    IF v_admin_id IS NULL OR NOT public.is_admin() THEN
        RAISE EXCEPTION 'Administrator access required'
            USING ERRCODE = '42501';
    END IF;

    SELECT *
    INTO v_invitation
    FROM public.editor_invitations
    WHERE id = p_invitation_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invitation not found'
            USING ERRCODE = 'P0002';
    END IF;

    IF v_invitation.status <> 'pending'
        OR v_invitation.expires_at <= now() THEN
        RAISE EXCEPTION 'This invitation cannot be revoked'
            USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.editor_invitations
    SET
        status = 'revoked',
        revoked_by = v_admin_id,
        revoked_at = now()
    WHERE id = p_invitation_id;

    RETURN jsonb_build_object(
        'invitationId', p_invitation_id,
        'status', 'revoked'
    );
END;
$$;


-- ------------------------------------------------------------
-- 13. Accept an editor invitation
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.accept_editor_invitation(
    p_token_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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

    PERFORM pg_catalog.pg_advisory_xact_lock(7419202601);

    IF v_invitation.status <> 'pending'
    OR v_invitation.expires_at <= now() THEN
    RAISE EXCEPTION 'This invitation is no longer valid'
        USING ERRCODE = 'P0001';
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
$$;


-- ------------------------------------------------------------
-- 14. Admin: list role-change history
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_list_user_role_history(
    p_search TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    history_id UUID,
    user_id UUID,
    user_name TEXT,
    user_email TEXT,
    changed_by UUID,
    changed_by_name TEXT,
    changed_by_email TEXT,
    previous_role TEXT,
    new_role TEXT,
    change_source TEXT,
    source_id UUID,
    changed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF auth.uid() IS NULL OR NOT public.is_admin() THEN
        RAISE EXCEPTION 'Administrator access required'
            USING ERRCODE = '42501';
    END IF;

    IF p_limit NOT BETWEEN 1 AND 50 OR p_offset < 0 THEN
        RAISE EXCEPTION 'Invalid pagination parameters'
            USING ERRCODE = '22023';
    END IF;

    RETURN QUERY
    SELECT
        h.id,
        h.user_id,
        h.user_name,
        h.user_email,
        h.changed_by,
        h.changed_by_name,
        h.changed_by_email,
        h.previous_role,
        h.new_role,
        h.source,
        h.source_id,
        h.created_at
    FROM public.user_role_history AS h
    WHERE
        NULLIF(trim(p_search), '') IS NULL
        OR h.user_name ILIKE '%' || trim(p_search) || '%'
        OR h.user_email ILIKE '%' || trim(p_search) || '%'
        OR h.changed_by_name ILIKE '%' || trim(p_search) || '%'
        OR h.changed_by_email ILIKE '%' || trim(p_search) || '%'
    ORDER BY h.created_at DESC, h.id DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;



-- ------------------------------------------------------------
-- 15. Function privileges
-- ------------------------------------------------------------



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
    PERFORM pg_catalog.pg_advisory_xact_lock(7419202601::BIGINT);

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

    -- Protect the last administrator.
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

    -- Ordinary administrator role changes must always be audited as admin.
    -- Do not trust caller-controlled transaction settings for attribution.
    PERFORM pg_catalog.set_config('app.role_change_source', 'admin', true);
    PERFORM pg_catalog.set_config('app.role_change_source_id', '', true);

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
    'Changes a user role for administrators while protecting self-access, the last administrator, and audit attribution.';


-- ------------------------------------------------------------
-- 16. Function privileges
-- ------------------------------------------------------------

REVOKE ALL ON FUNCTION public.submit_author_application(TEXT, TEXT, TEXT)
    FROM PUBLIC, anon;

REVOKE ALL ON FUNCTION public.admin_list_author_applications(TEXT, TEXT, INTEGER, INTEGER)
    FROM PUBLIC, anon;

REVOKE ALL ON FUNCTION public.admin_review_author_application(UUID, TEXT, TEXT)
    FROM PUBLIC, anon;

REVOKE ALL ON FUNCTION public.admin_create_editor_invitation(TEXT, TEXT, TIMESTAMPTZ)
    FROM PUBLIC, anon;

REVOKE ALL ON FUNCTION public.admin_list_editor_invitations(TEXT, TEXT, INTEGER, INTEGER)
    FROM PUBLIC, anon;

REVOKE ALL ON FUNCTION public.admin_revoke_editor_invitation(UUID)
    FROM PUBLIC, anon;

REVOKE ALL ON FUNCTION public.accept_editor_invitation(TEXT)
    FROM PUBLIC, anon;

REVOKE ALL ON FUNCTION public.admin_list_user_role_history(TEXT, INTEGER, INTEGER)
    FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.submit_author_application(TEXT, TEXT, TEXT)
    TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_list_author_applications(TEXT, TEXT, INTEGER, INTEGER)
    TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_review_author_application(UUID, TEXT, TEXT)
    TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_create_editor_invitation(TEXT, TEXT, TIMESTAMPTZ)
    TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_list_editor_invitations(TEXT, TEXT, INTEGER, INTEGER)
    TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_revoke_editor_invitation(UUID)
    TO authenticated;

GRANT EXECUTE ON FUNCTION public.accept_editor_invitation(TEXT)
    TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_list_user_role_history(TEXT, INTEGER, INTEGER)
    TO authenticated;



COMMIT;