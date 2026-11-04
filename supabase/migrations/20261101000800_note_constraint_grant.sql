-- CHECK constraints execute as the writer. This pure validator needs EXECUTE,
-- unlike the privileged trigger functions that remain inaccessible directly.
grant execute on function private.valid_links(jsonb) to authenticated;
