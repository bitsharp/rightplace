-- 0013 — Prompt 05: complete account deletion. delete_my_account() erases data at once and queues
-- the auth user; this job removes it from auth.users (email included), cascading to the profile.
-- Runs as the migration role, which may delete auth users on Supabase; no service-role key needed.

create or replace function private.process_account_deletions() returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from auth.users u
   using private.account_deletion_requests r
   where u.id = r.user_id;
  delete from private.account_deletion_requests r
   where not exists (select 1 from auth.users u where u.id = r.user_id);
end $$;

revoke all on function private.process_account_deletions() from public, anon, authenticated;

-- Hourly: well within the 24 h promised in the privacy policy.
select cron.schedule('process-account-deletions', '15 * * * *', 'select private.process_account_deletions()');
