import { lazy, Suspense, useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { db } from '../../../lib/supabase';
import { queryClient } from '../../../lib/query';
import { useAuth, useProfile } from '../../auth/hooks/useAuth';
import { adminAction } from '../../admin/api/admin';
import { downloadUrl, folderSchema, uploadFile } from '../api/vault';
import { Icon } from '../../../components/Icon';
import { EmptyState, Message, Skeleton } from '../../../components/Feedback';
import type { Row } from '../../../lib/database.types';
import { Badge, Button, CardList, Drawer, Menu } from '../../../components/ui/kit';
import { useMedia } from '../../../components/ui/useMedia';
import { bytes } from '../../workspace/components/shared';
const DataTable=lazy(()=>import('../../../components/ui/DataTable')) as typeof import('../../../components/ui/DataTable').default;
import FolderPicker from './FolderPicker';
export default function VaultPage() {
    const { folderId } = useParams();
    const [params,setParams]=useSearchParams();
    const small=useMedia('(max-width: 767px)');
    const [details,setDetails]=useState<Row<'files'>|null>(null);
    const [filters,setFilters]=useState(false);
    const [chosen,setChosen]=useState<File|null>(null);
    const location = useLocation();
    const savedOnly = location.pathname === '/vault/saved';
    const { session } = useAuth();
    const { data: profile } = useProfile();
    const [page, setPage] = useState(0);
    const [search, setSearch] = useState('');
    const [term, setTerm] = useState('');
    const [type, setType] = useState('');
    const [uploader, setUploader] = useState('');
    const [sort, setSort] = useState('newest');
    const [upload, setUpload] = useState(params.has('upload'));
    const [newFolder, setNewFolder] = useState(false);
    const [progress, setProgress] = useState<number | null>(null);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [manage, setManage] = useState<{
        kind: 'file' | 'folder';
        id: string;
        name: string;
        parent: string | null;
    } | null>(null);
    const [busy, setBusy] = useState(false);
    const [destination, setDestination] = useState<string | null>(null);
    useEffect(() => {
        const timer = setTimeout(() => {
            setTerm(search);
            setPage(0);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);
    useEffect(() => setPage(0), [folderId, savedOnly, type, uploader, sort]);
    const members = useQuery({ queryKey: ['directory'], queryFn: async () => {
            const { data, error } = await db().rpc('member_directory');
            if (error)
                throw error;
            return data;
        } });
    const saved = useQuery({ queryKey: ['saved-files', session?.user.id], queryFn: async () => {
            const { data, error } = await db().from('saved_files').select('*').eq('user_id', session!.user.id).limit(1000);
            if (error)
                throw error;
            return data;
        } });
    const query = useQuery({ queryKey: ['vault', folderId, savedOnly, page, term, type, uploader, sort, saved.data?.map(item => item.file_id).join(',')], queryFn: async () => {
            let files = db().from('files').select('*', { count: 'exact' }).eq('state', 'ready').eq('purpose', 'vault');
            if (savedOnly) {
                const ids = saved.data?.map(item => item.file_id) ?? [];
                if (!ids.length)
                    return {
                        files: [] as Row<'files'>[], folders: [] as Row<'folders'>[], path: [] as {
                            id: string;
                            name: string;
                        }[], count: 0
                    };
                files = files.in('id', ids);
            }
            else if (!term)
                files = folderId ? files.eq('folder_id', folderId) : files.is('folder_id', null);
            if (term)
                files = files.ilike('name', `%${term.replaceAll('%', '').replaceAll('_', '')}%`);
            if (type)
                files = files.like('mime', `${type}%`);
            if (uploader)
                files = files.eq('created_by', uploader);
            const folderQuery = db().from('folders').select('*').order('name').range(page * 25, page * 25 + 24);
            const folderResult = folderId ? folderQuery.eq('parent_id', folderId) : folderQuery.is('parent_id', null);
            const [fr, dr, pr] = await Promise.all([files.order(sort === 'name' ? 'name' : sort === 'size' ? 'size' : 'created_at', { ascending: sort === 'name' }).range(page * 25, page * 25 + 24), savedOnly || term ? Promise.resolve({ data: [] as Row<'folders'>[], error: null }) : folderResult, db().rpc('folder_path', { p_folder: folderId ?? '00000000-0000-0000-0000-000000000000' })]);
            if (fr.error || dr.error || pr.error)
                throw new Error('Vault unavailable.');
            return {
                files: fr.data ?? [], folders: dr.data ?? [], path: z.array(z.object({ id: z.string(), name: z.string() })).parse(pr.data), count: fr.count ?? 0
            };
        } });
    async function perform(action: () => Promise<void>) {
        setBusy(true);
        setError('');
        setNotice('');
        try {
            await action();
            await queryClient.invalidateQueries({ queryKey: ['vault'] });
            await queryClient.invalidateQueries({ queryKey: ['saved-files'] });
        }
        catch (failure) {
            setError(failure instanceof Error ? failure.message : 'Action unavailable.');
        }
        finally {
            setBusy(false);
        }
    }
    async function submitUpload(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const fromForm=form.get('file');
        const file=fromForm instanceof File&&fromForm.size?fromForm:chosen;
        if (!(file instanceof File) || !file.size)
            return;
        await perform(async () => {
            setProgress(0);
            try {
                await uploadFile(file, String(form.get('description') ?? ''), folderId ?? null, 'vault', setProgress);
                setUpload(false);setChosen(null);setParams({});
                setNotice('File uploaded and ready to share.');
            }
            finally {
                setProgress(null);
            }
        });
    }
    async function submitFolder(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const parsed = folderSchema.safeParse({ name: new FormData(event.currentTarget).get('name') });
        if (!parsed.success) {
            setError('Choose a valid folder name.');
            return;
        }
        await perform(async () => {
            const { error: failure } = await db().rpc('create_folder', { p_name: parsed.data.name, p_parent: folderId ?? null });
            if (failure)
                throw new Error('Could not create folder. Check depth and duplicate names.');
            setNewFolder(false);
        });
    }
    async function bookmark(file: Row<'files'>) {
        await perform(async () => {
            const exists = saved.data?.some(item => item.file_id === file.id);
            const result = exists ? await db().from('saved_files').delete().eq('user_id', session!.user.id).eq('file_id', file.id) : await db().from('saved_files').insert({ user_id: session!.user.id, file_id: file.id });
            if (result.error)
                throw new Error('Could not change saved files. Check your saved-file limit.');
        });
    }
    async function exportCsv() {
        await perform(async () => {
            const all: Row<'files'>[] = [];
            let offset = 0;
            while (true) {
                let request = db().from('files').select('*').eq('state', 'ready').eq('purpose', 'vault').order('id').range(offset, offset + 99);
                if (savedOnly)
                    request = request.in('id', saved.data?.map(item => item.file_id) ?? []);
                else
                    request = folderId ? request.eq('folder_id', folderId) : request.is('folder_id', null);
                const { data, error } = await request;
                if (error)
                    throw error;
                all.push(...data);
                if (data.length < 100)
                    break;
                offset += 100;
            }
            const { metadataCsv } = await import('../api/csv');
            const href = URL.createObjectURL(new Blob([metadataCsv(all)], { type: 'text/csv;charset=utf-8' }));
            const link = document.createElement('a');
            link.href = href;
            link.download = 'cqstudio-file-metadata.csv';
            link.click();
            setTimeout(() => URL.revokeObjectURL(href), 1000);
        });
    }
    async function download(file:Row<'files'>){await perform(async()=>{const url=await downloadUrl(file.id);const link=document.createElement('a');link.href=url;link.rel='noreferrer';link.download=file.name;link.click();});}
    function choose(file:File){if(file.size>52428800){setError('Files cannot exceed the 50 MiB bucket limit.');return;}setChosen(file);setUpload(true);}
    const filterControls=<><label className="sr-only" htmlFor="vault-type">Filter by type</label><select id="vault-type" aria-label="Filter by type" value={type} onChange={event=>setType(event.target.value)}><option value="">All types</option><option value="application/pdf">PDF</option><option value="image/">Images</option><option value="text/">Text</option><option value="application/vnd.">Office</option><option value="application/zip">ZIP</option></select><label className="sr-only" htmlFor="vault-uploader">Filter by uploader</label><select id="vault-uploader" aria-label="Filter by uploader" value={uploader} onChange={event=>setUploader(event.target.value)}><option value="">All uploaders</option>{members.data?.map(member=><option key={member.id} value={member.id}>{member.display_name}</option>)}</select><select aria-label="Sort files" value={sort} onChange={event=>setSort(event.target.value)}><option value="newest">Newest first</option><option value="name">Name A–Z</option><option value="size">Largest first</option></select></>;
    const fileActions=(file:Row<'files'>)=><Menu label="Actions"><button onClick={()=>setDetails(file)}>View details</button><button disabled={busy} onClick={()=>void download(file)}>Download</button><button disabled={busy} onClick={()=>void bookmark(file)}>{saved.data?.some(s=>s.file_id===file.id)?'Unsave':'Save'}</button>{profile?.role==='admin'&&<button onClick={()=>{setDestination(file.folder_id);setManage({kind:'file',id:file.id,name:file.name,parent:file.folder_id});}}>Manage file</button>}</Menu>;
    return <div className="feature-screen live-vault-screen" onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();const file=event.dataTransfer.files[0];if(file)choose(file);}}><div className="page-heading"><div><h1>{savedOnly?'Your saved files':'Shared vault'}</h1><p>{savedOnly?'Your personal collection of useful things.':''}</p></div><div className="heading-action"><Button onClick={()=>setUpload(true)}><Icon name="upload" size={17}/>Upload file</Button></div></div><nav className="tabs" aria-label="Vault lists"><Link className={!savedOnly?'active':''} to="/vault">All files</Link><Link className={savedOnly?'active':''} to="/vault/saved">Saved by me</Link></nav>{error&&<Message error>{error}</Message>}{notice&&<Message>{notice}</Message>}<div className="screen-toolbar"><div className="search-field"><Icon name="search" size={17}/><input aria-label="Search file names" placeholder="Search shared files…" value={search} onChange={event=>setSearch(event.target.value)}/></div>{small?<Button variant="quiet" onClick={()=>setFilters(true)}><Icon name="filter" size={16}/>Filters</Button>:<div className="live-vault-filters">{filterControls}</div>}<Menu label="More"><button onClick={()=>setNewFolder(true)}>New folder</button><button disabled={busy} onClick={()=>void exportCsv()}>Export CSV</button></Menu></div>{(type||uploader)&&<div className="active-chips">{type&&<Badge>{type}</Badge>}{uploader&&<Badge>{members.data?.find(m=>m.id===uploader)?.display_name??'Uploader'}</Badge>}<button className="text-button" onClick={()=>{setType('');setUploader('');}}>Clear filters</button></div>}{!savedOnly&&<nav className="folder-breadcrumb" aria-label="Folder path"><Link to="/vault">Vault</Link>{(query.data?.path.length??0)>2&&<Menu label="…">{query.data!.path.slice(0,-2).map(item=><Link key={item.id} to={`/vault/folders/${item.id}`}>{item.name}</Link>)}</Menu>}{query.data?.path.slice(-2).map(item=><span key={item.id}> / <Link to={`/vault/folders/${item.id}`}>{item.name}</Link></span>)}</nav>}<div className="pane-scroll">{query.isPending?<Skeleton/>:query.isError?<Message error>Could not load the vault. <button className="text-button" onClick={()=>void query.refetch()}>Retry</button></Message>:<><div className="vault-folder-tiles">{query.data.folders.map(folder=><div className="folder-tile" key={folder.id}><Link to={`/vault/folders/${folder.id}`}><Icon name="folder" size={18}/>{folder.name}</Link>{profile?.role==='admin'&&<button className="text-button" onClick={()=>{setDestination(folder.parent_id);setManage({kind:'folder',id:folder.id,name:folder.name,parent:folder.parent_id});}}>Manage</button>}</div>)}</div>{query.data.files.length?(small?<CardList items={query.data.files} render={file=><article className="file-card" key={file.id}><span className="mini-file"><Icon name="file"/></span><button className="file-title" onClick={()=>setDetails(file)}>{file.name}<small>{bytes(file.size)} · {members.data?.find(m=>m.id===file.created_by)?.display_name??'Former member'}</small></button>{fileActions(file)}</article>}/>:<Suspense fallback={<Skeleton/>}><DataTable caption={`${query.data.count} ready files · 25 per page`} items={query.data.files} columns={[{key:'name',label:'Name',render:file=><button className="file-title" onClick={()=>setDetails(file)}><Icon name="file" size={18}/>{file.name}</button>},{key:'type',label:'Type',render:file=><Badge>{file.mime.split('/').at(-1)?.slice(0,12)}</Badge>},{key:'size',label:'Size',render:file=>bytes(file.size),secondary:true},{key:'uploader',label:'Shared by',render:file=>members.data?.find(m=>m.id===file.created_by)?.display_name??'Former member',secondary:true},{key:'actions',label:'Actions',render:fileActions}]}/></Suspense>):<EmptyState title={term?'No matching files.':'No files yet.'}><p>{term?'Try another search or filter.':'Upload a resource, or open a folder to explore.'}</p></EmptyState>}</>}</div><div className="pane-pagination"><span>25 per page · Page {page+1}</span><Button variant="quiet" disabled={!page} onClick={()=>setPage(page-1)}>Previous</Button><Button variant="quiet" disabled={(query.data?.files.length??0)<25&&(query.data?.folders.length??0)<25} onClick={()=>setPage(page+1)}>Next</Button></div><Drawer title="Upload a file" open={upload} onClose={()=>{setUpload(false);setParams({});}}><form onSubmit={submitUpload}><div className="upload-dropzone"><Icon name="upload" size={32}/><h3>Upload a file</h3><p>PDF, text/Markdown, CSV, images, ZIP, or modern Office files. Workspace limits are checked before uploading.</p><label htmlFor="vault-file">Choose a file</label><input id="vault-file" name="file" type="file" required={!chosen} onChange={event=>{const file=event.target.files?.[0];if(file)choose(file);}}/>{chosen&&<Badge>{chosen.name} · {bytes(chosen.size)}</Badge>}</div><label htmlFor="file-description">Description</label><textarea id="file-description" name="description" maxLength={2000}/>{progress!==null&&<div role="status"><progress value={progress} max={100} aria-label="Upload progress"/><span>{progress}% uploaded</span></div>}{error&&<Message error>{error}</Message>}<Button disabled={busy}>{busy?'Uploading…':'Upload to this folder'}</Button><p className="fine-print">Files are private. No malware scanning is provided.</p></form></Drawer><Drawer title="New folder" open={newFolder} onClose={()=>setNewFolder(false)}><form onSubmit={submitFolder}><label htmlFor="folder-name">Folder name</label><input id="folder-name" name="name" required maxLength={120}/>{error&&<Message error>{error}</Message>}<Button disabled={busy}>Create folder</Button></form></Drawer><Drawer title="Filter files" open={filters} onClose={()=>setFilters(false)} footer={<Button onClick={()=>setFilters(false)}>Show files</Button>}><div className="filter-sheet-fields">{filterControls}</div></Drawer><Drawer title="File details" open={Boolean(details)} onClose={()=>setDetails(null)} footer={details&&<><Button variant="quiet" disabled={busy} onClick={()=>void bookmark(details)}>{saved.data?.some(s=>s.file_id===details.id)?'Unsave':'Save file'}</Button><Button disabled={busy} onClick={()=>void download(details)}>Download</Button></>}>{details&&<><span className="class-icon violet"><Icon name="file" size={28}/></span><h3>{details.name}</h3><p>{details.description||'No description added.'}</p><dl className="detail-list"><dt>Size</dt><dd>{bytes(details.size)}</dd><dt>Type</dt><dd>{details.mime}</dd><dt>Shared by</dt><dd>{members.data?.find(m=>m.id===details.created_by)?.display_name??'Former member'}</dd><dt>Added</dt><dd>{new Date(details.created_at).toLocaleDateString()}</dd></dl>{error&&<Message error>{error}</Message>}</>}</Drawer><Drawer title={`Manage ${manage?.kind??'content'}`} open={Boolean(manage)} onClose={()=>setManage(null)}>{manage&&<form onSubmit={event=>{event.preventDefault();const form=new FormData(event.currentTarget);const remove=form.get('remove')==='on';void perform(async()=>{await adminAction({action:manage.kind==='folder'?'manage_folder':'manage_file',id:manage.id,name:String(form.get('name')),...(manage.kind==='folder'?{parent_id:destination}:{folder_id:destination}),remove});setManage(null);setDetails(null);});}}><label htmlFor="manage-name">Name</label><input id="manage-name" name="name" defaultValue={manage.name} required maxLength={manage.kind==='file'?200:120}/><FolderPicker value={destination} onChange={setDestination}/><label className="checkbox-label"><input name="remove" type="checkbox"/><span>Delete instead. Folders must be empty. This permanently removes access to the item.</span></label>{error&&<Message error>{error}</Message>}<Button disabled={busy}>Apply change</Button></form>}</Drawer></div>;
}
