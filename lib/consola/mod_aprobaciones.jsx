'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S, fmtCLP } from '../ui';
export default function ModAprobaciones(props){
  var avisar=props.avisar||function(){};
  var [rows,setRows]=useState([]); var [pres,setPres]=useState({});
  async function cargar(){
    var r=await Promise.all([supabase.from('approvals').select('*').order('id',{ascending:false}).limit(200),supabase.from('presupuestos').select('id,total,estado')]);
    setRows(r[0].data||[]); var pm={}; (r[1].data||[]).forEach(function(p){pm[p.id]=p;}); setPres(pm);
  }
  useEffect(function(){ cargar(); },[]);
  async function decidir(a,st){
    var com=window.prompt('Comentario (opcional):')||'';
    await supabase.from('approvals').update({status:st,comments:com,decided_at:new Date().toISOString()}).eq('id',a.id);
    if(a.entity_type==='presupuesto') await supabase.from('presupuestos').update({estado:st==='approved'?'aceptado':'rechazado'}).eq('id',a.entity_id);
    avisar('✅ Aprobación '+st,T.ok); cargar();
  }
  var pend=rows.filter(function(a){return a.status==='pending';});
  var hist=rows.filter(function(a){return a.status!=='pending';});
  function titulo(a){ var p=pres[a.entity_id]; return a.entity_type+' #'+a.entity_id+(p?(' · '+fmtCLP(p.total)):''); }
  return (
    <div>
      <div style={S.card}>
        <h2 style={S.h2}>Aprobaciones pendientes ({pend.length})</h2>
        <p style={S.sub}>RN-01: no se ejecuta desarme sin aprobación. RN-04: no se repara sin presupuesto aprobado salvo excepción.</p>
        {pend.map(function(a){ return <div key={a.id} style={{border:'1px solid '+T.border,borderLeft:'4px solid '+T.warn,borderRadius:10,padding:10,marginBottom:8,background:T.surface2}}>
          <div style={{display:'flex',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}>
            <b style={{color:T.warn}}>{titulo(a)}</b><span style={S.sub}>{a.approver_type}</span>
          </div>
          <div style={{display:'flex',gap:8,marginTop:8}}>
            <button style={{...S.btnO(T.ok),width:'auto',marginBottom:0}} onClick={function(){ decidir(a,'approved'); }}>✔ Aprobar</button>
            <button style={{...S.btnO(T.danger),width:'auto',marginBottom:0}} onClick={function(){ decidir(a,'rejected'); }}>✘ Rechazar</button>
          </div>
        </div>; })}
        {pend.length===0? <p style={S.sub}>Sin aprobaciones pendientes.</p> : null}
      </div>
      <div style={S.card}>
        <h2 style={S.h2}>Historial ({hist.length})</h2>
        {hist.map(function(a){ return <p key={a.id} style={{fontSize:13,margin:'4px 0'}}>{a.status==='approved'?'✔':'✘'} {titulo(a)} · {a.approver_type} · {a.comments||''}</p>; })}
        {hist.length===0? <p style={S.sub}>Sin historial.</p> : null}
      </div>
    </div>);
}
