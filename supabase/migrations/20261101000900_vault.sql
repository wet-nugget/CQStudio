create function public.request_upload(p_name text,p_size bigint,p_mime text,p_folder uuid default null,p_purpose text default 'vault',p_description text default '')
returns public.files language plpgsql security definer set search_path='' as $$
declare result public.files; extension text; allowed boolean;
begin
  if not public.can_use_workspace() then raise exception 'Membership unavailable' using errcode='42501'; end if;
  perform private.lock_capacity();
  extension:=lower(substring(p_name from '\.([a-zA-Z0-9]+)$'));
  allowed:=case extension
    when 'pdf' then p_mime='application/pdf' when 'txt' then p_mime='text/plain'
    when 'md' then p_mime in ('text/markdown','text/plain') when 'csv' then p_mime in ('text/csv','text/plain')
    when 'png' then p_mime='image/png' when 'jpg' then p_mime='image/jpeg' when 'jpeg' then p_mime='image/jpeg'
    when 'webp' then p_mime='image/webp' when 'zip' then p_mime='application/zip'
    when 'docx' then p_mime='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    when 'xlsx' then p_mime='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    when 'pptx' then p_mime='application/vnd.openxmlformats-officedocument.presentationml.presentation'
    when 'html' then p_mime='text/html' and p_purpose='html_quiz'
    else false end;
  if allowed is distinct from true or p_purpose not in ('vault','html_quiz') or (p_purpose='html_quiz' and extension<>'html') then raise exception 'File type is not allowed' using errcode='23514'; end if;
  if p_size<=0 or p_size>private.limit_value(case when p_purpose='html_quiz' then 'html_bytes' else 'file_bytes' end) then raise exception 'File size limit reached' using errcode='23514'; end if;
  if (select coalesce(sum(size),0) from public.files)+p_size>private.limit_value('total_bytes') then raise exception 'Workspace storage is full' using errcode='23514'; end if;
  if not public.is_admin() and (select coalesce(sum(size),0) from public.files where created_by=auth.uid())+p_size>private.limit_value('member_bytes') then raise exception 'Personal storage is full' using errcode='23514'; end if;
  if p_folder is not null and not exists(select 1 from public.folders where id=p_folder) then raise exception 'Folder unavailable'; end if;
  if (select count(*) from public.files where folder_id is not distinct from p_folder and purpose='vault')>=private.limit_value('files_per_folder') and p_purpose='vault' then raise exception 'Folder file limit reached' using errcode='23514'; end if;
  insert into public.files(folder_id,path,name,mime,size,description,purpose,created_by)
    values(p_folder,auth.uid()::text||'/'||gen_random_uuid()::text||'.'||extension,p_name,p_mime,p_size,p_description,p_purpose,auth.uid()) returning * into result;
  return result;
end;
$$;

create function public.create_folder(p_name text,p_parent uuid default null) returns public.folders
language plpgsql security definer set search_path='' as $$
declare result public.folders; depth integer:=1; cursor_id uuid:=p_parent;
begin
  if not public.can_use_workspace() then raise exception 'Membership unavailable' using errcode='42501'; end if;
  perform private.lock_capacity();
  while cursor_id is not null loop
    depth:=depth+1;
    if depth>private.limit_value('folder_depth') then raise exception 'Folder depth limit reached' using errcode='23514'; end if;
    select parent_id into cursor_id from public.folders where id=cursor_id;
    if not found then raise exception 'Parent folder unavailable'; end if;
  end loop;
  insert into public.folders(name,parent_id,created_by) values(trim(p_name),p_parent,auth.uid()) returning * into result;
  return result;
end;
$$;
create function public.manage_folder(p_actor uuid,p_id uuid,p_name text,p_parent uuid,p_delete boolean default false)
returns void language plpgsql security definer set search_path='' as $$
declare parent_depth integer:=0; subtree_depth integer; cursor_id uuid:=p_parent;
begin
  perform private.lock_capacity(); perform private.require_admin(p_actor);
  if p_delete then
    if exists(select 1 from public.files where folder_id=p_id) or exists(select 1 from public.folders where parent_id=p_id) then raise exception 'Only empty folders can be deleted' using errcode='23514'; end if;
    delete from public.folders where id=p_id;
  else
    while cursor_id is not null loop
      if cursor_id=p_id then raise exception 'Folder cycle rejected' using errcode='23514'; end if;
      parent_depth:=parent_depth+1;
      if parent_depth>private.limit_value('folder_depth') then raise exception 'Folder depth limit reached' using errcode='23514'; end if;
      select parent_id into cursor_id from public.folders where id=cursor_id;
      if not found then raise exception 'Parent folder unavailable'; end if;
    end loop;
    with recursive tree as(select id,1 as depth from public.folders where id=p_id union all select f.id,t.depth+1 from public.folders f join tree t on f.parent_id=t.id)
      select max(depth) into subtree_depth from tree;
    if subtree_depth is null then raise exception 'Folder unavailable'; end if;
    if parent_depth+subtree_depth>private.limit_value('folder_depth') then raise exception 'Folder depth limit reached' using errcode='23514'; end if;
    update public.folders set name=trim(p_name),parent_id=p_parent where id=p_id;
  end if;
  perform private.log_action(p_actor,'folder.changed',p_id,jsonb_build_object('deleted',p_delete));
end;
$$;
create function public.manage_file(p_actor uuid,p_id uuid,p_name text,p_folder uuid,p_delete boolean default false)
returns void language plpgsql security definer set search_path='' as $$
begin
  perform private.lock_capacity(); perform private.require_admin(p_actor);
  if p_delete then
    if exists(select 1 from public.quiz_versions where html_file_id=p_id) then raise exception 'A quiz version still references this file' using errcode='23514'; end if;
    update public.files set state='deleting' where id=p_id;
  else
    if (select count(*) from public.files where folder_id is not distinct from p_folder and purpose='vault' and id<>p_id)>=private.limit_value('files_per_folder') then raise exception 'Folder file limit reached' using errcode='23514'; end if;
    update public.files set name=p_name,folder_id=p_folder where id=p_id and state='ready';
  end if;
  perform private.log_action(p_actor,'file.changed',p_id,jsonb_build_object('deleted',p_delete));
end;
$$;

create function private.saved_limit() returns trigger language plpgsql security definer set search_path='' as $$
begin
  perform private.lock_capacity();
  if (select count(*) from public.saved_files where user_id=new.user_id)>=private.limit_value('saved_files') then raise exception 'Saved file limit reached' using errcode='23514'; end if;
  return new;
end;
$$;
create trigger saved_capacity before insert on public.saved_files for each row execute function private.saved_limit();
grant insert(user_id,file_id),delete on public.saved_files to authenticated;
create policy saved_create on public.saved_files for insert to authenticated with check(public.can_use_workspace() and user_id=auth.uid() and exists(select 1 from public.files f where f.id=file_id and f.state='ready' and f.purpose='vault'));
create policy saved_delete on public.saved_files for delete to authenticated using(public.can_use_workspace() and user_id=auth.uid());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('cq-vault','cq-vault',false,52428800,array[
  'application/pdf','text/plain','text/markdown','text/csv','image/png','image/jpeg','image/webp','application/zip','text/html',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.openxmlformats-officedocument.presentationml.presentation'
]);
create function private.reserved_object(p_path text,p_metadata jsonb) returns boolean language sql stable security definer set search_path='' as $$
  select public.can_use_workspace() and exists(select 1 from public.files f where f.path=p_path and f.created_by=auth.uid()
    and f.state='pending' and f.expires_at>now() and f.size=(p_metadata->>'size')::bigint and f.mime=p_metadata->>'mimetype');
$$;
create policy reserved_upload on storage.objects for insert to authenticated with check(bucket_id='cq-vault' and private.reserved_object(name,metadata));
-- No SELECT/UPDATE/DELETE Storage policy for browser users. Issuing a signed URL
-- happens in an authenticated Edge Function after a caller-scoped RLS query.
revoke execute on function public.request_upload(text,bigint,text,uuid,text,text),public.create_folder(text,uuid),public.manage_folder(uuid,uuid,text,uuid,boolean),public.manage_file(uuid,uuid,text,uuid,boolean),private.saved_limit(),private.reserved_object(text,jsonb) from public,anon,authenticated;
grant execute on function public.request_upload(text,bigint,text,uuid,text,text),public.create_folder(text,uuid),private.reserved_object(text,jsonb) to authenticated;
grant execute on function public.manage_folder(uuid,uuid,text,uuid,boolean),public.manage_file(uuid,uuid,text,uuid,boolean) to service_role;
