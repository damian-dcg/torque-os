'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S } from '../ui';
export default function ModAuditoria(){
  const [rep,setRep]=useState('Generando…');
  async function auditar(){
    const L=[];
    const tabs=['customers','work_orders','assets','product_families','service_types','mant_types','tech_rates','sla_matrix','warranty_rules','paquetes','checklists','checklist_blocks','presupuestos','liquidaciones','notifications','insistencias','ot_events','equipment','stock_movements','parts','regions','settings','companies','users'];
    for(const t of tabs){
      const {count,error}=await supabase.from(t).select('*',{count:'exact',head:true});
      L.push(t+': '+(error?('ERROR '+error.message):count));
    }
    const wo=await supabase.from('work_orders').select('id,customer_id,ext_id');
    const d=wo.data||[];
    L.push('work_orders SIN customer_id: '+d.filter(w=>!w.customer_id).length);
    L.push('work_orders SIN ext_id: '+d.filter(w=>!w.ext_id).length);
    setRep(L.join('\n'));
  }
  useEffect(()=>{ auditar(); },[]);
  return (<div style={S.card}>
    <h2 style={S.h2}>Auditoría del sistema</h2>
    <div style={{display:'flex',gap:8,marginBottom:10}}>
      <button style={S.btn(T.brand)} onClick={auditar}>Re-auditar</button>
      <button style={S.btnO(T.info)} onClick={()=>navigator.clipboard.writeText(rep)}>Copiar informe (pégamelo)</button>
    </div>
    <pre style={{...S.sub,whiteSpace:'pre-wrap',background:T.surface2,padding:12,borderRadius:8}}>{rep}</pre>
  </div>);
}
