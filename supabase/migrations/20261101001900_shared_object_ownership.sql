-- Storage API copy (service role) adopts the object before finalization. Both
-- paths remain reserved for cleanup if an Edge invocation stops between steps.
create or replace function public.finalize_upload(p_id uuid,p_actor uuid) returns void language plpgsql security definer set search_path='' as $$
declare file public.files; object_metadata jsonb; object_owner text; final_path text;
begin
  perform private.lock_capacity();
  select * into file from public.files where id=p_id for update;
  if file.id is null or file.created_by<>p_actor or file.state<>'pending' or file.expires_at<=now() then raise exception 'Upload unavailable' using errcode='42501'; end if;
  if not exists(select 1 from public.profiles p cross join public.workspace_settings s where p.id=p_actor and p.status='approved' and p.policy_version=s.policy_version) then raise exception 'Membership unavailable' using errcode='42501'; end if;
  final_path:='ready/'||file.id::text||'.'||substring(file.path from '\.([a-zA-Z0-9]+)$');
  select metadata,owner_id into object_metadata,object_owner from storage.objects where bucket_id='cq-vault' and name=final_path;
  -- Ownerless objects from trusted restores retain their original path.
  if object_metadata is null then
    final_path:=file.path;
    select metadata,owner_id into object_metadata,object_owner from storage.objects where bucket_id='cq-vault' and name=final_path;
  end if;
  if object_metadata is null or nullif(object_owner,'') is not null or (object_metadata->>'size')::bigint<>file.size or object_metadata->>'mimetype'<>file.mime then raise exception 'Upload does not match reservation or still has a member owner' using errcode='23514'; end if;
  update public.files set path=final_path,state='ready',ready_at=now() where id=p_id;
end;
$$;
create or replace function public.orphan_objects() returns table(path text) language sql stable security definer set search_path='' as $$
  select o.name from storage.objects o where o.bucket_id='cq-vault' and o.created_at<now()-interval '1 hour'
    and not exists(select 1 from public.files f where f.path=o.name or (f.state='pending' and o.name='ready/'||f.id::text||'.'||substring(f.path from '\.([a-zA-Z0-9]+)$')))
  order by o.created_at limit 100;
$$;
