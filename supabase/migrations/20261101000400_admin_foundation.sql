create function public.workspace_usage() returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not (public.is_admin() and public.has_current_policy()) then raise exception 'Administrator required' using errcode = '42501'; end if;
  return jsonb_build_object(
    'approved_members', (select count(*) from public.profiles where status = 'approved'),
    'admins', (select count(*) from public.profiles where status = 'approved' and role = 'admin'),
    'open_invites', (select count(*) from public.invitations where accepted_at is null and revoked_at is null and expires_at > now()),
    'storage_bytes', (select coalesce(sum(size),0) from public.files),
    'database_bytes', pg_database_size(current_database()),
    'classes', (select count(*) from public.classes),
    'lessons', (select count(*) from public.lessons),
    'notes', (select count(*) from public.notes),
    'quizzes', (select count(*) from public.quizzes),
    'files', (select count(*) from public.files),
    'top_storage_users', coalesce((select jsonb_agg(to_jsonb(t)) from (
      select p.id, p.display_name, sum(f.size) as bytes from public.files f join public.profiles p on p.id = f.created_by
      group by p.id,p.display_name order by sum(f.size) desc limit 5
    ) t), '[]')
  );
end;
$$;

create function public.update_settings(p_actor uuid, p_name text, p_policy_version text, p_limits jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare usage jsonb; previous_limits jsonb;
begin
  perform private.lock_capacity();
  perform private.require_admin(p_actor);
  if not private.valid_limits(p_limits) then raise exception 'Invalid limits' using errcode = '23514'; end if;
  select limits into previous_limits from public.workspace_settings where id;
  if (p_limits->>'members')::bigint < (select count(*) from public.profiles where status = 'approved') +
      (select count(*) from public.invitations where accepted_at is null and revoked_at is null and expires_at > now())
    or (p_limits->>'admins')::bigint < (select count(*) from public.profiles where status = 'approved' and role = 'admin') +
      (select count(*) from public.invitations where role = 'admin' and accepted_at is null and revoked_at is null and expires_at > now())
    or (p_limits->>'open_invites')::bigint < (select count(*) from public.invitations where accepted_at is null and revoked_at is null and expires_at > now())
    or (p_limits->>'total_bytes')::bigint < (select coalesce(sum(size),0) from public.files)
    or (p_limits->>'classes')::bigint < (select count(*) from public.classes)
    or exists(select 1 from public.files where size > case when purpose = 'html_quiz' then (p_limits->>'html_bytes')::bigint else (p_limits->>'file_bytes')::bigint end)
    or exists(select 1 from public.files f join public.profiles p on p.id = f.created_by where p.role <> 'admin' group by p.id having sum(f.size) > (p_limits->>'member_bytes')::bigint)
    or exists(select 1 from public.lessons group by class_id having count(*) > (p_limits->>'lessons_per_class')::bigint)
    or exists(select 1 from public.notes group by class_id having count(*) > (p_limits->>'notes_per_class')::bigint)
    or exists(select 1 from public.quizzes group by class_id having count(*) > (p_limits->>'quizzes_per_class')::bigint)
    or exists(select 1 from public.lessons where octet_length(markdown) > (p_limits->>'lesson_bytes')::bigint)
    or exists(select 1 from public.notes where octet_length(body) + octet_length(links::text) > (p_limits->>'note_bytes')::bigint)
    or exists(select 1 from public.saved_files group by user_id having count(*) > (p_limits->>'saved_files')::bigint)
    or exists(select 1 from public.files where purpose = 'vault' group by folder_id having count(*) > (p_limits->>'files_per_folder')::bigint)
    or exists(select 1 from public.quiz_versions where status = 'pending' group by created_by having count(*) > (p_limits->>'pending_submissions')::bigint)
    or exists(select 1 from public.quiz_versions where kind = 'manual' and jsonb_array_length(content->'questions') > (p_limits->>'questions_per_quiz')::bigint)
    or exists(with recursive tree as (
      select id,1 as depth from public.folders where parent_id is null union all
      select f.id,t.depth+1 from public.folders f join tree t on f.parent_id=t.id
    ) select 1 from tree where depth > (p_limits->>'folder_depth')::bigint)
  then raise exception 'A limit cannot be below current usage' using errcode = '23514'; end if;
  update public.workspace_settings set name = trim(p_name), policy_version = p_policy_version, limits = p_limits, updated_at = now() where id;
  perform private.log_action(p_actor, 'settings.changed', null, jsonb_build_object('policy_version',p_policy_version,'limits_changed',previous_limits is distinct from p_limits));
end;
$$;

-- This job never deletes Storage metadata. Actual object deletion must use the
-- Storage API, invoked by a separately scheduled maintenance Edge Function.
create function public.apply_retention() returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.chat_messages where created_at < now() - make_interval(days => private.limit_value('chat_days')::integer);
  delete from public.activity_log where created_at < now() - make_interval(days => private.limit_value('activity_days')::integer);
  delete from public.notifications where created_at < now() - make_interval(days => private.limit_value('notification_days')::integer);
  delete from public.invitations where accepted_at is null and expires_at < now() - make_interval(days => private.limit_value('activity_days')::integer);
  with ranked as (
    select a.id, row_number() over(partition by a.user_id,v.quiz_id order by a.completed_at desc,a.id desc) as position
    from public.attempts a join public.quiz_versions v on v.id=a.quiz_version_id
  ) update public.attempts a set answers = null, summary = true from ranked r
    where a.id=r.id and r.position > private.limit_value('full_attempts') and not a.summary;
end;
$$;

create extension if not exists pg_cron;
select cron.schedule('cqstudio-retention','17 3 * * *','select public.apply_retention()');
select cron.schedule('cqstudio-daily-touch','0 9 * * *','select count(*) from public.workspace_settings');

alter publication supabase_realtime add table public.profiles, public.chat_messages, public.notifications;

revoke execute on function public.workspace_usage(), public.update_settings(uuid,text,text,jsonb), public.apply_retention() from public, anon, authenticated;
grant execute on function public.workspace_usage() to authenticated;
grant execute on function public.update_settings(uuid,text,text,jsonb), public.apply_retention() to service_role;
