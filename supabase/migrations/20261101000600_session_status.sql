-- Available to invited Auth users as well as existing members; exposes only a
-- boolean about the calling JWT's own session, never another user's session.
create function public.session_is_active() returns boolean language sql stable security definer set search_path = '' as $$
  select private.session_exists();
$$;
revoke execute on function public.session_is_active() from public, anon, authenticated;
grant execute on function public.session_is_active() to authenticated;
