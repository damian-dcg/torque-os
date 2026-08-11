'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S, estColor, fmtCLP, fmtFecha } from '../ui';
import Mapa from './Mapa';
import HistorialActivo from './HistorialActivo';
import DiagnosticoPresupuesto from './DiagnosticoPresupuesto';
import { geocode } from './geo';

export default function FichaOT(props){
  var ot=props.ot; var cust=props.cust||{}; var avisar=props.avisar||function(){};
  var onClose=props.onClose; var onChanged=props.onChanged||function(){};
  var c=cust[ot.customer_id]||{};
  var dp=ot.datos_portal||{};
  var s1=useState([]),ins=s1[0],setIns=s1[1];
  var s2=useState([]),evs=s2[0],setEvs=s2[1];
  var s3=useState([]),users=s3[0],setUsers=s3[1];
  var s4=useState([]),sats=s4[0],setSats=s4[1];
  var s5=useState({tipo:'',id:''}),asig=s5[0],setAsig=s5[1];
  var s6=useState(ot.fecha_programada||''),fecha=s6[0],setFecha=s6[1];
  var s9=useState(ot.modalidad||'taller'),modalidad=s9[0],setModalidad=s9[1];
  var s10=useState(ot.costo_traslado||0),traslado=s10[0],setTraslado=s10[1];
  var s7=useState(false),mapOpen=s7[0],setMapOpen=s7[1];
  var s8=useState([]),mapMk=s8[0],setMapMk=s8[1];
  useEffect(function(){
    (async function(){
      var r=await Promise.all([
        supabase.from('insistencias').select('*').eq('ot_id',ot.id).order('id',{ascending:false}),
        supabase.from('ot_events').select('*').eq('ot_id',ot.id).order('created_at',{ascending:false}),
        supabase.from('users').select('id,nombre,rol'),
        supabase.from('companies').select('id,nombre,activo').eq('tipo','sat')
      ]);
      setIns(r[0].data||[]); setEvs(r[1].data||[]); setUsers(r[2].data||[]);
      setSats((r[3].data||[]).filter(function(x){ return x.activo; }));
    })();
  },[ot.id]);
  function nombreAsignado(){
    if(ot.asignado_user_id){ var u=users.find(function(x){ return x.id===ot.asignado_user_id; }); return u?u.nombre:'Téc #'+ot.asignado_user_id; }
    if(ot.asignado_company_id){ var s=sats.find(function(x){ return x.id===ot.asignado_company_id; }); return s?s.nombre:'SSTT #'+ot.asignado_company_id; }
    return null;
  }
  async function cambiar(estado){
    var d=await supabase.rpc('cambiar_estado_ot',{p_ot_id:ot.id,p_estado:estado});
    if(d.error) avisar('⛗ '+d.error.message,T.danger);
    else { avisar('✅ Estado: '+estado,T.ok); onChanged(); onClose(); }
  }
  async function asignar(){
    if(!asig.id){ avisar('⛗ Elige técnico o SSTT',T.danger); return; }
    var patch={estado:'Asignada'};
    if(asig.tipo==='tec') patch.asignado_user_id=Number(asig.id); else patch.asignado_company_id=Number(asig.id);
    if(fecha) patch.fecha_programada=fecha;
    var e=await supabase.from('work_orders').update(patch).eq('id',ot.id);
    if(e.error) avisar('⛗ '+e.error.message,T.danger);
    else { avisar('✅ OT asignada a '+(asig.tipo==='tec'?'técnico':'SSTT'),T.ok); onChanged(); onClose(); }
  }
  async function programar(){
    if(!fecha){ avisar('⛗ Elige fecha',T.danger); return; }
    var e=await supabase.from('work_orders').update({fecha_programada:fecha}).eq('id',ot.id);
    if(e.error) avisar('⛗ '+e.error.message,T.danger); else { avisar('✅ Programada al '+fecha,T.ok); onChanged(); }
  }
  async function verMapa(){
    var dir=ot.direccion||c.direccion||'';
    if(!dir){ avisar('⛗ Sin dirección',T.danger); return; }
    var g=await geocode(dir);
    setMapMk(g?[{lat:g.lat,lng:g.lng,popup:dir}]:[]);
    setMapOpen(true);
  }
  function gmail(){
    window.open('https://mail.google.com/mail/?view=cm&fs=1&to='+(c.email||'')+'&su='+encodeURIComponent('OT-'+ot.ot_number+' · Bianchi Servicio Técnico')+'&body='+encodeURIComponent('Hola '+(c.nombre||'')+',\nSu orden OT-'+ot.ot_number+' ('+ot.tipo+') se encuentra en estado: '+ot.estado+'.\nLe contactaremos a la brevedad.'),'_blank');
  }
  function pdf(){
    var w=window.open('','_blank');
    var html='<html><head><title>OT-'+ot.ot_number+'</title><style>body{font-family:Arial;padding:24px;color:#111}table{width:100%;border-collapse:collapse;margin:10px 0}td,th{border:1px solid #ccc;padding:6px;font-size:12px;text-align:left}</style></head><body>'
      +'<h2>OT-'+ot.ot_number+' · '+ot.tipo+' · '+ot.estado+'</h2>'
      +'<table><tr><th>Cliente</th><td>'+(c.nombre||'')+'</td><th>RUT</th><td>'+(c.rut||'')+'</td></tr>'
      +'<tr><th>Teléfono</th><td>'+(c.telefono||'')+'</td><th>Dirección</th><td>'+(ot.direccion||c.direccion||'')+'</td></tr>'
      +'<tr><th>Producto</th><td>'+(dp.producto||'')+' '+(dp.modelo||'')+'</td><th>Boleta</th><td>'+(dp.boleta||'')+'</td></tr>'
      +'<tr><th>Asignado a</th><td>'+(nombreAsignado()||'—')+'</td><th>Fecha</th><td>'+(ot.fecha_programada||'—')+'</td></tr></table>'
      +'<p>'+ (ot.descripcion||'') +'</p><script>window.print()</script></body></html>';
    w.document.write(html); w.document.close();
  }
  var abierta=['Ingresada','Asignada','Aceptada','En Ruta','Llegada','Trabajando','Esperando Repuesto'].indexOf(ot.estado)>=0;
  return (
    <div style={S.modal} onClick={onClose}>
      <div style={{...S.modalCard,maxWidth:780,maxHeight:'88vh',overflow:'auto'}} onClick={function(e){ e.stopPropagation(); }}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h2 style={{...S.h2,color:T.brand,margin:0}}>{ot.ext_id||('OT-'+ot.ot_number)}</h2>
          <span style={S.pill(estColor(ot.estado))}>{ot.estado}</span>
        </div>
        <p style={{...S.sub,margin:'6px 0'}}>{c.nombre||'—'} · {ot.tipo} · {fmtFecha(ot.created_at)} · canal {ot.canal}</p>
        <p style={{...S.sub,margin:'0 0 6px'}}>Asignada a: <b>{nombreAsignado()||'— sin asignar —'}</b> · Fecha programada: <b>{ot.fecha_programada||'—'}</b></p>

        <div style={{background:T.surface2,borderRadius:10,padding:12,marginBottom:12}}>
          <h3 style={{...S.h2,margin:'0 0 6px'}}>Cliente</h3>
          <p style={{margin:'2px 0',fontSize:14}}>{c.nombre} · RUT {c.rut||'—'}</p>
          <p style={{margin:'2px 0',fontSize:14}}>{c.telefono} · {c.email}</p>
          <p style={{margin:'2px 0',fontSize:14}}>{ot.direccion||c.direccion}</p>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:6}}>
            <a style={{...S.btnO(T.info),width:'auto',marginBottom:0,textDecoration:'none'}} href={'tel:'+String(c.telefono||'').replace(/[^\d+]/g,'')}>📞 Llamar</a>
            <a style={{...S.btnO(T.ok),width:'auto',marginBottom:0,textDecoration:'none'}} href={'https://wa.me/'+String(c.telefono||'').replace(/[^\d+]/g,'')} target="_blank">💬 WhatsApp</a>
            <button style={{...S.btnO(T.warn),width:'auto',marginBottom:0}} onClick={verMapa}>🗺 Mapa</button>
          </div>
        </div>

        <div style={{background:T.surface2,borderRadius:10,padding:12,marginBottom:12}}>
          <h3 style={{...S.h2,margin:'0 0 6px'}}>Producto y compra</h3>
          <p style={{margin:'2px 0',fontSize:14}}><b>{dp.producto||'—'}</b> · {dp.modelo||ot.modelo_limpio||'—'}</p>
          <p style={{margin:'2px 0',fontSize:14}}>Boleta {dp.boleta||'—'} · Compra {dp.fecha_compra||'—'} · Tienda {dp.tienda||'—'}</p>
          {dp.boleta_url? <a style={{...S.btnO(T.violet),width:'auto',marginBottom:0,textDecoration:'none'}} href={dp.boleta_url} target="_blank">🧾 Ver boleta adjunta</a> : <p style={{...S.sub,margin:'4px 0'}}>Sin boleta adjunta.</p>}
        </div>

        <HistorialActivo customer_id={ot.customer_id} ot_id={ot.id}/>
        <DiagnosticoPresupuesto ot={ot} avisar={avisar} onChanged={onChanged}/>
        
        <div style={{background:T.surface2,borderRadius:10,padding:12,marginBottom:12}}>
          <h3 style={{...S.h2,margin:'0 0 6px'}}>Gestión</h3>
          {abierta? <div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:8}}>
              <select style={{...S.input,flex:2,marginBottom:0}} value={asig.tipo+':'+asig.id} onChange={function(e){ var v=(e.target.value||':').split(':'); setAsig({tipo:v[0],id:v[1]}); }}>
                <option value="">Asignar a…</option>
                <optgroup label="Técnicos internos">{users.map(function(u){ return <option key={'t'+u.id} value={'tec:'+u.id}>{u.nombre}</option>; })}</optgroup>
                <optgroup label="SSTT autorizados">{sats.map(function(s){ return <option key={'s'+s.id} value={'sat:'+s.id}>{s.nombre}</option>; })}</optgroup>
              </select>
              <input style={{...S.input,flex:1,marginBottom:0}} type="date" value={fecha} onChange={function(e){ setFecha(e.target.value); }}/>
              <button style={{...S.btn(T.brand),width:'auto',marginBottom:0}} onClick={asignar}>Asignar</button>
            </div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              <button style={{...S.btnO(T.info),width:'auto',marginBottom:0}} onClick={programar}>📅 Programar fecha</button>
              {ot.estado==='Revisión QA'? <button style={{...S.btn(T.ok),width:'auto',marginBottom:0}} onClick={function(){ cambiar('Cerrada'); }}>✔ Aprobar y cerrar</button> : null}
              {ot.estado==='Revisión QA'? <button style={{...S.btnO(T.warn),width:'auto',marginBottom:0}} onClick={function(){ cambiar('Trabajando'); }}>↩ Devolver</button> : null}
              <button style={{...S.btnO(T.danger),width:'auto',marginBottom:0}} onClick={function(){ if(window.confirm('¿Anular OT?')) cambiar('Anulada'); }}>Anular</button>
            </div>
          </div> : <p style={{...S.sub,margin:0}}>OT en estado {ot.estado} (sin acciones de asignación).</p>}
        </div>

        <div style={{marginBottom:12}}>
          <h3 style={S.h2}>Insistencias del cliente ({ins.length})</h3>
          {ins.map(function(i){ return <p key={i.id} style={{fontSize:13,margin:'4px 0'}}>• {fmtFecha(i.created_at)} — {i.mensaje}</p>; })}
          {ins.length===0? <p style={S.sub}>Sin insistencias.</p> : null}
        </div>
        <div style={{marginBottom:12}}>
          <h3 style={S.h2}>Bitácora ({evs.length})</h3>
          {evs.slice(0,12).map(function(e){ return <p key={e.id} style={{...S.sub,margin:'3px 0'}}>{fmtFecha(e.created_at)} · {e.evento}</p>; })}
          {evs.length===0? <p style={S.sub}>Sin movimientos.</p> : null}
        </div>

        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <button style={{...S.btnO(T.info),width:'auto',marginBottom:0}} onClick={pdf}>📄 PDF</button>
          <button style={{...S.btnO(T.warn),width:'auto',marginBottom:0}} onClick={gmail}>✉ Gmail</button>
          <button style={{...S.btn(T.muted),flex:1,marginBottom:0}} onClick={onClose}>Cerrar</button>
        </div>
      </div>
      {mapOpen? <div style={S.modal} onClick={function(){ setMapOpen(false); }}><div style={{...S.modalCard,maxWidth:700}} onClick={function(e){ e.stopPropagation(); }}><h3 style={S.h2}>Ubicación</h3><Mapa markers={mapMk}/><button style={S.btn(T.muted)} onClick={function(){ setMapOpen(false); }}>Cerrar</button></div></div> : null}
    </div>);
}
