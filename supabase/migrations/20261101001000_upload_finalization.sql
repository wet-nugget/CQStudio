create function public.finalize_upload(p_id uuid,p_actor uuid) returns void language plpgsql security definer set search_path='' as $$
declare file public.files; object_metadata jsonb;
begin
  perform private.lock_capacity();
  select * into file from public.files where id=p_id for update;
  if file.id is null or file.created_by<>p_actor or file.state<>'pending' or file.expires_at<=now() then raise exception 'Upload unavailable' using errcode='42501'; end if;
  if not exists(select 1 from public.profiles p cross join public.workspace_settings s where p.id=p_actor and p.status='approved' and p.policy_version=s.policy_version) then raise exception 'Membership unavailable' using errcode='42501'; end if;
  select metadata into object_metadata from storage.objects where bucket_id='cq-vault' and name=file.path;
  if object_metadata is null or (object_metadata->>'size')::bigint<>file.size or object_metadata->>'mimetype'<>file.mime then raise exception 'Upload does not match reservation' using errcode='23514'; end if;
  update public.files set state='ready',ready_at=now() where id=p_id;
end;
$$;
revoke execute on function public.finalize_upload(uuid,uuid) from public,anon,authenticated;
grant execute on function public.finalize_upload(uuid,uuid) to service_role;
