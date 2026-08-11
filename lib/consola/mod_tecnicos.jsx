'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S, fmtCLP } from '../ui';
import TablaPro from './TablaPro';
import Mapa from './Mapa';
import { geocode } from './geo';
var EQUIPOS=['BICICLETA','BICICLETA ELECTRICA','MAQUINA','SCOOTER ELECTRICO','ACCESORIO'];
var VACIO={nombre:'',rut:'',contacto:'',telefono:'',email:'',region_id:'',comuna:'',address:'',especialidad:'ambos',trayecto:'CONSULTAR',cargo_fijo_mensual:0,cuenta_bancaria:''};
export default function ModTecnicos(props){
  var avisar=props.avisar||function(){};
  var s1=useState([]),users=s1[0],setUsers=s1[1];
  var s2=useState([]),sats=s2[0],setSats=s2[1];
  var s3=useState([]),servs=s3[0],setServs=s3[1];
  var s4=useState([]),rates=s4[0],setRates=s4[1];
  var s5=useState([]),regs=s5[0],setRegs=s5[1];
  var s6=useState(null),selSat=s6[0],setSelSat=s6[1];
  var s7=useState(false),showForm=s7[0],setShowForm=s7[1];
  var s8=useState(VACIO),form=s8[0],setForm=s8[1];
  var s9=useState(null),editId=s9[0],setEditId=s9[1];
  var s10=useState(false),mapOpen=s10[0],setMapOpen=s10[1];
  var s11=useState([]),mapMk=s11[0],setMapMk=s11[1];
  var s12=useState('BICICLETA'),eqTab=s12[0],setEqTab=s12[1];
  var s13=useState(''),q=s13[0],setQ=s13[1];
  async function cargar(){
    var r=await Promise.all([supabase.from('users').select('*').order('id'),supabase.from('companies').select('*').eq('tipo','sat'),supabase.from('service_types').select('*'),supabase.from('sat_rates').select('*'),supabase.from('regions').select('*')]);
    setUsers(r[0].data||[]); setSats(r[1].data||[]); setServs(r[2].data||[]); setRates(r[3].data||[]); setRegs(r[4].data||[]);
  }
  useEffect(function(){ cargar(); },[]);
  async function guardar(e){
    e.preventDefault();
    if(!form.nombre){ avisar('⛔ Nombre obligatorio',T.danger); return; }
    var payload={nombre:form.nombre,rut:form.rut,contacto:form.contacto,telefono:form.telefono,email:form.email,region_id:form.region_id?Number(form.region_id):null,comuna:form.comuna,address:form.address,especialidad:form.especialidad,trayecto:form.trayecto,cargo_fijo_mensual:Number(form.cargo_fijo_mensual)||0,cuenta_bancaria:form.cuenta_bancaria,tipo:'sat',estado:'autorizado'};
    if(editId){ await supabase.from('companies').update(payload).eq('id',editId); avisar('✅ SSTT actualizado',T.ok); }
    else { payload.activo=true; await supabase.from('companies').insert([payload]); avisar('✅ SSTT creado',T.ok); }
    setForm(VACIO); setEditId(null); setShowForm(false); cargar();
  }
  async function del(s){ if(!window.confirm('¿Eliminar '+s.nombre+'?')) return; await supabase.from('companies').delete().eq('id',s.id); cargar(); }
  async function toggle(s){ await supabase.from('companies').update({activo:!s.activo}).eq('id',s.id); cargar(); }
  async function geoDe(s){ if(s.geo) return s.geo; var dir=(s.address||'')+', '+(s.comuna||''); var g=await geocode(dir); if(g){ await supabase.from('companies').update({geo:g}).eq('id',s.id); } return g; }
  async function mapaGeneral(){
    var mk=[]; for(var i=0;i<sats.length;i++){ var s=sats[i]; if(!s.activo) continue; var g=await geoDe(s); if(g) mk.push({lat:g.lat,lng:g.lng,popup:'<b>'+s.nombre+'</b><br>'+(s.address||'')}); }
    setMapMk(mk); setMapOpen(true);
  }
  async function mapaUno(s){ var g=await geoDe(s); setMapMk(g?[{lat:g.lat,lng:g.lng,popup:'<b>'+s.nombre+'</b><br>'+(s.address||'')}]:[]); setMapOpen(true); }
  async function saveRate(sv,val){
    var ex=rates.find(function(r){ return r.sat_id===selSat.id&&r.service_type_id===sv.id&&(r.tipo_equipo||'')===eqTab; });
    if(ex) await supabase.from('sat_rates').update({tarifa:Number(val)||0}).eq('id',ex.id);
    else await supabase.from('sat_rates').insert([{sat_id:selSat.id,service_type_id:sv.id,tipo_equipo:eqTab,tarifa:Number(val)||0}]);
    cargar();
  }
  function pdfFicha(s){
    var w=window.open('','_blank');
    var filas=servs.map(function(sv){ return EQUIPOS.map(function(eq){ var r=rates.find(function(x){ return x.sat_id===s.id&&x.service_type_id===sv.id&&(x.tipo_equipo||'')===eq; }); return '<tr><td>'+sv.nombre+'</td><td>'+eq+'</td><td>'+fmtCLP(r?r.tarifa:0)+'</td></tr>'; }).join(''); }).join('');
    w.document.write('<html><head><title>Ficha SSTT</title><style>body{font-family:Arial;padding:24px;color:#111}h1{margin:0}table{width:100%;border-collapse:collapse;margin:10px 0}td,th{border:1px solid #ccc;padding:6px;font-size:12px;text-align:left}</style></head><body>'
      +'<h1>FICHA SERVICIO TÉCNICO AUTORIZADO</h1>'
      +'<table><tr><th>Nombre</th><td>'+s.nombre+'</td><th>RUT</th><td>'+(s.rut||'')+'</td></tr>'
      +'<tr><th>Contacto</th><td>'+(s.contacto||'')+'</td><th>Teléfono</th><td>'+(s.telefono||'')+'</td></tr>'
      +'<tr><th>Email</th><td>'+(s.email||'')+'</td><th>Región/Comuna</th><td>'+((regs.find(function(r){return r.id===s.region_id;})||{}).nombre||'')+' / '+(s.comuna||'')+'</td></tr>'
      +'<tr><th>Dirección</th><td>'+(s.address||'')+'</td><th>Especialidad</th><td>'+s.especialidad+'</td></tr>'
      +'<tr><th>Trayecto</th><td>'+s.trayecto+'</td><th>Cargo fijo</th><td>'+fmtCLP(s.cargo_fijo_mensual)+'</td></tr>'
      +'<tr><th>Cuenta bancaria</th><td colspan="3">'+(s.cuenta_bancaria||'')+'</td></tr></table>'
      +'<h3>Tarifario vigente (congelado anual)</h3><table><tr><th>Servicio</th><th>Tipo equipo</th><th>Tarifa</th></tr>'+filas+'</table>'
      +'<script>window.print()</script></body></html>');
    w.document.close();
  }
  var ordenados=sats.slice().sort(function(a,b){ return (b.activo?1:0)-(a.activo?1:0)||String(a.nombre).localeCompare(String(b.nombre)); });
  var vis=ordenados.filter(function(s){ var t=q.toLowerCase(); return !t||String(s.nombre).toLowerCase().indexOf(t)>=0; });
  return (
    <div>
      <TablaPro titulo="Técnicos internos (terreno)" rows={users}
        campos={[['nombre','Nombre'],['email','Correo'],['rol','Rol'],['especialidad','Especialidad'],['telefono','Teléfono']]}
        onEdit={function(r,k,v){ supabase.from('users').update({[k]:v}).eq('id',r.id).then(cargar); }}
        onAdd={function(f){ supabase.from('users').insert([{nombre:f.nombre,email:f.email,rol:f.rol||'tecnico_sat',especialidad:f.especialidad,telefono:f.telefono}]).then(function(e){ if(e.error)avisar('⛗ '+e.error.message,T.danger); else { avisar('✅ Técnico registrado. Crea su acceso en Supabase→Authentication y vincula el UID.',T.ok); cargar(); } }); }}
        addLabel="+ Técnico"/>
      <div style={S.card}>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:12}}>
          <h2 style={{...S.h2,margin:0,flex:1}}>Servicios Técnicos Autorizados (SSTT)</h2>
          <input style={{...S.input,width:220,marginBottom:0}} placeholder="Buscar SSTT…" value={q} onChange={function(e){ setQ(e.target.value); }}/>
          <button style={{...S.btnO(T.info),width:'auto',marginBottom:0}} onClick={mapaGeneral}>🗺 Mapa general</button>
          <button style={{...S.btn(T.brand),width:'auto',marginBottom:0}} onClick={function(){ setEditId(null); setForm(VACIO); setShowForm(true); }}>+ Nuevo SSTT</button>
        </div>
        {showForm? (
          <form onSubmit={guardar} style={{background:T.surface2,border:'1px solid '+T.border,borderRadius:10,padding:12,marginBottom:12,display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:8}}>
            <input style={S.input} placeholder="Nombre empresa *" value={form.nombre} onChange={function(e){ setForm(Object.assign({},form,{nombre:e.target.value})); }}/>
            <input style={S.input} placeholder="RUT" value={form.rut} onChange={function(e){ setForm(Object.assign({},form,{rut:e.target.value})); }}/>
            <input style={S.input} placeholder="Contacto" value={form.contacto} onChange={function(e){ setForm(Object.assign({},form,{contacto:e.target.value})); }}/>
            <input style={S.input} placeholder="Teléfono" value={form.telefono} onChange={function(e){ setForm(Object.assign({},form,{telefono:e.target.value})); }}/>
            <input style={S.input} placeholder="Email" value={form.email} onChange={function(e){ setForm(Object.assign({},form,{email:e.target.value})); }}/>
            <select style={S.input} value={form.region_id} onChange={function(e){ setForm(Object.assign({},form,{region_id:e.target.value})); }}><option value="">Región…</option>{regs.map(function(r){ return <option key={r.id} value={r.id}>{r.nombre}</option>; })}</select>
            <input style={S.input} placeholder="Comuna" value={form.comuna} onChange={function(e){ setForm(Object.assign({},form,{comuna:e.target.value})); }}/>
            <input style={S.input} placeholder="Dirección" value={form.address} onChange={function(e){ setForm(Object.assign({},form,{address:e.target.value})); }}/>
            <select style={S.input} value={form.especialidad} onChange={function(e){ setForm(Object.assign({},form,{especialidad:e.target.value})); }}><option value="ambos">Ambos</option><option value="bici">Bicicletas</option><option value="fitness">Fitness</option></select>
            <select style={S.input} value={form.trayecto} onChange={function(e){ setForm(Object.assign({},form,{trayecto:e.target.value})); }}><option>SI</option><option>N/A</option><option>CONSULTAR</option></select>
            <input style={S.input} type="number" placeholder="Cargo fijo" value={form.cargo_fijo_mensual} onChange={function(e){ setForm(Object.assign({},form,{cargo_fijo_mensual:e.target.value})); }}/>
            <input style={S.input} placeholder="Cuenta bancaria" value={form.cuenta_bancaria} onChange={function(e){ setForm(Object.assign({},form,{cuenta_bancaria:e.target.value})); }}/>
            <div style={{display:'flex',gap:8}}><button style={{...S.btn(T.ok),flex:1,marginBottom:0}}>{editId?'Guardar cambios':'Crear SSTT'}</button><button type="button" style={{...S.btnO(T.muted),flex:1,marginBottom:0}} onClick={function(){ setShowForm(false); setEditId(null); }}>Cancelar</button></div>
          </form>) : null}
        <div style={{overflow:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr><th style={S.th}>SSTT</th><th style={S.th}>Ubicación</th><th style={S.th}>Especialidad</th><th style={S.th}>Trayecto</th><th style={S.th}>Cargo fijo</th><th style={S.th}>Activo</th><th style={S.th}>Acciones</th></tr></thead>
          <tbody>{vis.map(function(s){ return <tr key={s.id} style={{background:selSat&&selSat.id===s.id?(T.brand+'14'):'transparent',cursor:'pointer'}} onClick={function(){ setSelSat(s); }}>
            <td style={{...S.td,fontWeight:700}}>{s.nombre}</td>
            <td style={S.td}>{(s.comuna||'')+', '+((regs.find(function(r){return r.id===s.region_id;})||{}).nombre||'')}</td>
            <td style={S.td}>{s.especialidad}</td><td style={S.td}>{s.trayecto}</td><td style={S.td}>{fmtCLP(s.cargo_fijo_mensual)}</td>
            <td style={S.td}><button onClick={function(e){ e.stopPropagation(); toggle(s); }} style={{padding:'4px 10px',borderRadius:8,border:'1.5px solid '+(s.activo?T.ok:T.danger),background:'transparent',color:s.activo?T.ok:T.danger,fontWeight:800,cursor:'pointer'}}>{s.activo?'ACTIVO':'INACTIVO'}</button></td>
            <td style={S.td} onClick={function(e){ e.stopPropagation(); }}>
              <button title="Editar" style={{border:0,background:'transparent',cursor:'pointer'}} onClick={function(){ setEditId(s.id); setForm({nombre:s.nombre||'',rut:s.rut||'',contacto:s.contacto||'',telefono:s.telefono||'',email:s.email||'',region_id:s.region_id||'',comuna:s.comuna||'',address:s.address||'',especialidad:s.especialidad||'ambos',trayecto:s.trayecto||'CONSULTAR',cargo_fijo_mensual:s.cargo_fijo_mensual||0,cuenta_bancaria:s.cuenta_bancaria||''}); setShowForm(true); }}>✏️</button>
              <button title="Ficha PDF" style={{border:0,background:'transparent',cursor:'pointer'}} onClick={function(){ pdfFicha(s); }}>📄</button>
              <button title="Mapa" style={{border:0,background:'transparent',cursor:'pointer'}} onClick={function(){ mapaUno(s); }}>🗺</button>
              <button title="Eliminar" style={{border:0,background:'transparent',cursor:'pointer',color:T.danger}} onClick={function(){ del(s); }}>🗑</button>
            </td>
          </tr>; })}</tbody>
        </table></div>
        {selSat? (
          <div style={{marginTop:14,borderTop:'1px solid '+T.border,paddingTop:12}}>
            <h3 style={{...S.h2,color:T.brand}}>Tarifario de {selSat.nombre}</h3>
            <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:10}}>
              {EQUIPOS.map(function(eq){ return <button key={eq} onClick={function(){ setEqTab(eq); }} style={{padding:'6px 12px',borderRadius:999,border:eqTab===eq?'0':'1px solid '+T.border,background:eqTab===eq?T.brand:'transparent',color:eqTab===eq?'#fff':T.text,fontWeight:600,fontSize:12,cursor:'pointer'}}>{eq}</button>; })}
            </div>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr><th style={S.th}>Servicio</th><th style={S.th}>Tarifa ({eqTab})</th></tr></thead>
              <tbody>{servs.map(function(sv){ var r=rates.find(function(x){ return x.sat_id===selSat.id&&x.service_type_id===sv.id&&(x.tipo_equipo||'')===eqTab; }); return <tr key={sv.id}><td style={S.td}>{sv.nombre}</td><td style={S.td}><input style={{...S.input,width:140,marginBottom:0}} type="number" defaultValue={r?r.tarifa:0} onBlur={function(e){ saveRate(sv,e.target.value); }}/></td></tr>; })}</tbody>
            </table>
          </div>) : <p style={{...S.sub,marginTop:10}}>Selecciona un SSTT en la tabla para editar su tarifario.</p>}
      </div>
      {mapOpen? <div style={S.modal} onClick={function(){ setMapOpen(false); }}><div style={{...S.modalCard,maxWidth:760}} onClick={function(e){ e.stopPropagation(); }}><h3 style={S.h2}>Ubicaciones SSTT</h3><Mapa markers={mapMk}/><button style={S.btn(T.muted)} onClick={function(){ setMapOpen(false); }}>Cerrar</button></div></div> : null}
    </div>);
}
