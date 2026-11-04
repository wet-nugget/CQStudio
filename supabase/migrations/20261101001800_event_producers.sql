-- These replacements delegate notification production to the event triggers.
create or replace function public.accept_invitation(p_username text,p_display_name text,p_policy_version text,p_accepted boolean)
returns public.profiles language plpgsql security definer set search_path='' as $$
declare invite public.invitations; result public.profiles; current_version text;
begin
  perform private.lock_capacity();
  if not private.session_exists() then raise exception 'Sign in again' using errcode='42501'; end if;
  select policy_version into current_version from public.workspace_settings where id;
  if p_accepted is distinct from true or p_policy_version is distinct from current_version then raise exception 'Accept the current Privacy Policy and Terms' using errcode='23514'; end if;
  if exists(select 1 from public.profiles where id=auth.uid()) then raise exception 'Membership already exists'; end if;
  select i.* into invite from public.invitations i join auth.users u on u.id=i.auth_user_id
    where u.id=auth.uid() and u.email_confirmed_at is not null and i.email=lower(u.email) and i.accepted_at is null and i.revoked_at is null and i.expires_at>now()
    order by i.created_at desc limit 1 for update of i;
  if invite.id is null then raise exception 'Invitation unavailable' using errcode='42501'; end if;
  update public.invitations set accepted_at=now() where id=invite.id;
  insert into public.profiles(id,username,display_name,role,policy_version,policy_accepted_at)values(auth.uid(),p_username,trim(p_display_name),invite.role,current_version,now())returning * into result;
  perform private.log_action(result.id,'invite.accepted',invite.id);
  return result;
end;
$$;
create or replace function public.change_member(p_actor uuid,p_user uuid,p_role public.member_role,p_status public.member_status)
returns void language plpgsql security definer set search_path='' as $$
begin
  perform private.lock_capacity();perform private.require_admin(p_actor);
  update public.profiles set role=p_role,status=p_status where id=p_user;
  if not found then raise exception 'Member unavailable'; end if;
  perform private.log_action(p_actor,'member.changed',p_user,jsonb_build_object('role',p_role,'status',p_status));
end;
$$;
create or replace function public.submit_quiz(p_version uuid) returns void language plpgsql security definer set search_path='' as $$
declare version public.quiz_versions;
begin
  if not public.can_use_workspace() then raise exception 'Membership unavailable' using errcode='42501'; end if;
  perform private.lock_capacity();select * into version from public.quiz_versions where id=p_version for update;
  if version.id is null or (version.created_by is distinct from auth.uid() and not public.is_admin()) or version.status not in ('draft','rejected') then raise exception 'Submission unavailable' using errcode='42501'; end if;
  if (select count(*) from public.quiz_versions where created_by=auth.uid() and status='pending')>=private.limit_value('pending_submissions') then raise exception 'Pending submission limit reached' using errcode='23514'; end if;
  update public.quiz_versions set status='pending' where id=p_version;
end;
$$;
create or replace function public.review_quiz(p_actor uuid,p_version uuid,p_decision text,p_note text) returns void language plpgsql security definer set search_path='' as $$
declare version public.quiz_versions;
begin
  perform private.lock_capacity();perform private.require_admin(p_actor);select * into version from public.quiz_versions where id=p_version for update;
  if version.id is null or version.status<>'pending' or p_decision is null or p_decision not in ('published','rejected') then raise exception 'Review unavailable' using errcode='23514'; end if;
  update public.quiz_versions set status=p_decision::public.quiz_status where id=p_version;
  insert into public.quiz_reviews(quiz_version_id,reviewer_id,decision,note)values(p_version,p_actor,p_decision,p_note);
  if p_decision='published' then update public.quizzes set published_version_id=p_version where id=version.quiz_id;end if;
  perform private.log_action(p_actor,'quiz.reviewed',p_version,jsonb_build_object('decision',p_decision));
end;
$$;
create or replace function public.unpublish_quiz(p_actor uuid,p_quiz uuid,p_delete boolean default false) returns void language plpgsql security definer set search_path='' as $$
begin
  perform private.lock_capacity();perform private.require_admin(p_actor);
  update public.quizzes set published_version_id=null where id=p_quiz;
  update public.quiz_versions set status='rejected' where quiz_id=p_quiz and status='published';
  if p_delete then delete from public.quizzes where id=p_quiz;end if;
  perform private.log_action(p_actor,case when p_delete then 'quiz.deleted' else 'quiz.unpublished' end,p_quiz);
end;
$$;
create function private.guard_retention_change() returns trigger language plpgsql set search_path='' as $$
begin
  if (new.limits->'chat_days' is distinct from old.limits->'chat_days' or new.limits->'activity_days' is distinct from old.limits->'activity_days' or new.limits->'notification_days' is distinct from old.limits->'notification_days' or new.limits->'full_attempts' is distinct from old.limits->'full_attempts') and new.policy_version=old.policy_version then raise exception 'Retention changes require a new policy version' using errcode='23514';end if;
  return new;
end;
$$;
create trigger settings_retention_policy before update on public.workspace_settings for each row execute function private.guard_retention_change();
revoke execute on function private.guard_retention_change() from public,anon,authenticated;
