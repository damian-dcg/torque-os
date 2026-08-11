'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S, fmtCLP } from '../ui';
function BarsV(props){
  var data=props.data||[]; var color=props.color||T.brand;
  var max=Math.max.apply(null,data.map(function(d){ return d.v; }).concat([1]));
  return <div style={{display:'flex',gap:8,alignItems:'flex-end',height:150}}>
    {data.map(function(d,i){ return <div key={i} style={{flex:1,textAlign:'center'}}>
      <div style={{background:color,borderRadius:4,height:Math.max(4,(d.v/max)*120)}} title={d.v}></div>
      <div style={{...S.sub,fontSize:10,marginTop:4}}>{d.l}</div>
      <div style={{fontSize:11,fontWeight:700}}>{d.v}</div>
    </div>; })}
  </div>;
}
function Donut(props){
  var a=props.a||0,b=props.b||0; var t=(a+b)||1; var p=Math.round(a/t*100);
  return <div style={{display:'flex',gap:14,alignItems:'center'}}>
    <div style={{width:110,height:110,borderRadius:'50%',background:'conic-gradient('+(props.ca||T.ok)+' '+p+'%,'+(props.cb||T.danger)+' '+p+'% 100%)'}}></div>
    <div><p style={{...S.sub,margin:'2px 0'}}><b style={{color:props.ca||T.ok}}>{props.la}: {a} ({p}%)</b></p>
    <p style={{...S.sub,margin:'2px 0'}}><b style={{color:props.cb||T.danger}}>{props.lb}: {b} ({100-p}%)</b></p></div>
  </div>;
}
export default function ModKpis(){
  var s1=useState([]),ots=s1[0],setOts=s1[1];
  var s2=useState({}),hs=s2[0],setHs=s2[1];
  useEffect(function(){
    (async function(){
      var r=await Promise.all([supabase.from('work_orders').select('*').limit(2000),supabase.from('settings').select('valor').eq('clave','horas_estandar').single()]);
      setOts(r[0].data||[]);
      try{ setHs(r[1].data?r[1].data.valor:{}); }catch(e){}
    })();
  },[]);
  function K(o){ return o.kpi||{}; }
  function horasDe(o){ var k=K(o); var sv=String(k.tipo_servicio||'').toUpperCase(); var eq=String(k.tipo_equipo||'').toUpperCase(); return (hs[sv]&&hs[sv][eq]!=null)?hs[sv][eq]*(o.cantidad_unidades||1):(k.horas||0); }
  var cerr=ots.filter(function(o){ return o.estado==='Cerrada'; });
  var abiert=ots.filter(function(o){ return o.estado!=='Cerrada'; });
  var ftfSi=cerr.filter(function(o){ return String(K(o).ftf).toUpperCase()==='SI'; }).length;
  var ftfNo=cerr.length-ftfSi;
  var alta=cerr.filter(function(o){ return K(o).nivel==='ALTA'; }).length;
  var media=cerr.filter(function(o){ return K(o).nivel==='MEDIA'; }).length;
  var baja=cerr.filter(function(o){ return K(o).nivel==='BAJA'; }).length;
  var falla=ots.filter(function(o){ return String(K(o).reincidencia).toUpperCase()==='FALLA'; }).length;
  var margen=cerr.reduce(function(s,o){ return s+(K(o).margen||0); },0);
  var venta=cerr.reduce(function(s,o){ return s+(K(o).venta_total||0); },0);
  var porMes={}; ots.forEach(function(o){ var k=(o.created_at||'').slice(0,7); if(!k)return; porMes[k]=porMes[k]||{o:0,v:0}; porMes[k].o++; porMes[k].v+=K(o).venta_total||0; });
  var meses=Object.keys(porMes).sort().slice(-8);
  var porEq={}; ots.forEach(function(o){ var k=K(o).tipo_equipo||'—'; porEq[k]=(porEq[k]||0)+(o.cantidad_unidades||1); });
  var porTec={}; ots.forEach(function(o){ var t=o.tecnico_nombre||'—'; if(t==='—')return; porTec[t]=porTec[t]||{u:0,h:0}; porTec[t].u+=(o.cantidad_unidades||1); porTec[t].h+=horasDe(o); });
  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12,marginBottom:14}}>
        <div style={S.card}><div style={S.sub}>OTs totales</div><div style={{fontSize:22,fontWeight:800}}>{ots.length}</div></div>
        <div style={S.card}><div style={S.sub}>Cerradas</div><div style={{fontSize:22,fontWeight:800}}>{cerr.length}</div></div>
        <div style={S.card}><div style={S.sub}>First-Time-Fix</div><div style={{fontSize:22,fontWeight:800,color:T.teal}}>{cerr.length?Math.round(ftfSi/cerr.length*100):0}%</div></div>
        <div style={S.card}><div style={S.sub}>Reincidencia</div><div style={{fontSize:22,fontWeight:800,color:T.danger}}>{falla}</div></div>
        <div style={S.card}><div style={S.sub}>Venta total</div><div style={{fontSize:20,fontWeight:800,color:T.ok}}>{fmtCLP(venta)}</div></div>
        <div style={S.card}><div style={S.sub}>Margen</div><div style={{fontSize:20,fontWeight:800,color:margen<0?T.danger:T.ok}}>{fmtCLP(margen)}</div></div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:14}}>
        <div style={S.card}><h2 style={S.h2}>OTs por mes</h2><BarsV data={meses.map(function(m){ return {l:m.slice(5),v:porMes[m].o}; })}/></div>
        <div style={S.card}><h2 style={S.h2}>Venta por mes</h2><BarsV color={T.ok} data={meses.map(function(m){ return {l:m.slice(5),v:Math.round(porMes[m].v/1000); }; })}/><p style={S.sub}>en miles de $</p></div>
        <div style={S.card}><h2 style={S.h2}>First-Time-Fix</h2><Donut a={ftfSi} b={ftfNo} la="SI" lb="NO" ca={T.ok} cb={T.danger}/></div>
        <div style={S.card}><h2 style={S.h2}>Estado OT</h2><Donut a={cerr.length} b={abiert.length} la="Cerradas" lb="Abiertas" ca={T.info} cb={T.warn}/></div>
        <div style={S.card}><h2 style={S.h2}>SLA cliente (satisfacción)</h2><BarsV color={T.violet} data={[{l:'ALTA',v:alta},{l:'MEDIA',v:media},{l:'BAJA',v:baja}]}/></div>
        <div style={S.card}><h2 style={S.h2}>Volumen por tipo de equipo</h2><BarsV data={Object.keys(porEq).map(function(k){ return {l:k.slice(0,8),v:porEq[k]}; })}/></div>
        <div style={S.card}><h2 style={S.h2}>Unidades por técnico</h2><BarsV color={T.warn} data={Object.keys(porTec).map(function(k){ return {l:k.split(' ')[0],v:porTec[k].u}; })}/></div>
        <div style={S.card}><h2 style={S.h2}>Horas estándar por técnico</h2><BarsV color={T.teal} data={Object.keys(porTec).map(function(k){ return {l:k.split(' ')[0],v:Math.round(porTec[k].h)}; })}/></div>
      </div>
    </div>);
}
