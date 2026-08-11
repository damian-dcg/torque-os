'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { onChange } from '../data';
import { T, S, fmtCLP } from '../ui';
function BarsG({data}){ const max=Math.max(...data.map(d=>d.a+d.b),1);
  return <div style={{display:'flex',gap:8,alignItems:'flex-end',height:120}}>{data.map((d,i)=><div key={i} style={{flex:1,textAlign:'center'}}>
    <div style={{display:'flex',gap:3,alignItems:'flex-end',height:100,justifyContent:'center'}}>
      <div title={'OTs '+d.a} style={{width:12,background:T.info,borderRadius:4,height:Math.max(3,(d.a/max)*100)}}/>
      <div title={'Horas '+d.b} style={{width:12,background:T.warn,borderRadius:4,height:Math.max(3,(d.b/max)*100)}}/></div>
    <div style={{...S.sub,fontSize:10,marginTop:4}}>{d.l}</div></div>)}</div>; }

export default function ModKpis(){
  const [ots,setOts]=useState([]);
  useEffect(()=>{ const c=()=>supabase.from('work_orders').select('*').limit(2000).then(({data})=>setOts(data||[])); c(); return onChange(c); },[]);
  const K=o=>o.kpi||{};
  const cerr=ots.filter(o=>o.estado==='Cerrada');
  const ftf=cerr.length?Math.round(cerr.filter(o=>String(K(o).ftf).toUpperCase()==='SI').length/cerr.length*100):0;
  const nivel={ALTA:cerr.filter(o=>K(o).nivel==='ALTA').length,MEDIA:cerr.filter(o=>K(o).nivel==='MEDIA').length,BAJA:cerr.filter(o=>K(o).nivel==='BAJA').length};
  const reincidentes=ots.filter(o=>String(K(o).reincidencia).toUpperCase()==='FALLA').length;
  const margenTotal=cerr.reduce((s,o)=>s+(K(o).margen||0),0);
  const ventaTotal=cerr.reduce((s,o)=>s+(K(o).venta_total||0),0);
  const diasProm=cerr.length?(cerr.reduce((s,o)=>s+(K(o).dias||0),0)/cerr.length).toFixed(1):0;
  const horas=cerr.reduce((s,o)=>s+(K(o).horas||0),0);
  const porMes={}; ots.forEach(o=>{ const k=(K(o).mes||'')+' '+ (K(o).anio||''); porMes[k]=porMes[k]||{a:0,b:0}; porMes[k].a++; porMes[k].b+=K(o).horas||0; });
  const meses=Object.entries(porMes).slice(-6).map(([l,v])=>({l,a:v.a,b:Math.round(v.b)}));
  const porEq={}; ots.forEach(o=>{ const k=K(o).tipo_equipo||'—'; porEq[k]=(porEq[k]||0)+1; });
  const porTec={}; ots.forEach(o=>{ const k=o.tecnico_nombre||'—'; porTec[k]=(porTec[k]||0)+1; });
  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12,marginBottom:14}}>
        {[['OTs totales',ots.length,T.info],['Cerradas',cerr.length,T.ok],['First-Time-Fix',ftf+'%',T.teal],['Reincidencia (falla)',reincidentes,T.danger],['Días reparación',diasProm,T.warn],['Horas hombre',Math.round(horas),T.violet],['Venta total',fmtCLP(ventaTotal),T.ok],['Margen bruto',fmtCLP(margenTotal),margenTotal<0?T.danger:T.ok]].map(([l,v,c],i)=>(
          <div key={i} style={{...S.card,marginBottom:0,borderTop:`3px solid ${c}`}}><div style={S.sub}>{l}</div><div style={{fontSize:22,fontWeight:800}}>{v}</div></div>))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:14}}>
        <div style={S.card}><h2 style={S.h2}>SLA Cliente (nota entrega)</h2>
          <p style={{color:T.ok,fontWeight:800}}>ALTA (10): {nivel.ALTA}</p>
          <p style={{color:T.warn,fontWeight:800}}>MEDIA (7): {nivel.MEDIA}</p>
          <p style={{color:T.danger,fontWeight:800}}>BAJA (5): {nivel.BAJA}</p></div>
        <div style={S.card}><h2 style={S.h2}>OTs y horas por mes</h2><BarsG data={meses}/></div>
        <div style={S.card}><h2 style={S.h2}>Volumen por tipo de equipo</h2>
          {Object.entries(porEq).sort((a,b)=>b[1]-a[1]).map(([k,v])=><p key={k} style={{color:T.text,fontSize:14,margin:'4px 0'}}><b style={{color:T.brand}}>{v}</b> · {k}</p>)}</div>
        <div style={S.card}><h2 style={S.h2}>OTs por técnico</h2>
          {Object.entries(porTec).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,v])=><p key={k} style={{color:T.text,fontSize:14,margin:'4px 0'}}><b style={{color:T.info}}>{v}</b> · {k}</p>)}</div>
      </div>
    </div>);
}
