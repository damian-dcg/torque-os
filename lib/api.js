import { createClient } from '@supabase/supabase-js';

export const SB_URL = 'https://qlizhahzfqaesmyglmsn.supabase.co';
export const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsaXpoYWh6ZnFhZXNteWdsbXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MTE5OTgsImV4cCI6MjEwMTI4Nzk5OH0.VELTvmOOVPKkYlyQyr0pm0NnvPf3FINwFY3ZdKHSXJo';

export function json(data, status = 200) { return Response.json(data, { status }); }

export async function authUser(req) {
  const h = req.headers.get('authorization') || '';
  const token = h.replace('Bearer ', '');
  if (!token) return null;
  const r = await fetch(SB_URL + '/auth/v1/user', { headers: { authorization: h, apikey: SB_ANON } });
  if (!r.ok) return null;
  return { user: await r.json(), token };
}

export function dataClient(token) {
  return createClient(SB_URL, SB_ANON, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
}
