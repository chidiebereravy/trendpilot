BEGIN;

-- The authorization helper is only needed by authenticated users.
REVOKE ALL ON FUNCTION public.is_editor_or_admin()
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.is_editor_or_admin()
TO authenticated;

-- Trigger functions must not be directly callable by application roles.
REVOKE ALL ON FUNCTION public.validate_article_write()
FROM PUBLIC, anon, authenticated;

COMMIT;
