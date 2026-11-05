import { test, expect, type Page } from '@playwright/test';

// Browser integration fixtures exercise the real React routes/Auth SDK. SQL and
// Storage authorization are tested separately against the disposable services.
const uid='06000000-0000-4000-8000-000000000001', cid='26000000-0000-4000-8000-000000000001';
const qid='46000000-0000-4000-8000-000000000001', vid='56000000-0000-4000-8000-000000000001';
const date='2026-11-01T00:00:00.000Z';
function token(){return [Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:uid,role:'authenticated',aal:'aal1',session_id:'16000000-0000-4000-8000-000000000001',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,amr:[{method:'password',timestamp:Math.floor(Date.now()/1000)}]})).toString('base64url'),'fixture-signature-not-a-credential'].join('.');}
async function fixture(page:Page,{invited=false,stalePolicy=false,admin=false,dark=false,htmlQuiz=false}={}){
  let joined=!invited, current=stalePolicy?'old':'2026-11-01';
  const user={id:uid,email:'member@example.test',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email',providers:['email']},user_metadata:{},created_at:date,factors:[]};
  const session={access_token:token(),refresh_token:'fixture-refresh-not-a-credential',expires_in:3600,token_type:'bearer',user};
  const profile=()=>({id:uid,username:'learner',display_name:'Mika Reyes',avatar:3,theme:dark?'dark':'light',role:admin?'admin':'member',status:'approved',policy_version:current,policy_accepted_at:date,created_at:date});
  const classes=[{id:cid,name:'Everyday science',teacher_subject:'Ms. Rivera · Science',description:'Small discoveries, shared together.',icon:'flask',created_by:uid,folder_id:null,created_at:date,updated_at:date}];
  const quiz={id:qid,class_id:cid,title:'A little science practice',created_by:uid,published_version_id:vid,created_at:date,updated_at:date};
  const version={id:vid,quiz_id:qid,version:1,kind:htmlQuiz?'html':'manual',status:'published',content:{format_version:1,questions:[{id:'q1',type:'true_false',prompt:'Plants need light to grow.',points:1,answer:true}]},settings:{shuffle:false,mode:'paged',page_size:10,quiz_seconds:null,question_seconds:null},html_file_id:htmlQuiz?'66000000-0000-4000-8000-000000000001':null,created_by:uid,created_at:date};
  const attempts:Record<string,unknown>[]=[];const unexpected:string[]=[];
  await page.setExtraHTTPHeaders({'x-cq-fixture':'1'});
  await page.routeWebSocket('wss://cq-fixture.supabase.co/**',socket=>socket.close());
  await page.route('https://cq-fixture.supabase.co/**',async route=>{
    const request=route.request(),url=new URL(request.url()),name=url.pathname.split('/').at(-1)!;
    const body=request.postDataJSON() as Record<string,unknown>|null;
    let data:unknown=[];let status=200;
    if(url.pathname.startsWith('/storage/v1/object/sign/')) {
      await route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="en"><head><title>Quiz</title></head><body><h1>HTML practice</h1><button onclick="parent.postMessage({type: &quot;cq-result&quot;,score:1,max:1}, &quot;*&quot;)">Finish HTML quiz</button></body></html>'});
      return;
    }
    if(url.pathname==='/functions/v1/vault')data={url:'https://cq-fixture.supabase.co/storage/v1/object/sign/cq-vault/fixture.html',expires_in:60};
    else if(url.pathname.startsWith('/auth/v1/')){
      if(name==='token')data=session;
      else if(name==='user')data=user;
      else if(name==='logout'){status=204;data=null;}
      else {unexpected.push(url.pathname);status=400;}
    }else if(url.pathname.includes('/rpc/')){
      if(name==='public_policy_settings')data={name:'CQStudio',policy_version:'2026-11-01',chat_days:90,activity_days:60,notification_days:30,full_attempts:30};
      else if(name==='login_email')data='member@example.test';
      else if(name==='invitation_context')data={id:'76000000-0000-4000-8000-000000000001',role:'member',expires_at:'2099-01-01T00:00:00Z'};
      else if(name==='accept_invitation'){joined=true;data=uid;}
      else if(name==='accept_policy'){current=String(body?.p_version);data=null;}
      else if(name==='session_is_active')data=true;
      else if(name==='record_attempt'){attempts.push({id:body?.p_id,user_id:uid,quiz_version_id:vid,score:body?.p_score,max_score:body?.p_max,answers:body?.p_answers,summary:false,started_at:body?.p_started,completed_at:new Date().toISOString()});data=body?.p_id;}
      else if(name==='my_attempts')data=attempts;
      else if(name==='folder_path'||name==='unused_html_assets')data=[];
      else if(name==='member_directory')data=[{id:uid,display_name:'Mika Reyes',username:'learner',avatar:3}];
      else if(name==='workspace_usage')data={approved_members:1,admins:1,open_invites:0,storage_bytes:0,database_bytes:10240000,classes:classes.length,lessons:0,notes:0,quizzes:1,files:0,top_storage_users:[]};
      else{unexpected.push(url.pathname);status=400;}
    }else if(name==='profiles')data=url.searchParams.has('id')?(joined?profile():null):(joined?[profile()]:[]);
    else if(name==='classes'){
      if(request.method()==='POST'){const item={...classes[0]!,...body,id:crypto.randomUUID()};classes.push(item);data=item;}
      else data=url.searchParams.has('id')?classes.find(item=>item.id===url.searchParams.get('id')?.slice(3)):classes;
    }else if(name==='quizzes')data=url.searchParams.get('id')?.startsWith('eq.')?quiz:[quiz];
    else if(name==='quiz_versions')data=url.searchParams.has('status')?[]:url.searchParams.get('id')?.startsWith('in.')?[version]:version;
    else if(name==='attempts')data=url.searchParams.has('id')?attempts.find(item=>item.id===url.searchParams.get('id')?.slice(3)):attempts;
    else if(name==='workspace_settings')data={id:true,name:'CQStudio',policy_version:'2026-11-01',limits:{members:30,total_bytes:943718400,classes:30}};
    else if(['lesson_progress','lessons','notes','files','saved_files','folders','chat_messages','notifications','quiz_reviews','invitations','activity_log'].includes(name))data=[];
    else{unexpected.push(url.pathname);status=400;}
    await route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'*','content-range':'0-0/0'},body:status===204?'':JSON.stringify(data)});
  });
  return{session,unexpected,attempts,classes};
}
async function signIn(page:Page){await page.goto('/login');await page.getByLabel('Email address').fill('member@example.test');await page.getByLabel('Password',{exact:true}).fill('fixture-password-12345');await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.getByRole('heading',{name:/^Home$/})).toBeVisible();}
async function audit(page:Page){await page.addScriptTag({url:'/__test/axe.js'});return page.evaluate(async()=>{const axe=(window as unknown as {axe:{run:()=>Promise<{violations:{id:string;impact:string;nodes:{html:string}[]}[]}>}}).axe;return(await axe.run()).violations.filter(item=>['serious','critical'].includes(item.impact));});}

test('invite → policy acceptance → login → create class → persistent quiz attempt → cache cleanup',async({page})=>{
  const state=await fixture(page,{invited:true});const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`/accept-invite#access_token=${state.session.access_token}&refresh_token=${state.session.refresh_token}&expires_in=3600&token_type=bearer&type=invite`);
  await page.getByLabel('Display name').fill('Mika Reyes');await page.getByLabel('Username',{exact:true}).fill('learner');await page.getByLabel('Choose a password').fill('fixture-password-12345');
  await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Join the workspace'}).click();await expect(page.getByRole('heading',{name:/^Home$/})).toBeVisible();
  await page.getByRole('button',{name:'Sign out',exact:true}).click();await signIn(page);
  await page.getByRole('navigation',{name:'Main navigation',exact:true}).getByRole('link',{name:'Classes',exact:true}).click();await page.getByRole('button',{name:'New class'}).click();await page.getByLabel('Class name').fill('Biology club');await page.getByLabel('Teacher / subject').fill('Biology');await page.getByRole('button',{name:'Save class'}).click();await expect(page.getByRole('heading',{name:'Biology club'})).toBeVisible();
  await page.goto(`/quizzes/${qid}/take/${vid}`);await page.getByRole('radio',{name:'True',exact:true}).check();await page.reload();await expect(page.getByRole('radio',{name:'True',exact:true})).toBeChecked();
  await page.getByRole('button',{name:'Finish and review'}).click();await expect(page.getByText('Saved to your private progress.')).toBeVisible();expect(state.attempts).toHaveLength(1);expect(state.attempts[0]?.score).toBe(1);
  await page.evaluate(async()=>{localStorage.setItem('cqstudio.user.test.draft.chat.shared','private draft');sessionStorage.setItem('cqstudio.test','private');const cache=await caches.open('cqstudio-quiz-html');await cache.put('/__cq-quiz/private',new Response('private HTML'));await new Promise<void>((resolve,reject)=>{const req=indexedDB.open('cqstudio-offline');req.onsuccess=()=>{req.result.close();resolve();};req.onerror=()=>reject(req.error);});});
  await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page).toHaveURL('/login');
  const remaining=await page.evaluate(async()=>({local:Object.keys(localStorage).filter(key=>key.startsWith('cqstudio.')),session:Object.keys(sessionStorage).filter(key=>key.startsWith('cqstudio.')),caches:(await caches.keys()).filter(key=>key.startsWith('cqstudio-')),databases:(await indexedDB.databases()).filter(db=>db.name?.startsWith('cqstudio-'))}));
  expect(remaining).toEqual({local:[],session:[],caches:[],databases:[]});expect(state.unexpected).toEqual([]);expect(errors).toEqual([]);
});
test('changed policy gates protected routes until explicitly accepted',async({page})=>{
  const state=await fixture(page,{stalePolicy:true});await page.goto('/login');await page.getByLabel('Email address').fill('member@example.test');await page.getByLabel('Password',{exact:true}).fill('fixture-password-12345');await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page).toHaveURL('/accept-policy');
  await page.goto('/vault');await expect(page).toHaveURL('/accept-policy');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Accept and continue'}).click();await expect(page.getByRole('heading',{name:/^Home$/})).toBeVisible();expect(state.unexpected).toEqual([]);
});
for(const dark of [false,true])test(`main workspace pages have no serious axe violations (${dark?'dark':'light'})`,async({page})=>{
  const state=await fixture(page,{admin:true,dark});const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await signIn(page);
  const routes=[['/','Home'],['/classes','Your classes'],['/vault','Shared vault'],['/progress','Your progress'],['/chat','Group chat'],['/notifications','Notifications'],['/admin','Admin space'],['/profile','Your profile'],[`/quizzes/${qid}/take/${vid}`,'A little science practice'],[`/quizzes/new?class=${cid}`,'Create a quiz'],[`/classes/${cid}/lessons/new`,'New lesson']];
  for(const [path,heading] of routes){
    await page.goto(path!);if(dark)await page.getByRole('combobox',{name:'Theme',exact:true}).selectOption('dark');else await page.getByRole('combobox',{name:'Theme',exact:true}).selectOption('light');await expect(page.getByRole('heading',{name:heading!,exact:heading!=='Home'})).toBeVisible();await expect(page.locator('.skeleton')).toHaveCount(0);expect(await audit(page),path).toEqual([]);
  }
  await page.goto('/admin');for(const name of ['usage','settings','activity','reviews']){await page.getByRole('button',{name,exact:true}).click();await expect(page.locator('.skeleton')).toHaveCount(0);expect(await audit(page),name).toEqual([]);}
  expect(errors).toEqual([]);expect(state.unexpected).toEqual([]);
  await page.goto('/');await expect(page.getByRole('heading',{name:/^Home$/})).toBeVisible();await expect(page.locator('.skeleton')).toHaveCount(0);await page.screenshot({path:`test-results/dashboard-${dark?'dark':'light'}.png`,fullPage:true});
});

test('member navigation and quizzes remain keyboard usable on mobile',async({page})=>{
  await page.setViewportSize({width:390,height:844});await fixture(page);await signIn(page);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/dashboard-mobile.png',fullPage:true});
  await page.getByRole('button',{name:'Open navigation'}).click();await page.getByRole('dialog',{name:'Your workspace'}).getByRole('link',{name:'Classes',exact:true}).click();await expect(page.getByRole('heading',{name:'Your classes'})).toBeVisible();
  await page.goto(`/quizzes/${qid}/take/${vid}`);const answer=page.getByRole('radio',{name:'True',exact:true});await answer.focus();await page.keyboard.press('Space');await expect(answer).toBeChecked();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});


test('quiz saving recovers after a provider error without losing the result',async({page})=>{
  const state=await fixture(page);await signIn(page);let calls=0;
  await page.route('https://cq-fixture.supabase.co/rest/v1/rpc/record_attempt',async route=>{
    if(calls++===0)await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Unavailable'})});
    else await route.fallback();
  });
  await page.goto(`/quizzes/${qid}/take/${vid}`);await page.getByRole('radio',{name:'True',exact:true}).check();
  await page.getByRole('button',{name:'Finish and review'}).click();
  await expect(page.getByText('Your result is ready, but saving failed.',{exact:false})).toBeVisible();
  await page.getByRole('button',{name:'Retry saving result'}).click();
  await expect(page.getByText('Saved to your private progress.')).toBeVisible();expect(state.attempts).toHaveLength(1);
});

test('saved quiz remains successful when local draft removal is blocked',async({page})=>{
  const state=await fixture(page);await signIn(page);const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`/quizzes/${qid}/take/${vid}`);await page.getByRole('radio',{name:'True',exact:true}).check();
  await page.evaluate(()=>{const remove=Storage.prototype.removeItem;Storage.prototype.removeItem=function(key){if(key.includes('.attempt.'))throw new DOMException('Denied','SecurityError');return remove.call(this,key);};});
  await page.getByRole('button',{name:'Finish and review'}).click();
  await expect(page.getByText('Saved to your private progress.')).toBeVisible();
  await expect(page.getByRole('button',{name:'Retry saving result'})).toHaveCount(0);expect(state.attempts).toHaveLength(1);expect(errors).toEqual([]);
});

test('client navigation does not copy a lesson draft into another class',async({page})=>{
  const state=await fixture(page);const second='26000000-0000-4000-8000-000000000002';state.classes.push({...state.classes[0]!,id:second,name:'Second class'});
  await signIn(page);await page.goto(`/classes/${cid}/lessons/new`);await page.getByLabel('Title',{exact:true}).fill('First class draft');
  await page.getByLabel('Lesson Markdown').fill('Private unfinished lesson');
  await page.waitForTimeout(650);
  // A history navigation keeps the React application mounted, unlike page.goto.
  await page.evaluate(path=>{history.pushState(null,'',path);dispatchEvent(new PopStateEvent('popstate'));},`/classes/${second}/lessons/new`);
  await expect(page.getByLabel('Title',{exact:true})).toHaveValue('');await expect(page.getByLabel('Lesson Markdown')).toHaveValue('');
});

test('HTML practice runs and saves when browser caching is unavailable',async({page})=>{
  const state=await fixture(page,{htmlQuiz:true});await signIn(page);const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`/quizzes/${qid}`);
  await page.evaluate(()=>{CacheStorage.prototype.open=async()=>{throw new DOMException('Denied','SecurityError');};});
  await page.getByRole('button',{name:'Start HTML practice'}).click();
  const quiz=page.frameLocator('iframe[title="Isolated HTML quiz"]').frameLocator('iframe[title="Isolated HTML practice quiz"]');
  await quiz.getByRole('button',{name:'Finish HTML quiz'}).click();
  await expect(page.getByText('Reported result: 1 / 1. Saved to your private progress.')).toBeVisible();
  expect(state.attempts).toHaveLength(1);expect(state.unexpected).toEqual([]);expect(errors).toEqual([]);
});
