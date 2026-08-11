'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S, fmtFecha } from '../ui';
export default function Buzon(props){
  var ots=props.ots||[]; var onOpen=props.onOpen||function(){};
  var s1=useState([]),items=s1[0],setItems=s1[1];
  useEffect(function(){
    (async function(){
      var r=await Promise.all([
        supabase.from('notifications').select('*').order('id',{ascending:false}).limit(100),
        supabase.from('insistencias').select('*').order('id',{ascending:false}).limit(100)
      ]);
      var n=(r[0].data||[]).map(function(x){ return {id:'n'+x.id,tipo:x.tipo,titulo:x.titulo,ot_id:x.ot_id,fecha:x.creado_en}; });
      var i=(r[1].data||[]).map(function(x){ return {id:'i'+x.id,tipo:'insistencia',titulo:'✍️ Cliente: '+x.mensaje,ot_id:x.ot_id,fecha:x.created_at}; });
      setItems(n.concat(i).sort(function(a,b){ return new Date(b.fecha)-new Date(a.fecha); }));
    })();
  },[]);
  function color(t){ return t==='insistencia'?T.warn:(t==='solicitud_portal'?T.info:(t==='alerta_stock'?T.danger:T.violet)); }
  return (
    <div style={S.card}>
      <h2 style={S.h2}>Buzón del Agente ({items.length})</h2>
      {items.map(function(it){
        var ot=ots.find(function(o){ return o.id===it.ot_id; });
        return <div key={it.id} style={{border:'1px solid '+T.border,borderLeft:'4px solid '+color(it.tipo),borderRadius:10,padding:10,marginBottom:8,background:T.surface2}}>
          <div style={{display:'flex',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}>
            <b style={{color:color(it.tipo),fontSize:13}}>{it.titulo}</b>
            <span style={S.sub}>{fmtFecha(it.fecha)}</span>
          </div>
          {ot? <button style={{...S.btnO(T.info),width:'auto',marginBottom:0,marginTop:6}} onClick={function(){ onOpen(ot); }}>Abrir {ot.ext_id||('OT-'+ot.ot_number)}</button> : null}
        </div>;
      })}
      {items.length===0? <p style={S.sub}>Buzón limpio.</p> : null}
    </div>);
}
