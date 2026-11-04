-- Event producers are triggers so notifications cannot be skipped by a trusted
-- write that takes a different application path. Earlier function implementations
-- are replaced below to remove their duplicate notification inserts.
create function private.notify_membership() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if TG_OP='INSERT' then
    insert into public.notifications(user_id,kind,title,entity_id) select id,'invite_accepted','An invited member joined the workspace',new.id from public.profiles where role='admin' and status='approved';
  else
    if new.role is distinct from old.role then insert into public.notifications(user_id,kind,title,entity_id)values(new.id,'role_changed','Your workspace role changed',new.id);end if;
    if new.status is distinct from old.status then insert into public.notifications(user_id,kind,title,entity_id)values(new.id,'status_changed','Your membership status changed',new.id);end if;
  end if;
  return new;
end;
$$;
create trigger membership_notifications after insert or update on public.profiles for each row execute function private.notify_membership();
create function private.notify_quiz() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.status='pending' and old.status<>'pending' then
    insert into public.notifications(user_id,kind,title,entity_id)select id,'quiz_submitted','A quiz is ready for review',new.id from public.profiles where role='admin' and status='approved';
  elsif new.status in ('published','rejected') and old.status='pending' then
    if new.created_by is not null then insert into public.notifications(user_id,kind,title,entity_id)values(new.created_by,'quiz_reviewed','Your quiz was reviewed',new.quiz_id);end if;
    if new.status='published' then insert into public.notifications(user_id,kind,title,entity_id)select id,'quiz_published','A new quiz is ready to practice',new.quiz_id from public.profiles where status='approved';end if;
  elsif old.status='published' and new.status<>'published' then
    insert into public.notifications(user_id,kind,title,entity_id)select id,'quiz_reviewed','A quiz was unpublished',new.id from public.profiles where status='approved';
  end if;
  return new;
end;
$$;
create trigger quiz_notifications after update of status on public.quiz_versions for each row execute function private.notify_quiz();

create index lessons_search_idx on public.lessons using gin(to_tsvector('simple',title||' '||markdown));
create index notes_search_idx on public.notes using gin(to_tsvector('simple',title||' '||body));
create index quizzes_search_idx on public.quizzes using gin(to_tsvector('simple',title));
create index files_search_idx on public.files using gin(to_tsvector('simple',name||' '||description));
create function public.global_search(p_term text,p_page integer default 0) returns jsonb language sql stable security invoker set search_path='' as $$
  select coalesce(jsonb_agg(to_jsonb(result)),'[]') from (
    select * from (
      select l.title,'Lesson' as kind,'/lessons/'||l.id as url,l.updated_at as updated from public.lessons l where to_tsvector('simple',l.title||' '||l.markdown)@@plainto_tsquery('simple',left(p_term,100))
      union all select n.title,'Note','/classes/'||n.class_id||'/notes',n.updated_at from public.notes n where to_tsvector('simple',n.title||' '||n.body)@@plainto_tsquery('simple',left(p_term,100))
      union all select q.title,'Quiz','/quizzes/'||q.id,q.created_at from public.quizzes q where to_tsvector('simple',q.title)@@plainto_tsquery('simple',left(p_term,100))
      union all select f.name,'File',case when f.folder_id is null then '/vault' else '/vault/folders/'||f.folder_id end,f.created_at from public.files f where f.state='ready' and f.purpose='vault' and to_tsvector('simple',f.name||' '||f.description)@@plainto_tsquery('simple',left(p_term,100))
    ) matches where public.can_use_workspace() and char_length(trim(p_term)) between 2 and 100
    order by updated desc,title limit 25 offset greatest(0,least(p_page,10000))*25
  ) result;
$$;
revoke execute on function private.notify_membership(),private.notify_quiz(),public.global_search(text,integer) from public,anon,authenticated;
grant execute on function public.global_search(text,integer) to authenticated;
