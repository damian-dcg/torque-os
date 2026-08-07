import { authUser, json, dataClient } from '@/lib/api';
export async function GET(req){
  const auth = await authUser(req);
  if(!auth) return json({ error:'No autorizado' }, 401);
  const db = dataClient(auth.token);
  const { data } = await db.from('coupons').select('id,code').eq('estado','usado').limit(2000);
  return json((data||[]).map(c=>({ id:c.code, tenant_id:'dcg', code:c.code })));
}
