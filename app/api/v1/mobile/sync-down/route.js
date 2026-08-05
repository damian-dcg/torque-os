import { authUser, json, dataClient } from '@/lib/api';
export async function GET(req) {
  const auth = await authUser(req);
  if (!auth) return json({ error: 'No autorizado' }, 401);
  const db = dataClient(auth.token);
  const { data: me } = await db.from('users').select('*').eq('auth_uid', auth.user.id).single();
  if (!me) return json({ error: 'Usuario sin perfil en el sistema' }, 403);
  let otsQ = db.from('work_orders').select('*').order('id', { ascending: false }).limit(200);
  otsQ = me.rol === 'sat_admin' ? otsQ.eq('asignado_company_id', me.company_id) : otsQ.eq('asignado_user_id', me.id);
  const [ots, customers, products, checklists, blocks, coupons] = await Promise.all([
    otsQ,
    db.from('customers').select('id,nombre,telefono,whatsapp,direccion,region_id'),
    db.from('products').select('id,nombre,sku,ean_caja'),
    db.from('checklists').select('code,blocks'),
    db.from('checklist_blocks').select('code,nombre,items'),
    db.from('coupons').select('code').eq('estado', 'usado').limit(2000)
  ]);
  const blk = {}; (blocks.data || []).forEach(b => blk[b.code] = b);
  const schemaFor = (code) => {
    const ck = (checklists.data || []).find(c => c.code === code);
    if (!ck) return [];
    const out = [];
    (ck.blocks || []).forEach(bc => {
      const b = blk[bc]; if (!b) return;
      (b.items || []).forEach((it, i) => out.push({ id: bc + '_' + i, section: b.nombre, type: it.t === 'sel' ? 'checkbox' : it.t === 'foto' ? 'photo' : 'text', label: it.l, required: !!it.r, options: it.o || null }));
    });
    return out;
  };
  const cust = {}; (customers.data || []).forEach(c => cust[c.id] = c);
  return json({
    server_time: new Date().toISOString(),
    usuario: { id: me.id, rol: me.rol, nombre: me.nombre },
    work_orders: (ots.data || []).map(o => ({
      id: o.id, ot_number: o.ot_number, status: o.estado, type: o.tipo, priority: o.prioridad,
      customer: cust[o.customer_id] || null, description: o.descripcion, address: o.direccion,
      checklist_code: o.checklist_code, checklist_schema: schemaFor(o.checklist_code),
      checklist_responses: o.checklist_responses, financial_data: o.financial_data, created_at: o.created_at
    })),
    products: products.data || [],
    used_coupons: (coupons.data || []).map(c => c.code)
  });
}
