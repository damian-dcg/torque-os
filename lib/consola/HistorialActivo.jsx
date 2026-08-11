'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S, fmtFecha } from '../ui';
export default function HistorialActivo(props){
  var customerId=props.customer_id; var otId=props.ot_id;
  var s1=useState([]),acts=s1[0],setActs=s1[1];
  var s2=useState([]),ots=s2[0],setOts=s2[1];
  var s3=useState([]),movs=s3[0],setMovs=s3[1];
  useEffect(function(){ if(!customerId)return;
    (async function(){
      var r=await Promise.all([
        supabase.from('assets').select('*').eq('customer_id',customerId),
        supabase.from('work_orders').select('id,ot_number,ext_id,tipo,estado,created_at').eq('customer_id',customerId).order('id',{ascending:false}),
        supabase.from('stock_movements').select('*').eq('tipo','salida')
      ]);
      setActs(r[0].data||[]); setOts(r[1].data||[]); setMovs(r[2].data||[]);
    })();
  },[customerId]);
  var repuestosOt=movs.filter(function(m){ return m.ot_id===otId; });
  return (
    <div style={{background:T.surface2,borderRadius:10,padding:12,marginBottom:12}}>
      <h3 style={{...S.h2,margin:'0 0 6px'}}>📋 Historial del cliente / equipo</h3>
      {acts.length? acts.map(function(a){ return <p key={a.id} style={{fontSize:13,margin:'3px 0'}}><b>{a.model||a.serial}</b> · serie {a.serial||'—'} · garantía hasta {a.warranty_until||'—'}</p>; }) : <p style={S.sub}>Sin activos registrados.</p>}
      <p style={{...S.sub,fontWeight:800,margin:'8px 0 4px'}}>OTs anteriores ({ots.filter(function(o){return o.id!==otId;}).length})</p>
      {ots.filter(function(o){return o.id!==otId;}).slice(0,6).map(function(o){ return <p key={o.id} style={{fontSize:12,margin:'2px 0',color:T.muted}}>{o.ext_id||('OT-'+o.ot_number)} · {o.tipo} · {o.estado} · {fmtFecha(o.created_at)}</p>; })}
      {repuestosOt.length? <div><p style={{...S.sub,fontWeight:800,margin:'8px 0 4px'}}>Repuestos usados en esta OT</p>{repuestosOt.map(function(m){ return <p key={m.id} style={{fontSize:12,margin:'2px 0'}}>{m.cantidad}× {m.part_codigo}</p>; })}</div> : null}
    </div>);
}
