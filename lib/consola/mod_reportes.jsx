'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S, fmtCLP } from '../ui';

export default function ModReportes(){
  const [ots,setOts]=useState([]); const [nps,setNps]=useState([]); const [events,setEvents]=useState([]); const [sats,setSats]=useState([]); const [sla,setSla]=useState({});
  useEffect(()=>{(async()=>{
    const [o,n,e,s,st]=await Promise.all([
      supabase.from('work_orders').select('*').limit(500),
      supabase.from('surveys_nps').select('*').limit(500),
      supabase.from('ot_events').select('*').limit(800),
      supabase.from('companies').select('id,nombre').eq('tipo','sat'),
      supabase.from('settings').select('valor').eq('clave','sla_horas').single()
    ]);
    setOts(o.data||[]); setNps(n.data||[]); setEvents(e.data||[]); setSats(s.data||[]);
    try{ setSla(st.data&&st.data.valor?st.data.valor:{}); }catch(e){}
  })();},[]);
  const cerradas=ots.filter(o=>o.estado==='Cerrada');
  const horas=(o)=>o.cerrada_at?(new Date(o.cerrada_at)-new Date(o.created_at))/36e5:null;
  const aTiempo=cerradas.filter(o=>{ const h=horas(o); const s=sla[o.tipo]||48; return h!=null&&h<=s; });
  const rework=ots.filter(o=>(events.filter(e=>e.ot_id===o.id&&e.evento==='estado'&&e.detalle&&e.detalle.de==='Revisión QA'&&e.detalle.a==='Trabajando').length>0));
  const ftf=cerradas.length? Math.round((cerradas.length-rework.filter(o=>o.estado==='Cerrada').length)/cerradas.length*100):0;
  const npsProm=nps.length?(nps.reduce((s,x)=>s+Number(x.nota||0),0)/nps.length).toFixed(1):'—';
  const porTipo={}; ots.forEach(o=>{ porTipo[o.tipo]=porTipo[o.tipo]||{t:0,c:0}; porTipo[o.tipo].t++; if(o.estado==='Cerrada') porTipo[o.tipo].c++; });
  const porSat={}; ots.filter(o=>o.asignado_company_id).forEach(o=>{ porSat[o.asignado_company_id]=porSat[o.asignado_company_id]||{t:0,c:0,$:0}; porSat[o.asignado_company_id].t++; if(o.estado==='Cerrada'){ porSat[o.asignado_company_id].c++; porSat[o.asignado_company_id].$+=Number((o.financial_data&&o.financial_data.totalCost)||0); } });
  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12,marginBottom:14}}>
        {[['OTs totales',ots.length,T.info],['Cerradas',cerradas.length,T.ok],['NPS promedio',npsProm,T.ok],['First-time-fix',ftf+'%',T.teal],['Re-trabajos',rework.length,T.danger],['Entrega a tiempo',(cerradas.length?Math.round(aTiempo.length/cerradas.length*100):0)+'%',T.warn]].map(([l,v,c],i)=>(
          <div key={i} style={{...S.card,marginBottom:0,borderTop:`3px solid ${c}`}}><div style={S.sub}>{l}</div><div style={{fontSize:26,fontWeight:800}}>{v}</div></div>))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))',gap:14}}>
        <div style={S.card}><h2 style={S.h2}>Por tipo de servicio</h2>
          <table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr><th style={S.th}>Tipo</th><th style={S.th}>Total</th><th style={S.th}>Cerradas</th></tr></thead>
          <tbody>{Object.entries(porTipo).map(([k,v])=><tr key={k}><td style={S.td}>{k}</td><td style={S.td}>{v.t}</td><td style={S.td}>{v.c}</td></tr>)}</tbody></table></div>
        <div style={S.card}><h2 style={S.h2}>Por SAT (producción)</h2>
          <table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr><th style={S.th}>SAT</th><th style={S.th}>OTs</th><th style={S.th}>Cerradas</th><th style={S.th}>Producción</th></tr></thead>
          <tbody>{Object.entries(porSat).map(([id,v])=><tr key={id}><td style={S.td}>{(sats.find(s=>s.id===Number(id))||{}).nombre||id}</td><td style={S.td}>{v.t}</td><td style={S.td}>{v.c}</td><td style={S.td}>{fmtCLP(v.$)}</td></tr>)}</tbody></table></div>
      </div>
    </div>);
}
