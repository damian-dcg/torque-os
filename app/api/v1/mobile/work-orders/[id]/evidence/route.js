import { authUser, json, dataClient } from '@/lib/api';
export async function POST(req, { params }) {
  const auth = await authUser(req);
  if (!auth) return json({ error: 'No autorizado' }, 401);
  const db = dataClient(auth.token);
  const form = await req.formData();
  const files = form.getAll('files');
  const urls = [];
  for (const f of files) {
    const path = `ot-${params.id}/${Date.now()}-${Math.random().toString(36).slice(2)}-${f.name}`;
    const { error } = await db.storage.from('evidencia').upload(path, f);
    if (!error) urls.push(db.storage.from('evidencia').getPublicUrl(path).data.publicUrl);
  }
  return json({ urls });
}
