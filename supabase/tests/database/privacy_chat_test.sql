begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();
insert into auth.users(id,email,email_confirmed_at) values
('05000000-0000-4000-8000-000000000001','privacy-a@example.test',now()),
('05000000-0000-4000-8000-000000000002','privacy-b@example.test',now());
insert into auth.sessions(id,user_id,created_at,updated_at) values
('15000000-0000-4000-8000-000000000001','05000000-0000-4000-8000-000000000001',now(),now()),
('15000000-0000-4000-8000-000000000002','05000000-0000-4000-8000-000000000002',now(),now());
insert into profiles(id,username,display_name,policy_version,policy_accepted_at) values
('05000000-0000-4000-8000-000000000001','privacy_a','A','2026-11-01',now()),
('05000000-0000-4000-8000-000000000002','privacy_b','B','2026-11-01',now());
insert into classes(id,name) values('25000000-0000-4000-8000-000000000001','Privacy tests');
insert into lessons(id,class_id,title,markdown) values('35000000-0000-4000-8000-000000000001','25000000-0000-4000-8000-000000000001','Lesson','Private reflection');
insert into quizzes(id,class_id,title) values('45000000-0000-4000-8000-000000000001','25000000-0000-4000-8000-000000000001','Quiz');
insert into quiz_versions(id,quiz_id,version,kind,status,content,created_by) values
('55000000-0000-4000-8000-000000000001','45000000-0000-4000-8000-000000000001',1,'manual','published','{"format_version":1,"questions":[{"id":"q1","type":"true_false","prompt":"True?","points":1,"answer":true}]}','05000000-0000-4000-8000-000000000002'),
('55000000-0000-4000-8000-000000000002','45000000-0000-4000-8000-000000000001',2,'manual','draft','{"format_version":1,"questions":[{"id":"q1","type":"true_false","prompt":"Secret draft?","points":1,"answer":false}]}','05000000-0000-4000-8000-000000000002');
update quizzes set published_version_id='55000000-0000-4000-8000-000000000001' where id='45000000-0000-4000-8000-000000000001';
insert into attempts(id,user_id,quiz_version_id,score,max_score,answers) values('65000000-0000-4000-8000-000000000002','05000000-0000-4000-8000-000000000002','55000000-0000-4000-8000-000000000001',8,10,'{"responses":{},"question_ids":[]}');
insert into notifications(user_id,kind,title) values('05000000-0000-4000-8000-000000000001','role_changed','Own notification'),('05000000-0000-4000-8000-000000000002','role_changed','Other notification');
create temporary table import_fixture(payload jsonb);
insert into import_fixture select jsonb_build_object('attempts',jsonb_build_array(jsonb_build_object('id','65000000-0000-4000-8000-000000000001','user_id','05000000-0000-4000-8000-000000000002','quiz_version_id','55000000-0000-4000-8000-000000000001','score',1,'max_score',1,'answers','{"responses":{"q1":true},"question_ids":["q1"]}'::jsonb,'summary',false,'started_at',now()-interval '1 minute','completed_at',now())),'lesson_progress',jsonb_build_array(jsonb_build_object('user_id','05000000-0000-4000-8000-000000000002','lesson_id','35000000-0000-4000-8000-000000000001','status','in_progress','confidence',3,'reflection','Only caller receives this','updated_at',now()-interval '1 day')),'saved_files','[]'::jsonb);
grant select on import_fixture to authenticated;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"05000000-0000-4000-8000-000000000001","session_id":"15000000-0000-4000-8000-000000000001","aal":"aal1"}',true);
select is((select count(*) from notifications where kind='role_changed'),1::bigint,'notifications are private to their recipient');
select lives_ok($$update notifications set read_at=now() where kind='role_changed'$$,'recipient can mark own notification read');
select throws_ok($$update notifications set title='Forged'$$,'42501',null,'recipient cannot edit notification contents');
select lives_ok($$insert into chat_messages(user_id,body) select auth.uid(),'Message '||i from generate_series(1,19)i$$,'chat accepts rate limit minus one');
select lives_ok($$insert into chat_messages(user_id,body) values(auth.uid(),'Twentieth')$$,'chat accepts exactly twenty sends');
select throws_ok($$insert into chat_messages(user_id,body) values(auth.uid(),'Twenty-first')$$,'23514',null,'chat rejects rate limit plus one');
delete from chat_messages where user_id=auth.uid();
select throws_ok($$insert into chat_messages(user_id,body) values(auth.uid(),'Delete bypass')$$,'23514',null,'deleting own messages does not bypass the rate limit');
select throws_ok($$insert into chat_messages(user_id,body) values('05000000-0000-4000-8000-000000000002','Forged')$$,'42501',null,'sender cannot impersonate another member');
select throws_ok($$select import_private_data((select payload from import_fixture),'merge',false)$$,'23514',null,'import requires explicit confirmation');
select throws_ok($$select preview_private_import((select payload from import_fixture),null)$$,'23514',null,'null import mode is invalid');
select throws_ok($$select import_private_data(jsonb_set((select payload from import_fixture),'{attempts,0,score}','null'),'replace',true)$$,'23514',null,'null numeric import values fail before replacement');
select lives_ok($$select import_private_data((select payload from import_fixture),'merge',true)$$,'validated private data can be merged');
select is((select count(*) from attempts),1::bigint,'imported attempts belong only to caller');
select is((select user_id from attempts limit 1),auth.uid(),'backup user ID cannot change the import owner');
select is((select reflection from lesson_progress limit 1),'Only caller receives this','reflection is restored to caller');
select is((select updated_at::date from lesson_progress limit 1),(now()-interval '1 day')::date,'import preserves progress timestamp');
select lives_ok($$select import_private_data(jsonb_set((select payload from import_fixture),'{lesson_progress,0,updated_at}',to_jsonb(now()-interval '2 days')),'merge',true)$$,'older progress can be merged safely');
select is((select updated_at::date from lesson_progress limit 1),(now()-interval '1 day')::date,'older backup does not overwrite newer progress');
select is((preview_private_import(jsonb_set((select payload from import_fixture),'{attempts,0,quiz_version_id}','"55000000-0000-4000-8000-000000000002"'),'merge')->>'attempts')::integer,0,'preview excludes another author’s draft');
select lives_ok($$select import_private_data(jsonb_set((select payload from import_fixture),'{attempts,0,quiz_version_id}','"55000000-0000-4000-8000-000000000002"'),'merge',true)$$,'unavailable draft import is skipped');
select is((select count(*) from quiz_versions where status='draft'),0::bigint,'forged backup cannot reveal private draft content');
select is((select count(*) from my_attempts('25000000-0000-4000-8000-000000000001',0)),1::bigint,'class-filtered history includes caller attempt');
select is((select count(*) from my_attempts('25000000-0000-4000-8000-000000000099',0)),0::bigint,'class filter applies before pagination');
select is(jsonb_array_length(export_my_data()->'attempts'),1,'own-data export excludes another member’s attempts');
reset role;
update quizzes set published_version_id=null where id='45000000-0000-4000-8000-000000000001';
update quiz_versions set status='rejected' where id='55000000-0000-4000-8000-000000000001';
set local role authenticated;
select is((select count(*) from my_attempts(null,0)),1::bigint,'unpublished quiz stays in private historical progress');
reset role;
select is((select score from attempts where id='65000000-0000-4000-8000-000000000002'),8::numeric,'other member score is unchanged');
select is((select read_at from notifications where title='Other notification'),null::timestamptz,'other member notification is unchanged');
select ok(not exists(select 1 from activity_log where action='chat.sent' and metadata<>'{}'::jsonb),'chat rate metadata contains no bodies');
update activity_log set created_at=now()-interval '2 minutes' where action='chat.sent';
set local role authenticated;
select lives_ok($$insert into chat_messages(user_id,body) values(auth.uid(),'New rate window')$$,'chat resumes after rate window expires');
reset role;
update profiles set status='disabled' where id='05000000-0000-4000-8000-000000000001';
set local role authenticated;
select throws_ok($$insert into chat_messages(user_id,body) values(auth.uid(),'Disabled')$$,'42501',null,'disabled member immediately loses send access');
select * from finish();
rollback;
