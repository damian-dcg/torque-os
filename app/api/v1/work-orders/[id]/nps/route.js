import { authUser, json, dataClient } from '@/lib/api';
export async function POST(req,{ params }){
  const auth = await authUser(req);
  if(!auth) return json({ error:'No autorizado' }, 401);
  const db = dataClient(auth.token);
  const b = await req.json();
  const p = Number(b.punctuality||0), a = Number(b.attention||0), s = Number(b.solution||0);
  const nota = Number(b.nota||b.rating||0) || (p+a+s>0 ? Math.round((p+a+s)/3) : 0);
  const comentario = b.comentario||b.comments||b.customer_comments||null;
  const { error } = await db.from('surveys_nps').insert([{ ot_id:Number(params.id), nota, punctuality:p||null, attention:a||null, solution:s||null, comentario }]);
  if(error) return json({ error:error.message }, 400);
  return json({ ok:true });
}
