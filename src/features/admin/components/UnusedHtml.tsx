import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '../../../lib/supabase';
import { adminAction } from '../api/admin';
import { Message } from '../../../components/Feedback';

export default function UnusedHtml() {
  const [page,setPage]=useState(0);
  const [target,setTarget]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const query=useQuery({queryKey:['unused-html',page],queryFn:async()=>{
    const {data,error}=await db().rpc('unused_html_assets',{p_page:page});
    if(error)throw new Error('Assets unavailable.');
    return data;
  }});
  return <section className="panel section-space"><h2>Unattached HTML uploads</h2><p>These ready uploads have no saved quiz version. They may still belong to an unfinished browser draft. Check with the uploader before reclaiming their space.</p>{error&&<Message error>{error}</Message>}{query.isError?<Message error>Could not load unused assets.</Message>:query.data?.length?query.data.map(file=><article className="list-row" key={file.id}><span>{file.name}<small>{(file.size/1048576).toFixed(2)} MiB · {new Date(file.created_at).toLocaleDateString()}</small></span>{target===file.id?<div><label className="checkbox-label"><input type="checkbox" disabled={busy} onChange={()=>{setBusy(true);setError('');void adminAction({action:'manage_file',id:file.id,name:file.name,folder_id:file.folder_id,remove:true}).then(()=>query.refetch()).catch(()=>setError('Could not remove this asset. It may now be attached to a quiz.')).finally(()=>{setBusy(false);setTarget(null);});}}/><span>Confirm removal</span></label><button className="text-button" disabled={busy} onClick={()=>setTarget(null)}>Cancel</button></div>:<button className="text-button danger-text" onClick={()=>setTarget(file.id)}>Remove unused asset</button>}</article>):<p>No unattached HTML uploads.</p>}<div className="pagination"><button className="button-secondary" disabled={!page||busy} onClick={()=>setPage(page-1)}>Previous assets</button><span>Page {page+1}</span><button className="button-secondary" disabled={(query.data?.length??0)<25||busy} onClick={()=>setPage(page+1)}>More assets</button></div></section>;
}
