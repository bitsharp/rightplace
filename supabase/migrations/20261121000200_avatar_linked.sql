-- 0033 — Profile photo visible to linked users (decision of 20/11/2026, principle 1).
-- The photo is visible to its owner and to anyone with an accepted follow in either direction (the owner's accepted
-- followers and the people the owner follows), never across a block. The rule lives only here: same signature, so
-- get_avatar_paths and every caller change together.

create or replace function private.can_see_avatar(p_viewer uuid, p_owner uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles o where o.id = p_owner and o.deleted_at is null)
     and (p_viewer = p_owner or private.is_linked(p_viewer, p_owner))
$$;
comment on function private.can_see_avatar(uuid, uuid) is
  'Privacy: true for the owner and for anyone with an accepted follow with the owner in either direction (private.is_linked); never across a block, never for pending requests or strangers, never for deleted profiles.';

comment on function public.get_avatar_paths(uuid[]) is
  'Privacy: storage paths only of the caller''s own photo and of people linked to the caller by an accepted follow in either direction (private.is_linked), never across a block; used by the avatar-urls Edge Function, which signs them for 1 hour.';
