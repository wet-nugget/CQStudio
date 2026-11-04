import { createInterface } from 'node:readline/promises';
// The one-time token exists only in Edge secrets and this process's environment.
// This script never needs or accepts a service-role key.
const url = process.env.SUPABASE_URL;
const token = process.env.CQ_BOOTSTRAP_TOKEN;
if (!url || !token || token.length < 32) throw new Error('Set SUPABASE_URL and a random CQ_BOOTSTRAP_TOKEN of at least 32 characters in your terminal environment. Never use VITE_ names for secrets.');
const prompt=createInterface({input:process.stdin,output:process.stdout});
const email=(await prompt.question('First administrator email: ')).trim(); prompt.close();
const response=await fetch(`${new URL(url).origin}/functions/v1/bootstrap-admin`,{
  method:'POST',headers:{'Content-Type':'application/json','x-bootstrap-token':token},body:JSON.stringify({email}),
});
if(!response.ok) throw new Error('Bootstrap failed. Check Edge secrets, invitation capacity, and SMTP. No provider details were printed.');
console.log('Administrator invitation sent. Accept it, then remove the BOOTSTRAP_TOKEN Edge secret.');
