create function private.validate_private_import(payload jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare item jsonb;
begin
  if jsonb_typeof(payload)<>'object' or not(payload?&array['attempts','lesson_progress','saved_files']) or (select count(*) from jsonb_object_keys(payload))<>3 or octet_length(payload::text)>52428800 then return false; end if;
  if jsonb_typeof(payload->'attempts')<>'array' or jsonb_typeof(payload->'lesson_progress')<>'array' or jsonb_typeof(payload->'saved_files')<>'array' then return false; end if;
  if jsonb_array_length(payload->'attempts')>100000 or jsonb_array_length(payload->'lesson_progress')>100000 or jsonb_array_length(payload->'saved_files')>100000 then return false; end if;
  for item in select value from jsonb_array_elements(payload->'attempts') loop
    if jsonb_typeof(item)<>'object' or not(item?&array['id','user_id','quiz_version_id','score','max_score','answers','summary','started_at','completed_at']) or (select count(*) from jsonb_object_keys(item))<>10 then return false; end if;
    if (item->>'score')::numeric<0 or (item->>'max_score')::numeric<=0 or (item->>'score')::numeric>(item->>'max_score')::numeric or (item->>'max_score')::numeric>1000000 or (item->>'started_at')::timestamptz>(item->>'completed_at')::timestamptz then return false; end if;
    perform (item->>'id')::uuid,(item->>'user_id')::uuid,(item->>'quiz_version_id')::uuid,(item->>'summary')::boolean;
  end loop;
  for item in select value from jsonb_array_elements(payload->'lesson_progress') loop
    if jsonb_typeof(item)<>'object' or not(item?&array['user_id','lesson_id','status','confidence','reflection','updated_at']) or (select count(*) from jsonb_object_keys(item))<>6 then return false; end if;
    perform (item->>'user_id')::uuid,(item->>'lesson_id')::uuid,(item->>'updated_at')::timestamptz;
  end loop;
  for item in select value from jsonb_array_elements(payload->'saved_files') loop
    if jsonb_typeof(item)<>'object' or not(item?&array['user_id','file_id','created_at']) or (select count(*) from jsonb_object_keys(item))<>3 then return false; end if;
    perform (item->>'user_id')::uuid,(item->>'file_id')::uuid,(item->>'created_at')::timestamptz;
  end loop;
  return true;
exception when others then return false;
end;
$$;
create function public.preview_private_import(p_payload jsonb,p_mode text) returns jsonb language plpgsql security definer set search_path='' as $$
declare version_ids uuid[];
begin
  if not public.can_use_workspace() then raise exception 'Membership unavailable' using errcode='42501'; end if;
  if p_mode not in ('merge','replace') or not private.validate_private_import(p_payload) then raise exception 'Invalid backup' using errcode='23514'; end if;
  select array_agg(id) into version_ids from public.quiz_versions v where status='published' or created_by=auth.uid() or public.is_admin() or exists(select 1 from public.attempts a where a.quiz_version_id=v.id and a.user_id=auth.uid());
  return jsonb_build_object(
    'attempts', (select count(*) from jsonb_array_elements(p_payload->'attempts') a where (a->>'quiz_version_id')::uuid=any(version_ids)),
    'lesson_progress', (select count(*) from jsonb_array_elements(p_payload->'lesson_progress') p where exists(select 1 from public.lessons where id=(p->>'lesson_id')::uuid)),
    'saved_files', (select count(distinct s->>'file_id') from jsonb_array_elements(p_payload->'saved_files') s where exists(select 1 from public.files where id=(s->>'file_id')::uuid and state='ready' and purpose='vault')),
    'existing_attempts', (select count(*) from public.attempts where user_id=auth.uid()),
    'existing_progress', (select count(*) from public.lesson_progress where user_id=auth.uid()),
    'existing_saved', (select count(*) from public.saved_files where user_id=auth.uid())
  );
end;
$$;
create function public.import_private_data(p_payload jsonb,p_mode text,p_confirm boolean) returns void language plpgsql security definer set search_path='' as $$
declare version_ids uuid[]; saved_count bigint;
begin
  if not public.can_use_workspace() then raise exception 'Membership unavailable' using errcode='42501'; end if;
  if p_confirm is distinct from true or p_mode not in ('merge','replace') or not private.validate_private_import(p_payload) then raise exception 'Invalid import confirmation' using errcode='23514'; end if;
  perform private.lock_capacity();
  -- Capture visible historical versions before Replace deletes the old attempts.
  select array_agg(id) into version_ids from public.quiz_versions v where status='published' or created_by=auth.uid() or public.is_admin() or exists(select 1 from public.attempts a where a.quiz_version_id=v.id and a.user_id=auth.uid());
  if p_mode='replace' then
    delete from public.attempts where user_id=auth.uid();delete from public.lesson_progress where user_id=auth.uid();delete from public.saved_files where user_id=auth.uid();
  end if;
  select count(*) into saved_count from (
    select file_id from public.saved_files where user_id=auth.uid() union
    select (s->>'file_id')::uuid from jsonb_array_elements(p_payload->'saved_files') s where exists(select 1 from public.files where id=(s->>'file_id')::uuid and state='ready' and purpose='vault')
  ) combined;
  if saved_count>private.limit_value('saved_files') then raise exception 'Saved file limit reached' using errcode='23514'; end if;
  insert into public.attempts(id,user_id,quiz_version_id,score,max_score,answers,summary,started_at,completed_at)
    select (a->>'id')::uuid,auth.uid(),(a->>'quiz_version_id')::uuid,(a->>'score')::numeric,(a->>'max_score')::numeric,nullif(a->'answers','null'::jsonb),(a->>'summary')::boolean,(a->>'started_at')::timestamptz,least((a->>'completed_at')::timestamptz,now())
    from jsonb_array_elements(p_payload->'attempts') a where (a->>'quiz_version_id')::uuid=any(version_ids)
      and not exists(select 1 from public.attempts where id=(a->>'id')::uuid) on conflict(id) do nothing;
  insert into public.lesson_progress(user_id,lesson_id,status,confidence,reflection,updated_at)
    select auth.uid(),(p->>'lesson_id')::uuid,p->>'status',(p->>'confidence')::smallint,p->>'reflection',least((p->>'updated_at')::timestamptz,now())
    from jsonb_array_elements(p_payload->'lesson_progress') p where exists(select 1 from public.lessons where id=(p->>'lesson_id')::uuid)
    on conflict(user_id,lesson_id) do update set status=excluded.status,confidence=excluded.confidence,reflection=excluded.reflection,updated_at=excluded.updated_at where excluded.updated_at>public.lesson_progress.updated_at;
  insert into public.saved_files(user_id,file_id,created_at)
    select distinct auth.uid(),(s->>'file_id')::uuid,now() from jsonb_array_elements(p_payload->'saved_files') s
      where exists(select 1 from public.files where id=(s->>'file_id')::uuid and state='ready' and purpose='vault')
      and not exists(select 1 from public.saved_files where user_id=auth.uid() and file_id=(s->>'file_id')::uuid) on conflict do nothing;
end;
$$;
revoke execute on function private.validate_private_import(jsonb),public.preview_private_import(jsonb,text),public.import_private_data(jsonb,text,boolean) from public,anon,authenticated;
grant execute on function public.preview_private_import(jsonb,text),public.import_private_data(jsonb,text,boolean) to authenticated;
