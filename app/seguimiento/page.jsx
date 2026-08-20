'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

var wrap={minHeight:'100vh',background:'#F4F6F8',fontFamily:"'Segoe UI',system-ui,Arial,sans-serif",display:'flex',flexDirection:'column'};
var header={background:'#141414',padding:'16px 22px'};
var mainS={flex:1,width:'100%',maxWidth:720,margin:'0 auto',padding:'30px 18px',boxSizing:'border-box'};
var h1={textAlign:'center',fontSize:26,fontWeight:900,color:'#141414',margin:'6px 0 6px'};
var sub={textAlign:'center',color:'#5A6470',fontSize:14,margin:'0 0 22px'};
var inp={width:'100%',boxSizing:'border-box',padding:'12px 18px',borderRadius:999,border:'1px solid #C9CFD6',background:'#fff',fontSize:15,marginBottom:13,color:'#141414',outline:'none',textTransform:'uppercase'};
var btn={display:'inline-block',background:'#3EC6B2',color:'#fff',border:0,borderRadius:999,padding:'13px 26px',fontWeight:800,fontSize:15,cursor:'pointer',marginBottom:10};
var btnSec={display:'inline-block',background:'#fff',color:'#0E8074',border:'2px solid #0E8074',borderRadius:999,padding:'9px 18px',fontWeight:800,fontSize:13,cursor:'pointer'};
var card={background:'#fff',border:'1px solid #D5DAE0',borderRadius:16,padding:'16px 18px',marginBottom:12};
var footer={background:'#141414',color:'#fff',textAlign:'center',padding:'20px 12px 28px'};
function estColor(e){ return {'Ingresada':'#1D4ED8','Asignada':'#1D4ED8','Trabajando':'#B45309','Esperando Repuesto':'#B91C1C','Cerrada':'#15803D','Anulada':'#4A5866'}[e]||'#4A5866'; }

export default function Seguimiento(){
  var [q,setQ]=useState(''); var [ots,setOts]=useState(null); var [err,setErr]=useState(''); var [ok,setOk]=useState('');
  var [insOt,setInsOt]=useState(null); var [msg,setMsg]=useState('');
  useEffect(function(){
    var p=new URLSearchParams(window.location.search).get('q');
    if(p){ setQ(p); buscarCon(p); }
  },[]);
  async function buscarCon(t){
    setErr(''); setOk(''); setOts(null);
    var rows=[];
    var isRut=/^[0-9K\.\-]+$/i.test(t);
    if(isRut){
      var c=await supabase.from('customers').select('id').ilike('rut',t.replace(/\./g,'')).limit(5);
      var ids=(c.data||[]).map(function(x){ return x.id; });
      if(ids.length){ var o=await supabase.from('work_orders').select('*').in('customer_id',ids).order('id',{ascending:false}).limit(20); rows=o.data||[]; }
    } else {
      var o2=await supabase.from('work_orders').select('*').or('ext_id.ilike."%'+t+'%",ot_number.ilike."%'+t+'%"').order('id',{ascending:false}).limit(20);
      rows=o2.data||[];
    }
    if(!rows.length){ setErr('NO ENCONTRAMOS SOLICITUDES CON ESE DATO.'); return; }
    setOts(rows);
  }
  function buscar(){ var t=q.trim(); if(!t){ setErr('INGRESA TU RUT O N° DE ORDEN.'); return; } buscarCon(t); }
  async function insistir(ot){
    if(!msg.trim()){ setErr('ESCRIBE UN MENSAJE PARA INSISTIR.'); return; }
    var e=await supabase.from('insistencias').insert([{ot_id:ot.id,mensaje:msg.trim()}]);
    if(e.error){ setErr('ERROR: '+e.error.message); return; }
    setInsOt(null); setMsg(''); setErr('');
    setOk('✔ TU INSISTENCIA FUE ENVIADA AL BUZÓN DEL AGENTE. TE CONTACTARÁN A LA BREVEDAD.');
  }
  return (
    <div style={wrap}>
      <div style={header}><span style={{color:'#fff',fontWeight:900,fontSize:24,letterSpacing:1}}>BIANCHI</span></div>
      <div style={mainS}>
        <h1 style={h1}>SEGUIMIENTO DE MI CASO</h1>
        <p style={sub}>INGRESA TU RUT O N° DE ORDEN PARA REVISAR EL ESTADO, O PRESIONA INSISTIR SI NECESITAS UNA RESPUESTA.</p>
        <div style={{display:'flex',gap:8}}>
          <input style={Object.assign({},inp,{marginBottom:0,flex:1})} placeholder="RUT O N° ORDEN (EJ: S_01234)" value={q} onChange={function(e){ setQ(e.target.value); }}/>
          <button style={btn} onClick={buscar}>BUSCAR</button>
        </div>
        {err? <p style={{color:'#B91C1C',fontWeight:800,fontSize:14,marginTop:12}}>{err}</p> : null}
        {ok? <p style={{color:'#0E8074',fontWeight:800,fontSize:14,marginTop:12}}>{ok}</p> : null}
        <div style={{marginTop:18}}>
          {(ots||[]).map(function(o){
            return (
              <div key={o.id} style={card}>
                <div style={{display:'flex',justifyContent:'space-between',gap:8,flexWrap:'wrap',alignItems:'center'}}>
                  <b style={{fontSize:16}}>{o.ext_id||o.ot_number} · {o.tipo}</b>
                  <span style={{background:estColor(o.estado)+'1A',color:estColor(o.estado),borderRadius:999,padding:'4px 12px',fontWeight:800,fontSize:12}}>{o.estado}</span>
                </div>
                <p style={{fontSize:13,color:'#5A6470',margin:'8px 0 4px'}}>INGRESO: {String(o.created_at||'').slice(0,10)} · PROMESA: {o.fecha_promesa||'—'} · PROGRAMADA: {o.fecha_programada||'—'}</p>
                <p style={{fontSize:13,color:'#5A6470',margin:'0 0 10px'}}>EQUIPO: {o.tipo_equipo||'—'} · MODELO: {o.modelo||'—'} · ATIENDE: {o.tecnico_nombre||'POR ASIGNAR'}</p>
                {insOt===o.id? <div>
                  <textarea style={Object.assign({},inp,{borderRadius:14,minHeight:70})} placeholder="ESCRIBE TU MENSAJE…" value={msg} onChange={function(e){ setMsg(e.target.value); }}/>
                  <button style={btn} onClick={function(){ insistir(o); }}>ENVIAR INSISTENCIA</button>
                  <button style={btnSec} onClick={function(){ setInsOt(null); setMsg(''); }}>CANCELAR</button>
                </div> : <button style={btnSec} onClick={function(){ setInsOt(o.id); setOk(''); }}>✋ INSISTIR EN MI CASO</button>}
              </div>
            );
          })}
        </div>
      </div>
      <div style={footer}><p style={{margin:'0 0 6px',fontWeight:800,fontSize:15}}>NO TE PIERDAS LAS NOVEDADES</p><p style={{margin:0,fontSize:12,color:'#9fb3af'}}>© 2026 BIANCHI STORE.</p></div>
    </div>
  );
}
