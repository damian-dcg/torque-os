import { SB_URL, SB_ANON, json } from '@/lib/api';
export async function POST(req) {
  const { email, password } = await req.json();
  const r = await fetch(SB_URL + '/auth/v1/token?grant_type=password', {
    method: 'POST', headers: { apikey: SB_ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await r.json();
  if (!r.ok) return json({ error: 'Credenciales inválidas' }, 401);
  return json(data);
}
