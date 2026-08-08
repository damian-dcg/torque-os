import { authUser, json, dataClient } from '@/lib/api';

const defaultByType=(t)=>{
  const x=(t||'').toLowerCase();
  if(x.includes('volumen')) return 'CK-ARM-VOL-BICI';
  if(x.includes('armado')) return 'CK-ARM-BICI';
  if(x.includes('garantia')) return 'CK-EVAL-GARANTIA';
  if(x.includes('retiro')) return 'CK-RETIRO';
  if(x.includes('manten')) return 'CK-MANT-ELEC';
  return 'CK-REP-CONV';
};

export async function GET(req){
  const auth = await authUser(req);
  if(!auth) return json({ error:'No autorizado' }, 401);
  const db = dataClient(auth.token);
  const { data: me } = await db.from('users').select('*').eq('auth_uid', auth.user.id).single();
  const tenant = 'dcg';
  let otsQ = db.from('work_orders').select('*').order('id',{ascending:false}).limit(300);
  if(me && me.rol==='tecnico_sat') otsQ = otsQ.eq('asignado_user_id', me.id);
  else if(me && me.rol==='sat_admin') otsQ = otsQ.eq('asignado_company_id', me.company_id);
  const [ots, coupons, customers, products, checklists, blocks] = await Promise.all([
    otsQ,
    db.from('coupons').select('id,code').eq('estado','usado').limit(2000),
    db.from('customers').select('id,nombre,telefono,direccion,region_id').limit(500),
    db.from('products').select('id,nombre,sku,ean_caja').limit(1000),
    db.from('checklists').select('code,blocks'),
    db.from('checklist_blocks').select('code,nombre,items')
  ]);
  const blk={}; (blocks.data||[]).forEach(b=>blk[b.code]=b);
  const schemaFor=(code)=>{
    const ck=(checklists.data||[]).find(c=>c.code===code); if(!ck) return [];
    const out=[];
    (ck.blocks||[]).forEach(bc=>{
      const b=blk[bc]; if(!b) return;
           (b.items||[]).forEach((it,i)=>out.push({ id:it.id||bc+'_'+i, type: it.t==='sel'?'select': it.t==='foto'?'photo': it.t==='num'?'number': it.t==='tit'?'title':'text', label:it.l, required:!!it.r, options:it.o||null, dependsOn:it.dep||null }));
    });
    return out;
  };
  const cust={}; (customers.data||[]).forEach(c=>cust[c.id]=c);
  const workOrders=(ots.data||[]).map(o=>{
    const schema=schemaFor(o.checklist_code||defaultByType(o.tipo));
    const fotos=(o.evidence_urls||[]).filter(u=>typeof u==='string');
    return {
      id:String(o.id), tenant_id:tenant, type:o.tipo, priority:o.prioridad,
      status:o.estado, asset_id:String(o.customer_id||''),
      customer:cust[o.customer_id]||null, description:o.descripcion, address:o.direccion,
      checklist_schema:schema,
      evidenceUrls:[schema.length?JSON.stringify(schema):null,...fotos].filter(Boolean),
      evidence_urls:fotos,
      financial_data:o.financial_data||{}, created_at:o.created_at
    };
  });
  return json({
    workOrders,
    usedCoupons:(coupons.data||[]).map(c=>({ id:c.code, tenant_id:tenant, code:c.code })),
    productsCatalog:products.data||[],
    clients:customers.data||[],
    assets:[]
  });
}
