'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

const inp = { width:'100%', padding:10, borderRadius:7, border:'1px solid #d9d4c9', background:'#fff', fontSize:13, boxSizing:'border-box', color:'#191c1f' };
const lab = { fontFamily:'monospace', fontSize:10, letterSpacing:1, color:'#7a766c', display:'block', marginBottom:4, textTransform:'uppercase' };

export default function Solicitud(){
  const [regiones,setRegiones]=useState([]);
  const [fotos,setFotos]=useState([]);
  const [subiendo,setSubiendo]=useState(false);
  const [error,setError]=useState('');
  const [otNum,setOtNum]=useState(null);
  const [f,setF]=useState({nombre:'',rut:'',telefono:'',email:'',region:'',direccion:'',tipo_producto:'Bicicleta',marca_modelo:'',serial:'',garantia:'No, garantía vencida',falla:'Ruido / traqueteo',descripcion:''});

  useEffect(()=>{ supabase.from('regions').select('*').then(({data})=>setRegiones(data||[])); },[]);

  async function subirFotos(e){
    const archivos=[...e.target.files].slice(0,4);
    setSubiendo(true);
    for(const a of archivos){
      const path='solicitud-'+Date.now()+'-'+Math.random().toString(36).slice(2)+'-'+a.name;
      const {error:up}=await supabase.storage.from('portal').upload(path,a);
      if(!up){ setFotos(v=>[...v,supabase.storage.from('portal').getPublicUrl(path).data.publicUrl]); }
    }
    setSubiendo(false);
  }

  async function enviar(e){
    e.preventDefault(); setError('');
    const {data,error:err}=await supabase.rpc('crear_ot_publica',{
      p_nombre:f.nombre, p_rut:f.rut, p_telefono:f.telefono, p_email:f.email,
      p_region_codigo:f.region, p_direccion:f.direccion, p_tipo_producto:f.tipo_producto,
      p_marca_modelo:f.marca_modelo, p_serial:f.serial, p_garantia:f.garantia,
      p_falla:f.falla, p_descripcion:f.descripcion, p_fotos:fotos
    });
    if(err) setError('Error al enviar: '+err.message);
    else setOtNum(data);
  }

  return (
    <main style={{minHeight:'100vh',background:'#f6f4ef',color:'#191c1f',fontFamily:'system-ui,sans-serif',padding:'30px 16px'}}>
      <div style={{maxWidth:640,margin:'0 auto'}}>
        <h1 style={{fontSize:30,fontWeight:800,margin:'0 0 4px'}}>TORQUE<span style={{color:'#ff6b2c'}}>·OS</span></h1>
        <p style={{color:'#7a766c',fontSize:12,margin:'0 0 18px'}}>DCG · Servicio técnico de bicicletas y máquinas de ejercicios · Todo Chile</p>
        {otNum ? (
          <div style={{background:'#e9f6ee',border:'1px solid #b8dfc6',borderRadius:10,padding:26,textAlign:'center'}}>
            <div style={{fontSize:26}}>✅</div>
            <h2 style={{margin:'8px 0 4px'}}>¡Solicitud recibida!</h2>
            <div style={{fontFamily:'monospace',fontSize:22,color:'#2f9e52',margin:'8px 0'}}>OT-{otNum}</div>
            <p style={{fontSize:12.5,color:'#5c636b'}}>Guarda este número único. Te contactaremos por teléfono o WhatsApp para coordinar. Puedes hacer seguimiento en cualquier sucursal o SAT de la red.</p>
          </div>
        ) : (
          <form onSubmit={enviar} style={{background:'#fff',border:'1px solid #e2ddd2',borderRadius:10,padding:22}}>
            <h2 style={{margin:'0 0 14px',fontSize:18}}>Ingresa tu solicitud de servicio</h2>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
              <div><label style={lab}>Nombre completo *</label><input style={inp} required value={f.nombre} onChange={e=>setF({...f,nombre:e.target.value})} /></div>
              <div><label style={lab}>RUT</label><input style={inp} value={f.rut} onChange={e=>setF({...f,rut:e.target.value})} /></div>
              <div><label style={lab}>Teléfono / WhatsApp *</label><input style={inp} required value={f.telefono} onChange={e=>setF({...f,telefono:e.target.value})} /></div>
              <div><label style={lab}>Email *</label><input style={inp} type="email" required value={f.email} onChange={e=>setF({...f,email:e.target.value})} /></div>
              <div><label style={lab}>Región *</label><select style={inp} required value={f.region} onChange={e=>setF({...f,region:e.target.value})}><option value="">Elegir…</option>{regiones.map(r=><option key={r.id} value={r.codigo}>{r.nombre}</option>)}</select></div>
              <div><label style={lab}>Comuna / dirección</label><input style={inp} value={f.direccion} onChange={e=>setF({...f,direccion:e.target.value})} /></div>
              <div><label style={lab}>Tipo de producto</label><select style={inp} value={f.tipo_producto} onChange={e=>setF({...f,tipo_producto:e.target.value})}><option>Bicicleta</option><option>Bicicleta eléctrica</option><option>Máquina de ejercicios</option></select></div>
              <div><label style={lab}>Marca y modelo *</label><input style={inp} required value={f.marca_modelo} onChange={e=>setF({...f,marca_modelo:e.target.value})} placeholder="Trek Marlin 7" /></div>
              <div><label style={lab}>N° de serie</label><input style={inp} value={f.serial} onChange={e=>setF({...f,serial:e.target.value})} /></div>
              <div><label style={lab}>¿En garantía?</label><select style={inp} value={f.garantia} onChange={e=>setF({...f,garantia:e.target.value})}><option>Sí, comprada hace menos de 6 meses</option><option>No estoy seguro</option><option>No, garantía vencida</option></select></div>
              <div style={{gridColumn:'1 / -1'}}><label style={lab}>Tipo de falla *</label><select style={inp} value={f.falla} onChange={e=>setF({...f,falla:e.target.value})}><option>Ruido / traqueteo</option><option>No enciende / error consola</option><option>Banda o correa resbala</option><option>Frenos</option><option>Cambios / transmisión</option><option>Batería (e-bike)</option><option>Consola / display</option><option>Estructura / soldadura</option><option>Rodamientos / poleas</option><option>Otra</option></select></div>
              <div style={{gridColumn:'1 / -1'}}><label style={lab}>Describe el problema *</label><textarea style={inp} rows="3" required value={f.descripcion} onChange={e=>setF({...f,descripcion:e.target.value})} /></div>
              <div style={{gridColumn:'1 / -1'}}><label style={lab}>Fotos del equipo (máx. 4)</label><input type="file" accept="image/*" multiple onChange={subirFotos} />{subiendo && <span style={{fontSize:11,color:'#7a766c'}}> subiendo…</span>}{fotos.length>0 && <span style={{fontSize:11,color:'#2f9e52'}}> {fotos.length} foto(s) adjuntada(s)</span>}</div>
            </div>
            {error && <p style={{color:'#c0392b',fontSize:12}}>{error}</p>}
            <button type="submit" style={{width:'100%',padding:13,borderRadius:8,border:0,background:'#ff6b2c',color:'#14100c',fontWeight:700,fontSize:14,cursor:'pointer'}}>Enviar solicitud →</button>
          </form>
        )}
      </div>
    </main>
  );
}
