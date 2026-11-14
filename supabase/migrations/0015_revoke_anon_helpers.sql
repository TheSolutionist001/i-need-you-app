-- ==========================================================================
-- Aufraeumen nach Supabase-Sicherheitspruefung (Advisor):
-- Aeltere Hilfs- und Trigger-Funktionen waren fuer nicht angemeldete
-- Besucher (anon) per API aufrufbar. Supabase vergibt dieses Recht
-- automatisch an anon - "revoke from public" allein reicht nicht.
-- Trigger-Funktionen brauchen fuer das Ausloesen kein EXECUTE-Recht,
-- deshalb auch fuer angemeldete Nutzer entzogen.
-- ==========================================================================

revoke all on function public.current_user_gender() from anon;
revoke all on function public.is_group_creator(uuid) from anon;
revoke all on function public.is_group_member(uuid) from anon;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.notify_on_promotion() from public, anon, authenticated;
revoke all on function public.reject_if_banned() from public, anon, authenticated;

notify pgrst, 'reload schema';
