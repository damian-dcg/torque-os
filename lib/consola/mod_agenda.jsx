'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S, estColor } from '../ui';

export default function ModAgenda(props){
  var avisar=props.avisar||function(){};
  var s1=useState([]),ots=s1[0],setOts=s1[1];
  var s2=useState([]),users=s2[0],setUsers=s2[1];
  var s3=useState([]),sats=s3[0],setSats=s3[1];
  var s4=useState('mes'),vista=s4[0],setVista=s4[1];
  var s5=useState(function(){ var d=new Date(); return new Date(d.getFullYear(),d.getMonth(),1); }),mes=s5[0],setMes=s5[1];
  var s6=useState(new Date().toISOString().slice(0,10)),dia=s6[0],setDia=s6[1];
  var s7=useState(4),cap=s7[0],setCap=s7[1];
  var s8=useState({ot:'',tec:''}),prog=s8[0],setProg=s8[1];

  async function cargar(){
    var r=await Promise.all([
      supabase.from('work_orders').select('*').limit(800),
      supabase.from('users').select('id,nombre,rol'),
      supabase.from('companies').select('id,nombre').eq('tipo','sat'),
      supabase.from('settings').select('valor').eq('clave','capacidad_diaria').limit(1)
    ]);
    setOts(r[0].data||[]); setUsers(r[1].data||[]); setSats(r[2].data||[]);
    if(r[3].data&&r[3].data[0]) setCap(Number(r[3].data[0].valor)||4);
  }
  useEffect(function(){ cargar(); },[]);

  function esTecInt(u){ return u.rol==='tecnico'||u.rol==='tecnico_sat'||u.rol==='admin'; }
  function fkey(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
  function cargaDe(tecKey,fecha){
    return ots.filter(function(x){
      if(x.fecha_programada!==fecha) return false;
      if(tecKey.indexOf('u')===0) return x.asignado_user_id===Number(tecKey.slice(1));
      return x.asignado_company_id===Number(tecKey.slice(1));
    }).length;
  }
  var dias=new Date(mes.getFullYear(),mes.getMonth()+1,0).getDate();
  var primero=new Date(mes.getFullYear(),mes.getMonth(),1).getDay();
  var delDia=ots.filter(function(o){ return o.fecha_programada===dia; });
  var sinFecha=ots.filter(function(o){ return !o.fecha_programada&&['Cerrada','Anulada'].indexOf(o.estado)<0; });
  var recursos=users.filter(esTecInt).map(function(u){ return {id:u.id,nombre:u.nombre,tipo:'tec'}; })
    .concat(sats.map(function(s){ return {id:s.id,nombre:s.nombre,tipo:'sat'}; }));

  async function programar(){
    if(!prog.ot){ avisar('⛔ Elige OT',T.danger); return; }
    var o=ots.find(function(x){ return x.id===Number(prog.ot); });
    var tecKey=prog.tec||(o?((o.asignado_user_id?('u'+o.asignado_user_id):(o.asignado_company_id?('s'+o.asignado_company_id):''))):'');
    if(tecKey){
      var n=cargaDe(tecKey,dia);
      if(n>=cap){ avisar('⛔ Sobrecupo: ese técnico ya tiene '+n+' OTs el '+dia+' (máximo '+cap+'). Reprograma o reasigna.',T.danger); return; }
    }
    var patch={fecha_programada:dia};
    if(prog.tec){
      if(prog.tec.indexOf('u')===0) patch.asignado_user_id=Number(prog.tec.slice(1)); else patch.asignado_company_id=Number(prog.tec.slice(1));
      patch.estado='Asignada';
    }
    var e=await supabase.from('work_orders').update(patch).eq('id',Number(prog.ot));
    if(e.error) avisar('⛔ '+e.error.message,T.danger); else { avisar('✅ OT programada',T.ok); setProg({ot:'',tec:''}); cargar(); }
  }

  async function asignar(o){
    if(!prog.tec){ avisar('⛔ Elige técnico o SSTT',T.danger); return; }
    var n=cargaDe(prog.tec,dia);
    if(n>=cap){ avisar('⛔ Sobrecupo (máximo '+cap+' por día)',T.danger); return; }
    var patch={estado:'Asignada'};
    if(prog.tec.indexOf('u')===0) patch.asignado_user_id=Number(prog.tec.slice(1)); else patch.asignado_company_id=Number(prog.tec.slice(1));
    var e=await supabase.from('work_orders').update(patch).eq('id',o.id);
    if(e.error) avisar('⛔ '+e.error.message,T.danger); else { avisar('✅ Asignada',T.ok); cargar(); }
  }

  return (
    <div>
      <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap',alignItems:'center'}}>
        <button style={{...S.btnO(vista==='mes'?T.brand:T.muted),width:'auto',marginBottom:0}} onClick={function(){ setVista('mes'); }}>📅 Mes</button>
        <button style={{...S.btnO(vista==='dia'?T.brand:T.muted),width:'auto',marginBottom:0}} onClick={function(){ setVista('dia'); }}>👷 Día por técnico</button>
        <input style={{...S.input,width:170,marginBottom:0}} type="date" value={dia} onChange={function(e){ setDia(e.target.value); }}/>
        <span style={{...S.sub,marginLeft:'auto'}}>Capacidad: {cap} OTs/técnico/día (editable en Parámetros → Generales)</span>
      </div>
      {vista==='mes'? (
        <div style={S.card}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
            <button style={{...S.btnO(T.info),width:'auto',marginBottom:0,padding:'6px 14px'}} onClick={function(){ setMes(new Date(mes.getFullYear(),mes.getMonth()-1,1)); }}>‹</button>
            <b style={{flex:1,textAlign:'center',textTransform:'capitalize'}}>{mes.toLocaleDateString('es-CL',{month:'long',year:'numeric'})}</b>
            <button style={{...S.btnO(T.info),width:'auto',marginBottom:0,padding:'6px 14px'}} onClick={function(){ setMes(new Date(mes.getFullYear(),mes.getMonth()+1,1)); }}>›</button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:6}}>
            {['D','L','M','X','J','V','S'].map(function(d){ return <div key={d} style={{...S.sub,textAlign:'center',fontWeight:800}}>{d}</div>; })}
            {Array.from({length:primero},function(_,i){ return <div key={'e'+i}/>; })}
            {Array.from({length:dias},function(_,i){
              var d=new Date(mes.getFullYear(),mes.getMonth(),i+1);
              var k=fkey(d);
              var n=ots.filter(function(o){ return o.fecha_programada===k; }).length;
              return <button key={i} onClick={function(){ setDia(k); setVista('dia'); }} style={{height:56,borderRadius:10,border:dia===k?('2px solid '+T.brand):('1px solid '+T.border),background:T.surface,cursor:'pointer',position:'relative'}}>
                <span style={{fontSize:13,fontWeight:700}}>{i+1}</span>
                {n>0? <span style={{position:'absolute',top:5,right:5,background:T.brand,color:'#fff',borderRadius:999,padding:'1px 7px',fontSize:10,fontWeight:800}}>{n}</span> : null}
              </button>;
            })}
          </div>
        </div>) : (
        <div>
          {recursos.map(function(r){
            var mias=delDia.filter(function(o){ return r.tipo==='tec'? o.asignado_user_id===r.id : o.asignado_company_id===r.id; });
            if(!mias.length) return null;
            return <div key={r.tipo+r.id} style={S.card}>
              <h3 style={{...S.h2,color:mias.length>=cap?T.danger:T.brand}}>{r.nombre} ({mias.length}/{cap}) {mias.length>=cap?'· ⚠ lleno':''}</h3>
              {mias.map(function(o){ return <p key={o.id} style={{fontSize:13,margin:'4px 0'}}>{o.ext_id||('OT-'+o.ot_number)} · {o.tipo} · <span style={S.pill(estColor(o.estado))}>{o.estado}</span></p>; })}
            </div>;
          })}
          <div style={S.card}>
            <h3 style={S.h2}>Sin asignar ({delDia.filter(function(o){ return !o.asignado_user_id&&!o.asignado_company_id; }).length})</h3>
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:10}}>
              <select style={{...S.input,flex:1,marginBottom:0}} value={prog.tec} onChange={function(e){ setProg({ot:prog.ot,tec:e.target.value}); }}>
                <option value="">Elegir técnico/SSTT…</option>
                <optgroup label="Internos">{users.filter(esTecInt).map(function(u){ return <option key={'u'+u.id} value={'u'+u.id}>{u.nombre}</option>; })}</optgroup>
                <optgroup label="SSTT">{sats.map(function(s){ return <option key={'s'+s.id} value={'s'+s.id}>{s.nombre}</option>; })}</optgroup>
              </select>
            </div>
            {delDia.filter(function(o){ return !o.asignado_user_id&&!o.asignado_company_id; }).map(function(o){
              return <div key={o.id} style={{display:'flex',gap:8,alignItems:'center',marginBottom:6,flexWrap:'wrap'}}>
                <b style={{color:T.brand}}>{o.ext_id||('OT-'+o.ot_number)}</b>
                <span style={S.sub}>{o.tipo}</span>
                <button style={{...S.btnO(T.ok),width:'auto',marginBottom:0}} onClick={function(){ asignar(o); }}>Asignar</button>
              </div>;
            })}
          </div>
          <div style={S.card}>
            <h3 style={S.h2}>Programar OT sin fecha al {dia}</h3>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              <select style={{...S.input,flex:2,marginBottom:0}} value={prog.ot} onChange={function(e){ setProg({ot:e.target.value,tec:prog.tec}); }}>
                <option value="">Elegir OT…</option>
                {sinFecha.map(function(o){ return <option key={o.id} value={o.id}>{o.ext_id||('OT-'+o.ot_number)} · {o.tipo}</option>; })}
              </select>
              <button style={{...S.btn(T.brand),width:'auto',marginBottom:0}} onClick={programar}>Programar</button>
            </div>
          </div>
        </div>)}
    </div>);
}
