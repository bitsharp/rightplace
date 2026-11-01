-- 0011 — Final privilege sweep. Keep this migration last: re-run it (as a new migration)
-- whenever functions are added, so new RPCs never stay executable by anon.


-- Supabase grants EXECUTE on new functions to anon by default: no RPC is callable before sign-in,
-- and private helpers are never callable by clients except the four used inside RLS policies.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig, n.nspname, p.prosecdef
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public', 'private') and p.prokind = 'f'
  loop
    execute format('revoke all on function %s from public, anon', f.sig);
    if f.nspname = 'public' then
      execute format('grant execute on function %s to authenticated, service_role', f.sig);
    else
      execute format('revoke all on function %s from authenticated', f.sig);
    end if;
  end loop;
end $$;

grant execute on function private.is_blocked_pair(uuid, uuid), private.is_following(uuid, uuid),
  private.is_room_member(uuid, uuid), private.can_see_post(uuid, timestamptz, timestamptz) to authenticated;

-- Future functions created by the migration role start without EXECUTE for anon/public.
alter default privileges in schema public revoke execute on functions from public, anon;
alter default privileges in schema private revoke execute on functions from public, anon, authenticated;
