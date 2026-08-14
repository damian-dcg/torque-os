'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S } from '../ui';
const REPO='damian-dcg/torque-os';
const DEAD=['app/armado','app/catalogo','app/cupones','app/importar','app/panel','lib/consola/mod_catalogos.jsx','lib/consola/mod_reportes.jsx'];
const LIVE=['app/page.jsx','app/consola/page.jsx','app/tecnico/page.jsx','app/solicitud/page.jsx','app/seguimiento/page.jsx','app/sstt/page.jsx','lib/consola/mod_auditoria.jsx','lib/consola/mod_parametros.jsx','lib/consola/mod_inventario.jsx','lib/consola/mod_compras.jsx','lib/consola/mod_caja.jsx','lib/consola/mod_garantias.jsx','lib/consola/mod_calidad.jsx','lib/consola/mod_rrhh.jsx','lib/consola/mod_bi.jsx','lib/consola/mod_desarme.jsx','lib/consola/mod_recuperacion.jsx','lib/consola/mod_recepcion.jsx','lib/consola/mod_aprobaciones.jsx','lib/consola/mod_exportar.jsx','lib/consola/FichaOT.jsx','lib/consola/FichaCliente.jsx','lib/consola/Buzon.jsx','lib/consola/mod_nuevaot.jsx','lib/consola/mod_kpis.jsx','lib/consola/mod_importar.jsx'];
export default function ModAuditoria(){
  const [rep,setRep]=useState('Generando…');
  const [tab,setTab]=useState('datos');
  const [repoRep,setRepoRep]=useState('Pulsa "Auditar repo".');
  const [token,setToken]=useState('');
  const url=(typeof process!=='undefined'&&process.env&&process.env.NEXT_PUBLIC_SUPABASE_URL)||'n/d';
  async function cnt(t){ const {count}=await supabase.from(t).select('*',{count:'exact',head:true}); return count||0; }
  async function auditar(){
    const L=['WEB CONECTADA A: '+url,'=== CONTEOS ==='];
    const tabs=['customers','work_orders','assets','product_families','service_types','mant_types','tech_rates','sla_matrix','warranty_rules','paquetes','checklists','checklist_blocks','presupuestos','liquidaciones','notifications','insistencias','ot_events','equipment','stock_movements','parts','regions','settings','companies','users','approvals','receptions','belongings','disassembly_requests','disassembly_sessions','extracted_components','component_evaluations','component_valuations','stock_items','stock_kardex','warehouses','suppliers','purchase_orders','accounts_payable','cash_sessions','invoices','payments','accounts_receivable','warranty_cases','brand_contracts','brand_claims','recall_campaigns','non_conformities','quality_audits','incidents','shifts','attendance'];
    for(const t of tabs){ const {count,error}=await supabase.from(t).select('*',{count:'exact',head:true}); L.push(t+': '+(error?('ERROR '+error.message):count)); }
    L.push('=== CHEQUEOS DE INTEGRIDAD ===');
    const wo=(await supabase.from('work_orders').select('*').limit(5000)).data||[];
    const cu=(await supabase.from('customers').select('id,rut,nombre').limit(5000)).data||[];
    const cuIds={}; cu.forEach(c=>cuIds[c.id]=1);
    L.push('OTs sin cliente válido: '+wo.filter(o=>!o.customer_id||!cuIds[o.customer_id]).length);
    L.push('OTs sin ext_id: '+wo.filter(o=>!o.ext_id).length);
    L.push('OTs sin kpi: '+wo.filter(o=>!o.kpi).length);
    L.push('OTs sin diagnóstico: '+wo.filter(o=>!o.diagnostico).length);
    L.push('OTs en Buzón (Ingresada sin asignar): '+wo.filter(o=>o.estado==='Ingresada'&&!o.asignado_user_id&&!o.asignado_company_id).length);
    const ruts={}; let dupR=0; cu.forEach(c=>{ if(c.rut){ ruts[c.rut]=(ruts[c.rut]||0)+1; } }); Object.keys(ruts).forEach(k=>{ if(ruts[k]>1)dupR++; });
    L.push('Clientes con RUT duplicado: '+dupR);
    const otPorCli={}; wo.forEach(o=>{ otPorCli[o.customer_id]=(otPorCli[o.customer_id]||0)+1; });
    L.push('Clientes sin ninguna OT: '+cu.filter(c=>!otPorCli[c.id]).length);
    const si=(await supabase.from('stock_items').select('*').limit(2000)).data||[];
    L.push('Stock sin almacén: '+si.filter(s=>!s.warehouse_id).length);
    L.push('Stock negativo: '+si.filter(s=>Number(s.quantity)<0).length);
    L.push('Stock bajo mínimo: '+si.filter(s=>Number(s.min_stock)>0&&Number(s.quantity)<=Number(s.min_stock)).length);
    L.push('Aprobaciones pendientes: '+await cnt('approvals')?L[L.length-1]:L[L.length-1]);
    setRep(L.join('\n'));
  }
  async function auditarRepo(){
    setRepoRep('Leyendo árbol de '+REPO+'…');
    const hdr=token?{Authorization:'token '+token}:{};
    const r=await fetch('https://api.github.com/repos/'+REPO+'/git/trees/main?recursive=1',{headers:hdr});
    if(!r.ok){ setRepoRep('⛗ HTTP '+r.status+'. Si el repo es privado, pega un token.'); return; }
    const j=await r.json(); const paths=(j.tree||[]).map(n=>n.path);
    const L=['AUDITORÍA DE REPO · '+REPO,'---','MUERTOS (deben estar ELIMINADOS):'];
    DEAD.forEach(d=>{ L.push((paths.some(p=>p===d||p.startsWith(d+'/'))?'⛗ PRESENTE: ':'✔ ELIMINADO: ')+d); });
    L.push('---','VIVOS (deben estar PRESENTES):');
    LIVE.forEach(v=>{ L.push((paths.some(p=>p===v)?'✔ PRESENTE: ':'⛗ FALTA: ')+v); });
    setRepoRep(L.join('\n'));
  }
  async function sembrar(){
    const L=['Sembrando en '+url];
    if(await cnt('product_families')===0){ await supabase.from('product_families').insert([{code:'FP001',name:'BICICLETA',active:true},{code:'FP002',name:'BICICLETA ELECTRICA',active:true},{code:'FP003',name:'MAQUINA',active:true},{code:'FP004',name:'SCOOTER ELECTRICO',active:true},{code:'FP005',name:'ACCESORIO',active:true}]); L.push('✅ familias'); }
    if(await cnt('warehouses')===0){ await supabase.from('warehouses').insert([{name:'Almacén Central',type:'principal',active:true}]); L.push('✅ almacén'); }
    L.push('FIN.');
    setRep(L.join('\n'));
  }
  useEffect(()=>{ auditar(); },[]);
  return (<div style={S.card}>
    <h2 style={S.h2}>Auditoría del sistema</h2>
    <div style={{display:'flex',gap:6,marginBottom:10}}>
      {['datos','repo'].map(t=><button key={t} onClick={()=>setTab(t)} style={{padding:'8px 14px',borderRadius:999,border:tab===t?'0':'1px solid '+T.border,background:tab===t?T.brand:'transparent',color:tab===t?'#fff':T.text,fontWeight:600,fontSize:13,cursor:'pointer'}}>{t}</button>)}
    </div>
    {tab==='datos'? <div>
      <div style={{display:'flex',gap:8,marginBottom:10,flexWrap:'wrap'}}>
        <button style={S.btn(T.ok)} onClick={sembrar}>🌱 Sembrar</button>
        <button style={S.btn(T.brand)} onClick={auditar}>🔄 Re-auditar</button>
        <button style={S.btnO(T.info)} onClick={()=>navigator.clipboard.writeText(rep)}>Copiar informe</button>
      </div>
      <pre style={{...S.sub,whiteSpace:'pre-wrap',background:T.surface2,padding:12,borderRadius:8}}>{rep}</pre>
    </div> : <div>
      <input style={{...S.input,width:320,marginBottom:8}} placeholder="Token GitHub (opcional)" value={token} onChange={e=>setToken(e.target.value)}/>
      <div style={{display:'flex',gap:8,marginBottom:10}}>
        <button style={S.btn(T.brand)} onClick={auditarRepo}>🔍 Auditar repo</button>
        <button style={S.btnO(T.info)} onClick={()=>navigator.clipboard.writeText(repoRep)}>Copiar informe repo</button>
      </div>
      <pre style={{...S.sub,whiteSpace:'pre-wrap',background:T.surface2,padding:12,borderRadius:8}}>{repoRep}</pre>
    </div>}
  </div>);
}
