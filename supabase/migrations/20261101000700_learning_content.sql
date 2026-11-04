create function private.valid_links(value jsonb) returns boolean language sql immutable set search_path = '' as $$
  select jsonb_typeof(value)='array' and jsonb_array_length(value)<=30 and not exists(
    select 1 from jsonb_array_elements(value) e where jsonb_typeof(e)<>'object'
      or not (e ?& array['label','url']) or (select count(*) from jsonb_object_keys(e))<>2
      or char_length(e->>'label') not between 1 and 200 or char_length(e->>'url') not between 1 and 2048
      or (e->>'url') !~ '^https?://[^[:space:]]+$'
  );
$$;
alter table public.notes add constraint notes_links_valid check(private.valid_links(links));

create function private.enforce_learning_limits() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.lock_capacity();
  if TG_TABLE_NAME='classes' then
    if TG_OP='INSERT' and (select count(*) from public.classes)>=private.limit_value('classes') then raise exception 'Class capacity reached' using errcode='23514'; end if;
  elsif TG_TABLE_NAME='lessons' then
    if octet_length(new.markdown)>private.limit_value('lesson_bytes') then raise exception 'Lesson is too large' using errcode='23514'; end if;
    if (select count(*) from public.lessons where class_id=new.class_id and id<>new.id)>=private.limit_value('lessons_per_class') then raise exception 'Lesson capacity reached' using errcode='23514'; end if;
  elsif TG_TABLE_NAME='notes' then
    if octet_length(new.body)+octet_length(new.links::text)>private.limit_value('note_bytes') then raise exception 'Note is too large' using errcode='23514'; end if;
    if (select count(*) from public.notes where class_id=new.class_id and id<>new.id)>=private.limit_value('notes_per_class') then raise exception 'Note capacity reached' using errcode='23514'; end if;
  end if;
  new.updated_at:=now();
  return new;
end;
$$;
create trigger classes_capacity before insert or update on public.classes for each row execute function private.enforce_learning_limits();
create trigger lessons_capacity before insert or update on public.lessons for each row execute function private.enforce_learning_limits();
create trigger notes_capacity before insert or update on public.notes for each row execute function private.enforce_learning_limits();

grant insert(name,teacher_subject,description,icon,folder_id,created_by), update(name,teacher_subject,description,icon,folder_id), delete on public.classes to authenticated;
grant insert(class_id,title,markdown,created_by), update(title,markdown), delete on public.lessons to authenticated;
grant insert(class_id,title,body,links,created_by), update(title,body,links), delete on public.notes to authenticated;

create policy classes_create on public.classes for insert to authenticated with check(public.can_use_workspace() and created_by=auth.uid());
create policy classes_edit on public.classes for update to authenticated using(public.can_use_workspace() and (created_by=auth.uid() or public.is_admin())) with check(public.can_use_workspace());
create policy classes_delete on public.classes for delete to authenticated using(public.can_use_workspace() and public.is_admin());
create policy lessons_create on public.lessons for insert to authenticated with check(public.can_use_workspace() and created_by=auth.uid());
create policy lessons_edit on public.lessons for update to authenticated using(public.can_use_workspace() and (created_by=auth.uid() or public.is_admin())) with check(public.can_use_workspace());
create policy lessons_delete on public.lessons for delete to authenticated using(public.can_use_workspace() and public.is_admin());
create policy notes_create on public.notes for insert to authenticated with check(public.can_use_workspace() and created_by=auth.uid());
create policy notes_edit on public.notes for update to authenticated using(public.can_use_workspace() and (created_by=auth.uid() or public.is_admin())) with check(public.can_use_workspace());
create policy notes_delete on public.notes for delete to authenticated using(public.can_use_workspace() and public.is_admin());

grant insert(user_id,lesson_id,status,confidence,reflection),update(user_id,lesson_id,status,confidence,reflection),delete on public.lesson_progress to authenticated;
create policy progress_own_create on public.lesson_progress for insert to authenticated with check(public.can_use_workspace() and user_id=auth.uid());
create policy progress_own_update on public.lesson_progress for update to authenticated using(public.can_use_workspace() and user_id=auth.uid()) with check(public.can_use_workspace() and user_id=auth.uid());
create policy progress_own_delete on public.lesson_progress for delete to authenticated using(public.can_use_workspace() and user_id=auth.uid());
create function private.touch_progress() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at:=now(); return new; end; $$;
create trigger progress_updated before update on public.lesson_progress for each row execute function private.touch_progress();
revoke execute on function private.valid_links(jsonb),private.enforce_learning_limits(),private.touch_progress() from public,anon,authenticated;
