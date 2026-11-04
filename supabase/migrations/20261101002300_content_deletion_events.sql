create function private.notify_quiz_deletion() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if old.kind='html' then
    insert into public.notifications(user_id,kind,title,entity_id)
      select id,'quiz_reviewed','An HTML quiz version was removed',old.id from public.profiles where status='approved';
  end if;
  return old;
end;
$$;
create trigger quiz_deletion_notifications before delete on public.quiz_versions for each row execute function private.notify_quiz_deletion();
revoke execute on function private.notify_quiz_deletion() from public,anon,authenticated;
