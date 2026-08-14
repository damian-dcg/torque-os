'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S, fmtCLP } from '../ui';

export default function ModDesarme(props){
  var avisar=props.avisar||function(){};
  var [reqs,setReqs]=useState([]); var [sessions,setSessions]=useState([]);
  var [components,setComponents]=useState([]); var [evals,setEvals]=useState([]);
  var [vals,setVals]=useState([]); var [ots,setOts]=useState([]);
  var [cust,setCust]=useState({}); var [users,setUsers]=useState([]);
  var [tab,setTab]=useState('solicitudes');

  async function cargar(){
    var r=await Promise.all([
      supabase.from('disassembly_requests').select('*').order('id',{ascending:false}).limit(100),
      supabase.from('disassembly_sessions').select('*').order('id',{ascending:false}).limit(100),
      supabase.from('extracted_components').select('*').order('id',{ascending:false}).limit(200),
      supabase.from('component_evaluations').select('*').order('id',{ascending:false}).limit(200),
      supabase.from('component_valuations').select('*').order('id',{ascending:false}).limit(200),
      supabase.from('work_orders').select('*').order('id',{ascending:false}).limit(200),
      supabase.from('customers').select('id,nombre'),
      supabase.from('users').select('id,nombre')
    ]);
    setReqs(r[0].data||[]); setSessions(r[1].data||[]); setComponents(r[2].data||[]);
    setEvals(r[3].data||[]); setVals(r[4].data||[]); setOts(r[5].data||[]);
    var cm={}; (r[6].data||[]).forEach(function(c){cm[c.id]=c;}); setCust(cm); setUsers(r[7].data||[]);
  }
  useEffect(function(){ cargar(); },[]);

  function otDe(id){ return ots.find(function(o){return o.id===id;}); }
  function userDe(id){ return (users.find(function(u){return u.id===id;})||{}).nombre||'—'; }

  var pendientes=reqs.filter(function(r){return r.status==='pending_approval'||r.status==='submitted';});
  var aprobadas=reqs.filter(function(r){return r.status==='approved'||r.status==='in_execution';});
  var completadas=reqs.filter(function(r){return r.status==='completed';});

  return (
    <div>
      <div style={{display:'flex',gap:6,marginBottom:12}}>
        {['solicitudes','sesiones','piezas'].map(function(t){
          return <button key={t} onClick={function(){ setTab(t); }} style={{padding:'8px 14px',borderRadius:999,border:tab===t?'0':'1px solid '+T.border,background:tab===t?T.brand:'transparent',color:tab===t?'#fff':T.text,fontWeight:600,fontSize:13,cursor:'pointer'}}>{t}</button>;
        })}
      </div>

      {tab==='solicitudes'? <div>
        <div style={S.card}>
          <h2 style={S.h2}>Solicitudes de desarme pendientes ({pendientes.length})</h2>
          <p style={S.sub}>RN-01: No se puede ejecutar desarme sin aprobación registrada.</p>
          {pendientes.map(function(r){
            var o=otDe(r.ot_id); var c=o?cust[o.customer_id]||{}:{};
            return <div key={r.id} style={{border:'1px solid '+T.border,borderLeft:'4px solid '+T.warn,borderRadius:10,padding:12,marginBottom:10,background:T.surface2}}>
              <div style={{display:'flex',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}>
                <b style={{color:T.warn}}>Solicitud #{r.id} · OT-{o?o.ot_number:'?'}</b>
                <span style={S.pill(T.warn)}>{r.status}</span>
              </div>
              <p style={{...S.sub,margin:'6px 0'}}>Cliente: {c.nombre||'—'} · {r.scope} · {r.reason||''}</p>
              <p style={{...S.sub,margin:'4px 0'}}>Costo est: {fmtCLP(r.estimated_cost)} · Horas est: {r.estimated_hours} · Riesgos: {r.risk_notes||'—'}</p>
              <div style={{display:'flex',gap:8,marginTop:8}}>
                <button style={{...S.btnO(T.ok),width:'auto',marginBottom:0}} onClick={async function(){
                  await supabase.from('disassembly_requests').update({status:'approved'}).eq('id',r.id);
                  await supabase.from('work_orders').update({disassembly_request_id:r.id}).eq('id',r.ot_id);
                  await supabase.from('approvals').insert([{entity_type:'desarme',entity_id:r.id,approver_type:r.requires_customer_approval?'cliente':'interno',status:'approved'}]);
                  avisar('✅ Desarme aprobado',T.ok); cargar();
                }}>✔ Aprobar</button>
                <button style={{...S.btnO(T.danger),width:'auto',marginBottom:0}} onClick={async function(){
                  await supabase.from('disassembly_requests').update({status:'rejected'}).eq('id',r.id);
                  avisar('✅ Desarme rechazado',T.ok); cargar();
                }}>✘ Rechazar</button>
              </div>
            </div>;
          })}
          {pendientes.length===0? <p style={S.sub}>Sin solicitudes pendientes.</p> : null}
        </div>
        <div style={S.card}>
          <h2 style={S.h2}>Aprobadas / en ejecución ({aprobadas.length})</h2>
          {aprobadas.map(function(r){
            var o=otDe(r.ot_id);
            return <div key={r.id} style={{border:'1px solid '+T.border,borderRadius:10,padding:10,marginBottom:8,background:T.surface2}}>
              <div style={{display:'flex',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}>
                <b>Solicitud #{r.id} · OT-{o?o.ot_number:'?'}</b>
                <span style={S.pill(T.ok)}>{r.status}</span>
              </div>
              {r.status==='approved'? <button style={{...S.btn(T.brand),width:'auto',marginBottom:0,marginTop:8}} onClick={async function(){
                var s=await supabase.from('disassembly_sessions').insert([{request_id:r.id,technician_id:null,started_at:new Date().toISOString()}]).select();
                await supabase.from('disassembly_requests').update({status:'in_execution'}).eq('id',r.id);
                avisar('✅ Sesión de desarme iniciada',T.ok); cargar();
              }}>▶ Iniciar sesión</button> : null}
            </div>;
          })}
          {aprobadas.length===0? <p style={S.sub}>Sin desarmes en ejecución.</p> : null}
        </div>
        <div style={S.card}>
          <h2 style={S.h2}>Completadas ({completadas.length})</h2>
          {completadas.map(function(r){
            var o=otDe(r.ot_id);
            return <p key={r.id} style={{fontSize:13,margin:'4px 0'}}>✔ Solicitud #{r.id} · OT-{o?o.ot_number:'?'}</p>;
          })}
          {completadas.length===0? <p style={S.sub}>Sin desarmes completados.</p> : null}
        </div>
      </div> : null}

      {tab==='sesiones'? <div style={S.card}>
        <h2 style={S.h2}>Sesiones de desarme ({sessions.length})</h2>
        {sessions.map(function(s){
          var req=reqs.find(function(r){return r.id===s.request_id;});
          var o=req?otDe(req.ot_id):null;
          var comps=components.filter(function(c){return c.session_id===s.id;});
          return <div key={s.id} style={{border:'1px solid '+T.border,borderRadius:10,padding:12,marginBottom:10,background:T.surface2}}>
            <div style={{display:'flex',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}>
              <b>Sesión #{s.id} · OT-{o?o.ot_number:'?'}</b>
              <span style={S.sub}>Técnico: {userDe(s.technician_id)}</span>
            </div>
            <p style={{...S.sub,margin:'6px 0'}}>Inicio: {s.started_at?new Date(s.started_at).toLocaleString('es-CL'):'—'}</p>
            <p style={{...S.sub,margin:'4px 0'}}>Piezas extraídas: {comps.length}</p>
            <div style={{display:'flex',gap:8,marginTop:8}}>
              <button style={{...S.btnO(T.info),width:'auto',marginBottom:0}} onClick={function(){ agregarPieza(s.id); }}>+ Agregar pieza</button>
              {s.started_at&&!s.completed_at? <button style={{...S.btn(T.ok),width:'auto',marginBottom:0}} onClick={async function(){
                await supabase.from('disassembly_sessions').update({completed_at:new Date().toISOString()}).eq('id',s.id);
                await supabase.from('disassembly_requests').update({status:'completed'}).eq('id',s.request_id);
                avisar('✅ Sesión completada',T.ok); cargar();
              }}>✔ Completar sesión</button> : null}
            </div>
          </div>;
        })}
        {sessions.length===0? <p style={S.sub}>Sin sesiones. Aprueba una solicitud e inicia la sesión.</p> : null}
      </div> : null}

      {tab==='piezas'? <div style={S.card}>
        <h2 style={S.h2}>Piezas extraídas ({components.length})</h2>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr><th style={S.th}>Pieza</th><th style={S.th}>N° parte</th><th style={S.th}>Cantidad</th><th style={S.th}>Condición</th><th style={S.th}>Destino</th><th style={S.th}>Acción</th></tr></thead>
          <tbody>{components.map(function(c){
            return <tr key={c.id}>
              <td style={S.td}>{c.name}</td>
              <td style={S.td}>{c.part_number||'—'}</td>
              <td style={S.td}>{c.quantity}</td>
              <td style={S.td}>{c.condition}</td>
              <td style={S.td}>{c.destination}</td>
              <td style={S.td}><button style={{...S.btnO(T.info),width:'auto',marginBottom:0}} onClick={function(){ evaluar(c.id); }}>Evaluar</button></td>
            </tr>;
          })}</tbody>
        </table>
        {components.length===0? <p style={S.sub}>Sin piezas. Inicia una sesión y agrega piezas.</p> : null}
      </div> : null}
    </div>);

  async function agregarPieza(sessionId){
    var name=window.prompt('Nombre de la pieza:'); if(!name)return;
    var pn=window.prompt('Número de parte (opcional):')||'';
    var qty=Number(window.prompt('Cantidad:')||1);
    var cond=window.prompt('Condición (new/used/damaged):')||'used';
    var dest=window.prompt('Destino (stock/warranty/scrap/customer):')||'stock';
    await supabase.from('extracted_components').insert([{session_id:sessionId,name:name,part_number:pn,quantity:qty,condition:cond,destination:dest}]);
    avisar('✅ Pieza agregada',T.ok); cargar();
  }

  async function evaluar(componentId){
    var tech=window.prompt('Condición técnica (ej: funcional, desgaste normal, dañado):')||'';
    var grade=window.prompt('Grado (A/B/C):')||'B';
    var test=window.prompt('Resultado prueba (pass/fail/pending):')||'pending';
    var notes=window.prompt('Notas:')||'';
    var e=await supabase.from('component_evaluations').insert([{component_id:componentId,evaluator_id:null,technical_condition:tech,grade:grade,test_result:test,safety_approved:false,notes:notes}]).select();
    if(e.data&&e.data[0]){
      var val=window.confirm('¿Crear valoración económica?');
      if(val){
        var ref=Number(window.prompt('Precio de referencia nuevo ($):')||0);
        var mkt=Number(window.prompt('Precio usado mercado ($):')||0);
        var sug=Math.round(mkt*0.7);
        await supabase.from('component_valuations').insert([{evaluation_id:e.data[0].id,valuation_method:'market',reference_new_price:ref,market_used_price:mkt,suggested_value:sug,approved_value:sug}]);
      }
    }
    avisar('✅ Evaluación registrada',T.ok); cargar();
  }
}
