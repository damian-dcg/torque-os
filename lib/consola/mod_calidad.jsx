'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S } from '../ui';
export default function ModCalidad(props){
  var avisar=props.avisar||function(){};
  var [ncs,setNcs]=useState([]); var [cas,setCas]=useState([]); var [auds,setAuds]=useState([]);
  var [incs,setIncs]=useState([]); var [epp,setEpp]=useState([]); var [waste,setWaste]=useState([]); var [permits,setPermits]=useState([]);
  var [tab,setTab]=useState('nc');
  async function cargar(){
    var r=await Promise.all([
      supabase.from('non_conformities').select('*').order('id',{ascending:false}).limit(200),
      supabase.from('corrective_actions').select('*').order('id',{ascending:false}).limit(200),
      supabase.from('quality_audits').select('*').order('id',{ascending:false}).limit(200),
      supabase.from('incidents').select('*').order('id',{ascending:false}).limit(200),
      supabase.from('epp_records').select('*').order('id',{ascending:false}),
      supabase.from('waste_records').select('*').order('id',{ascending:false}),
      supabase.from('work_permits').select('*').order('id',{ascending:false})
    ]);
    setNcs(r[0].data||[]); setCas(r[1].data||[]); setAuds(r[2].data||[]); setIncs(r[3].data||[]);
    setEpp(r[4].data||[]); setWaste(r[5].data||[]); setPermits(r[6].data||[]);
  }
  useEffect(function(){ cargar(); },[]);
  async function nuevaNC(){
    var desc=window.prompt('Descripción de la no conformidad:'); if(!desc)return;
    var sev=window.prompt('Severidad (baja/media/alta/critica):','media')||'media';
    var src=window.prompt('Origen (auditoria/reclamo/interno):')||'interno';
    await supabase.from('non_conformities').insert([{description:desc,severity:sev,source:src}]);
    avisar('✅ NC registrada',T.ok); cargar();
  }
  async function agregarAC(nc){
    var action=window.prompt('Acción correctiva:'); if(!action)return;
    var resp=window.prompt('Responsable:')||'';
    var due=window.prompt('Vencimiento (YYYY-MM-DD):')||null;
    await supabase.from('corrective_actions').insert([{non_conformity_id:nc.id,action:action,responsible:resp,due_date:due}]);
    avisar('✅ Acción agregada',T.ok); cargar();
  }
  async function cerrarAC(ac){ await supabase.from('corrective_actions').update({status:'closed',closed_at:new Date().toISOString()}).eq('id',ac.id);
    var open=cas.filter(function(x){return x.non_conformity_id===ac.non_conformity_id&&x.status!=='closed'&&x.id!==ac.id;}).length;
    if(!open) await supabase.from('non_conformities').update({status:'closed'}).eq('id',ac.non_conformity_id);
    avisar('✅ Acción cerrada',T.ok); cargar(); }
  async function nuevaAuditoria(){
    var ot=Number(window.prompt('ID de OT auditada:')||0)||null;
    var res=window.prompt('Resultado (pass/fail/partial):','pass')||'pass';
    var notes=window.prompt('Notas:')||'';
    await supabase.from('quality_audits').insert([{ot_id:ot,result:res,notes:notes}]);
    avisar('✅ Auditoría registrada',T.ok); cargar();
  }
  async function nuevoIncidente(){
    var type=window.prompt('Tipo (seguridad/medioambiente):','seguridad')||'seguridad';
    var desc=window.prompt('Descripción:'); if(!desc)return;
    var sev=window.prompt('Severidad:')||'media';
    await supabase.from('incidents').insert([{type:type,description:desc,severity:sev}]);
    avisar('✅ Incidente registrado',T.ok); cargar();
  }
  return (
    <div>
      <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
        {['nc','auditorias','incidentes','hse'].map(function(t){
          return <button key={t} onClick={function(){ setTab(t); }} style={{padding:'8px 14px',borderRadius:999,border:tab===t?'0':'1px solid '+T.border,background:tab===t?T.brand:'transparent',color:tab===t?'#fff':T.text,fontWeight:600,fontSize:13,cursor:'pointer'}}>{t}</button>;
        })}
      </div>
      {tab==='nc'? <div style={S.card}>
        <div style={{display:'flex',justifyContent:'space-between',gap:8,marginBottom:10}}>
          <h2 style={S.h2}>No conformidades y acciones correctivas</h2>
          <button style={{...S.btn(T.brand),width:'auto',marginBottom:0}} onClick={nuevaNC}>+ NC</button>
        </div>
        {ncs.map(function(nc){
          var acc=cas.filter(function(a){return a.non_conformity_id===nc.id;});
          return <div key={nc.id} style={{border:'1px solid '+T.border,borderLeft:'4px solid '+(nc.severity==='critica'?T.danger:nc.severity==='alta'?T.warn:T.info),borderRadius:10,padding:12,marginBottom:10,background:T.surface2}}>
            <div style={{display:'flex',justifyContent:'space-between',gap:8}}><b>NC #{nc.id}</b><span style={S.pill(nc.status==='closed'?T.ok:T.warn)}>{nc.status}</span></div>
            <p style={{...S.sub,margin:'6px 0'}}>{nc.description} · {nc.severity} · {nc.source}</p>
            {acc.map(function(a){ return <p key={a.id} style={{fontSize:13,margin:'4px 0'}}>{a.status==='closed'?'✅':'⬜'} {a.action} · {a.responsible} · {a.due_date||''}</p>; })}
            <div style={{display:'flex',gap:6,marginTop:6}}>
              <button style={{...S.btnO(T.info),width:'auto',marginBottom:0}} onClick={function(){ agregarAC(nc); }}>+ Acción</button>
              {acc.filter(function(a){return a.status!=='closed';}).map(function(a){ return <button key={a.id} style={{...S.btnO(T.ok),width:'auto',marginBottom:0}} onClick={function(){ cerrarAC(a); }}>Cerrar acción</button>; })}
            </div>
          </div>;
        })}
        {ncs.length===0? <p style={S.sub}>Sin no conformidades.</p> : null}
      </div> : null}
      {tab==='auditorias'? <div style={S.card}>
        <div style={{display:'flex',justifyContent:'space-between',gap:8,marginBottom:10}}>
          <h2 style={S.h2}>Auditorías de calidad ({auds.length})</h2>
          <button style={{...S.btn(T.brand),width:'auto',marginBottom:0}} onClick={nuevaAuditoria}>+ Auditoría</button>
        </div>
        {auds.map(function(a){ return <p key={a.id} style={{fontSize:13,margin:'4px 0'}}>{a.result==='pass'?'✅':a.result==='fail'?'⛔':'⚠'} OT-{a.ot_id||'—'} · {a.result} · {a.notes}</p>; })}
        {auds.length===0? <p style={S.sub}>Sin auditorías.</p> : null}
      </div> : null}
      {tab==='incidentes'? <div style={S.card}>
        <div style={{display:'flex',justifyContent:'space-between',gap:8,marginBottom:10}}>
          <h2 style={S.h2}>Incidentes de seguridad / medioambiente ({incs.length})</h2>
          <button style={{...S.btn(T.danger),width:'auto',marginBottom:0}} onClick={nuevoIncidente}>+ Incidente</button>
        </div>
        {incs.map(function(i){ return <p key={i.id} style={{fontSize:13,margin:'4px 0'}}>[{i.type}] {i.description} · sev {i.severity}</p>; })}
        {incs.length===0? <p style={S.sub}>Sin incidentes.</p> : null}
      </div> : null}
      {tab==='hse'? <div>
        <div style={S.card}><h2 style={S.h2}>EPP ({epp.length})</h2>
          {epp.map(function(e){ return <p key={e.id} style={{fontSize:13,margin:'4px 0'}}>{e.item} · {e.assigned_to} · <span style={{color:e.status==='ok'?T.ok:T.warn}}>{e.status}</span> · revisión {e.next_check||'—'}</p>; })}
          {epp.length===0? <p style={S.sub}>Sin EPP registrado.</p> : null}</div>
        <div style={S.card}><h2 style={S.h2}>Residuos ({waste.length})</h2>
          {waste.map(function(w){ return <p key={w.id} style={{fontSize:13,margin:'4px 0'}}>{w.type} · {w.quantity} · {w.disposal}</p>; })}
          {waste.length===0? <p style={S.sub}>Sin registros de residuos.</p> : null}</div>
        <div style={S.card}><h2 style={S.h2}>Permisos de trabajo ({permits.length})</h2>
          {permits.map(function(p){ return <p key={p.id} style={{fontSize:13,margin:'4px 0'}}>{p.type} · {p.worker} · OT-{p.ot_id||'—'} · hasta {p.valid_until||'—'}</p>; })}
          {permits.length===0? <p style={S.sub}>Sin permisos.</p> : null}</div>
      </div> : null}
    </div>);
}
