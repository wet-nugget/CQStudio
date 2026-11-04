create index activity_chat_rate_idx on public.activity_log(actor_id,created_at desc) where action='chat.sent';
create function private.chat_rate_limit() returns trigger language plpgsql security definer set search_path='' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('chat:'||new.user_id::text,0));
  if (select count(*) from public.activity_log where actor_id=new.user_id and action='chat.sent' and created_at>now()-interval '1 minute')>=20 then raise exception 'Chat rate limit: wait a minute before sending more' using errcode='23514'; end if;
  new.created_at:=now();
  -- Keep the rate window after own-message deletion, without logging any body.
  perform private.log_action(new.user_id,'chat.sent',new.id);
  return new;
end;
$$;
create trigger chat_rate before insert on public.chat_messages for each row execute function private.chat_rate_limit();
grant insert(user_id,class_id,body),delete on public.chat_messages to authenticated;
create policy chat_send on public.chat_messages for insert to authenticated with check(public.can_use_workspace() and user_id=auth.uid());
create policy chat_remove on public.chat_messages for delete to authenticated using(public.can_use_workspace() and (user_id=auth.uid() or public.is_admin()));
grant update(read_at),delete on public.notifications to authenticated;
create policy notifications_read_own on public.notifications for update to authenticated using(public.can_use_workspace() and user_id=auth.uid()) with check(public.can_use_workspace() and user_id=auth.uid());
create policy notifications_remove_own on public.notifications for delete to authenticated using(public.can_use_workspace() and user_id=auth.uid());
revoke execute on function private.chat_rate_limit() from public,anon,authenticated;

create function public.unpublish_quiz(p_actor uuid,p_quiz uuid,p_delete boolean default false) returns void language plpgsql security definer set search_path='' as $$
declare version_ids uuid[];
begin
  perform private.lock_capacity();perform private.require_admin(p_actor);
  select array_agg(id) into version_ids from public.quiz_versions where quiz_id=p_quiz;
  update public.quizzes set published_version_id=null where id=p_quiz;
  update public.quiz_versions set status='rejected' where quiz_id=p_quiz and status='published';
  -- These visible recipient records also tell clients to evict cached HTML.
  insert into public.notifications(user_id,kind,title,entity_id)
    select p.id,'quiz_reviewed',case when p_delete then 'A quiz was removed' else 'A quiz was unpublished' end,v.id
    from public.profiles p cross join public.quiz_versions v where p.status='approved' and v.quiz_id=p_quiz;
  if p_delete then delete from public.quizzes where id=p_quiz; end if;
  perform private.log_action(p_actor,case when p_delete then 'quiz.deleted' else 'quiz.unpublished' end,p_quiz);
end;
$$;
revoke execute on function public.unpublish_quiz(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.unpublish_quiz(uuid,uuid,boolean) to service_role;
