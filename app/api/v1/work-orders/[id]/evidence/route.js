import { authUser, json, dataClient } from '@/lib/api';
export async function POST(req,{ params }){
  const auth = await authUser(req);
  if(!auth) return json({ error:'No autorizado' }, 401);
  const db = dataClient(auth.token);
  const form = await req.formData();
  const otId = Number(params.id);
  const got = form.getAll('file').concat(form.getAll('files'));
  const urls=[];
  for(const f of got){
    const path = `ot-${otId}/${Date.now()}-${Math.random().toString(36).slice(2)}-${f.name}`;
    const { error } = await db.storage.from('evidencia').upload(path, f);
    if(!error) urls.push(db.storage.from('evidencia').getPublicUrl(path).data.publicUrl);
  }
  const { data: ot } = await db.from('work_orders').select('evidence_urls').eq('id',otId).single();
  const prev = (ot?.evidence_urls||[]).filter(u=>typeof u==='string');
  const all = [...prev, ...urls];
  await db.from('work_orders').update({ evidence_urls: all }).eq('id',otId);
  return json({ ok:true, evidence_urls: all, evidenceUrls: all });
}
