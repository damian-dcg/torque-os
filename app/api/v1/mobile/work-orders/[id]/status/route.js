import { authUser, json, dataClient } from '@/lib/api';
export async function PATCH(req, { params }) {
  const auth = await authUser(req);
  if (!auth) return json({ error: 'No autorizado' }, 401);
  const db = dataClient(auth.token);
  const body = await req.json();
  const otId = Number(params.id);
  const codes = body.validation_codes || {};
  const errores = [];
  for (const c of (codes.cupones || [])) {
    const { error } = await db.rpc('validar_cupon', { p_code: c, p_ot_id: otId, p_codigo_secundario: null });
    if (error) errores.push(error.message);
  }
  if (errores.length) return json({ error: 'Antifraude: ' + errores.join(' | ') }, 409);
  const { data, error } = await db.rpc('cambiar_estado_ot', { p_ot_id: otId, p_estado: body.new_status });
  if (error) return json({ error: error.message }, 400);
  const patch = {};
  if (body.financials) patch.financial_data = body.financials;
  if (body.checklist_responses) patch.checklist_responses = body.checklist_responses;
  if (Object.keys(patch).length) await db.from('work_orders').update(patch).eq('id', otId);
  return json({ ok: true, ot: data });
}
