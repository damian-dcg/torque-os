'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

const C = { fondo:'#0d1216', panel:'#141b21', borde:'#26323d', borde2:'#31404d', tinta:'#e9eef2', gris:'#8b9aa6', naranja:'#ff6b2c', teal:'#35d0ba', amarillo:'#ffc53d', rojo:'#ff5d5d', verde:'#57d977', azul:'#5aa7ff' };
const caja = { width:'100%', padding:10, borderRadius:8, border:`1px solid ${C.borde2}`, background:'#1a232b', color:C.tinta, fontSize:13, marginBottom:10, boxSizing:'border-box' };
const etiqueta = { fontSize:10, letterSpacing:1, color:C.gris, textTransform:'uppercase', display:'block', marginBottom:4, fontFamily:'monospace' };
const boton = { padding:'10px 18px', borderRadius:8, border:0, background:C.naranja, color:'#14100c', fontWeight:700, cursor:'pointer', fontSize:13 };
const th = { textAlign:'left', fontSize:10, letterSpacing:1, textTransform:'uppercase', color:C.gris, padding:'8px 10px', borderBottom:`1px solid ${C.borde}`, fontFamily:'monospace' };
const td = { padding:'9px 10px', borderBottom:'1px solid rgba(38,50,61,.5)', fontSize:12.5, color:C.tinta };
const ESTADOS = ['recibida','diagnostico','esperando_repuestos','en_reparacion','pruebas','lista','entregada','cerrada','anulada'];

function colorEstado(e){
  if(e==='recibida'||e==='diagnostico') return C.azul;
  if(e==='esperando_repuestos') return C.amarillo;
  if(e==='en_reparacion'||e==='pruebas') return C.naranja;
  if(e==='lista'||e==='entregada'||e==='cerrada') return C.verde;
  return C.gris;
}

function FormCliente({ regiones, onOk }){
  const [f,setF]=useState({nombre:'',rut:'',tipo:'final',region_id:'',telefono:'',email:''});
  const [msg,setMsg]=useState('');
  async function guardar(e){
    e.preventDefault();
    const {error}=await supabase.from('customers').insert([{ nombre:f.nombre, rut:f.rut||null, tipo:f.tipo, region_id:f.region_id?Number(f.region_id):null, telefono:f.telefono||null, email:f.email||null }]);
    if(error){ setMsg('Error: '+error.message); } else { setMsg(''); setF({nombre:'',rut:'',tipo:'final',region_id:'',telefono:'',email:''}); onOk('Cliente creado: '+f.nombre); }
  }
  return (
    <form onSubmit={guardar} style={{background:C.panel,border:`1px solid ${C.borde}`,borderRadius:10,padding:16,marginBottom:16}}>
      <h3 style={{margin:'0 0 12px',fontSize:15,letterSpacing:1}}>NUEVO CLIENTE</h3>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        <div><label style={etiqueta}>Nombre / Razón social *</label><input style={caja} value={f.nombre} onChange={e=>setF({...f,nombre:e.target.value})} required /></div>
        <div><label style={etiqueta}>RUT</label><input style={caja} value={f.rut} onChange={e=>setF({...f,rut:e.target.value})} placeholder="76.123.456-7" /></div>
        <div><label style={etiqueta}>Tipo</label><select style={caja} value={f.tipo} onChange={e=>setF({...f,tipo:e.target.value})}><option value="final">Cliente final</option><option value="retail">Retail</option><option value="mayorista">Mayorista</option><option value="proveedor">Proveedor</option></select></div>
        <div><label style={etiqueta}>Región</label><select style={caja} value={f.region_id} onChange={e=>setF({...f,region_id:e.target.value})}><option value="">—</option>{regiones.map(r=><option key={r.id} value={r.id}>{r.nombre}</option>)}</select></div>
        <div><label style={etiqueta}>Teléfono</label><input style={caja} value={f.telefono} onChange={e=>setF({...f,telefono:e.target.value})} /></div>
        <div><label style={etiqueta}>Email</label><input style={caja} type="email" value={f.email} onChange={e=>setF({...f,email:e.target.value})} /></div>
      </div>
      {msg && <p style={{color:C.rojo,fontSize:12}}>{msg}</p>}
      <button style={boton} type="submit">Guardar cliente</button>
    </form>
  );
}

function FormSAT({ regiones, onOk }){
  const [f,setF]=useState({nombre:'',rut:'',region_id:'',especialidad:'ambos',billing_mode:'por_definir'});
  const [msg,setMsg]=useState('');
  async function guardar(e){
    e.preventDefault();
    const {error}=await supabase.from('companies').insert([{ nombre:f.nombre, rut:f.rut, tipo:'sat', region_id:f.region_id?Number(f.region_id):null, especialidad:f.especialidad, billing_mode:f.billing_mode, estado:'autorizado' }]);
    if(error){ setMsg('Error: '+error.message); } else { setMsg(''); setF({nombre:'',rut:'',region_id:'',especialidad:'ambos',billing_mode:'por_definir'}); onOk('SAT creado: '+f.nombre); }
  }
  return (
    <form onSubmit={guardar} style={{background:C.panel,border:`1px solid ${C.borde}`,borderRadius:10,padding:16,marginBottom:16}}>
      <h3 style={{margin:'0 0 12px',fontSize:15,letterSpacing:1}}>NUEVO SAT AUTORIZADO</h3>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        <div><label style={etiqueta}>Nombre empresa *</label><input style={caja} value={f.nombre} onChange={e=>setF({...f,nombre:e.target.value})} required /></div>
        <div><label style={etiqueta}>RUT *</label><input style={caja} value={f.rut} onChange={e=>setF({...f,rut:e.target.value})} required placeholder="77.123.456-6" /></div>
        <div><label style={etiqueta}>Región</label><select style={caja} value={f.region_id} onChange={e=>setF({...f,region_id:e.target.value})}><option value="">—</option>{regiones.map(r=><option key={r.id} value={r.id}>{r.nombre}</option>)}</select></div>
        <div><label style={etiqueta}>Especialidad</label><select style={caja} value={f.especialidad} onChange={e=>setF({...f,especialidad:e.target.value})}><option value="bici">Bicicletas</option><option value="fitness">Fitness</option><option value="ambos">Ambos</option></select></div>
        <div style={{gridColumn:'1 / -1'}}><label style={etiqueta}>Modo de cobro (mientras se define)</label><select style={caja} value={f.billing_mode} onChange={e=>setF({...f,billing_mode:e.target.value})}><option value="por_definir">Por definir</option><option value="sat_cobra_cliente">El SAT cobra al cliente</option><option value="nosotros_cobramos">Nosotros cobramos y el SAT factura</option></select></div>
      </div>
      {msg && <p style={{color:C.rojo,fontSize:12}}>{msg}</p>}
      <button style={boton} type="submit">Guardar SAT</button>
    </form>
  );
}

function FormTarifa({ sats, servicios, tarifas, onOk }){
  const [f,setF]=useState({sat_id:'',service_type_id:'',tarifa:''});
  const [msg,setMsg]=useState('');
  async function guardar(e){
    e.preventDefault();
    const {error}=await supabase.from('sat_rates').insert([{ sat_id:Number(f.sat_id), service_type_id:Number(f.service_type_id), tarifa:Number(f.tarifa) }]);
    if(error){ setMsg('Error: '+error.message); } else { setMsg(''); setF({...f,service_type_id:'',tarifa:''}); onOk('Tarifa pactada guardada'); }
  }
  const propias = f.sat_id ? tarifas.filter(t=>t.sat_id===Number(f.sat_id)) : [];
  return (
    <form onSubmit={guardar} style={{background:C.panel,border:`1px solid ${C.borde}`,borderRadius:10,padding:16,marginBottom:16}}>
      <h3 style={{margin:'0 0 12px',fontSize:15,letterSpacing:1}}>TARIFA PACTADA POR SERVICIO</h3>
      <div style={{display:'grid',gridTemplateColumns:'2fr 2fr 1fr',gap:10}}>
        <div><label style={etiqueta}>SAT *</label><select style={caja} value={f.sat_id} onChange={e=>setF({...f,sat_id:e.target.value})} required><option value="">Elegir…</option>{sats.map(s=><option key={
