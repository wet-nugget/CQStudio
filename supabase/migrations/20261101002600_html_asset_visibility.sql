drop policy files_read on public.files;
create policy files_read on public.files for select to authenticated using (
  public.can_use_workspace() and (created_by=auth.uid() or public.is_admin() or
    (state='ready' and (purpose='vault' or exists(select 1 from public.quiz_versions v where v.html_file_id=files.id))))
);
