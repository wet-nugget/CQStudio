-- Private attempt history must remain navigable after publication is withdrawn.
-- This exposes only the quiz metadata to that learner; version visibility still
-- requires a published version, authorship/admin, or their own exact attempt.
drop policy quizzes_read on public.quizzes;
create policy quizzes_read on public.quizzes for select to authenticated using (
  public.can_use_workspace() and (published_version_id is not null or created_by=auth.uid() or public.is_admin()
    or exists(select 1 from public.quiz_versions v join public.attempts a on a.quiz_version_id=v.id
      where v.quiz_id=quizzes.id and a.user_id=auth.uid()))
);
