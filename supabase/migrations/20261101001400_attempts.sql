create function public.record_attempt(p_id uuid,p_version uuid,p_score numeric,p_max numeric,p_answers jsonb,p_started timestamptz)
returns uuid language plpgsql security definer set search_path='' as $$
declare existing public.attempts;
begin
  if not public.can_use_workspace() then raise exception 'Membership unavailable' using errcode='42501'; end if;
  if not exists(select 1 from public.quiz_versions where id=p_version and status='published') then raise exception 'Quiz is not published' using errcode='42501'; end if;
  if p_max>1000000 or p_started>now() or jsonb_typeof(p_answers)<>'object' then raise exception 'Invalid attempt' using errcode='23514'; end if;
  insert into public.attempts(id,user_id,quiz_version_id,score,max_score,answers,started_at)
    values(p_id,auth.uid(),p_version,p_score,p_max,p_answers,p_started) on conflict(id) do nothing;
  select * into existing from public.attempts where id=p_id;
  if existing.user_id is distinct from auth.uid() or existing.quiz_version_id is distinct from p_version then raise exception 'Attempt unavailable' using errcode='42501'; end if;
  return existing.id;
end;
$$;
create function private.summarize_attempts() returns trigger language plpgsql security definer set search_path='' as $$
declare quiz uuid;
begin
  select quiz_id into quiz from public.quiz_versions where id=new.quiz_version_id;
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text||quiz::text,0));
  with ranked as(select a.id,row_number() over(order by a.completed_at desc,a.id desc) as position from public.attempts a join public.quiz_versions v on v.id=a.quiz_version_id where a.user_id=new.user_id and v.quiz_id=quiz)
  update public.attempts a set answers=null,summary=true from ranked r where a.id=r.id and r.position>private.limit_value('full_attempts') and not a.summary;
  return new;
end;
$$;
create trigger attempts_retention after insert on public.attempts for each row execute function private.summarize_attempts();
revoke execute on function public.record_attempt(uuid,uuid,numeric,numeric,jsonb,timestamptz),private.summarize_attempts() from public,anon,authenticated;
grant execute on function public.record_attempt(uuid,uuid,numeric,numeric,jsonb,timestamptz) to authenticated;
