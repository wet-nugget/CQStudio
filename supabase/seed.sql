-- Idempotent demo study content only. No Auth users, emails, tokens, or passwords.
-- Run only on development. Membership is created by the real invitation flow.
insert into public.classes(id,name,teacher_subject,description,icon) values
 ('de000000-0000-4000-8000-000000000001','A little biology','Science · Independent study','From the smallest cell to the world around us.','leaf'),
 ('de000000-0000-4000-8000-000000000002','Thinking in systems','Computer science','Make complex things a little clearer, one idea at a time.','code')
on conflict(id) do nothing;
insert into public.lessons(id,class_id,title,markdown) values
 ('de000000-0000-4000-8000-000000000011','de000000-0000-4000-8000-000000000001','Cells: a small beginning',E'# Cells: a small beginning\n\nA cell is a living system’s basic unit. Start with three parts:\n\n| Part | A useful way to think about it |\n| --- | --- |\n| Membrane | A selective boundary |\n| Cytoplasm | A space for many reactions |\n| Genetic material | Instructions for cell processes |\n\n## Pause and reflect\n\nHow is a cell like a small community? Write your own reflection in your private progress panel.\n'),
 ('de000000-0000-4000-8000-000000000012','de000000-0000-4000-8000-000000000002','Inputs, processes, outputs',E'# Inputs, processes, outputs\n\nChoose something familiar: making tea, preparing for a quiz, or writing a program.\n\n1. What goes in?\n2. What changes?\n3. What comes out?\n\nDescribe one feedback loop that could make the result better.\n')
on conflict(id) do nothing;
