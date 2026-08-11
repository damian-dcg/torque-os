'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S, fmtCLP } from '../ui';
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
  var cerr=ots.filter(function(o){ return o.estado==='Cerrada'; });
  var ftf=cerr.length?Math.round(cerr.filter(function(o){ return String(K(o).ftf).toUpperCase()==='SI'; }).length/cerr.length*100):0;
  var alta=cerr.filter(function(o){ return K(o).nivel==='ALTA'; }).length;
  var media=cerr.filter(function(o){ return K(o).nivel==='MEDIA'; }).length;
  var baja=cerr.filter(function(o){ return K(o).nivel==='BAJA'; }).length;
  var falla=ots.filter(function(o){ return String(K(o).reincidencia).toUpperCase()==='FALLA'; }).length;
  var margen=cerr.reduce(function(s,o){ return s+(K(o).margen||0); },0);
  var venta=cerr.reduce(function(s,o){ return s+(K(o).venta_total||0); },0);
  var dias=cerr.length?(cerr.reduce(function(s,o){ return s+(K(o).dias||0); },0)/cerr.length).toFixed(1):0;
  // Productividad: horas vendidas (estándar) vs trabajadas, por técnico
  var porTec={};
  ots.forEach(function(o){
    var t=o.tecnico_nombre||'—'; if(t==='—')return;
    var k=K(o);
    var sv=String(k.tipo_servicio||'').toUpperCase();
    var eq=String(k.tipo_equipo||'').toUpperCase();
    var vend=(hs[sv]&&hs[sv][eq]!=null)?hs[sv][eq]*(o.cantidad_unidades||1):0;
    var trab=k.horas||0;
    if(!porTec[t]) porTec[t]={u:0,v:0,c:0};
    porTec[t].u+=trab; porTec[t].v+=vend; porTec[t].c++;
  });
  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12,marginBottom:14}}>
        <div style={S.card}><div style={S.sub}>OTs totales</div><div style={{fontSize:22,fontWeight:800}}>{ots.length}</div></div>
        <div style={S.card}><div style={S.sub}>Cerradas</div><div style={{fontSize:22,fontWeight:800}}>{cerr.length}</div></div>
        <div style={S.card}><div style={S.sub}>First-Time-Fix</div><div style={{fontSize:22,fontWeight:800,color:T.teal}}>{ftf}%</div></div>
        <div style={S.card}><div style={S.sub}>Reincidencia</div><div style={{fontSize:22,fontWeight:800,color:T.danger}}>{falla}</div></div>
        <div style={S.card}><div style={S.sub}>Días reparación</div><div style={{fontSize:22,fontWeight:800}}>{dias}</div></div>
        <div style={S.card}><div style={S.sub}>Venta total</div><div style={{fontSize:20,fontWeight:800,color:T.ok}}>{fmtCLP(venta)}</div></div>
        <div style={S.card}><div style={S.sub}>Margen bruto</div><div style={{fontSize:20,fontWeight:800,color:margen<0?T.danger:T.ok}}>{fmtCLP(margen)}</div></div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:14}}>
        <div style={S.card}><h2 style={S.h2}>SLA cliente (satisfacción)</h2>
          <p style={{color:T.ok,fontWeight:700}}>ALTA (10): {alta}</p>
          <p style={{color:T.warn,fontWeight:700}}>MEDIA (7): {media}</p>
          <p style={{color:T.danger,fontWeight:700}}>BAJA (5): {baja}</p></div>
        <div style={S.card}><h2 style={S.h2}>Productividad / Eficiencia por técnico</h2>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr><th style={S.th}>Técnico</th><th style={S.th}>OTs</th><th style={S.th}>Hrs vendidas</th><th style={S.th}>Hrs trabajadas</th><th style={S.th}>Eficiencia</th></tr></thead>
            <tbody>{Object.keys(porTec).map(function(t){ var p=porTec[t]; var eff=p.u>0?Math.round(p.v/p.u*100):0;
              return <tr key={t}><td style={S.td}>{t}</td><td style={S.td}>{p.c}</td><td style={S.td}>{p.v.toFixed(1)}</td><td style={S.td}>{p.u.toFixed(1)}</td><td style={{...S.td,fontWeight:800,color:eff>=100?T.ok:eff>=70?T.warn:T.danger}}>{eff}%</td></tr>; })}</tbody>
          </table></div>
      </div>
    </div>);
}
