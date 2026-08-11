'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S, fmtFecha } from '../ui';
export default function Buzon(props){
  var ots=props.ots||[];
  var cust=props.cust||{};
  var onOpen=props.onOpen||function(){};
  var s2=useState([]),notis=s2[0],setNotis=s2[1];
  var s3=useState([]),ins=s3[0],setIns=s3[1];
  useEffect(function(){
    (async function(){
      var r=await Promise.all([
        supabase.from('notifications').select('*').eq('rol_destino','agente').order('id',{ascending:false}).limit(100),
        supabase.from('insistencias').select('*').order('id',{ascending:false}).limit(100)
      ]);
      setNotis(r[0].data||[]); setIns(r[1].data||[]);
    })();
  },[ots.length]);
  var pend=ots.filter(function(o){ return o.estado==='Ingresada'&&!o.asignado_user_id&&!o.asignado_company_id; });
  return (
    <div>
      <div style={S.card}>
        <h2 style={S.h2}>📥 Recepción · pendientes de asignar ({pend.length})</h2>
        {pend.map(function(o){
          var dp=o.datos_portal||{};
          return <div key={o.id} style={{border:'1px solid '+T.border,borderLeft:'4px solid '+T.info,borderRadius:10,padding:12,marginBottom:10,background:T.surface2}}>
            <div style={{display:'flex',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}>
              <b style={{color:T.info}}>{o.ext_id||('OT-'+o.ot_number)} · {(cust[o.customer_id]||{}).nombre||'—'}</b>
              <span style={S.sub}>{fmtFecha(o.created_at)}</span>
            </div>
            <p style={{...S.sub,margin:'6px 0'}}>{o.tipo} · {dp.producto||''} {dp.modelo||''} · {dp.tienda||''}</p>
            <button style={{...S.btn(T.brand),width:'auto',marginBottom:0}} onClick={function(){ onOpen(o); }}>🗓 Abrir y asignar / programar</button>
          </div>;
        })}
        {pend.length===0? <p style={S.sub}>Sin pendientes. Todo asignado.</p> : null}
      </div>
      <div style={S.card}>
        <h2 style={S.h2}>Notificaciones ({notis.length})</h2>
        {notis.map(function(n){ var ot=ots.find(function(o){ return o.id===n.ot_id; });
          return <div key={n.id} style={{border:'1px solid '+T.border,borderLeft:'4px solid '+T.violet,borderRadius:10,padding:10,marginBottom:8,background:T.surface2}}>
            <div style={{display:'flex',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}><b style={{color:T.violet}}>{n.titulo}</b><span style={S.sub}>{fmtFecha(n.creado_en)}</span></div>
            {ot? <button style={{...S.btnO(T.info),width:'auto',marginBottom:0,marginTop:6}} onClick={function(){ onOpen(ot); }}>Abrir {ot.ext_id||('OT-'+ot.ot_number)}</button> : null}
          </div>; })}
        {notis.length===0? <p style={S.sub}>Sin notificaciones.</p> : null}
      </div>
      <div style={S.card}>
        <h2 style={S.h2}>Insistencias de clientes ({ins.length})</h2>
        {ins.map(function(i){ var ot=ots.find(function(o){ return o.id===i.ot_id; });
          return <div key={i.id} style={{border:'1px solid '+T.border,borderLeft:'4px solid '+T.warn,borderRadius:10,padding:10,marginBottom:8,background:T.surface2}}>
            <div style={{display:'flex',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}><b style={{color:T.warn}}>✍️ {i.mensaje}</b><span style={S.sub}>{fmtFecha(i.created_at)}</span></div>
            {ot? <button style={{...S.btnO(T.info),width:'auto',marginBottom:0,marginTop:6}} onClick={function(){ onOpen(ot); }}>Abrir {ot.ext_id||('OT-'+ot.ot_number)}</button> : null}
          </div>; })}
        {ins.length===0? <p style={S.sub}>Sin insistencias.</p> : null}
      </div>
    </div>);
}
