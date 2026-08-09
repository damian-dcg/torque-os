import { authUser, json, dataClient } from '@/lib/api';
export async function PATCH(req,{ params }){
  const auth = await authUser(req);
  if(!auth) return json({ error:'No autorizado' }, 401);
  const db = dataClient(auth.token);
  const body = await req.json();
  const otId = Number(params.id);
  const newStatus = body.status || body.new_status;
  const cupones = [];
  if(body.couponCode) cupones.push(body.couponCode);
  if(body.validation_codes && body.validation_codes.cupones) cupones.push(...body.validation_codes.cupones);
  const errores=[];
  for(const c of cupones){
    const { error } = await db.rpc('validar_cupon',{ p_code:c, p_ot_id:otId, p_codigo_secundario:null });
    if(error) errores.push(error.message);
  }
  if(errores.length) return json({ error:'Antifraude: '+errores.join(' | ') }, 409);
  const { data: otRow } = await db.from('work_orders').select('tipo').eq('id',otId).single();
  const tipo=(otRow&&otRow.tipo||'').toLowerCase();
  if(tipo.includes('armado') && newStatus==='Revisión QA'){
    if(!body.couponCode) return json({ error:'Validación doble obligatoria: falta Código Cupón' }, 400);
    const hasBox = !!(body.boxCode&&String(body.boxCode).trim()) || (body.scannedCodes&&body.scannedCodes.length);
    if(!hasBox) return json({ error:'Validación doble obligatoria: falta Código Caja' }, 400);
  }
  const boxes = body.boxCode ? [body.boxCode] : (body.scannedCodes||[]);
  if(boxes.length) await db.from('ot_events').insert([{ ot_id:otId, evento:'scan_cajas', detalle:{ codes: boxes } }]);
  if(body.motivo) await db.from('ot_events').insert([{ ot_id:otId, evento:'motivo', detalle:{ estado:newStatus, motivo:body.motivo } }]);
  if(body.area_responsable) await db.from('ot_events').insert([{ ot_id:otId, evento:'pausa_repuesto', detalle:{ area:body.area_responsable } }]);
  const { data, error } = await db.rpc('cambiar_estado_ot',{ p_ot_id:otId, p_estado:newStatus });
  if(error) return json({ error:error.message }, 400);
  const patch={};
  if(body.financials||body.financialData) patch.financial_data = body.financials||body.financialData;
  if(body.checklist) patch.checklist_responses = body.checklist;
  if(body.latitude!=null) patch.geo = { lat:body.latitude, lng:body.longitude };
  if(body.firma) patch.evidence_urls = [ ...((data&&data.evidence_urls)||[]), body.firma ];
  if(Object.keys(patch).length) await db.from('work_orders').update(patch).eq('id',otId);
  return json({ ok:true, ot:data });
}
