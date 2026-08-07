import { authUser, json, dataClient } from '@/lib/api';
export async function POST(req,{ params }){
  const auth = await authUser(req);
  if(!auth) return json({ error:'No autorizado' }, 401);
  const db = dataClient(auth.token);
  const b = await req.json();
  const { error } = await db.from('surveys_nps').insert([{ ot_id:Number(params.id), nota:Number(b.nota||b.rating||0), comentario:b.comentario||b.comment||null }]);
  if(error) return json({ error:error.message }, 400);
  return json({ ok:true });
}
