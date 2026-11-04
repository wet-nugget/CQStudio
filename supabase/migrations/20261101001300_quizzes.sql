create function private.text_array(value jsonb,min_items integer,max_items integer) returns boolean language sql immutable set search_path='' as $$
  select jsonb_typeof(value)='array' and jsonb_array_length(value) between min_items and max_items and not exists(
    select 1 from jsonb_array_elements(value) e where jsonb_typeof(e)<>'string' or char_length(trim(e#>>'{}')) not between 1 and 2000);
$$;
create function private.valid_quiz_content(kind text,content jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare q jsonb; key_names text[]; question_type text; option_count integer; blank_count integer;
begin
  if jsonb_typeof(content)<>'object' then return false; end if;
  if kind='html' then return (select count(*)=1 from jsonb_object_keys(content)) and jsonb_typeof(content->'path')='string' and char_length(content->>'path') between 1 and 500; end if;
  if kind<>'manual' or not(content?&array['format_version','questions']) or (select count(*) from jsonb_object_keys(content))<>2 or content->'format_version'<>'1'::jsonb or jsonb_typeof(content->'questions')<>'array' or jsonb_array_length(content->'questions') not between 1 and 1000 then return false; end if;
  if (select count(distinct e->>'id') from jsonb_array_elements(content->'questions') e)<>jsonb_array_length(content->'questions') then return false; end if;
  for q in select value from jsonb_array_elements(content->'questions') loop
    if jsonb_typeof(q)<>'object' then return false; end if;
    question_type:=q->>'type';
    key_names:=array['id','type','prompt','points']||case question_type
      when 'multiple_choice' then array['options','answer'] when 'multiple_response' then array['options','answers']
      when 'matching' then array['pairs'] when 'true_false' then array['answer']
      when 'identification' then array['accepted','case_sensitive'] when 'fill_blank' then array['accepted','case_sensitive']
      when 'enumeration' then array['accepted','case_sensitive','order_matters'] else array[]::text[] end;
    if cardinality(key_names)=4 or not(q?&key_names) or exists(select 1 from jsonb_object_keys(q) k where not(k=any(key_names))) then return false; end if;
    if jsonb_typeof(q->'id')<>'string' or (q->>'id')!~'^[a-zA-Z0-9_-]{1,80}$' or jsonb_typeof(q->'prompt')<>'string' or char_length(trim(q->>'prompt')) not between 1 and 20000 or jsonb_typeof(q->'points')<>'number' or (q->>'points')::numeric not between 1 and 100 or (q->>'points')::numeric<>trunc((q->>'points')::numeric) then return false; end if;
    if question_type in ('multiple_choice','multiple_response') then
      if not private.text_array(q->'options',2,30) then return false; end if;option_count:=jsonb_array_length(q->'options');
      if question_type='multiple_choice' then
        if jsonb_typeof(q->'answer')<>'number' or (q->>'answer')::numeric<>trunc((q->>'answer')::numeric) or (q->>'answer')::integer not between 0 and option_count-1 then return false; end if;
      else
        if jsonb_typeof(q->'answers')<>'array' or jsonb_array_length(q->'answers') not between 1 and option_count then return false; end if;
        if exists(select 1 from jsonb_array_elements(q->'answers') a where jsonb_typeof(a)<>'number' or a::text::numeric<>trunc(a::text::numeric) or a::text::integer not between 0 and option_count-1) or (select count(distinct a) from jsonb_array_elements(q->'answers') a)<>jsonb_array_length(q->'answers') then return false; end if;
      end if;
    elsif question_type='true_false' then if jsonb_typeof(q->'answer')<>'boolean' then return false; end if;
    elsif question_type='matching' then
      if jsonb_typeof(q->'pairs')<>'array' or jsonb_array_length(q->'pairs') not between 2 and 30 then return false; end if;
      if exists(select 1 from jsonb_array_elements(q->'pairs') p where jsonb_typeof(p)<>'object' or not(p?&array['left','right']) or (select count(*) from jsonb_object_keys(p))<>2 or jsonb_typeof(p->'left')<>'string' or jsonb_typeof(p->'right')<>'string' or char_length(trim(p->>'left')) not between 1 and 2000 or char_length(trim(p->>'right')) not between 1 and 2000) then return false; end if;
    else
      if jsonb_typeof(q->'case_sensitive')<>'boolean' then return false; end if;
      if question_type='enumeration' and jsonb_typeof(q->'order_matters')<>'boolean' then return false; end if;
      if question_type='fill_blank' then
        if jsonb_typeof(q->'accepted')<>'array' or jsonb_array_length(q->'accepted') not between 1 and 30 then return false; end if;
        if exists(select 1 from jsonb_array_elements(q->'accepted') a where not private.text_array(a,1,100)) then return false; end if;
        blank_count:=jsonb_array_length(q->'accepted');
        if (select array_agg((m[1])::integer) from regexp_matches(q->>'prompt','\{\{(\d+)\}\}','g') m) is distinct from array(select generate_series(1,blank_count)) then return false; end if;
      elsif not private.text_array(q->'accepted',1,100) then return false;
      end if;
    end if;
  end loop;
  return true;
exception when others then return false;
end;
$$;
create function private.valid_quiz_settings(value jsonb) returns boolean language plpgsql immutable set search_path='' as $$
begin
  return jsonb_typeof(value)='object' and value?&array['shuffle','mode','page_size','quiz_seconds','question_seconds']
    and (select count(*) from jsonb_object_keys(value))=5 and jsonb_typeof(value->'shuffle')='boolean'
    and value->>'mode' in ('paged','single') and jsonb_typeof(value->'page_size')='number' and (value->>'page_size')::numeric=trunc((value->>'page_size')::numeric) and (value->>'page_size')::integer between 1 and 50
    and (value->'quiz_seconds'='null'::jsonb or (jsonb_typeof(value->'quiz_seconds')='number' and (value->>'quiz_seconds')::numeric=trunc((value->>'quiz_seconds')::numeric) and (value->>'quiz_seconds')::integer between 5 and 86400))
    and (value->'question_seconds'='null'::jsonb or (jsonb_typeof(value->'question_seconds')='number' and (value->>'question_seconds')::numeric=trunc((value->>'question_seconds')::numeric) and (value->>'question_seconds')::integer between 5 and 3600));
exception when others then return false;
end;
$$;
alter table public.quiz_versions add constraint quiz_content_valid check(private.valid_quiz_content(kind,content));
alter table public.quiz_versions add constraint quiz_settings_valid check(private.valid_quiz_settings(settings));
create function private.guard_quiz_version() returns trigger language plpgsql security definer set search_path='' as $$
begin
  perform private.lock_capacity();
  if TG_OP='UPDATE' and (old.status='published' or exists(select 1 from public.quiz_reviews where quiz_version_id=old.id and decision='published')) and (new.content is distinct from old.content or new.settings is distinct from old.settings or new.kind is distinct from old.kind or new.html_file_id is distinct from old.html_file_id or new.quiz_id<>old.quiz_id or new.version<>old.version) then raise exception 'Published versions are immutable' using errcode='23514'; end if;
  if new.kind='manual' and jsonb_array_length(new.content->'questions')>private.limit_value('questions_per_quiz') then raise exception 'Question limit reached' using errcode='23514'; end if;
  if new.kind='html' and not exists(select 1 from public.files where id=new.html_file_id and path=new.content->>'path' and state='ready' and purpose='html_quiz') then raise exception 'HTML asset unavailable' using errcode='23514'; end if;
  return new;
end;
$$;
create trigger quiz_version_guard before insert or update on public.quiz_versions for each row execute function private.guard_quiz_version();
create function public.save_quiz(p_class uuid,p_title text,p_kind text,p_content jsonb,p_settings jsonb,p_html_file uuid default null,p_quiz uuid default null)
returns public.quiz_versions language plpgsql security definer set search_path='' as $$
declare quiz public.quizzes; version public.quiz_versions; next_version integer;
begin
  if not public.can_use_workspace() then raise exception 'Membership unavailable' using errcode='42501'; end if;
  perform private.lock_capacity();
  if p_quiz is null then
    if (select count(*) from public.quizzes where class_id=p_class)>=private.limit_value('quizzes_per_class') then raise exception 'Quiz limit reached' using errcode='23514'; end if;
    insert into public.quizzes(class_id,title,created_by) values(p_class,p_title,auth.uid()) returning * into quiz;
  else
    select * into quiz from public.quizzes where id=p_quiz for update;
    if quiz.id is null or (quiz.created_by is distinct from auth.uid() and not public.is_admin()) then raise exception 'Quiz unavailable' using errcode='42501'; end if;
    update public.quizzes set title=p_title where id=quiz.id;
  end if;
  if p_kind='html' and not exists(select 1 from public.files where id=p_html_file and created_by=auth.uid() and state='ready' and purpose='html_quiz') and not public.is_admin() then raise exception 'HTML asset unavailable' using errcode='42501'; end if;
  select v.* into version from public.quiz_versions v where v.quiz_id=quiz.id and v.status in ('draft','rejected') and not exists(select 1 from public.quiz_reviews r where r.quiz_version_id=v.id and r.decision='published') order by v.version desc limit 1;
  if version.id is not null then
    update public.quiz_versions set content=p_content,settings=p_settings,kind=p_kind,html_file_id=p_html_file,status='draft' where id=version.id returning * into version;
  else
    select coalesce(max(v.version),0)+1 into next_version from public.quiz_versions v where v.quiz_id=quiz.id;
    insert into public.quiz_versions(quiz_id,version,kind,content,settings,html_file_id,created_by) values(quiz.id,next_version,p_kind,p_content,p_settings,p_html_file,auth.uid()) returning * into version;
  end if;
  return version;
end;
$$;
create function public.submit_quiz(p_version uuid) returns void language plpgsql security definer set search_path='' as $$
declare version public.quiz_versions;
begin
  if not public.can_use_workspace() then raise exception 'Membership unavailable' using errcode='42501'; end if;
  perform private.lock_capacity();select * into version from public.quiz_versions where id=p_version for update;
  if version.id is null or (version.created_by is distinct from auth.uid() and not public.is_admin()) or version.status not in ('draft','rejected') then raise exception 'Submission unavailable' using errcode='42501'; end if;
  if (select count(*) from public.quiz_versions where created_by=auth.uid() and status='pending')>=private.limit_value('pending_submissions') then raise exception 'Pending submission limit reached' using errcode='23514'; end if;
  update public.quiz_versions set status='pending' where id=p_version;
  insert into public.notifications(user_id,kind,title,entity_id) select id,'quiz_submitted','A quiz is ready for review',p_version from public.profiles where role='admin' and status='approved';
end;
$$;
create function public.review_quiz(p_actor uuid,p_version uuid,p_decision text,p_note text) returns void language plpgsql security definer set search_path='' as $$
declare version public.quiz_versions;
begin
  perform private.lock_capacity();perform private.require_admin(p_actor);
  select * into version from public.quiz_versions where id=p_version for update;
  if version.id is null or version.status<>'pending' or p_decision not in ('published','rejected') then raise exception 'Review unavailable' using errcode='23514'; end if;
  update public.quiz_versions set status=p_decision::public.quiz_status where id=p_version;
  insert into public.quiz_reviews(quiz_version_id,reviewer_id,decision,note) values(p_version,p_actor,p_decision,p_note);
  if p_decision='published' then
    update public.quizzes set published_version_id=p_version where id=version.quiz_id;
    insert into public.notifications(user_id,kind,title,entity_id) select id,'quiz_published','A new quiz is ready to practice',version.quiz_id from public.profiles where status='approved';
  end if;
  if version.created_by is not null then insert into public.notifications(user_id,kind,title,entity_id) values(version.created_by,'quiz_reviewed','Your quiz was reviewed',version.quiz_id); end if;
  perform private.log_action(p_actor,'quiz.reviewed',p_version,jsonb_build_object('decision',p_decision));
end;
$$;
grant insert(user_id,quiz_version_id,score,max_score,answers,started_at) on public.attempts to authenticated;
create policy attempts_own_create on public.attempts for insert to authenticated with check(public.can_use_workspace() and user_id=auth.uid() and exists(select 1 from public.quiz_versions where id=quiz_version_id and status='published'));
revoke execute on function private.text_array(jsonb,integer,integer),private.valid_quiz_content(text,jsonb),private.valid_quiz_settings(jsonb),private.guard_quiz_version(),public.save_quiz(uuid,text,text,jsonb,jsonb,uuid,uuid),public.submit_quiz(uuid),public.review_quiz(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.save_quiz(uuid,text,text,jsonb,jsonb,uuid,uuid),public.submit_quiz(uuid) to authenticated;
grant execute on function public.review_quiz(uuid,uuid,text,text) to service_role;
