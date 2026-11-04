-- Invitees do not have profiles yet, but must still hold a live Auth session.
create function private.session_exists() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from auth.sessions where id::text = auth.jwt()->>'session_id' and user_id = auth.uid());
$$;
revoke execute on function private.session_exists() from public, anon, authenticated;
grant execute on function private.session_exists() to authenticated;

drop policy profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using (
  (id = auth.uid() and private.session_exists()) or (public.is_admin() and public.has_current_policy())
);

create or replace function public.invitation_context() returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('expires_at', i.expires_at, 'role', i.role)
  from public.invitations i join auth.users u on u.id = auth.uid() and u.id = i.auth_user_id
  where private.session_exists() and i.email = lower(u.email) and i.accepted_at is null and i.revoked_at is null and i.expires_at > now()
    and u.email_confirmed_at is not null
  order by i.created_at desc limit 1;
$$;

-- Preserve one implementation of acceptance while enforcing the session at the
-- table boundary too. This also protects service inserts from stale JWT context.
create function private.guard_invite_acceptance() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.accepted_at is distinct from old.accepted_at and new.accepted_at is not null and auth.uid() is not null then
    if not private.session_exists() then raise exception 'Sign in again' using errcode = '42501'; end if;
  end if;
  return new;
end;
$$;
create trigger guard_invite_acceptance before update on public.invitations for each row execute function private.guard_invite_acceptance();
revoke execute on function private.guard_invite_acceptance() from public, anon, authenticated;
