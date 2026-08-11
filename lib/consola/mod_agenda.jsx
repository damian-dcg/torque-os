'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S, estColor } from '../ui';
export default function ModAgenda(props){
  var avisar=props.avisar||function(){};
  var s1=useState([]),ots=s1[0],setOts=s1[1]; var s2=useState([]),users=s2[0],setUsers=s2[1]; var s3=useState([]),avail=s3[0],setAvail=s3[1];
  var s4=useState(function(){ var d=new Date(); return new Date(d.getFullYear(),d.getMonth(),1); }),mes=s4[0],setMes=s4[1];
  var s5=useState(null),dia=s5[0],setDia=s5[1]; var s6=useState({ot:'',tec:''}),prog=s6[0],setProg=s6[1];
  async function cargar(){ var r=await Promise.all([supabase.from('work_orders').select('id,ot_number,estado,tipo,fecha_programada,asignado_user_id').order('ot_number').limit(500),supabase.from('users').select('id,nombre,rol'),supabase.from('technician_availability').select('*')]); setOts(r[0].data||[]); setUsers(r[1].data||[]); setAvail(r[2].data||[]); }
  useEffect(function(){ cargar(); },[]);
  function fkey(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
  var dias=new Date(mes.getFullYear(),mes.getMonth()+1,0).getDate();
  var primero=new Date(mes.getFullYear(),mes.getMonth(),1).getDay();
  var delDia=ots.filter(function(o){ return o.fecha_programada===dia; });
  var sinFecha=ots.filter(function(o){ return !o.fecha_programada&&['Cerrada','Anulada'].indexOf(o.estado)<0; });
  async function programar(){ if(!prog.ot||!dia){ avisar('⛔ Elige OT y día',T.danger); return; } var e=await supabase.from('work_orders').update({fecha_programada:dia}).eq('id',Number(prog.ot)); if(e.error) avisar('⛔ '+e.error.message,T.danger); else { avisar('✅ OT programada',T.ok); setProg({ot:'',tec:prog.tec}); cargar(); } }
  async function asignar(o){ var tec=Number(prog.tec||o.asignado_user_id); if(!tec){ avisar('⛔ Elige técnico',T.danger); return; } var p={asignado_user_id:tec}; if(o.estado==='Ingresada')p.estado='Asignada'; var e=await supabase.from('work_orders').update(p).eq('id',o.id); if(e.error) avisar('⛔ '+e.error.message,T.danger); else { avisar('✅ Asignada',T.ok); cargar(); } }
  return (
    <div>
      <div style={S.card}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
          <button style={{...S.btnO(T.info),width:'auto',marginBottom:0,padding:'6px 14px'}} onClick={function(){ setMes(new Date(mes.getFullYear(),mes.getMonth()-1,1)); }}>‹</button>
          <b style={{flex:1,textAlign:'center',fontSize:16,textTransform:'capitalize'}}>{mes.toLocaleDateString('es-CL',{month:'long',year:'numeric'})}</b>
          <button style={{...S.btnO(T.info),width:'auto',marginBottom:0,padding:'6px 14px'}} onClick={function(){ setMes(new Date(mes.getFullYear(),mes.getMonth()+1,1)); }}>›</button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:6}}>
          {['D','L','M','X','J','V','S'].map(function(d){ return <div key={d} style={{...S.sub,textAlign:'center',fontWeight:800}}>{d}</div>; })}
          {Array.from({length:primero},function(_,i){ return <div key={'e'+i}/>; })}
          {Array.from({length:dias},function(_,i){ var d=new Date(mes.getFullYear(),mes.getMonth(),i+1); var k=fkey(d);
            var n=ots.filter(function(o){ return o.fecha_programada===k; }).length;
            var ind=avail.filter(function(a){ return d>=new Date(a.desde+'T00:00:00')&&d<=new Date(a.hasta+'T23:59:59'); }).length;
            return <button key={i} onClick={function(){ setDia(k); }} style={{height:56,borderRadius:10,border:dia===k?('2px solid '+T.brand):('1px solid '+T.border),background:dia===k?(T.brand+'14'):T.surface,cursor:'pointer',position:'relative'}}>
              <span style={{fontSize:13,fontWeight:700}}>{i+1}</span>
              {n>0? <span style={{position:'absolute',top:5,right:5,background:T.brand,color:'#fff',borderRadius:999,padding:'1px 7px',fontSize:10,fontWeight:800}}>{n}</span> : null}
              {ind>0? <span style={{position:'absolute',bottom:5,right:5,background:T.danger,color:'#fff',borderRadius:999,padding:'1px 6px',fontSize:10,fontWeight:800}}>{ind}</span> : null}
            </button>; })}
        </div>
      </div>
      {dia? <div style={S.card}>
        <h2 style={S.h2}>OTs del {dia}</h2>
        {delDia.map(function(o){ return <div key={o.id} style={{display:'flex',gap:8,alignItems:'center',marginBottom:8,flexWrap:'wrap'}}>
          <b style={{color:T.brand}}>OT-{o.ot_number}</b><span style={S.pill(estColor(o.estado))}>{o.estado}</span>
          <span style={{...S.sub,flex:1}}>{(users.find(function(u){return u.id===o.asignado_user_id;})||{}).nombre||'Sin técnico'}</span>
          <select style={{...S.input,width:180,marginBottom:0}} value={prog.tec} onChange={function(e){ setProg({ot:prog.ot,tec:e.target.value}); }}><option value="">Técnico…</option>{users.filter(function(u){return u.rol==='tecnico_sat'||u.rol==='admin';}).map(function(u){ return <option key={u.id} value={u.id}>{u.nombre}</option>; })}</select>
          <button style={{...S.btnO(T.ok),width:'auto',marginBottom:0}} onClick={function(){ asignar(o); }}>Asignar</button>
        </div>; })}
        {delDia.length===0? <p style={S.sub}>Sin OTs este día.</p> : null}
        <h3 style={{...S.h2,marginTop:12}}>Programar OT sin fecha</h3>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <select style={{...S.input,flex:1,marginBottom:0}} value={prog.ot} onChange={function(e){ setProg({ot:e.target.value,tec:prog.tec}); }}><option value="">Elegir OT…</option>{sinFecha.map(function(o){ return <option key={o.id} value={o.id}>OT-{o.ot_number} · {o.tipo}</option>; })}</select>
          <button style={{...S.btn(T.brand),width:'auto',marginBottom:0}} onClick={programar}>Programar al {dia}</button>
        </div>
      </div> : null}
    </div>);
}
