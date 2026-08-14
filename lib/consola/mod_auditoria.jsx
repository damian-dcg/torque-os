'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S } from '../ui';
const REPO='damian-dcg/torque-os';
const DEAD=['app/armado','app/catalogo','app/cupones','app/importar','app/panel','lib/consola/mod_catalogos.jsx','lib/consola/mod_reportes.jsx'];
const LIVE=['app/page.jsx','app/consola/page.jsx','app/tecnico/page.jsx','app/solicitud/page.jsx','app/seguimiento/page.jsx','app/sstt/page.jsx','lib/consola/mod_auditoria.jsx','lib/consola/mod_parametros.jsx','lib/consola/mod_inventario.jsx','lib/consola/mod_compras.jsx','lib/consola/mod_caja.jsx','lib/consola/mod_garantias.jsx','lib/consola/mod_calidad.jsx','lib/consola/mod_rrhh.jsx','lib/consola/mod_bi.jsx','lib/consola/mod_desarme.jsx','lib/consola/mod_recuperacion.jsx','lib/consola/mod_recepcion.jsx','lib/consola/mod_aprobaciones.jsx','lib/consola/FichaOT.jsx','lib/consola/FichaCliente.jsx','lib/consola/Buzon.jsx','lib/consola/mod_nuevaot.jsx','lib/consola/mod_kpis.jsx','lib/consola/mod_importar.jsx'];
export default function ModAuditoria(){
  const [rep,setRep]=useState('Generando…');
  const [tab,setTab]=useState('datos');
  const [repoRep,setRepoRep]=useState('Pulsa "Auditar repo" para leer el árbol de archivos.');
  const [token,setToken]=useState('');
  const url=(typeof process!=='undefined'&&process.env&&process.env.NEXT_PUBLIC_SUPABASE_URL)||'n/d';
  async function cnt(t){ const {count}=await supabase.from(t).select('*',{count:'exact',head:true}); return count||0; }
  async function auditar(){
    const L=['WEB CONECTADA A: '+url,'---'];
    const tabs=['customers','work_orders','assets','product_families','service_types','mant_types','tech_rates','sla_matrix','warranty_rules','paquetes','checklists','checklist_blocks','presupuestos','liquidaciones','notifications','insistencias','ot_events','equipment','stock_movements','parts','regions','settings','companies','users','approvals','receptions','belongings','disassembly_requests','disassembly_sessions','extracted_components','component_evaluations','component_valuations','stock_items','stock_kardex','warehouses','suppliers','purchase_orders','accounts_payable','cash_sessions','invoices','payments','accounts_receivable','warranty_cases','brand_contracts','brand_claims','recall_campaigns','non_conformities','quality_audits','incidents','shifts','attendance'];
    for(const t of tabs){ const {count,error}=await supabase.from(t).select('*',{count:'exact',head:true}); L.push(t+': '+(error?('ERROR '+error.message):count)); }
    setRep(L.join('\n'));
  }
  async function auditarRepo(){
    setRepoRep('Leyendo árbol de '+REPO+'…');
    const hdr=token?{Authorization:'token '+token}:{};
    const r=await fetch('https://api.github.com/repos/'+REPO+'/git/trees/main?recursive=1',{headers:hdr});
    if(!r.ok){ setRepoRep('⛗ No se pudo leer el repo (HTTP '+r.status+'). Si el repo es PRIVADO, pega un token de GitHub arriba y reintenta.'); return; }
    const j=await r.json();
    const paths=(j.tree||[]).map(n=>n.path);
    const L=['AUDITORÍA DE REPO · '+REPO,'---','MUERTOS (deben estar ELIMINADOS):'];
    DEAD.forEach(d=>{ const present=paths.some(p=>p===d||p.startsWith(d+'/')); L.push((present?'⛗ PRESENTE (eliminar): ':'✔ ELIMINADO: ')+d); });
    L.push('---','VIVOS (deben estar PRESENTES):');
    LIVE.forEach(v=>{ const present=paths.some(p=>p===v); L.push((present?'✔ PRESENTE: ':'⛗ FALTA: ')+v); });
    setRepoRep(L.join('\n'));
  }
  async function sembrar(){
    const L=['Sembrando EN LA BASE DE LA WEB: '+url];
    if(await cnt('product_families')===0){ await supabase.from('product_families').insert([{code:'FP001',name:'BICICLETA',active:true},{code:'FP002',name:'BICICLETA ELECTRICA',active:true},{code:'FP003',name:'MAQUINA',active:true},{code:'FP004',name:'SCOOTER ELECTRICA',active:true},{code:'FP005',name:'ACCESORIO',active:true}]); L.push('✅ familias +5'); }
    if(await cnt('tech_rates')===0){ await supabase.from('tech_rates').insert([{technician:'MAYCOLL GODOY',costo_sueldo_mensual:856386,horas_mes:168,costo_x_hora:5098,venta_x_hora:10195},{technician:'CLAUDIO MOLINA',costo_sueldo_mensual:1220601,horas_mes:168,costo_x_hora:7265,venta_x_hora:14531},{technician:'ALVARO ROJAS',costo_sueldo_mensual:1058500,horas_mes:168,costo_x_hora:6301,venta_x_hora:12601},{technician:'LUIS BRAVO',costo_sueldo_mensual:863059,horas_mes:168,costo_x_hora:5137,venta_x_hora:10275},{technician:'MANUEL FUENTES',costo_sueldo_mensual:2042748,horas_mes:168,costo_x_hora:12159,venta_x_hora:24318},{technician:'GASTON PALMA',costo_sueldo_mensual:933749,horas_mes:168,costo_x_hora:5558,venta_x_hora:11116},{technician:'DAMIAN CARRASCO',costo_sueldo_mensual:2050535,horas_mes:168,costo_x_hora:12206,venta_x_hora:24411},{technician:'TALLER',costo_sueldo_mensual:856386,horas_mes:168,costo_x_hora:5098,venta_x_hora:10195}]); L.push('✅ tech_rates +8'); }
    if(await cnt('sla_matrix')===0){ const rows=[]; const SV=['ARMADO','GARANTIA','EVALUACION','MANTENCION','POST VENTA','RECLAMO','DEVOLUCION','CAMBIO','DESPACHO','LEVANTAMIENTO','RETIRO','ANULACION']; const EQ=['BICICLETA','BICICLETA ELECTRICA','MAQUINA','SCOOTER ELECTRICO','ACCESORIO']; SV.forEach(t=>EQ.forEach(e=>rows.push({tipo_servicio:t,tipo_equipo:e,dias:(t==='ARMADO'?(e==='BICICLETA'||e==='BICICLETA ELECTRICA'?3:e==='MAQUINA'||e==='SCOOTER ELECTRICO'?5:10):15)}))); await supabase.from('sla_matrix').insert(rows); L.push('✅ sla +'+rows.length); }
    L.push('FIN. Pulsa Re-auditar.');
    setRep(L.join('\n'));
  }
  useEffect(()=>{ auditar(); },[]);
  return (<div style={S.card}>
    <h2 style={S.h2}>Auditoría del sistema</h2>
    <div style={{display:'flex',gap:6,marginBottom:10}}>
      {['datos','repo'].map(t=><button key={t} onClick={()=>setTab(t)} style={{padding:'8px 14px',borderRadius:999,border:tab===t?'0':'1px solid '+T.border,background:tab===t?T.brand:'transparent',color:tab===t?'#fff':T.text,fontWeight:600,fontSize:13,cursor:'pointer'}}>{t}</button>)}
    </div>
    {tab==='datos'? <div>
      <p style={{...S.sub,marginBottom:10}}>Base conectada: <b style={{color:T.brand}}>{url}</b>.</p>
      <div style={{display:'flex',gap:8,marginBottom:10,flexWrap:'wrap'}}>
        <button style={S.btn(T.ok)} onClick={sembrar}>🌱 Sembrar maestros</button>
        <button style={S.btn(T.brand)} onClick={auditar}>Re-auditar</button>
        <button style={S.btnO(T.info)} onClick={()=>navigator.clipboard.writeText(url+'\n'+rep)}>Copiar informe</button>
      </div>
      <pre style={{...S.sub,whiteSpace:'pre-wrap',background:T.surface2,padding:12,borderRadius:8}}>{rep}</pre>
    </div> : <div>
      <p style={{...S.sub,marginBottom:10}}>Lee el árbol de archivos de GitHub y evidencia la limpieza (muertos eliminados / vivos presentes). Si el repo es privado, pega un token.</p>
      <input style={{...S.input,width:320,marginBottom:8}} placeholder="Token GitHub (opcional, si repo privado)" value={token} onChange={e=>setToken(e.target.value)}/>
      <div style={{display:'flex',gap:8,marginBottom:10}}>
        <button style={S.btn(T.brand)} onClick={auditarRepo}> Auditar repo</button>
        <button style={S.btnO(T.info)} onClick={()=>navigator.clipboard.writeText(repoRep)}>Copiar informe repo</button>
      </div>
      <pre style={{...S.sub,whiteSpace:'pre-wrap',background:T.surface2,padding:12,borderRadius:8}}>{repoRep}</pre>
    </div>}
  </div>);
}
