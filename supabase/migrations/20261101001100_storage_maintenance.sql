alter table public.files add constraint files_no_control_names check(name !~ '[[:cntrl:]]');
alter table public.folders add constraint folders_no_control_names check(name !~ '[[:cntrl:]]');
create function public.folder_path(p_folder uuid) returns jsonb language sql stable security definer set search_path='' as $$
  with recursive path as(select id,name,parent_id,1 as depth from public.folders where id=p_folder and public.can_use_workspace()
    union all select f.id,f.name,f.parent_id,p.depth+1 from public.folders f join path p on f.id=p.parent_id where p.depth<20)
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name) order by depth desc),'[]') from path;
$$;
create function public.orphan_objects() returns table(path text) language sql stable security definer set search_path='' as $$
  select o.name from storage.objects o where o.bucket_id='cq-vault' and o.created_at<now()-interval '1 hour'
    and not exists(select 1 from public.files f where f.path=o.name) order by o.created_at limit 100;
$$;
create extension if not exists pg_net with schema extensions;
select cron.schedule('cqstudio-storage-cleanup','*/30 * * * *',$job$
  select net.http_post(
    url:=(select decrypted_secret from vault.decrypted_secrets where name='cqstudio_maintenance_url'),
    headers:=jsonb_build_object('Content-Type','application/json','x-maintenance-token',(select decrypted_secret from vault.decrypted_secrets where name='cqstudio_maintenance_token')),
    body:='{"action":"cleanup"}'::jsonb
  ) where exists(select 1 from vault.decrypted_secrets where name='cqstudio_maintenance_url')
      and exists(select 1 from vault.decrypted_secrets where name='cqstudio_maintenance_token');
$job$);
revoke execute on function public.folder_path(uuid),public.orphan_objects() from public,anon,authenticated;
grant execute on function public.folder_path(uuid) to authenticated;
grant execute on function public.orphan_objects() to service_role;
