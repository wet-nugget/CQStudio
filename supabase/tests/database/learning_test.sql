begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select plan(12);
insert into auth.users(id,email,email_confirmed_at) values
 ('01000000-0000-4000-8000-000000000001','learning-admin@example.test',now()),
 ('01000000-0000-4000-8000-000000000002','learning-member@example.test',now());
insert into auth.sessions(id,user_id,created_at,updated_at) values
 ('11000000-0000-4000-8000-000000000001','01000000-0000-4000-8000-000000000001',now(),now()),
 ('11000000-0000-4000-8000-000000000002','01000000-0000-4000-8000-000000000002',now(),now());
insert into profiles(id,username,display_name,role,policy_version,policy_accepted_at) values
 ('01000000-0000-4000-8000-000000000001','learning_admin','Admin','admin','2026-11-01',now()),
 ('01000000-0000-4000-8000-000000000002','learning_member','Member','member','2026-11-01',now());
insert into classes(id,name,created_by) values('21000000-0000-4000-8000-000000000001','Owner class','01000000-0000-4000-8000-000000000001');
update workspace_settings set limits=jsonb_set(limits,'{classes}',to_jsonb((select count(*)+1 from classes)));
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"01000000-0000-4000-8000-000000000002","session_id":"11000000-0000-4000-8000-000000000002","aal":"aal1"}',true);
select throws_ok($$insert into classes(name,created_by) values('Forged owner','01000000-0000-4000-8000-000000000001')$$,'42501',null,'member cannot forge ownership');
select lives_ok($$insert into classes(name,created_by) values('My class',auth.uid())$$,'class allowed at limit minus one');
select throws_ok($$insert into classes(name,created_by) values('Too many',auth.uid())$$,'23514',null,'new class blocked at limit');
with changed as(update classes set name='Hijacked' where id='21000000-0000-4000-8000-000000000001' returning id) select is((select count(*) from changed),0::bigint,'member cannot edit another owner class');
select lives_ok($$insert into lessons(class_id,title,markdown,created_by) values('21000000-0000-4000-8000-000000000001','My lesson','# Safe',auth.uid())$$,'member can contribute lesson');
select throws_ok($$insert into lessons(class_id,title,markdown,created_by) values('21000000-0000-4000-8000-000000000001','Too large',repeat('x',204801),auth.uid())$$,'23514',null,'lesson size is enforced in database');
select lives_ok($$insert into notes(class_id,title,body,links,created_by) values('21000000-0000-4000-8000-000000000001','Reference','A note','[{"label":"Reference","url":"https://example.com"}]',auth.uid())$$,'valid note and link accepted');
select throws_ok($$insert into notes(class_id,title,links,created_by) values('21000000-0000-4000-8000-000000000001','Bad link','[{"label":"Bad","url":"javascript:alert(1)"}]',auth.uid())$$,'23514',null,'unsafe reference protocol rejected');
with removed as(delete from classes returning id) select is((select count(*)from removed),0::bigint,'member cannot delete classes');
reset role;
update workspace_settings set limits=jsonb_set(limits,'{lessons_per_class}','1');
set local role authenticated;
select throws_ok($$insert into lessons(class_id,title,markdown,created_by) values('21000000-0000-4000-8000-000000000001','Too many','Text',auth.uid())$$,'23514',null,'lesson count enforced at limit');
select lives_ok($$update lessons set markdown='# Updated' where title='My lesson'$$,'owner can update existing content at reached capacity');
select is((select markdown from lessons where title='My lesson'),'# Updated','owner update persists');
select * from finish();
rollback;
