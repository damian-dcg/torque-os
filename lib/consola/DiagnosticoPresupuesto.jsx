'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S, fmtCLP } from '../ui';
var CAUSAS=['Fabricación','Armado','Transporte','Mal uso','Desgaste normal','Falta mantenimiento','Instalación incorrecta','Otro'];
var FALLAS=['Mecánica','Eléctrica','Electrónica','Software','Desgaste','Fabricación','Transporte','Otro'];
export default function DiagnosticoPresupuesto(props){
  var ot=props.ot; var avisar=props.avisar||function(){}; var onChanged=props.onChanged||function(){};
  var d=ot.diagnostico||{};
  var s1=useState({tecnico:d.tecnico||'',causa:d.causa||'',falla:d.falla||''}),diag=s1[0],setDiag=s1[1];
  var s2=useState([{concepto:'',cantidad:1,precio:0}]),items=s2[0],setItems=s2[1];
  var s3=useState(null),pres=s3[0],setPres=s3[1];
  var s4=useState(''),vig=s4[0],setVig=s4[1];
  var s5=useState([]),paqs=s5[0],setPaqs=s5[1];
  var s6=useState(''),paq=s6[0],setPaq=s6[1];
  useEffect(function(){
    (async function(){
      var r=await supabase.from('presupuestos').select('*').eq('ot_id',ot.id).limit(1);
      var p=(r.data||[])[0]||null; setPres(p);
      if(p&&p.items&&p.items.length) setItems(p.items);
      if(p&&p.vigencia) setVig(p.vigencia);
      var rp=await supabase.from('paquetes').select('*');
      setPaqs(rp.data||[]);
    })();
  },[ot.id]);
  var total=items.reduce(function(s,x){ return s+(Number(x.cantidad)||0)*(Number(x.precio)||0); },0);
  function cargarPaquete(){
    var p=paqs.find(function(x){ return String(x.id)===paq; });
    if(!p){ avisar('⛗ Elige un paquete',T.danger); return; }
    var lines=[{concepto:'PAQUETE: '+p.nombre+' ('+p.horas+' h)',cantidad:1,precio:p.precio}];
    (p.tareas||[]).forEach(function(t){ lines.push({concepto:'  · '+t.t,cantidad:1,precio:0}); });
    setItems(lines);
    avisar('✅ Paquete cargado: '+fmtCLP(p.precio),T.ok);
  }
  async function guardarDiag(){ var e=await supabase.from('work_orders').update({diagnostico:diag}).eq('id',ot.id); if(e.error) avisar('⛗ '+e.error.message,T.danger); else { avisar('✅ Diagnóstico guardado',T.ok); onChanged(); } }
  async function guardarPres(){
    var p=paqs.find(function(x){ return String(x.id)===paq; });
    var payload={ot_id:ot.id,customer_id:ot.customer_id,items:items.filter(function(x){return x.concepto;}),total:total,vigencia:vig||null,paquete_id:p?p.id:null};
    if(pres) await supabase.from('presupuestos').update(payload).eq('id',pres.id); else await supabase.from('presupuestos').insert([payload]);
    avisar('✅ Presupuesto guardado',T.ok); onChanged();
    var r=await supabase.from('presupuestos').select('*').eq('ot_id',ot.id).limit(1); setPres((r.data||[])[0]||null);
  }
  function enviar(){ window.open('https://wa.me/?text='+encodeURIComponent('Presupuesto OT-'+ot.ot_number+' por '+fmtCLP(total)+'. ¿Aprueba el servicio? Responda SI/NO.'),'_blank'); if(pres) supabase.from('presupuestos').update({estado:'enviado'}).eq('id',pres.id); avisar('📤 Enviado a aprobación',T.info); }
  async function resolver(e){ await supabase.from('presupuestos').update({estado:e}).eq('id',pres.id); avisar('✅ Presupuesto '+e,T.ok); onChanged(); }
  return (
    <div style={{background:T.surface2,borderRadius:10,padding:12,marginBottom:12}}>
      <h3 style={{...S.h2,margin:'0 0 6px'}}>🩺 Diagnóstico técnico</h3>
      <textarea style={{...S.input,minHeight:60}} placeholder="Diagnóstico / problema detectado" value={diag.tecnico} onChange={function(e){ setDiag({tecnico:e.target.value,causa:diag.causa,falla:diag.falla}); }}/>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <select style={{...S.input,flex:1,marginBottom:0}} value={diag.causa} onChange={function(e){ setDiag({tecnico:diag.tecnico,causa:e.target.value,falla:diag.falla}); }}><option value="">Causa raíz…</option>{CAUSAS.map(function(c){ return <option key={c}>{c}</option>; })}</select>
        <select style={{...S.input,flex:1,marginBottom:0}} value={diag.falla} onChange={function(e){ setDiag({tecnico:diag.tecnico,causa:diag.causa,falla:e.target.value}); }}><option value="">Tipo falla…</option>{FALLAS.map(function(c){ return <option key={c}>{c}</option>; })}</select>
        <button style={{...S.btnO(T.info),width:'auto',marginBottom:0}} onClick={guardarDiag}>Guardar</button>
      </div>
      <h3 style={{...S.h2,margin:'12px 0 6px'}}>💰 Presupuesto (nace del diagnóstico / paquete)</h3>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:8}}>
        <select style={{...S.input,flex:2,marginBottom:0}} value={paq} onChange={function(e){ setPaq(e.target.value); }}><option value="">Usar paquete de servicio…</option>{paqs.map(function(p){ return <option key={p.id} value={p.id}>{p.nombre} · {fmtCLP(p.precio)} · {p.horas}h</option>; })}</select>
        <button style={{...S.btnO(T.brand),width:'auto',marginBottom:0}} onClick={cargarPaquete}>⚡ Cargar</button>
      </div>
      {items.map(function(it,i){ return <div key={i} style={{display:'flex',gap:6,marginBottom:6}}>
        <input style={{...S.input,flex:2,marginBottom:0}} placeholder="Concepto" value={it.concepto} onChange={function(e){ var c=items.slice(); c[i]={concepto:e.target.value,cantidad:it.cantidad,precio:it.precio}; setItems(c); }}/>
        <input style={{...S.input,width:70,marginBottom:0}} type="number" value={it.cantidad} onChange={function(e){ var c=items.slice(); c[i]={concepto:it.concepto,cantidad:e.target.value,precio:it.precio}; setItems(c); }}/>
        <input style={{...S.input,width:110,marginBottom:0}} type="number" placeholder="$" value={it.precio} onChange={function(e){ var c=items.slice(); c[i]={concepto:it.concepto,cantidad:it.cantidad,precio:e.target.value}; setItems(c); }}/>
      </div>; })}
      <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
        <button style={{...S.btnO(T.info),width:'auto',marginBottom:0}} onClick={function(){ setItems(items.concat([{concepto:'',cantidad:1,precio:0}])); }}>+ Ítem</button>
        <b style={{color:T.ok}}>Total {fmtCLP(total)}</b>
        <input style={{...S.input,width:160,marginBottom:0}} type="date" value={vig} onChange={function(e){ setVig(e.target.value); }} title="Vigencia"/>
        {pres&&pres.vigencia&&new Date(pres.vigencia)<new Date()&&pres.estado!=='aceptado'? <span style={S.pill(T.danger)}>EXPIRADO</span> : null}
        <button style={{...S.btn(T.brand),width:'auto',marginBottom:0}} onClick={guardarPres}>Guardar</button>
        <button style={{...S.btnO(T.warn),width:'auto',marginBottom:0}} onClick={enviar}>📤 Enviar aprobación</button>
      </div>
      {pres? <div style={{marginTop:8,display:'flex',gap:8,alignItems:'center'}}>
        <span style={S.pill(pres.estado==='aceptado'?T.ok:pres.estado==='rechazado'?T.danger:T.warn)}>{pres.estado}</span>
        {pres.estado!=='aceptado'&&pres.estado!=='rechazado'? <div style={{display:'flex',gap:6}}><button style={{...S.btnO(T.ok),width:'auto',marginBottom:0}} onClick={function(){ resolver('aceptado'); }}>✔ Cliente aprobó</button><button style={{...S.btnO(T.danger),width:'auto',marginBottom:0}} onClick={function(){ resolver('rechazado'); }}>✘ Rechazado</button></div> : null}
      </div> : null}
    </div>);
}
