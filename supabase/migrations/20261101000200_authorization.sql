-- Membership is looked up on every request; JWT role metadata is never trusted.
create function public.is_approved() returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'approved')
    and exists (select 1 from auth.sessions s where s.id::text = auth.jwt()->>'session_id' and s.user_id = auth.uid())
    and (coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2' or not exists (
      select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified'
    ));
$$;
create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_approved() and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
create function public.has_current_policy() returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p cross join public.workspace_settings s
    where p.id = auth.uid() and p.policy_version = s.policy_version);
$$;
create function public.can_use_workspace() returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_approved() and public.has_current_policy();
$$;

create function private.limit_value(key text) returns bigint language sql stable security definer set search_path = '' as $$
  select (limits->>key)::bigint from public.workspace_settings where id;
$$;
create function private.lock_capacity() returns void language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.workspace_settings where id for update;
end;
$$;
create function private.require_admin(actor uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.profiles p cross join public.workspace_settings s
    where p.id = actor and p.role = 'admin' and p.status = 'approved' and p.policy_version = s.policy_version) then
    raise exception 'An approved administrator is required' using errcode = '42501';
  end if;
end;
$$;
create function private.log_action(actor uuid, action_name text, target uuid, details jsonb default '{}')
returns void language sql security definer set search_path = '' as $$
  insert into public.activity_log(actor_id, action, entity_id, metadata) values (actor, action_name, target, details);
$$;

-- This runs even for service-role changes and Auth account deletion cascades.
create function private.guard_membership() returns trigger language plpgsql security definer set search_path = '' as $$
declare seats bigint; admins bigint;
begin
  perform private.lock_capacity();
  if TG_OP <> 'INSERT' then
    if old.role = 'admin' and old.status = 'approved' and
      (TG_OP = 'DELETE' or new.role <> 'admin' or new.status <> 'approved') then
      if (select count(*) from public.profiles where role = 'admin' and status = 'approved' and id <> old.id) = 0 then
        raise exception 'The last approved administrator cannot be removed' using errcode = '23514';
      end if;
    end if;
  end if;
  if TG_OP = 'DELETE' then return old; end if;
  if new.status = 'approved' and (TG_OP = 'INSERT' or old.status <> 'approved') then
    select count(*) into seats from public.profiles where status = 'approved' and id <> new.id;
    seats := seats + (select count(*) from public.invitations where accepted_at is null and revoked_at is null and expires_at > now());
    if seats >= private.limit_value('members') then raise exception 'Member capacity reached' using errcode = '23514'; end if;
  end if;
  if new.status = 'approved' and new.role = 'admin' then
    select count(*) into admins from public.profiles where status = 'approved' and role = 'admin' and id <> new.id;
    admins := admins + (select count(*) from public.invitations where role = 'admin' and accepted_at is null and revoked_at is null and expires_at > now());
    if admins >= private.limit_value('admins') then raise exception 'Administrator capacity reached' using errcode = '23514'; end if;
  end if;
  return new;
end;
$$;
create trigger guard_membership before insert or update or delete on public.profiles for each row execute function private.guard_membership();

create function public.public_policy_settings() returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('name', name, 'policy_version', policy_version,
    'chat_days', limits->'chat_days', 'activity_days', limits->'activity_days',
    'notification_days', limits->'notification_days', 'full_attempts', limits->'full_attempts')
  from public.workspace_settings where id;
$$;

create function public.invitation_context() returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('expires_at', i.expires_at, 'role', i.role)
  from public.invitations i join auth.users u on u.id = auth.uid() and u.id = i.auth_user_id
  where i.email = lower(u.email) and i.accepted_at is null and i.revoked_at is null and i.expires_at > now()
    and u.email_confirmed_at is not null
  order by i.created_at desc limit 1;
$$;

create function public.accept_invitation(p_username text, p_display_name text, p_policy_version text, p_accepted boolean)
returns public.profiles language plpgsql security definer set search_path = '' as $$
declare invite public.invitations; result public.profiles; current_version text;
begin
  perform private.lock_capacity();
  select policy_version into current_version from public.workspace_settings where id;
  if p_accepted is distinct from true or p_policy_version is distinct from current_version then
    raise exception 'Accept the current Privacy Policy and Terms' using errcode = '23514';
  end if;
  if exists (select 1 from public.profiles where id = auth.uid()) then raise exception 'Membership already exists'; end if;
  select i.* into invite from public.invitations i join auth.users u on u.id = i.auth_user_id
    where u.id = auth.uid() and u.email_confirmed_at is not null and i.email = lower(u.email)
      and i.accepted_at is null and i.revoked_at is null and i.expires_at > now()
    order by i.created_at desc limit 1 for update of i;
  if invite.id is null then raise exception 'Invitation is unavailable' using errcode = '42501'; end if;
  -- Consume the seat reservation before creating membership in the same transaction.
  update public.invitations set accepted_at = now() where id = invite.id;
  insert into public.profiles(id, username, display_name, role, policy_version, policy_accepted_at)
    values (auth.uid(), p_username, trim(p_display_name), invite.role, current_version, now()) returning * into result;
  insert into public.notifications(user_id, kind, title, entity_id)
    select id, 'invite_accepted', 'An invited member joined the workspace', result.id
    from public.profiles where role = 'admin' and status = 'approved';
  perform private.log_action(result.id, 'invite.accepted', invite.id);
  return result;
end;
$$;

create function public.accept_policy(p_version text, p_accepted boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.lock_capacity();
  if not public.is_approved() then raise exception 'Membership unavailable' using errcode = '42501'; end if;
  if p_accepted is distinct from true or p_version is distinct from (select policy_version from public.workspace_settings where id) then
    raise exception 'Accept the current Privacy Policy and Terms' using errcode = '23514';
  end if;
  update public.profiles set policy_version = p_version, policy_accepted_at = now() where id = auth.uid();
end;
$$;

create function public.update_my_profile(p_username text, p_display_name text, p_avatar smallint, p_theme text)
returns public.profiles language plpgsql security definer set search_path = '' as $$
declare result public.profiles;
begin
  if not public.can_use_workspace() then raise exception 'Membership unavailable' using errcode = '42501'; end if;
  update public.profiles set username = p_username, display_name = trim(p_display_name), avatar = p_avatar, theme = p_theme
    where id = auth.uid() returning * into result;
  return result;
end;
$$;

create function public.member_directory() returns table(id uuid, username text, display_name text, avatar smallint, role public.member_role)
language sql stable security definer set search_path = '' as $$
  select p.id, p.username, p.display_name, p.avatar, p.role from public.profiles p
  where public.can_use_workspace() and p.status = 'approved' order by p.display_name;
$$;

create function public.reserve_invitation(p_actor uuid, p_email text, p_role public.member_role default 'member', p_bootstrap boolean default false)
returns public.invitations language plpgsql security definer set search_path = '' as $$
declare result public.invitations; open_count bigint; admin_count bigint;
begin
  perform private.lock_capacity();
  if p_bootstrap then
    if exists(select 1 from public.profiles) or exists(select 1 from public.invitations where revoked_at is null) then
      raise exception 'Bootstrap is already complete' using errcode = '42501';
    end if;
    if p_role <> 'admin' or p_actor is not null then raise exception 'Invalid bootstrap'; end if;
  else
    perform private.require_admin(p_actor);
  end if;
  select count(*) into open_count from public.invitations where accepted_at is null and revoked_at is null and expires_at > now();
  if open_count >= private.limit_value('open_invites') then raise exception 'Open invitation capacity reached' using errcode = '23514'; end if;
  if open_count + (select count(*) from public.profiles where status = 'approved') >= private.limit_value('members') then
    raise exception 'Member capacity reached' using errcode = '23514';
  end if;
  if p_role = 'admin' then
    select count(*) into admin_count from public.profiles where status = 'approved' and role = 'admin';
    admin_count := admin_count + (select count(*) from public.invitations where role = 'admin' and accepted_at is null and revoked_at is null and expires_at > now());
    if admin_count >= private.limit_value('admins') then raise exception 'Administrator capacity reached' using errcode = '23514'; end if;
  end if;
  if exists (select 1 from public.invitations where email = lower(trim(p_email)) and accepted_at is null and revoked_at is null and expires_at > now()) then
    raise exception 'An open invitation already exists' using errcode = '23514';
  end if;
  if exists(select 1 from auth.users u join public.profiles p on p.id = u.id where lower(u.email) = lower(trim(p_email))) then
    raise exception 'This address already has a membership' using errcode = '23514';
  end if;
  insert into public.invitations(email, role, invited_by, expires_at)
    values(lower(trim(p_email)), p_role, p_actor, now() + make_interval(days => private.limit_value('invite_days')::integer)) returning * into result;
  perform private.log_action(p_actor, 'invite.reserved', result.id, jsonb_build_object('role', p_role));
  return result;
end;
$$;

create function public.bind_invitation(p_invitation uuid, p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.invitations i set auth_user_id = p_user from auth.users u
    where i.id = p_invitation and u.id = p_user and lower(u.email) = i.email
      and i.accepted_at is null and i.revoked_at is null;
  if not found then raise exception 'Invitation could not be bound'; end if;
end;
$$;

create function public.cancel_invitation(p_actor uuid, p_invitation uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_admin(p_actor);
  perform private.lock_capacity();
  update public.invitations set revoked_at = now() where id = p_invitation and accepted_at is null;
  perform private.log_action(p_actor, 'invite.revoked', p_invitation);
end;
$$;

create function public.change_member(p_actor uuid, p_user uuid, p_role public.member_role, p_status public.member_status)
returns void language plpgsql security definer set search_path = '' as $$
declare previous public.profiles;
begin
  perform private.lock_capacity();
  perform private.require_admin(p_actor);
  select * into previous from public.profiles where id = p_user for update;
  if previous.id is null then raise exception 'Member unavailable'; end if;
  update public.profiles set role = p_role, status = p_status where id = p_user;
  if previous.role is distinct from p_role then
    insert into public.notifications(user_id, kind, title, entity_id) values(p_user, 'role_changed', 'Your workspace role changed', p_user);
  end if;
  if previous.status is distinct from p_status then
    insert into public.notifications(user_id, kind, title, entity_id) values(p_user, 'status_changed', 'Your membership status changed', p_user);
  end if;
  perform private.log_action(p_actor, 'member.changed', p_user, jsonb_build_object('role', p_role, 'status', p_status));
end;
$$;

-- RLS and column grants are both used: clients cannot write protected fields.
grant select on public.profiles, public.invitations, public.workspace_settings, public.classes, public.lessons,
  public.notes, public.folders, public.files, public.saved_files, public.quizzes, public.quiz_versions,
  public.quiz_reviews, public.attempts, public.lesson_progress, public.chat_messages, public.notifications, public.activity_log to authenticated;

create policy profiles_read on public.profiles for select to authenticated using (
  id = auth.uid() or (public.is_admin() and public.has_current_policy())
);
create policy invitations_admin_read on public.invitations for select to authenticated using (public.is_admin() and public.has_current_policy());
create policy settings_read on public.workspace_settings for select to authenticated using (public.can_use_workspace());
create policy classes_read on public.classes for select to authenticated using (public.can_use_workspace());
create policy lessons_read on public.lessons for select to authenticated using (public.can_use_workspace());
create policy notes_read on public.notes for select to authenticated using (public.can_use_workspace());
create policy folders_read on public.folders for select to authenticated using (public.can_use_workspace());
create policy files_read on public.files for select to authenticated using (public.can_use_workspace() and (state = 'ready' or created_by = auth.uid() or public.is_admin()));
create policy saved_files_own_read on public.saved_files for select to authenticated using (public.can_use_workspace() and user_id = auth.uid());
create policy quizzes_read on public.quizzes for select to authenticated using (
  public.can_use_workspace() and (published_version_id is not null or created_by = auth.uid() or public.is_admin())
);
create policy versions_read on public.quiz_versions for select to authenticated using (
  public.can_use_workspace() and (status = 'published' or created_by = auth.uid() or public.is_admin()
    or exists(select 1 from public.attempts a where a.quiz_version_id = quiz_versions.id and a.user_id = auth.uid()))
);
create policy reviews_read on public.quiz_reviews for select to authenticated using (
  public.can_use_workspace() and (public.is_admin() or exists(select 1 from public.quiz_versions v where v.id = quiz_version_id and v.created_by = auth.uid()))
);
create policy attempts_own_read on public.attempts for select to authenticated using (public.can_use_workspace() and user_id = auth.uid());
create policy progress_own_read on public.lesson_progress for select to authenticated using (public.can_use_workspace() and user_id = auth.uid());
create policy chat_read on public.chat_messages for select to authenticated using (public.can_use_workspace());
create policy notifications_own_read on public.notifications for select to authenticated using (public.can_use_workspace() and user_id = auth.uid());
create policy activity_admin_read on public.activity_log for select to authenticated using (public.is_admin() and public.has_current_policy());

revoke execute on all functions in schema public from public, anon, authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function public.public_policy_settings() to anon, authenticated;
grant execute on function public.is_approved(), public.is_admin(), public.has_current_policy(), public.can_use_workspace(),
  public.invitation_context(), public.accept_invitation(text,text,text,boolean), public.accept_policy(text,boolean),
  public.update_my_profile(text,text,smallint,text), public.member_directory() to authenticated;
grant execute on function public.reserve_invitation(uuid,text,public.member_role,boolean), public.bind_invitation(uuid,uuid),
  public.cancel_invitation(uuid,uuid), public.change_member(uuid,uuid,public.member_role,public.member_status) to service_role;
