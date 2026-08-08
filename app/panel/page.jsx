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
const link = { color:C.gris, fontSize:12, textDecoration:'none', padding:'6px 10px', border:`1px solid ${C.borde2}`, borderRadius:8 };
const ESTADOS = ['Ingresada','Asignada','Aceptada','Rechazada','En Ruta','Llegada','Trabajando','Esperando Repuesto','Finalizada','Cerrada','Anulada'];

function colorEstado(e){
  if(e==='Ingresada'||e==='Asignada') return C.azul;
  if(e==='Aceptada') return C.teal;
  if(e==='Rechazada') return C.rojo;
  if(e==='Llegada') return C.teal;
  if(e==='Trabajando') return C.amarillo;
  if(e==='Esperando Repuesto') return C.rojo;
  if(e==='Finalizada'||e==='Cerrada') return C.verde;
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
        <div><label style={etiqueta}>SAT *</label><select style={caja} value={f.sat_id} onChange={e=>setF({...f,sat_id:e.target.value})} required><option value="">Elegir…</option>{sats.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}</select></div>
        <div><label style={etiqueta}>Servicio *</label><select style={caja} value={f.service_type_id} onChange={e=>setF({...f,service_type_id:e.target.value})} required><option value="">Elegir…</option>{servicios.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}</select></div>
        <div><label style={etiqueta}>Tarifa $ *</label><input style={caja} type="number" value={f.tarifa} onChange={e=>setF({...f,tarifa:e.target.value})} required /></div>
      </div>
      {propias.length>0 && (
        <table style={{width:'100%',borderCollapse:'collapse',marginTop:6}}>
          <thead><tr><th style={th}>Servicio</th><th style={th}>Tarifa</th><th style={th}>Vigente desde</th></tr></thead>
          <tbody>{propias.map(t=>(
            <tr key={t.id}><td style={td}>{(servicios.find(s=>s.id===t.service_type_id)||{}).nombre||'—'}</td><td style={{...td,fontFamily:'monospace'}}>${t.tarifa}</td><td style={td}>{t.vigencia_desde}</td></tr>
          ))}</tbody>
        </table>
      )}
      {msg && <p style={{color:C.rojo,fontSize:12}}>{msg}</p>}
      <button style={boton} type="submit">Guardar tarifa</button>
    </form>
  );
}

function FormOT({ customers, sats, regiones, onOk }){
  const [f,setF]=useState({customer_id:'',tipo:'servicio',prioridad:'media',region_id:'',asignado:'',descripcion:''});
  const [msg,setMsg]=useState('');
  async function guardar(e){
    e.preventDefault();
    const {data,error}=await supabase.from('work_orders').insert([{ customer_id:Number(f.customer_id), tipo:f.tipo, prioridad:f.prioridad, region_id:f.region_id?Number(f.region_id):null, asignado_company_id:f.asignado?Number(f.asignado):null, descripcion:f.descripcion||null, canal:'interno' }]).select();
    if(error){ setMsg('Error: '+error.message); } else { setMsg(''); setF({customer_id:'',tipo:'servicio',prioridad:'media',region_id:'',asignado:'',descripcion:''}); onOk('OT-'+data[0].ot_number+' creada'); }
  }
  return (
    <form onSubmit={guardar} style={{background:C.panel,border:`1px solid ${C.borde}`,borderRadius:10,padding:16,marginBottom:16}}>
      <h3 style={{margin:'0 0 12px',fontSize:15,letterSpacing:1}}>NUEVA OT (SECUENCIA ÚNICA)</h3>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        <div><label style={etiqueta}>Cliente *</label><select style={caja} value={f.customer_id} onChange={e=>setF({...f,customer_id:e.target.value})} required><option value="">Elegir…</option>{customers.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
        <div><label style={etiqueta}>Tipo de OT</label><select style={caja} value={f.tipo} onChange={e=>setF({...f,tipo:e.target.value})}><option value="servicio">Servicio / reparación</option><option value="armado_unidad">Armado cliente final</option><option value="armado_volumen">Armado volumen</option><option value="repuesto_garantia">Repuesto en garantía</option><option value="cambio_producto">Cambio de producto</option><option value="despacho">Despacho</option><option value="devolucion_dinero">Devolución de dinero</option><option value="trayecto">Trayecto</option></select></div>
        <div><label style={etiqueta}>Prioridad</label><select style={caja} value={f.prioridad} onChange={e=>setF({...f,prioridad:e.target.value})}><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option></select></div>
        <div><label style={etiqueta}>Región</label><select style={caja} value={f.region_id} onChange={e=>setF({...f,region_id:e.target.value})}><option value="">—</option>{regiones.map(r=><option key={r.id} value={r.id}>{r.nombre}</option>)}</select></div>
        <div style={{gridColumn:'1 / -1'}}><label style={etiqueta}>Asignar a</label><select style={caja} value={f.asignado} onChange={e=>setF({...f,asignado:e.target.value})}><option value="">Taller central DCG</option>{sats.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}</select></div>
        <div style={{gridColumn:'1 / -1'}}><label style={etiqueta}>Descripción / síntoma</label><textarea style={caja} value={f.descripcion} onChange={e=>setF({...f,descripcion:e.target.value})} rows="2" /></div>
      </div>
      {msg && <p style={{color:C.rojo,fontSize:12}}>{msg}</p>}
      <button style={boton} type="submit">Crear OT</button>
    </form>
  );
}

export default function Panel(){
  const [email,setEmail]=useState(null);
  const [tab,setTab]=useState('panel');
  const [customers,setCustomers]=useState([]);
  const [ots,setOts]=useState([]);
  const [sats,setSats]=useState([]);
  const [regiones,setRegiones]=useState([]);
  const [servicios,setServicios]=useState([]);
  const [tarifas,setTarifas]=useState([]);
  const [aviso,setAviso]=useState('');
  const router=useRouter();

  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>{
      if(!data.session) router.replace('/');
      else { setEmail(data.session.user.email); cargar(); }
    });
  },[]);

    useEffect(()=>{
    const ch=supabase.channel('rt-consola')
      .on('postgres_changes',{event:'*',schema:'public',table:'work_orders'},()=>cargar())
      .on('postgres_changes',{event:'*',schema:'public',table:'insistencias'},()=>cargar())
      .on('postgres_changes',{event:'*',schema:'public',table:'surveys_nps'},()=>cargar())
      .subscribe();
    const t=setInterval(()=>{ cargar(); },60000);
    return ()=>{ supabase.removeChannel(ch); clearInterval(t); };
  },[]);
  async function cargar(){
    const [c,o,s,r,serv,tar]=await Promise.all([
      supabase.from('customers').select('*').order('id',{ascending:false}).limit(100),
      supabase.from('work_orders').select('*').order('id',{ascending:false}).limit(100),
      supabase.from('companies').select('*'),
      supabase.from('regions').select('*'),
      supabase.from('service_types').select('*'),
      supabase.from('sat_rates').select('*')
    ]);
    setCustomers(c.data||[]); setOts(o.data||[]);
    setSats((s.data||[]).filter(x=>x.tipo==='sat'));
    setRegiones(r.data||[]); setServicios(serv.data||[]); setTarifas(tar.data||[]);
  }

  async function salir(){ await supabase.auth.signOut(); router.replace('/'); }
  function avisoY(msg){ setAviso(msg); setTimeout(()=>setAviso(''),4000); cargar(); }
  async function cambiarEstado(id,estado){ await supabase.from('work_orders').update({estado}).eq('id',id); cargar(); }
  async function toggleActivo(s){ await supabase.from('companies').update({activo:!s.activo}).eq('id',s.id); cargar(); }

  const satsActivos = sats.filter(x=>x.activo);
  const proxOT = ots.length ? Math.max(...ots.map(o=>o.ot_number))+1 : 5001;
  const tabBtn = t => ({ padding:'8px 16px', borderRadius:8, border:`1px solid ${C.borde2}`, background: tab===t?C.naranja:'transparent', color: tab===t?'#14100c':C.gris, fontWeight:700, cursor:'pointer', fontSize:12.5 });

  return (
    <main style={{minHeight:'100vh',background:C.fondo,color:C.tinta,fontFamily:'system-ui,sans-serif'}}>
      <header style={{display:'flex',alignItems:'center',gap:14,padding:'14px 22px',borderBottom:`1px solid ${C.borde}`,background:'rgba(13,18,22,.9)',position:'sticky',top:0,flexWrap:'wrap'}}>
        <h1 style={{margin:0,fontSize:22,letterSpacing:1}}>TORQUE<span style={{color:C.naranja}}>·OS</span></h1>
        <span style={{fontSize:11,color:C.gris}}>DCG · Consola de operación</span>
        <nav style={{display:'flex',gap:8,marginLeft:'auto'}}>
          <a style={link} href="/catalogo">Catálogo</a>
          <a style={link} href="/cupones">Cupones</a>
          <a style={link} href="/armado">Armado</a>
          <a style={link} href="/inventario">Inventario</a>
          <a style={link} href="/importar">Migrar</a>
        </nav>
        <span style={{fontSize:12,color:C.teal}}>{email}</span>
        <button onClick={salir} style={{padding:'7px 12px',borderRadius:8,border:`1px solid ${C.borde2}`,background:'#1a232b',color:C.tinta,cursor:'pointer',fontSize:12}}>Cerrar sesión</button>
      </header>

      <nav style={{display:'flex',gap:8,padding:'16px 22px 0',flexWrap:'wrap'}}>
        <button style={tabBtn('panel')} onClick={()=>setTab('panel')}>Panel</button>
        <button style={tabBtn('clientes')} onClick={()=>setTab('clientes')}>Clientes</button>
        <button style={tabBtn('ots')} onClick={()=>setTab('ots')}>Órdenes de trabajo</button>
        <button style={tabBtn('sat')} onClick={()=>setTab('sat')}>Red SAT</button>
      </nav>

      {aviso && <div style={{margin:'12px 22px',padding:'10px 14px',borderRadius:8,background:'rgba(87,217,119,.1)',border:`1px solid ${C.verde}`,color:C.verde,fontSize:13}}>{aviso}</div>}

      <section style={{padding:'16px 22px'}}>
        {tab==='panel' && (
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
            <div style={{background:C.panel,border:`1px solid ${C.borde}`,borderTop:`3px solid ${C.naranja}`,borderRadius:10,padding:16}}><div style={etiqueta}>OTs activas</div><div style={{fontSize:30,fontFamily:'monospace'}}>{ots.filter(o=>o.estado!=='Cerrada'&&o.estado!=='Anulada').length}</div></div>
            <div style={{background:C.panel,border:`1px solid ${C.borde}`,borderTop:`3px solid ${C.teal}`,borderRadius:10,padding:16}}><div style={etiqueta}>Clientes</div><div style={{fontSize:30,fontFamily:'monospace'}}>{customers.length}</div></div>
            <div style={{background:C.panel,border:`1px solid ${C.borde}`,borderTop:`3px solid ${C.amarillo}`,borderRadius:10,padding:16}}><div style={etiqueta}>SAT activos</div><div style={{fontSize:30,fontFamily:'monospace'}}>{satsActivos.length}</div></div>
            <div style={{background:C.panel,border:`1px solid ${C.borde}`,borderTop:`3px solid ${C.verde}`,borderRadius:10,padding:16}}><div style={etiqueta}>Próxima OT (secuencia única)</div><div style={{fontSize:30,fontFamily:'monospace',color:C.verde}}>OT-{proxOT}</div></div>
          </div>
        )}

        {tab==='clientes' && (
          <div>
            <FormCliente regiones={regiones} onOk={avisoY} />
            <div style={{background:C.panel,border:`1px solid ${C.borde}`,borderRadius:10,overflow:'hidden'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr><th style={th}>Nombre</th><th style={th}>Tipo</th><th style={th}>RUT</th><th style={th}>Teléfono</th></tr></thead>
                <tbody>{customers.map(c=>(<tr key={c.id}><td style={td}>{c.nombre}</td><td style={td}>{c.tipo}</td><td style={td}>{c.rut||'—'}</td><td style={td}>{c.telefono||'—'}</td></tr>))}</tbody>
              </table>
              {customers.length===0 && <p style={{padding:14,color:C.gris,fontSize:12.5}}>Aún no hay clientes.</p>}
            </div>
          </div>
        )}

        {tab==='ots' && (
          <div>
            {customers.length===0
              ? <p style={{color:C.amarillo,fontSize:13,background:'rgba(255,197,61,.08)',border:`1px solid ${C.amarillo}`,borderRadius:8,padding:12}}>Primero crea un cliente en la pestaña "Clientes".</p>
              : <FormOT customers={customers} sats={satsActivos} regiones={regiones} onOk={avisoY} />}
            <div style={{background:C.panel,border:`1px solid ${C.borde}`,borderRadius:10,overflow:'hidden'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr><th style={th}>OT</th><th style={th}>Cliente</th><th style={th}>Tipo</th><th style={th}>Estado (cambiar aquí)</th><th style={th}>Prioridad</th></tr></thead>
                <tbody>{ots.map(o=>(
                  <tr key={o.id}>
                    <td style={{...td,color:C.naranja,fontFamily:'monospace'}}>OT-{o.ot_number}</td>
                    <td style={td}>{(customers.find(c=>c.id===o.customer_id)||{}).nombre||'—'}</td>
                    <td style={td}>{o.tipo}</td>
                    <td style={td}><select value={o.estado} onChange={e=>cambiarEstado(o.id,e.target.value)} style={{...caja,marginBottom:0,padding:'6px 8px',color:colorEstado(o.estado),fontWeight:700}}>{ESTADOS.map(s=><option key={s} value={s}>{s}</option>)}</select></td>
                    <td style={td}>{o.prioridad}</td>
                  </tr>
                ))}</tbody>
              </table>
              {ots.length===0 && <p style={{padding:14,color:C.gris,fontSize:12.5}}>Aún no hay OTs.</p>}
            </div>
          </div>
        )}

        {tab==='sat' && (
          <div>
            <FormSAT regiones={regiones} onOk={avisoY} />
            <FormTarifa sats={satsActivos} servicios={servicios} tarifas={tarifas} onOk={avisoY} />
            <div style={{background:C.panel,border:`1px solid ${C.borde}`,borderRadius:10,overflow:'hidden'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr><th style={th}>SAT</th><th style={th}>RUT</th><th style={th}>Especialidad</th><th style={th}>Modo de cobro</th><th style={th}>Activo</th></tr></thead>
                <tbody>{sats.map(s=>(
                  <tr key={s.id}>
                    <td style={td}>{s.nombre}</td>
                    <td style={td}>{s.rut}</td>
                    <td style={td}>{s.especialidad}</td>
                    <td style={td}>{s.billing_mode}</td>
                    <td style={td}><button onClick={()=>toggleActivo(s)} style={{padding:'5px 12px',borderRadius:6,border:'1px solid '+(s.activo?C.verde:C.rojo),background:'transparent',color:s.activo?C.verde:C.rojo,cursor:'pointer',fontSize:11,fontWeight:700}}>{s.activo?'ACTIVO':'INACTIVO'}</button></td>
                  </tr>
                ))}</tbody>
              </table>
              {sats.length===0 && <p style={{padding:14,color:C.gris,fontSize:12.5}}>Aún no hay SATs registrados.</p>}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
