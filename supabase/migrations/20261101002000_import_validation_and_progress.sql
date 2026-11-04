create or replace function private.validate_private_import(payload jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare item jsonb; answers jsonb;
begin
  if jsonb_typeof(payload) is distinct from 'object' or not(payload?&array['attempts','lesson_progress','saved_files']) or (select count(*) from jsonb_object_keys(payload))<>3 or octet_length(payload::text)>52428800 then return false; end if;
  if jsonb_typeof(payload->'attempts') is distinct from 'array' or jsonb_typeof(payload->'lesson_progress') is distinct from 'array' or jsonb_typeof(payload->'saved_files') is distinct from 'array' then return false; end if;
  if jsonb_array_length(payload->'attempts')>100000 or jsonb_array_length(payload->'lesson_progress')>100000 or jsonb_array_length(payload->'saved_files')>100000 then return false; end if;
  for item in select value from jsonb_array_elements(payload->'attempts') loop
    if jsonb_typeof(item)<>'object' or not(item?&array['id','user_id','quiz_version_id','score','max_score','answers','summary','started_at','completed_at']) or (select count(*) from jsonb_object_keys(item))<>9 then return false; end if;
    if exists(select 1 from jsonb_each(item) e where e.key<>'answers' and e.value='null') then return false; end if;
    if jsonb_typeof(item->'score')<>'number' or jsonb_typeof(item->'max_score')<>'number' or jsonb_typeof(item->'summary')<>'boolean' then return false; end if;
    if (item->>'score')::numeric<0 or (item->>'max_score')::numeric<=0 or (item->>'score')::numeric>(item->>'max_score')::numeric or (item->>'max_score')::numeric>1000000 or (item->>'started_at')::timestamptz>(item->>'completed_at')::timestamptz then return false; end if;
    perform (item->>'id')::uuid,(item->>'user_id')::uuid,(item->>'quiz_version_id')::uuid;
    answers:=item->'answers';
    if answers<>'null' then
      if jsonb_typeof(answers)<>'object' or octet_length(answers::text)>1048576 then return false; end if;
      if answers<>'{"html_report":true}'::jsonb then
        if not(answers?&array['responses','question_ids']) or (select count(*) from jsonb_object_keys(answers))<>2 or jsonb_typeof(answers->'responses')<>'object' or jsonb_typeof(answers->'question_ids')<>'array' or jsonb_array_length(answers->'question_ids')>1000 then return false; end if;
        if exists(select 1 from jsonb_array_elements(answers->'question_ids') q where jsonb_typeof(q)<>'string' or char_length(q#>>'{}')>80) then return false; end if;
      end if;
    end if;
    if (item->>'summary')::boolean and answers<>'null' then return false; end if;
  end loop;
  for item in select value from jsonb_array_elements(payload->'lesson_progress') loop
    if jsonb_typeof(item)<>'object' or not(item?&array['user_id','lesson_id','status','confidence','reflection','updated_at']) or (select count(*) from jsonb_object_keys(item))<>6 then return false; end if;
    if exists(select 1 from jsonb_each(item) e where e.key<>'confidence' and e.value='null') or item->>'status' not in ('not_started','in_progress','complete') or jsonb_typeof(item->'reflection')<>'string' or octet_length(item->>'reflection')>20000 then return false; end if;
    if item->'confidence'<>'null' and (jsonb_typeof(item->'confidence')<>'number' or (item->>'confidence')::numeric<>trunc((item->>'confidence')::numeric) or (item->>'confidence')::integer not between 1 and 5) then return false; end if;
    perform (item->>'user_id')::uuid,(item->>'lesson_id')::uuid,(item->>'updated_at')::timestamptz;
  end loop;
  for item in select value from jsonb_array_elements(payload->'saved_files') loop
    if jsonb_typeof(item)<>'object' or not(item?&array['user_id','file_id','created_at']) or (select count(*) from jsonb_object_keys(item))<>3 or exists(select 1 from jsonb_each(item) e where e.value='null') then return false; end if;
    perform (item->>'user_id')::uuid,(item->>'file_id')::uuid,(item->>'created_at')::timestamptz;
  end loop;
  return true;
exception when others then return false;
end;
$$;

-- Client column grants exclude updated_at. Trusted imports can preserve dates;
-- ordinary edits continue to advance them, keeping Merge's newer-wins rule.
create or replace function private.touch_progress() returns trigger language plpgsql set search_path='' as $$
begin
  new.updated_at:=case when new.updated_at is distinct from old.updated_at then least(new.updated_at,now()) else now() end;
  return new;
end;
$$;

create or replace function public.my_attempts(p_class uuid default null,p_page integer default 0) returns setof public.attempts
language sql stable security invoker set search_path='' as $$
  select a.* from public.attempts a
  join public.quiz_versions v on v.id=a.quiz_version_id join public.quizzes q on q.id=v.quiz_id
  where a.user_id=auth.uid() and (p_class is null or q.class_id=p_class)
  order by a.completed_at desc,a.id desc limit 25 offset greatest(0,least(p_page,100000))*25;
$$;
revoke execute on function public.my_attempts(uuid,integer) from public,anon,authenticated;
grant execute on function public.my_attempts(uuid,integer) to authenticated;

create or replace function private.valid_links(value jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare item jsonb;
begin
  if jsonb_typeof(value) is distinct from 'array' or jsonb_array_length(value)>30 then return false; end if;
  for item in select v from jsonb_array_elements(value) v loop
    if jsonb_typeof(item)<>'object' or not(item?&array['label','url']) or (select count(*) from jsonb_object_keys(item))<>2 then return false; end if;
    if jsonb_typeof(item->'label') is distinct from 'string' or jsonb_typeof(item->'url') is distinct from 'string' or char_length(item->>'label') not between 1 and 200 or char_length(item->>'url') not between 1 and 2048 or item->>'url' !~ '^https?://[^[:space:]]+$' then return false; end if;
  end loop;
  return true;
end;
$$;

create or replace function public.preview_private_import(p_payload jsonb,p_mode text) returns jsonb language plpgsql security definer set search_path='' as $$
declare version_ids uuid[];
begin
  if not public.can_use_workspace() then raise exception 'Membership unavailable' using errcode='42501'; end if;
  if coalesce(p_mode,'') not in ('merge','replace') or not private.validate_private_import(p_payload) then raise exception 'Invalid backup' using errcode='23514'; end if;
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
create or replace function public.import_private_data(p_payload jsonb,p_mode text,p_confirm boolean) returns void language plpgsql security definer set search_path='' as $$
declare version_ids uuid[]; saved_count bigint;
begin
  if not public.can_use_workspace() then raise exception 'Membership unavailable' using errcode='42501'; end if;
  if p_confirm is distinct from true or coalesce(p_mode,'') not in ('merge','replace') or not private.validate_private_import(p_payload) then raise exception 'Invalid import confirmation' using errcode='23514'; end if;
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
