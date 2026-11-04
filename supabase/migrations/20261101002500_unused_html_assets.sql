create function private.release_html_asset() returns trigger language plpgsql security definer set search_path='' as $$
begin
  perform private.lock_capacity();
  if old.html_file_id is not null and not exists(select 1 from public.quiz_versions where html_file_id=old.html_file_id) then
    update public.files set state='deleting' where id=old.html_file_id;
  end if;
  return old;
end;
$$;
create trigger release_deleted_html after delete on public.quiz_versions for each row execute function private.release_html_asset();
create trigger release_replaced_html after update of html_file_id on public.quiz_versions for each row when(old.html_file_id is distinct from new.html_file_id) execute function private.release_html_asset();
revoke execute on function private.release_html_asset() from public,anon,authenticated;

create function public.unused_html_assets(p_page integer default 0) returns setof public.files language sql stable security invoker set search_path='' as $$
  select f.* from public.files f where public.is_admin() and public.has_current_policy()
    and f.purpose='html_quiz' and f.state='ready' and not exists(select 1 from public.quiz_versions v where v.html_file_id=f.id)
  order by f.created_at,f.id limit 25 offset greatest(0,least(p_page,100000))*25;
$$;
revoke execute on function public.unused_html_assets(integer) from public,anon,authenticated;
grant execute on function public.unused_html_assets(integer) to authenticated;
