'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S, estColor, fmtCLP, fmtFecha } from '../ui';
export default function FichaCliente(props){
  var c=props.cliente; var onClose=props.onClose; var onOpenOT=props.onOpenOT||function(){};
  var s1=useState([]),ots=s1[0],setOts=s1[1];
  var s2=useState([]),acts=s2[0],setActs=s2[1];
  useEffect(function(){ if(!c)return;
    (async function(){
      var r=await Promise.all([
        supabase.from('work_orders').select('*').eq('customer_id',c.id).order('id',{ascending:false}),
        supabase.from('assets').select('*').eq('customer_id',c.id)
      ]);
      setOts(r[0].data||[]); setActs(r[1].data||[]);
    })();
  },[c&&c.id]);
  if(!c) return null;
  var fallas=ots.filter(function(o){ return o.kpi&&String(o.kpi.reincidencia).toUpperCase()==='FALLA'; }).length;
  var notas=ots.filter(function(o){ return o.kpi&&o.kpi.nota; });
  var notaProm=notas.length?(notas.reduce(function(s,o){ return s+Number(o.kpi.nota); },0)/notas.length).toFixed(1):'—';
  var margen=ots.reduce(function(s,o){ return s+((o.kpi&&o.kpi.margen)||0); },0);
  var reinci=ots.length>1?(fallas>0?('ALTA · '+fallas+' falla(s)'):'RECURRENTE · '+ots.length+' OTs'):'PRIMERA VEZ';
  var colorRei=fallas>0?T.danger:(ots.length>1?T.ok:T.info);
  return (
    <div style={S.modal} onClick={onClose}>
      <div style={{...S.modalCard,maxWidth:820,maxHeight:'88vh',overflow:'auto'}} onClick={function(e){ e.stopPropagation(); }}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h2 style={{...S.h2,color:T.brand,margin:0}}>{c.nombre}</h2>
          <span style={S.pill(colorRei)}>{reinci}</span>
        </div>
        <p style={{...S.sub,margin:'6px 0'}}>RUT {c.rut||'—'} · {c.telefono||''} · {c.email||''}</p>
        <p style={{...S.sub,margin:'0 0 10px'}}>{c.direccion||''} {c.comuna||''}</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:10,marginBottom:12}}>
          <div style={S.card}><div style={S.sub}>OTs</div><div style={{fontSize:20,fontWeight:800}}>{ots.length}</div></div>
          <div style={S.card}><div style={S.sub}>Nota prom.</div><div style={{fontSize:20,fontWeight:800}}>{notaProm}</div></div>
          <div style={S.card}><div style={S.sub}>Fallas</div><div style={{fontSize:20,fontWeight:800,color:fallas?T.danger:T.ok}}>{fallas}</div></div>
          <div style={S.card}><div style={S.sub}>Margen</div><div style={{fontSize:18,fontWeight:800,color:margen<0?T.danger:T.ok}}>{fmtCLP(margen)}</div></div>
        </div>
        <div style={{background:T.surface2,borderRadius:10,padding:12,marginBottom:12}}>
          <h3 style={{...S.h2,margin:'0 0 6px'}}>Máquinas / equipos ({acts.length})</h3>
          {acts.map(function(a){ return <p key={a.id} style={{fontSize:13,margin:'3px 0'}}><b>{a.model||a.serial}</b> · {a.serial||''} · garantía {a.warranty_until||'—'}</p>; })}
          {acts.length===0? <p style={S.sub}>Sin activos registrados.</p> : null}
        </div>
        <h3 style={S.h2}>Historial de OTs ({ots.length})</h3>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr><th style={S.th}>OT</th><th style={S.th}>Tipo</th><th style={S.th}>Estado</th><th style={S.th}>Nota</th><th style={S.th}>Reincid.</th><th style={S.th}>Margen</th><th style={S.th}>Fecha</th></tr></thead>
          <tbody>{ots.map(function(o){ return <tr key={o.id} onClick={function(){ onOpenOT(o); }} style={{cursor:'pointer'}}>
            <td style={{...S.td,color:T.brand,fontWeight:700}}>{o.ext_id||('OT-'+o.ot_number)}</td>
            <td style={S.td}>{o.tipo}</td>
            <td style={S.td}><span style={S.pill(estColor(o.estado))}>{o.estado}</span></td>
            <td style={S.td}>{o.kpi&&o.kpi.nota?o.kpi.nota:'—'}</td>
            <td style={S.td}>{o.kpi?String(o.kpi.reincidencia||'—'):'—'}</td>
            <td style={S.td}>{fmtCLP((o.kpi&&o.kpi.margen)||0)}</td>
            <td style={S.td}>{fmtFecha(o.created_at)}</td>
          </tr>; })}</tbody>
        </table>
        <button style={{...S.btn(T.muted),marginTop:12}} onClick={onClose}>Cerrar</button>
      </div>
    </div>);
}
