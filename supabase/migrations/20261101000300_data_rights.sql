create function public.export_my_data() returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  if not public.can_use_workspace() then raise exception 'Membership unavailable' using errcode = '42501'; end if;
  select jsonb_build_object(
    'format_version', 1, 'exported_at', now(),
    'profile', (select to_jsonb(p) from public.profiles p where id = auth.uid()),
    'email', (select email from auth.users where id = auth.uid()),
    'chat_messages', coalesce((select jsonb_agg(to_jsonb(m)) from public.chat_messages m where user_id = auth.uid()), '[]'),
    'uploads', coalesce((select jsonb_agg(to_jsonb(f)) from public.files f where created_by = auth.uid()), '[]'),
    'attempts', coalesce((select jsonb_agg(to_jsonb(a)) from public.attempts a where user_id = auth.uid()), '[]'),
    'lesson_progress', coalesce((select jsonb_agg(to_jsonb(p)) from public.lesson_progress p where user_id = auth.uid()), '[]'),
    'saved_files', coalesce((select jsonb_agg(to_jsonb(s)) from public.saved_files s where user_id = auth.uid()), '[]'),
    'notifications', coalesce((select jsonb_agg(to_jsonb(n)) from public.notifications n where user_id = auth.uid()), '[]')
  ) into result;
  return result;
end;
$$;

create function public.prepare_account_deletion(p_actor uuid, p_user uuid, p_remove_shared boolean default false)
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

create function public.export_workspace(p_actor uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_admin(p_actor);
  perform private.log_action(p_actor, 'workspace.exported', null);
  return jsonb_build_object(
    'format_version', 1, 'exported_at', now(),
    'settings', (select to_jsonb(s) from public.workspace_settings s where id),
    'classes', coalesce((select jsonb_agg(to_jsonb(c)) from public.classes c), '[]'),
    'lessons', coalesce((select jsonb_agg(to_jsonb(l)) from public.lessons l), '[]'),
    'notes', coalesce((select jsonb_agg(to_jsonb(n)) from public.notes n), '[]'),
    'folders', coalesce((select jsonb_agg(to_jsonb(f)) from public.folders f), '[]'),
    'files', coalesce((select jsonb_agg(to_jsonb(f)) from public.files f), '[]'),
    'quizzes', coalesce((select jsonb_agg(to_jsonb(q)) from public.quizzes q), '[]'),
    'quiz_versions', coalesce((select jsonb_agg(to_jsonb(v)) from public.quiz_versions v), '[]'),
    'quiz_reviews', coalesce((select jsonb_agg(to_jsonb(r)) from public.quiz_reviews r), '[]'),
    'chat_messages', coalesce((select jsonb_agg(to_jsonb(m)) from public.chat_messages m), '[]'),
    'activity_log', coalesce((select jsonb_agg(to_jsonb(a)) from public.activity_log a), '[]')
  );
end;
$$;
revoke execute on function public.export_my_data(), public.prepare_account_deletion(uuid,uuid,boolean), public.export_workspace(uuid) from public, anon, authenticated;
grant execute on function public.export_my_data() to authenticated;
grant execute on function public.prepare_account_deletion(uuid,uuid,boolean), public.export_workspace(uuid) to service_role;
