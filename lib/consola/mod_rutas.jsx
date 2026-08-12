'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S } from '../ui';
import Mapa from './Mapa';
import { geocode } from './geo';

export default function ModRutas(props){
  var avisar=props.avisar||function(){};
  var s1=useState(new Date().toISOString().slice(0,10)),fecha=s1[0],setFecha=s1[1];
  var s2=useState(''),tec=s2[0],setTec=s2[1];
  var s3=useState([]),users=s3[0],setUsers=s3[1];
  var s4=useState([]),sats=s4[0],setSats=s4[1];
  var s5=useState([]),ots=s5[0],setOts=s5[1];
  var s6=useState(null),plan=s6[0],setPlan=s6[1];
  var s7=useState(false),busy=s7[0],setBusy=s7[1];

  useEffect(function(){
    (async function(){
      var r=await Promise.all([
        supabase.from('users').select('id,nombre,rol'),
        supabase.from('companies').select('id,nombre').eq('tipo','sat')
      ]);
      setUsers((r[0].data||[]).filter(function(u){ return u.rol==='tecnico_sat'||u.rol==='admin'; }));
      setSats(r[1].data||[]);
    })();
  },[]);

  async function cargar(){
    var q=supabase.from('work_orders').select('*,customers(nombre,direccion,comuna,geo)').eq('fecha_programada',fecha);
    if(tec.indexOf('u')===0) q=q.eq('asignado_user_id',Number(tec.slice(1)));
    else if(tec.indexOf('s')===0) q=q.eq('asignado_company_id',Number(tec.slice(1)));
    var d=await q;
    setOts(d.data||[]);
    setPlan(null);
  }
  useEffect(function(){ if(tec) cargar(); },[fecha,tec]);

  async function optimizar(){
    setBusy(true);
    var stops=[];
    for(var i=0;i<ots.length;i++){
      var o=ots[i];
      var g=o.geo_cliente||((o.customers&&o.customers.geo)||null);
      if(!g){
        var dir=((o.direccion||(o.customers&&o.customers.direccion)||'')+', '+((o.customers&&o.customers.comuna)||'')+', Chile');
        if(dir.length>10){ g=await geocode(dir); if(g&&o.customer_id){ await supabase.from('customers').update({geo:g}).eq('id',o.customer_id); } }
      }
      if(g) stops.push({ot:o,lat:g.lat,lng:g.lng});
    }
    if(stops.length<2){ avisar('⛗ Faltan direcciones geocodificadas (mínimo 2)',T.danger); setBusy(false); return; }
    var coords=stops.map(function(s){ return s.lng+','+s.lat; }).join(';');
    var r=await fetch('https://router.project-osrm.org/table/v1/driving/'+coords+'?annotations=duration,distance');
    var j=await r.json();
    if(!j.durations){ avisar('⛗ El motor de rutas no respondió',T.danger); setBusy(false); return; }
    var n=stops.length; var visited=[0]; var cur=0;
    while(visited.length<n){
      var best=-1,bd=1e9;
      for(var k=0;k<n;k++){
        if(visited.indexOf(k)>=0) continue;
        if(j.durations[cur][k]<bd){ bd=j.durations[cur][k]; best=k; }
      }
      visited.push(best); cur=best;
    }
    var legs=[]; var totalMin=0; var totalKm=0; var eta=8*60;
    for(var m=0;m<visited.length;m++){
      var idx=visited[m];
      var travel=(m===0)?0:(j.durations[visited[m-1]][idx]/60);
      var km=(m===0)?0:(j.distances[visited[m-1]][idx]/1000);
      var svc=60;
      totalMin+=travel+svc; totalKm+=km; eta+=travel;
      var hh=Math.floor(eta/60); var mm=Math.round(eta%60);
            legs.push({ot:stops[idx].ot,lat:stops[idx].lat,lng:stops[idx].lng,travel:Math.round(travel),km:Math.round(km),eta:(hh<10?'0':'')+hh+':'+(mm<10?'0':'')+mm});
      eta+=svc;
    }
    setPlan({legs:legs,totalMin:Math.round(totalMin),totalKm:Math.round(totalKm)});
    setBusy(false);
    avisar('✅ Ruta optimizada: '+legs.length+' paradas',T.ok);
  }

  async function aplicar(){
    if(!plan) return;
    for(var i=0;i<plan.legs.length;i++){
      await supabase.from('work_orders').update({ruta_orden:i+1,eta:plan.legs[i].eta}).eq('id',plan.legs[i].ot.id);
    }
    avisar('✅ Orden y ETAs guardados en las OTs',T.ok);
    cargar();
  }

  var markers=plan?plan.legs.map(function(l,i){ return {lat:l.lat,lng:l.lng,popup:(i+1)+') '+(l.ot.ext_id||('OT-'+l.ot.ot_number))+' · llega '+l.eta}; }):[];
  var linea=plan?plan.legs.map(function(l){ return [l.lat,l.lng]; }):null;
  var carga=plan?Math.round(plan.totalMin/480*100):0;

  return (
    <div>
      <div style={S.card}>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
          <h2 style={{...S.h2,margin:0,flex:1}}>Optimizador de rutas (tipo PlannerPro)</h2>
          <input style={{...S.input,width:170,marginBottom:0}} type="date" value={fecha} onChange={function(e){ setFecha(e.target.value); }}/>
          <select style={{...S.input,width:220,marginBottom:0}} value={tec} onChange={function(e){ setTec(e.target.value); }}>
            <option value="">Técnico / SSTT…</option>
            <optgroup label="Internos">{users.map(function(u){ return <option key={'u'+u.id} value={'u'+u.id}>{u.nombre}</option>; })}</optgroup>
            <optgroup label="SSTT">{sats.map(function(s){ return <option key={'s'+s.id} value={'s'+s.id}>{s.nombre}</option>; })}</optgroup>
          </select>
          <button style={{...S.btn(T.brand),width:'auto',marginBottom:0}} onClick={optimizar} disabled={busy}>{busy?'Calculando…':'⚡ Optimizar orden'}</button>
          {plan? <button style={{...S.btn(T.ok),width:'auto',marginBottom:0}} onClick={aplicar}>💾 Aplicar orden y ETAs</button> : null}
        </div>
        {plan? <div style={{marginTop:12}}>
          <p style={{fontWeight:800}}>{plan.legs.length} paradas · {plan.totalKm} km · {Math.round(plan.totalMin/60*10)/10} h totales</p>
          <div style={{height:10,background:T.surface2,borderRadius:6,marginTop:6}}>
            <div style={{height:10,width:Math.min(100,carga)+'%',background:carga>100?T.danger:(carga>80?T.warn:T.ok),borderRadius:6}}/>
          </div>
          <p style={{...S.sub,marginTop:4}}>Carga de jornada (8 h): {carga}% {carga>100?'· ⚠ sobrecupo: reasigna o reprograma':''}</p>
        </div> : null}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))',gap:14}}>
        <div style={S.card}>
          <h2 style={S.h2}>Orden sugerido</h2>
          {plan? plan.legs.map(function(l,i){ return <p key={l.ot.id} style={{fontSize:13,margin:'6px 0'}}>
            <b style={{color:T.brand}}>{i+1}.</b> {l.ot.ext_id||('OT-'+l.ot.ot_number)} · {((l.ot.customers||{}).nombre)||''} · manejo {l.travel} min · <b>llega {l.eta}</b>
          </p>; }) : <p style={S.sub}>Elige fecha y técnico, luego "Optimizar".</p>}
          {!plan&&ots.length? <p style={S.sub}>{ots.length} OTs programadas ese día para este técnico.</p> : null}
        </div>
        <div style={S.card}><h2 style={S.h2}>Mapa de la ruta</h2><Mapa markers={markers} linea={linea}/></div>
      </div>
    </div>);
}
