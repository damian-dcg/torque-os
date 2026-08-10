'use client';
import { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';

const TEAL='#3ec6b2'; const NEGRO='#1c1c1c'; const FONDO='#f7f9fa';
const inp={width:'100%',padding:'15px 22px',borderRadius:999,border:'1px solid #c9d2d8',background:'#fff',fontSize:15,marginBottom:14,boxSizing:'border-box',color:'#222'};
const lab={fontSize:13,color:'#5a6a72',display:'block',margin:'4px 0 6px 18px'};
const REGIONS=[['AP','Arica y Parinacota'],['TA','Tarapacá'],['AN','Antofagasta'],['AT','Atacama'],['CO','Coquimbo'],['VA','Valparaíso'],['RM','Metropolitana'],['LI',"O'Higgins"],['ML','Maule'],['NB','Ñuble'],['BB','Biobío'],['AR','La Araucanía'],['LR','Los Ríos'],['LL','Los Lagos'],['AY','Aysén'],['MG','Magallanes']];
const PROD=['BICICLETA','BICICLETA ELECTRICA','MAQUINA','SCOOTER ELECTRICO','ACCESORIO'];

export default function Solicitud(){
  const [flujo,setFlujo]=useState('armado');
  const [f,setF]=useState({nombre:'',rut:'',region:'',comuna:'',direccion:'',telefono:'',email:'',producto:'BICICLETA',modelo:'',boleta:'',fecha:'',tienda:'',cantidad:'1',detalle:''});
  const [file,setFile]=useState(null); const [hp,setHp]=useState(''); const t0=useRef(Date.now());
  const [busy,setBusy]=useState(false); const [ok,setOk]=useState(null); const [err,setErr]=useState('');

  async function enviar(e){
    e.preventDefault(); setBusy(true); setErr('');
    try{
      let boletaUrl=null;
      if(file){ const path=`boleta-${Date.now()}-${file.name}`; const {error}=await supabase.storage.from('boletas').upload(path,file); if(!error) boletaUrl=supabase.storage.from('boletas').getPublicUrl(path).data.publicUrl; }
      const tipo_ot = flujo==='armado' ? (Number(f.cantidad)>1?'armado_volumen':'armado_unidad')
        : flujo==='garantia' ? 'repuesto_garantia'
        : flujo==='retail' ? 'armado_volumen' : 'servicio';
      const {data,error}=await supabase.rpc('portal_solicitud',{p:{
        nombre:f.nombre,rut:f.rut,region:f.region,direccion:(f.direccion||'')+', '+f.comuna,
        telefono:f.telefono,email:f.email,flujo,tipo_ot,
        canal_cliente: flujo==='retail'?'retail':'final',
        producto:f.producto,modelo:f.modelo,boleta:f.boleta,fecha_compra:f.fecha,tienda:f.tienda,
        cantidad:Number(f.cantidad)||1,boleta_url:boletaUrl,detalle:f.detalle||('Solicitud '+flujo+' · '+f.producto+' '+f.modelo)
      }});
      if(error) throw new Error(error.message);
      setOk(data.ot_number);
    }catch(ex){ setErr('⛔ '+ex.message); }
    setBusy(false);
  }

  return (
    <main style={{minHeight:'100vh',background:FONDO,fontFamily:"system-ui,'Segoe UI',Arial,sans-serif"}}>
      <header style={{background:NEGRO,padding:'26px 40px',display:'flex',alignItems:'center',gap:14}}>
        <div style={{color:TEAL,fontWeight:900,fontSize:30,letterSpacing:2}}>BIANCHI</div>
        <div style={{color:'#fff',fontSize:13,opacity:.8}}>Servicio Técnico Oficial</div>
        <a href="/seguimiento" style={{marginLeft:'auto',color:'#fff',fontSize:13,textDecoration:'none',border:'1px solid '+TEAL,borderRadius:999,padding:'8px 18px'}}>Seguir mi OT</a>
      </header>
      <div style={{maxWidth:760,margin:'0 auto',padding:'40px 18px'}}>
        <h1 style={{textAlign:'center',fontSize:34,color:NEGRO,margin:'0 0 6px'}}>SERVICIO TÉCNICO BIANCHI</h1>
        <p style={{textAlign:'center',color:'#5a6a72',margin:'0 0 26px'}}>Tu Bianchi lista para usar</p>
        <div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap',marginBottom:24}}>
          {[['armado','Armado'],['garantia','Garantía'],['postventa','Post-venta'],['retail','Retail / Volumen']].map(([k,l])=>(
            <button key={k} onClick={()=>setFlujo(k)} style={{borderRadius:999,padding:'10px 20px',border:'1.5px solid '+TEAL,background:flujo===k?TEAL:'#fff',color:flujo===k?'#fff':TEAL,fontWeight:700,fontSize:14,cursor:'pointer'}}>{l}</button>))}
        </div>
        {ok? (
          <div style={{background:'#fff',border:'2px solid '+TEAL,borderRadius:20,padding:34,textAlign:'center'}}>
            <h2 style={{color:TEAL,margin:'0 0 8px'}}>✅ Solicitud recibida</h2>
            <p style={{color:'#333',fontSize:17}}>Tu número de orden es <b>OT-{ok}</b>.</p>
            <p style={{color:'#5a6a72',fontSize:14}}>Guárdalo para hacer seguimiento. Nuestro equipo la derivará al SAT de tu región según los plazos oficiales (RM 3 días hábiles / regiones 5).</p>
            <a href="/seguimiento" style={{display:'inline-block',marginTop:10,background:TEAL,color:'#fff',borderRadius:999,padding:'13px 28px',textDecoration:'none',fontWeight:800}}>Hacer seguimiento</a>
          </div>) : (
          <form onSubmit={enviar} style={{background:'#fff',borderRadius:24,padding:'30px 26px',boxShadow:'0 6px 24px rgba(0,0,0,.06)'}}>
            <label style={lab}>Nombre Completo / Razón Social *</label>
            <input style={inp} required value={f.nombre} onChange={e=>setF({...f,nombre:e.target.value})}/>
            <label style={lab}>RUT *</label>
            <input style={inp} required value={f.rut} onChange={e=>setF({...f,rut:e.target.value})} placeholder="12.345.678-9"/>
            <label style={lab}>Región *</label>
            <select style={inp} required value={f.region} onChange={e=>setF({...f,region:e.target.value})}><option value="">Selecciona una región *</option>{REGIONS.map(([c,n])=><option key={c} value={c}>{n}</option>)}</select>
            <label style={lab}>Comuna *</label>
            <input style={inp} required value={f.comuna} onChange={e=>setF({...f,comuna:e.target.value})}/>
            <label style={lab}>Dirección (Calle y Número) *</label>
            <input style={inp} required value={f.direccion} onChange={e=>setF({...f,direccion:e.target.value})}/>
            <label style={lab}>Número de teléfono (ej: +56912345678) *</label>
            <input style={inp} required value={f.telefono} onChange={e=>setF({...f,telefono:e.target.value})}/>
            <label style={lab}>Correo electrónico *</label>
            <input style={inp} type="email" required value={f.email} onChange={e=>setF({...f,email:e.target.value})}/>
            <label style={lab}>Tipo de Producto *</label>
            <select style={inp} required value={f.producto} onChange={e=>setF({...f,producto:e.target.value})}>{PROD.map(p=><option key={p}>{p}</option>)}</select>
            <label style={lab}>Modelo o SKU del Producto *</label>
            <input style={inp} required value={f.modelo} onChange={e=>setF({...f,modelo:e.target.value})}/>
            {flujo==='retail'&&<div><label style={lab}>Cantidad de unidades *</label><input style={inp} type="number" min="1" required value={f.cantidad} onChange={e=>setF({...f,cantidad:e.target.value})}/></div>}
            {flujo!=='retail'&&<>
              <label style={lab}>Número de Boleta / Factura *</label>
              <input style={inp} required value={f.boleta} onChange={e=>setF({...f,boleta:e.target.value})}/>
              <label style={lab}>Fecha de Compra *</label>
              <input style={inp} type="date" required value={f.fecha} onChange={e=>setF({...f,fecha:e.target.value})}/>
              <label style={lab}>Tienda de Compra *</label>
              <input style={inp} required value={f.tienda} onChange={e=>setF({...f,tienda:e.target.value})}/>
            </>}
            {(flujo==='garantia'||flujo==='postventa')&&<div><label style={lab}>Describe la falla o servicio requerido *</label><textarea style={{...inp,minHeight:90,borderRadius:18}} required value={f.detalle} onChange={e=>setF({...f,detalle:e.target.value})}/></div>}
            {flujo!=='retail'&&<div><label style={lab}>Adjuntar Boleta (PDF, JPG, PNG) *</label><input style={{...inp,borderRadius:18}} type="file" accept=".pdf,.jpg,.jpeg,.png" required onChange={e=>setFile(e.target.files[0])}/></div>}
            <p style={{color:'#5a6a72',fontSize:13}}>Todos los campos marcados con (*) son obligatorios.</p>
            {err&&<p style={{color:'#d33',fontSize:14}}>{err}</p>}
            <button disabled={busy} style={{background:TEAL,color:'#fff',borderRadius:999,padding:'15px 30px',border:0,fontWeight:800,fontSize:16,cursor:'pointer',opacity:busy?.6:1}}>{busy?'Enviando…':'Enviar Solicitud'}</button>
          </form>)}
      </div>
    </main>);
}
