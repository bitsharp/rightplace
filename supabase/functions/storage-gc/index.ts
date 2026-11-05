import { createClient } from 'npm:@supabase/supabase-js@2';
import { handleGc, type QueuedFile } from './handler.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
// `supabase secrets set STORAGE_GC_KEY=...`; the same value lives in Vault as `storage_gc_key`.
const gcKey = Deno.env.get('STORAGE_GC_KEY') ?? '';

const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

async function claim(): Promise<QueuedFile[]> {
  const { data, error } = await admin.rpc('claim_storage_deletions', { p_limit: 200 });
  if (error) throw new Error('CLAIM_FAILED');
  return (data ?? []).map((row: { id: number; bucket_id: string; object_path: string }) => ({
    id: row.id,
    bucketId: row.bucket_id,
    objectPath: row.object_path,
  }));
}

async function remove(bucketId: string, paths: string[]): Promise<void> {
  const { error } = await admin.storage.from(bucketId).remove(paths);
  if (error) throw new Error('REMOVE_FAILED');
}

async function complete(ids: number[]): Promise<void> {
  const { error } = await admin.rpc('complete_storage_deletions', { p_ids: ids });
  if (error) throw new Error('COMPLETE_FAILED');
}

Deno.serve((request) =>
  handleGc(request, { gcKey, claim, remove, complete, log: (m) => console.log(m) }),
);
