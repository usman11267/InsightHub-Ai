import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client using the service role key.
 * This bypasses Row Level Security — only use in trusted server contexts.
 * Never expose the service role key to the client.
 */
function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    // Return a mock client when Supabase is not configured (dev without storage)
    return null;
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Singleton per module instance
let _admin: SupabaseClient | null | undefined = undefined;

export function getSupabaseAdmin() {
  if (_admin === undefined) _admin = createSupabaseAdmin();
  return _admin;
}

export const STORAGE_BUCKET = "datasets";

/**
 * Upload a file buffer to Supabase Storage.
 * Returns the storage path on success, throws on failure.
 */
export async function uploadToStorage(
  path: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const client = getSupabaseAdmin();

  // If Supabase not configured, store path is a placeholder (dev mode)
  if (!client) {
    console.warn("[supabase] Storage not configured — skipping upload");
    return path;
  }

  const { error } = await client.storage
    .from(STORAGE_BUCKET)
    .upload(path, buffer, {
      contentType,
      upsert: false,
    });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return path;
}

/**
 * Generate a signed URL for temporary file access.
 */
export async function getSignedUrl(
  path: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  const client = getSupabaseAdmin();
  if (!client) return null;

  const { data, error } = await client.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data) return null;
  return data.signedUrl;
}

/**
 * Delete a file from storage (best-effort — failures are logged, not thrown).
 */
export async function deleteFromStorage(path: string): Promise<void> {
  const client = getSupabaseAdmin();
  if (!client) return;

  const { error } = await client.storage.from(STORAGE_BUCKET).remove([path]);
  if (error) console.error("[supabase] Failed to delete file:", error.message);
}
