-- Resolve an approved member's username to their login email address.
create or replace function public.login_email(p_identifier text) returns text language sql stable security definer set search_path = '' as $$
  select u.email from public.profiles p join auth.users u on u.id = p.id
  where p.username = lower(trim(p_identifier)) and p.status = 'approved' limit 1;
$$;
revoke execute on function public.login_email(text) from public, anon, authenticated;
grant execute on function public.login_email(text) to anon, authenticated;
