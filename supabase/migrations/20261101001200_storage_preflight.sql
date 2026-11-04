-- Storage checks declared contentLength before reading bytes, then checks again
-- with backend object metadata before committing. Accept both metadata shapes.
create or replace function private.reserved_object(p_path text,p_metadata jsonb) returns boolean language sql stable security definer set search_path='' as $$
  select public.can_use_workspace() and exists(select 1 from public.files f where f.path=p_path and f.created_by=auth.uid()
    and f.state='pending' and f.expires_at>now()
    and f.size=coalesce((p_metadata->>'size')::bigint,(p_metadata->>'contentLength')::bigint)
    and (not(p_metadata ? 'size') or f.size=(p_metadata->>'size')::bigint)
    and (not(p_metadata ? 'contentLength') or f.size=(p_metadata->>'contentLength')::bigint)
    and f.mime=p_metadata->>'mimetype');
$$;
