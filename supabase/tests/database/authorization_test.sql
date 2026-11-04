begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(33);

insert into auth.users(id,email,email_confirmed_at) values
 ('00000000-0000-4000-8000-000000000001','admin@example.test',now()),
 ('00000000-0000-4000-8000-000000000002','alice@example.test',now()),
 ('00000000-0000-4000-8000-000000000003','bob@example.test',now()),
 ('00000000-0000-4000-8000-000000000004','invite@example.test',now());
insert into auth.sessions(id,user_id,created_at,updated_at) values
 ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001',now(),now()),
 ('10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002',now(),now()),
 ('10000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000003',now(),now()),
 ('10000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000004',now(),now());
insert into public.profiles(id,username,display_name,role,policy_version,policy_accepted_at) values
 ('00000000-0000-4000-8000-000000000001','admin','Administrator','admin','2026-11-01',now()),
 ('00000000-0000-4000-8000-000000000002','alice','Alice','member','2026-11-01',now()),
 ('00000000-0000-4000-8000-000000000003','bob','Bob','member','2026-11-01',now());
insert into public.classes(id,name,created_by) values('20000000-0000-4000-8000-000000000001','Biology','00000000-0000-4000-8000-000000000002');
insert into public.lessons(id,class_id,title,markdown) values('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Cells','# Cells');
insert into public.quizzes(id,class_id,title,created_by) values('40000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Practice','00000000-0000-4000-8000-000000000002');
insert into public.quiz_versions(id,quiz_id,version,kind,content,status,created_by) values('50000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',1,'manual','{"format_version":1,"questions":[{"id":"q1","type":"true_false","prompt":"True?","points":1,"answer":true}]}','published','00000000-0000-4000-8000-000000000002');
update public.quizzes set published_version_id='50000000-0000-4000-8000-000000000001';
insert into public.attempts(user_id,quiz_version_id,score,max_score,answers) values
 ('00000000-0000-4000-8000-000000000002','50000000-0000-4000-8000-000000000001',1,1,'{"private":"alice"}'),
 ('00000000-0000-4000-8000-000000000003','50000000-0000-4000-8000-000000000001',0,1,'{"private":"bob"}');
insert into public.lesson_progress(user_id,lesson_id,reflection) values
 ('00000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000001','Private Bob reflection');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000002","session_id":"10000000-0000-4000-8000-000000000002","aal":"aal1"}',true);
select ok(public.is_approved(),'approved member is recognized');
select ok(public.session_is_active(),'own active session status is available');
select is((select count(*) from public.attempts),1::bigint,'member sees only own attempts');
select is((select count(*) from public.lesson_progress),0::bigint,'member cannot read another reflection');
select is((select count(*) from public.invitations),0::bigint,'member cannot read invitations');
select is((select count(*) from public.activity_log),0::bigint,'member cannot read admin log');
select throws_ok($$update public.profiles set role='admin' where id=auth.uid()$$,'42501',null,'member cannot change roles');
select throws_ok($$update public.quiz_versions set status='published'$$,'42501',null,'member cannot review quizzes');
select throws_ok($$select public.change_member(auth.uid(),auth.uid(),'admin','approved')$$,'42501',null,'admin service RPC cannot be called by members');
select is((public.export_my_data()->'profile'->>'id'),'00000000-0000-4000-8000-000000000002','export profile belongs to caller');
select is(jsonb_array_length(public.export_my_data()->'attempts'),1,'export includes only caller attempts');

reset role;
update public.profiles set status='disabled' where username='alice';
set local role authenticated;
select ok(not public.is_approved(),'disabled membership takes effect without JWT refresh');
select is((select count(*) from public.classes),0::bigint,'disabled member cannot read shared content');
select is((select count(*) from public.attempts),0::bigint,'disabled member cannot read attempts');
reset role;
update public.profiles set status='approved' where username='alice';
update public.workspace_settings set policy_version='next';
set local role authenticated;
select ok(not public.can_use_workspace(),'outdated policy blocks workspace');
select throws_ok($$select public.accept_policy('2026-11-01',true)$$,'23514',null,'cannot accept stale policy');
select lives_ok($$select public.accept_policy('next',true)$$,'current policy can be accepted');
select ok(public.can_use_workspace(),'acceptance restores workspace access');
reset role;
update public.workspace_settings set policy_version='2026-11-01';
update public.profiles set policy_version='2026-11-01' where username='alice';
select throws_ok($$update public.profiles set role='member' where username='admin'$$,'23514',null,'last admin cannot be demoted');
select throws_ok($$update public.profiles set status='disabled' where username='admin'$$,'23514',null,'last admin cannot be disabled');
select throws_ok($$delete from auth.users where id='00000000-0000-4000-8000-000000000001'$$,'23514',null,'last admin cannot be deleted through Auth cascade');
update public.workspace_settings set limits=jsonb_set(jsonb_set(limits,'{admins}','2'),'{members}','4');
select lives_ok($$select public.reserve_invitation('00000000-0000-4000-8000-000000000001','invite@example.test','member',false)$$,'invite allowed at limit minus one');
select throws_ok($$select public.reserve_invitation('00000000-0000-4000-8000-000000000001','extra@example.test','member',false)$$,'23514',null,'invite blocked at member limit');
select throws_ok($$select public.update_settings('00000000-0000-4000-8000-000000000001','CQStudio','2026-11-01',jsonb_set((select limits from public.workspace_settings),'{members}','3'))$$,'23514',null,'settings cannot fall below reserved usage');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","session_id":"10000000-0000-4000-8000-000000000001","aal":"aal1"}',true);
select is((select count(*) from public.attempts),0::bigint,'admin cannot read member attempts');
select is((select count(*) from public.lesson_progress),0::bigint,'admin cannot read member reflections');
reset role;
update public.invitations set auth_user_id='00000000-0000-4000-8000-000000000004' where email='invite@example.test';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000004","session_id":"10000000-0000-4000-8000-000000000004","aal":"aal1"}',true);
select throws_ok($$select public.accept_invitation('invited','Invited','2026-11-01',false)$$,'23514',null,'invite acceptance requires explicit consent');
select lives_ok($$select public.accept_invitation('invited','Invited','2026-11-01',true)$$,'reserved seat is consumed without double counting');
select ok(public.can_use_workspace(),'accepted invite immediately grants approved access');
reset role;
delete from auth.sessions where user_id='00000000-0000-4000-8000-000000000004';
set local role authenticated;
select ok(not public.is_approved(),'revoked session is rejected even with an unexpired JWT');
select ok(not public.session_is_active(),'client can detect remote revocation and clear local data');
select is((select count(*) from public.classes),0::bigint,'revoked session cannot read shared data');
reset role;
select is((select count(*) from public.profiles where status='approved'),4::bigint,'approved capacity is preserved after invite acceptance');

select * from finish();
rollback;
