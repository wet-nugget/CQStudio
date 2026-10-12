export const $ = selector => document.querySelector(selector);
export const uid = () => globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
export const escapeHtml = (text='') => String(text).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export const normalize = value => String(value || '').trim().toLowerCase();
export function downloadBlob(data, filename, type='application/octet-stream') { const a=document.createElement('a'); const url=URL.createObjectURL(new Blob([data],{type})); a.href=url; a.download=filename; a.click(); setTimeout(()=>URL.revokeObjectURL(url),0); }
export const downloadMarkdownFile=(content,filename)=>downloadBlob(content,filename,'text/markdown');
export const downloadJsonFile=(data,filename)=>downloadBlob(JSON.stringify(data,null,2),filename,'application/json');
