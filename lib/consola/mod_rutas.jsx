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
  var s8=useState(false),busyGeo=s8[0],setBusyGeo=s8[1];
  var s9=useState(''),logGeo=s9[0],setLogGeo=s9[1];

  async function cargar(){
    var r=await Promise.all([
      supabase.from('work_orders').select('*').eq('fecha_programada',fecha),
      supabase.from('users').select('id,nombre,rol'),
      supabase.from('companies').select('id,nombre').eq('tipo','sat')
    ]);
    setOts(r[0].data||[]); setUsers((r[1].data||[]).filter(function(u){ return u.rol==='tecnico_sat'||u.rol==='admin'; })); setSats(r[2].data||[]);
    setPlan(null);
  }
  useEffect(function(){ if(tec) cargar(); },[fecha,tec]);

  async function geocodificar(){
    setBusyGeo(true); setLogGeo('Buscando OTs sin coordenadas…');
    var r=await supabase.from('work_orders').select('id,customer_id,direccion,customers(direccion,comuna,geo)').is('geo_cliente',null).limit(50);
    var rows=r.data||[]; var done=0;
    for(var i=0;i<rows.length;i++){
      var o=rows[i]; var c=o.customers||{};
      var g=c.geo||null;
      if(!g){
        var dir=((o.direccion||c.direccion||'')+', '+(c.comuna||'')+', Chile');
        if(dir.length>10){ g=await geocode(dir); if(g&&o.customer_id){ await supabase.from('customers').update({geo:g}).eq('id',o.customer_id); } }
      }
      if(g){ await supabase.from('work_orders').update({geo_cliente:g}).eq('id',o.id); done++; }
      setLogGeo('Geocodificando '+(i+1)+'/'+rows.length+'…');
      await new Promise(function(res){ setTimeout(res,300); });
    }
    setLogGeo('✅ Geocodificadas '+done+' OTs (lote de 50; pulsa de nuevo para seguir).');
    setBusyGeo(false);
  }

  async function optimizar(){
    setBusy(true);
    var stops=[];
    for(var i=0;i<ots.length;i++){
      var o=ots[i];
      var g=o.geo_cliente||((o.customers&&o.customers.geo)||null);
      if(g) stops.push({ot:o,lat:g.lat,lng:g.lng});
    }
    if(stops.length<2){ avisar('⛗ Faltan direcciones geocodificadas. Usa "Geocodificar todas".',T.danger); setBusy(false); return; }
    var coords=stops.map(function(s){ return s.lng+','+s.lat; }).join(';');
    var r=await fetch('https://router.project-osrm.org/table/v1/driving/'+coords+'?annotations=duration,distance');
    var j=await r.json();
    if(!j.durations){ avisar('⛗ El motor de rutas no respondió',T.danger); setBusy(false); return; }
    var n=stops.length; var visited=[0]; var cur=0;
    while(visited.length<n){
      var best=-1,bd=1e9;
      for(var k=0;k<n;k++){ if(visited.indexOf(k)>=0)continue; if(j.durations[cur][k]<bd){ bd=j.durations[cur][k]; best=k; } }
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
      await supabase.from('work_orders').update({ruta_orden:i+1,eta:plan.legs[i].eta,km_estimado:plan.legs[i].km||0}).eq('id',plan.legs[i].ot.id);
    }
    avisar('✅ Orden y ETAs guardados en las OTs',T.ok);
    cargar();
  }

  var markers=plan?plan.legs.map(function(l,i){ return {lat:l.lat,lng:l.lng,popup:(i+1)+') '+(l.ot.ext_id||('OT-'+l.ot.ot_number))+' · llega '+l.eta}; }):[];
  var linea=plan?plan.legs.map(function(l){ return [l.lat,l.lng]; }):null;

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
          <button style={{...S.btnO(T.warn),width:'auto',marginBottom:0}} onClick={geocodificar} disabled={busyGeo}>{busyGeo?'Geocodificando…':'🌍 Geocodificar todas'}</button>
          <button style={{...S.btn(T.brand),width:'auto',marginBottom:0}} onClick={optimizar} disabled={busy}>{busy?'Calculando…':'⚡ Optimizar orden'}</button>
          {plan? <button style={{...S.btn(T.ok),width:'auto',marginBottom:0}} onClick={aplicar}>💾 Aplicar orden y ETAs</button> : null}
        </div>
        {logGeo? <p style={{...S.sub,marginTop:8,color:T.info}}>{logGeo}</p> : null}
        {plan? <div style={{marginTop:12}}>
          <p style={{fontWeight:800}}>{plan.legs.length} paradas · {plan.totalKm} km · {Math.round(plan.totalMin/60*10)/10} h totales</p>
        </div> : null}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))',gap:14}}>
        <div style={S.card}>
          <h2 style={S.h2}>Orden sugerido</h2>
          {plan? plan.legs.map(function(l,i){ return <p key={l.ot.id} style={{fontSize:13,margin:'6px 0'}}>
            <b style={{color:T.brand}}>{i+1}.</b> {l.ot.ext_id||('OT-'+l.ot.ot_number)} · manejo {l.travel} min · <b>llega {l.eta}</b>
          </p>; }) : <p style={S.sub}>Elige fecha y técnico, geocodifica y luego "Optimizar".</p>}
          {!plan&&ots.length? <p style={S.sub}>{ots.length} OTs programadas el '+fecha+' para este técnico.</p> : null}
        </div>
        <div style={S.card}><h2 style={S.h2}>Mapa de la ruta</h2><Mapa markers={markers} linea={linea}/></div>
      </div>
    </div>);
}
