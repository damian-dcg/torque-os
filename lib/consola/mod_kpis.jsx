'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S, fmtCLP } from '../ui';

export default function ModKpis(){
  const [ots,setOts]=useState([]);
  useEffect(function(){ cargar(); },[]);
  async function cargar(){
    const {data}=await supabase.from('work_orders').select('*').limit(2000);
    setOts(data||[]);
  }
  function K(o){ return o.kpi||{}; }
  const cerr=ots.filter(o=>o.estado==='Cerrada');
  const ftf=cerr.length?Math.round(cerr.filter(o=>String(K(o).ftf).toUpperCase()==='SI').length/cerr.length*100):0;
  const alta=cerr.filter(o=>K(o).nivel==='ALTA').length;
  const media=cerr.filter(o=>K(o).nivel==='MEDIA').length;
  const baja=cerr.filter(o=>K(o).nivel==='BAJA').length;
  const falla=ots.filter(o=>String(K(o).reincidencia).toUpperCase()==='FALLA').length;
  const margen=cerr.reduce((s,o)=>s+(K(o).margen||0),0);
  const venta=cerr.reduce((s,o)=>s+(K(o).venta_total||0),0);
  const dias=cerr.length?(cerr.reduce((s,o)=>s+(K(o).dias||0),0)/cerr.length).toFixed(1):0;
  const horas=Math.round(cerr.reduce((s,o)=>s+(K(o).horas||0),0));
  const porEq={}; ots.forEach(o=>{ const k=K(o).tipo_equipo||'—'; porEq[k]=(porEq[k]||0)+1; });
  const porTec={}; ots.forEach(o=>{ const k=o.tecnico_nombre||'—'; porTec[k]=(porTec[k]||0)+1; });
  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12,marginBottom:14}}>
        <div style={S.card}><div style={S.sub}>OTs totales</div><div style={{fontSize:22,fontWeight:800}}>{ots.length}</div></div>
        <div style={S.card}><div style={S.sub}>Cerradas</div><div style={{fontSize:22,fontWeight:800}}>{cerr.length}</div></div>
        <div style={S.card}><div style={S.sub}>First-Time-Fix</div><div style={{fontSize:22,fontWeight:800,color:T.teal}}>{ftf}%</div></div>
        <div style={S.card}><div style={S.sub}>Reincidencia</div><div style={{fontSize:22,fontWeight:800,color:T.danger}}>{falla}</div></div>
        <div style={S.card}><div style={S.sub}>Días reparación</div><div style={{fontSize:22,fontWeight:800}}>{dias}</div></div>
        <div style={S.card}><div style={S.sub}>Horas hombre</div><div style={{fontSize:22,fontWeight:800}}>{horas}</div></div>
        <div style={S.card}><div style={S.sub}>Venta total</div><div style={{fontSize:20,fontWeight:800,color:T.ok}}>{fmtCLP(venta)}</div></div>
        <div style={S.card}><div style={S.sub}>Margen bruto</div><div style={{fontSize:20,fontWeight:800,color:margen<0?T.danger:T.ok}}>{fmtCLP(margen)}</div></div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:14}}>
        <div style={S.card}><h2 style={S.h2}>SLA cliente (satisfacción)</h2>
          <p style={{color:T.ok,fontWeight:700}}>ALTA (10): {alta}</p>
          <p style={{color:T.warn,fontWeight:700}}>MEDIA (7): {media}</p>
          <p style={{color:T.danger,fontWeight:700}}>BAJA (5): {baja}</p></div>
        <div style={S.card}><h2 style={S.h2}>Volumen por tipo de equipo</h2>
          {Object.keys(porEq).map(k=><p key={k} style={{fontSize:14,margin:'4px 0'}}><b style={{color:T.brand}}>{porEq[k]}</b> · {k}</p>)}</div>
        <div style={S.card}><h2 style={S.h2}>OTs por técnico</h2>
          {Object.keys(porTec).slice(0,8).map(k=><p key={k} style={{fontSize:14,margin:'4px 0'}}><b style={{color:T.info}}>{porTec[k]}</b> · {k}</p>)}</div>
      </div>
    </div>);
}
