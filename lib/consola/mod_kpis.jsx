'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S, fmtCLP } from '../ui';

function BarsG({data}){ const max=Math.max(...data.map(d=>d.a+d.b),1);
  return <div style={{display:'flex',gap:10,alignItems:'flex-end',height:130}}>
    {data.map((d,i)=><div key={i} style={{flex:1,textAlign:'center'}}>
      <div style={{display:'flex',gap:3,alignItems:'flex-end',height:110,justifyContent:'center'}}>
        <div title={'Creadas '+d.a} style={{width:14,background:T.info,borderRadius:4,height:Math.max(4,(d.a/max)*110)}}/>
        <div title={'Cerradas '+d.b} style={{width:14,background:T.ok,borderRadius:4,height:Math.max(4,(d.b/max)*110)}}/>
      </div>
      <div style={{...S.sub,fontSize:11,marginTop:4}}>{d.l}</div>
    </div>)}
  </div>; }

function Line({pts}){ const max=Math.max(...pts.map(p=>p.v),5); const W=100,H=40;
  const xy=pts.map((p,i)=>[(i/(pts.length-1||1))*W, H-(p.v/max)*(H-6)-3]);
  return <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height:90}}>
    <polyline fill="none" stroke={T.warn} strokeWidth="1.5" points={xy.map(p=>p.join(',')).join(' ')}/>
    {xy.map((p,i)=><circle key={i} cx={p[0]} cy={p[1]} r="1.6" fill={T.warn}/>)}</svg>; }

export default function ModKpis({avisar}){
  const [ots,setOts]=useState([]); const [nps,setNps]=useState([]); const [evs,setEvs]=useState([]);
  const [movs,setMovs]=useState([]); const [sats,setSats]=useState([]); const [sla,setSla]=useState({});
  useEffect(()=>{(async()=>{
    const [o,n,e,mv,s,st]=await Promise.all([
      supabase.from('work_orders').select('*').limit(600),
      supabase.from('surveys_nps').select('*').limit(600),
      supabase.from('ot_events').select('*').limit(900),
      supabase.from('stock_movements').select('*').eq('tipo','salida').limit(600),
      supabase.from('companies').select('id,nombre').eq('tipo','sat'),
      supabase.from('settings').select('valor').eq('clave','sla_horas').single()]);
    setOts(o.data||[]); setNps(n.data||[]); setEvs(e.data||[]); setMovs(mv.data||[]); setSats(s.data||[]);
    try{ setSla(st.data&&st.data.valor?st.data.valor:{}); }catch(e){}
  })();},[]);
  const cerradas=ots.filter(o=>o.estado==='Cerrada');
  const hrs=o=>o.cerrada_at?(new Date(o.cerrada_at)-new Date(o.created_at))/36e5:null;
  const aTiempo=cerradas.filter(o=>{const h=hrs(o); return h!=null&&h<=(sla[o.tipo]||48);});
  const reworkIds=new Set(evs.filter(e=>e.evento==='estado'&&e.detalle&&e.detalle.de==='Revisión QA'&&e.detalle.a==='Trabajando').map(e=>e.ot_id));
  const ftf=cerradas.length?Math.round((cerradas.filter(o=>!reworkIds.has(o.id)).length/cerradas.length)*100):0;
  const npsProm=nps.length?(nps.reduce((s,x)=>s+Number(x.nota||0),0)/nps.length).toFixed(1):'—';
  const ingresos=cerradas.reduce((s,o)=>s+Number((o.financial_data&&o.financial_data.totalCost)||0),0);
  const meses=[]; for(let i=5;i>=0;i--){ const d=new Date(new Date().getFullYear(),new Date().getMonth()-i,1); meses.push({k:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,l:d.toLocaleDateString('es-CL',{month:'short'})}); }
  const porMes=meses.map(m=>({l:m.l,a:ots.filter(o=>(o.created_at||'').startsWith(m.k)).length,b:cerradas.filter(o=>(o.cerrada_at||'').startsWith(m.k)).length}));
  const npsMes=meses.map(m=>{ const xs=nps.filter(x=>(x.created_at||'').startsWith(m.k)); return {l:m.l,v:xs.length?xs.reduce((s,x)=>s+Number(x.nota||0),0)/xs.length:0}; });
  const porTipo={}; ots.forEach(o=>{porTipo[o.tipo]=(porTipo[o.tipo]||0)+1;});
  const maxTipo=Math.max(...Object.values(porTipo),1);
  const topRep={}; movs.forEach(m=>{topRep[m.part_codigo]=(topRep[m.part_codigo]||0)+m.cantidad;});
  const top=Object.entries(topRep).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const porSat={}; cerradas.forEach(o=>{ if(o.asignado_company_id){ porSat[o.asignado_company_id]=(porSat[o.asignado_company_id]||0)+Number((o.financial_data&&o.financial_data.totalCost)||0); } });
  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12,marginBottom:14}}>
        {[['OTs totales',ots.length,T.info],['Cerradas',cerradas.length,T.ok],['First-time-fix',ftf+'%',T.teal],['Entrega a tiempo',(cerradas.length?Math.round(aTiempo.length/cerradas.length*100):0)+'%',T.warn],['NPS',npsProm,T.violet],['Ingresos terreno',fmtCLP(ingresos),T.ok]].map(([l,v,c],i)=>(
          <div key={i} style={{...S.card,marginBottom:0,borderTop:`3px solid ${c}`}}><div style={S.sub}>{l}</div><div style={{fontSize:24,fontWeight:800}}>{v}</div></div>))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))',gap:14}}>
        <div style={S.card}><h2 style={S.h2}>OTs por mes (creadas vs cerradas)</h2><BarsG data={porMes}/></div>
        <div style={S.card}><h2 style={S.h2}>NPS por mes</h2><Line pts={npsMes}/></div>
        <div style={S.card}><h2 style={S.h2}>Por tipo de servicio</h2>
          {Object.entries(porTipo).sort((a,b)=>b[1]-a[1]).map(([k,v])=>(
            <div key={k} style={{marginBottom:8}}><div style={{display:'flex',justifyContent:'space-between'}}><span style={{...S.sub}}>{k}</span><b style={{color:T.text}}>{v}</b></div>
            <div style={{height:8,background:T.bg,borderRadius:6}}><div style={{height:8,width:`${(v/maxTipo)*100}%`,background:T.info,borderRadius:6}}/></div></div>))}
        </div>
        <div style={S.card}><h2 style={S.h2}>Top repuestos consumidos</h2>
          {top.map(([k,v])=><p key={k} style={{color:T.text,fontSize:14,margin:'4px 0'}}><b style={{color:T.brand}}>{v}×</b> {k}</p>)}
          {top.length===0&&<p style={S.sub}>Sin salidas de bodega registradas.</p>}</div>
        <div style={S.card}><h2 style={S.h2}>Producción por SAT (cerradas)</h2>
          {Object.entries(porSat).map(([id,v])=><p key={id} style={{color:T.text,fontSize:14,margin:'4px 0'}}>{(sats.find(s=>s.id===Number(id))||{}).nombre||id}: <b style={{color:T.ok}}>{fmtCLP(v)}</b></p>)}
          {Object.keys(porSat).length===0&&<p style={S.sub}>Sin producción cerrada aún.</p>}</div>
      </div>
    </div>);
}
