-- 0018 — Friends lists: who I follow (with tonight's venue), who follows me, whom I blocked.
-- "Following" always means an accepted follow (CLAUDE.md principle 6).

create or replace function public.get_following()
returns table (
  user_id uuid, handle text, age_band text, gender text, is_creator boolean,
  follows_me boolean, tonight_venue_id uuid, tonight_venue_name text, followed_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare v_me uuid := private.require_user();
begin
  return query
  select p.id, p.handle, public.age_band(p.birth_date), p.gender, p.is_creator,
         private.is_following(p.id, v_me),
         tv.venue_id, tv.venue_name, f.created_at
    from public.follows f
    join public.profiles p on p.id = f.followee_id and p.deleted_at is null
    -- accepted only: where they go tonight is shared by the accepted follow itself
    left join lateral private.user_tonight_venue(p.id) tv on true
   where f.follower_id = v_me and f.status = 'accepted'
     and not private.is_blocked_pair(v_me, p.id)
   order by p.handle;
end $$;
comment on function public.get_following() is
  'Privacy: only accepted follows of the caller (pending requests unlock nothing); public identity plus tonight''s '
  'venue the followee shares through the accepted follow; blocked pairs and deleted profiles excluded.';

create or replace function public.get_followers()
returns table (
  user_id uuid, handle text, age_band text, gender text, is_creator boolean,
  i_follow boolean, followed_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare v_me uuid := private.require_user();
begin
  return query
  select p.id, p.handle, public.age_band(p.birth_date), p.gender, p.is_creator,
         private.is_following(v_me, p.id), f.created_at
    from public.follows f
    join public.profiles p on p.id = f.follower_id and p.deleted_at is null
   where f.followee_id = v_me and f.status = 'accepted'
     and not private.is_blocked_pair(v_me, p.id)
   order by p.handle;
end $$;
comment on function public.get_followers() is
  'Privacy: accepted followers of the caller, public identity only; no plans of theirs (they did not grant access to the caller).';

create or replace function public.get_blocked_users()
returns table (user_id uuid, handle text, blocked_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.handle, b.created_at
    from public.blocks b join public.profiles p on p.id = b.blocked_id and p.deleted_at is null
   where b.blocker_id = private.require_user()
   order by p.handle
$$;
comment on function public.get_blocked_users() is
  'Privacy: only the blocks created by the caller, handle only; the blocked user can never see who blocked them.';

revoke all on function public.get_following(), public.get_followers(), public.get_blocked_users()
  from public, anon;
grant execute on function public.get_following(), public.get_followers(), public.get_blocked_users()
  to authenticated, service_role;
