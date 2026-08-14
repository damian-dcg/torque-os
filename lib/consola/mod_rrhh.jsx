'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S, fmtCLP } from '../ui';
export default function ModRrhh(props){
  var avisar=props.avisar||function(){};
  var [shifts,setShifts]=useState([]); var [att,setAtt]=useState([]); var [train,setTrain]=useState([]);
  var [ots,setOts]=useState([]); var [rates,setRates]=useState({});
  var [tab,setTab]=useState('productividad');
  async function cargar(){
    var r=await Promise.all([
      supabase.from('shifts').select('*').order('id',{ascending:false}).limit(200),
      supabase.from('attendance').select('*').order('id',{ascending:false}).limit(300),
      supabase.from('training_records').select('*').order('id',{ascending:false}),
      supabase.from('work_orders').select('*').limit(2000),
      supabase.from('tech_rates').select('*')
    ]);
    setShifts(r[0].data||[]); setAtt(r[1].data||[]); setTrain(r[2].data||[]); setOts(r[3].data||[]);
    var m={}; (r[4].data||[]).forEach(function(x){ m[x.technician]=x; }); setRates(m);
  }
  useEffect(function(){ cargar(); },[]);
  function horasTrabajadas(name){
    var rows=att.filter(function(a){return a.user_name===name&&a.check_in&&a.check_out;});
    return rows.reduce(function(s,a){ return s+(new Date(a.check_out)-new Date(a.check_in))/3600000; },0);
  }
  function horasFacturables(name){
    return ots.filter(function(o){return o.tecnico_nombre===name&&o.estado==='Cerrada';})
      .reduce(function(s,o){ return s+Number((o.kpi||{}).horas||0); },0);
  }
  function margenDe(name){
    return ots.filter(function(o){return o.tecnico_nombre===name&&o.estado==='Cerrada';})
      .reduce(function(s,o){ return s+Number((o.kpi||{}).margen||0); },0);
  }
  var tecnicos=Object.keys(rates).filter(function(k){return rates[k]&&Number(rates[k].venta_x_hora)>0;});
  async function marcar(name,tipo){
    var now=new Date();
    if(tipo==='in') await supabase.from('attendance').insert([{user_name:name,date:now.toISOString().slice(0,10),check_in:now.toISOString()}]);
    else { var ex=await supabase.from('attendance').select('*').eq('user_name',name).order('id',{ascending:false}).limit(1);
      if(ex.data&&ex.data[0]&&!ex.data[0].check_out) await supabase.from('attendance').update({check_out:now.toISOString()}).eq('id',ex.data[0].id); }
    avisar('✅ Marcado',T.ok); cargar();
  }
  async function nuevoTurno(){
    var name=window.prompt('Técnico:'); if(!name)return;
    var date=window.prompt('Fecha (YYYY-MM-DD):')||new Date().toISOString().slice(0,10);
    var st=window.prompt('Inicio (HH:MM):','09:00')||'09:00';
    var en=window.prompt('Fin (HH:MM):','18:00')||'18:00';
    await supabase.from('shifts').insert([{user_name:name,date:date,start_time:st,end_time:en}]);
    avisar('✅ Turno creado',T.ok); cargar();
  }
  async function nuevaCapacitacion(){
    var name=window.prompt('Técnico:'); if(!name)return;
    var course=window.prompt('Curso/certificación:'); if(!course)return;
    var exp=window.prompt('Vence (YYYY-MM-DD):')||null;
    await supabase.from('training_records').insert([{user_name:name,course:course,completed_at:new Date().toISOString().slice(0,10),expires_at:exp}]);
    avisar('✅ Capacitación registrada',T.ok); cargar();
  }
  return (
    <div>
      <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
        {['productividad','turnos','asistencia','capacitacion'].map(function(t){
          return <button key={t} onClick={function(){ setTab(t); }} style={{padding:'8px 14px',borderRadius:999,border:tab===t?'0':'1px solid '+T.border,background:tab===t?T.brand:'transparent',color:tab===t?'#fff':T.text,fontWeight:600,fontSize:13,cursor:'pointer'}}>{t}</button>;
        })}
      </div>
      {tab==='productividad'? <div style={S.card}>
        <h2 style={S.h2}>Productividad y comisiones</h2>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr><th style={S.th}>Técnico</th><th style={S.th}>Hs trabajadas</th><th style={S.th}>Hs facturables</th><th style={S.th}>Productividad</th><th style={S.th}>Margen</th><th style={S.th}>Comisión (10%)</th></tr></thead>
          <tbody>{tecnicos.map(function(t){
            var tw=horasTrabajadas(t); var fb=horasFacturables(t); var mg=margenDe(t);
            var prod=tw>0?Math.round(fb/tw*100):0;
            return <tr key={t}>
              <td style={S.td}>{t}</td><td style={S.td}>{tw.toFixed(1)}</td><td style={S.td}>{fb.toFixed(1)}</td>
              <td style={{...S.td,color:prod>=70?T.ok:prod>=40?T.warn:T.danger}}>{prod}%</td>
              <td style={S.td}>{fmtCLP(mg)}</td><td style={S.td}>{fmtCLP(Math.round(mg*0.10))}</td>
            </tr>; })}</tbody>
        </table>
      </div> : null}
      {tab==='turnos'? <div style={S.card}>
        <div style={{display:'flex',justifyContent:'space-between',gap:8,marginBottom:10}}>
          <h2 style={S.h2}>Turnos ({shifts.length})</h2>
          <button style={{...S.btn(T.brand),width:'auto',marginBottom:0}} onClick={nuevoTurno}>+ Turno</button>
        </div>
        {shifts.map(function(s){ return <p key={s.id} style={{fontSize:13,margin:'4px 0'}}>{s.date} · {s.user_name} · {s.start_time}–{s.end_time} · {s.type}</p>; })}
        {shifts.length===0? <p style={S.sub}>Sin turnos.</p> : null}
      </div> : null}
      {tab==='asistencia'? <div style={S.card}>
        <h2 style={S.h2}>Asistencia</h2>
        <div style={{display:'flex',gap:6,marginBottom:10,flexWrap:'wrap'}}>
          {tecnicos.map(function(t){ return <span key={t} style={{display:'inline-flex',gap:4,alignItems:'center'}}>
            <b style={{fontSize:12}}>{t}</b>
            <button style={{...S.btnO(T.ok),width:'auto',marginBottom:0,fontSize:11,padding:'3px 8px'}} onClick={function(){ marcar(t,'in'); }}>Entrada</button>
            <button style={{...S.btnO(T.danger),width:'auto',marginBottom:0,fontSize:11,padding:'3px 8px'}} onClick={function(){ marcar(t,'out'); }}>Salida</button>
          </span>; })}
        </div>
        {att.slice(0,50).map(function(a){ return <p key={a.id} style={{fontSize:12,margin:'3px 0'}}>{a.date} · {a.user_name} · in {a.check_in?new Date(a.check_in).toLocaleTimeString('es-CL'):'—'} · out {a.check_out?new Date(a.check_out).toLocaleTimeString('es-CL'):'—'}</p>; })}
      </div> : null}
      {tab==='capacitacion'? <div style={S.card}>
        <div style={{display:'flex',justifyContent:'space-between',gap:8,marginBottom:10}}>
          <h2 style={S.h2}>Capacitación ({train.length})</h2>
          <button style={{...S.btn(T.brand),width:'auto',marginBottom:0}} onClick={nuevaCapacitacion}>+ Curso</button>
        </div>
        {train.map(function(t){ var exp=t.expires_at&&new Date(t.expires_at)<new Date();
          return <p key={t.id} style={{fontSize:13,margin:'4px 0'}}>{t.user_name} · {t.course} · <span style={{color:exp?T.danger:T.ok}}>{exp?'VENCIDO':'vigente'}</span></p>; })}
        {train.length===0? <p style={S.sub}>Sin capacitaciones.</p> : null}
      </div> : null}
    </div>);
}
