-- Do not retain recipient email after account deletion or indefinitely after use.
create or replace function public.prepare_account_deletion(p_actor uuid, p_user uuid, p_remove_shared boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.lock_capacity();
  if p_actor <> p_user or p_remove_shared then perform private.require_admin(p_actor); end if;
  if not exists(select 1 from public.profiles where id = p_actor and status = 'approved') then
    raise exception 'Membership unavailable' using errcode = '42501';
  end if;
  -- This invokes the last-admin trigger before any shared deletion or Auth call.
  update public.profiles set status = 'disabled' where id = p_user;
  if not found then raise exception 'Member unavailable'; end if;
  delete from public.invitations where auth_user_id=p_user;
  if p_remove_shared then
    delete from public.classes where created_by = p_user;
    delete from public.lessons where created_by = p_user;
    delete from public.notes where created_by = p_user;
    delete from public.quizzes where created_by = p_user;
    update public.files f set state = 'deleting' where created_by = p_user
      and not exists(select 1 from public.quiz_versions v where v.html_file_id = f.id);
    -- Nonempty folders are preserved and anonymized, like shared file dependencies.
    delete from public.folders f where created_by = p_user
      and not exists(select 1 from public.folders c where c.parent_id = f.id)
      and not exists(select 1 from public.files o where o.folder_id = f.id);
  end if;
  perform private.log_action(p_actor, 'member.deletion_requested', p_user, jsonb_build_object('remove_shared', p_remove_shared));
end;
$$;


create or replace function public.apply_retention() returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.chat_messages where created_at < now() - make_interval(days => private.limit_value('chat_days')::integer);
  delete from public.activity_log where created_at < now() - make_interval(days => private.limit_value('activity_days')::integer);
  delete from public.notifications where created_at < now() - make_interval(days => private.limit_value('notification_days')::integer);
  delete from public.invitations where coalesce(accepted_at,revoked_at,expires_at) < now() - make_interval(days => private.limit_value('activity_days')::integer);
  with ranked as (
    select a.id, row_number() over(partition by a.user_id,v.quiz_id order by a.completed_at desc,a.id desc) as position
    from public.attempts a join public.quiz_versions v on v.id=a.quiz_version_id
  ) update public.attempts a set answers = null, summary = true from ranked r
    where a.id=r.id and r.position > private.limit_value('full_attempts') and not a.summary;
end;
$$;

