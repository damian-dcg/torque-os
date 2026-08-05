'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

const C={fondo:'#0d1216',panel:'#141b21',borde:'#26323d',borde2:'#31404d',tinta:'#e9eef2',gris:'#8b9aa6',naranja:'#ff6b2c',rojo:'#ff5d5d',verde:'#57d977',amarillo:'#ffc53d',azul:'#5aa7ff'};
const caja={width:'100%',padding:10,borderRadius:8,border:`1px solid ${C.borde2}`,background:'#1a232b',color:C.tinta,fontSize:13,marginBottom:10,boxSizing:'border-box'};
const etiqueta={fontSize:10,letterSpacing:1,color:C.gris,textTransform:'uppercase',display:'block',marginBottom:4,fontFamily:'monospace'};
const boton={padding:'10px 18px',borderRadius:8,border:0,background:C.naranja,color:'#14100c',fontWeight:700,cursor:'pointer',fontSize:13};
const th={textAlign:'left',fontSize:10,letterSpacing:1,textTransform:'uppercase',color:C.gris,padding:'8px 10px',borderBottom:`1px solid ${C.borde}`,fontFamily:'monospace'};
const td={padding:'9px 10px',borderBottom:'1px solid rgba(38,50,61,.5)',fontSize:12.5,color:C.tinta};
const link={color:C.gris,fontSize:12,textDecoration:'none',padding:'6px 10px',border:`1px solid ${C.borde2}`,borderRadius:8};

export default function Armado(){
  const [customers,setCustomers]=useState([]); const [sats,setSats]=useState([]); const [regiones,setRegiones]=useState([]);
  const [productos,setProductos]=useState([]); const [ots,setOts]=useState([]); const [lineas,setLineas]=useState([]);
  const [fOT,setFOT]=useState({customer_id:'',region_id:'',asignado:''});
  const [fL,setFL]=useState({ot_id:'',product_id:'',cantidad:'1'});
  const [fV,setFV]=useState({ot_id:'',code:'',serial:''});
  const [msg,setMsg]=useState(''); const [val,setVal]=useState(null);
  const router=useRouter();
  useEffect(()=>{ supabase.auth.getSession().then(({data})=>{ if(!data.session) router.replace('/'); else cargar(); }); },[]);
  async function cargar(){
    const [c,s,r,p,o]=await Promise.all([
      supabase.from('customers').select('*'),
      supabase.from('companies').select('*'),
      supabase.from('regions').select('*'),
      supabase.from('products').select('*'),
      supabase.from('work_orders').select('*').eq('tipo','armado_volumen').order('id',{ascending:false}).limit(50)
    ]);
    setCustomers(c.data||[]); setSats((s.data||[]).filter(x=>x.tipo==='sat')); setRegiones(r.data||[]); setProductos(p.data||[]); setOts(o.data||[]);
    if(o.data&&o.data.length&&!fL.ot_id){ setFL(v=>({...v,ot_id:String(o.data[0].id)})); setFV(v=>({...v,ot_id:String(o.data[0].id)})); cargarLineas(o.data[0].id); }
  }
  async function cargarLineas(otId){
    const {data}=await supabase.from('ot_lines').select('*').eq('ot_id',otId);
    setLineas(data||[]);
  }
  function nombreCliente(id){ return (customers.find(c=>c.id===id)||{}).nombre||'—'; }
  function nombreProducto(id){ return (productos.find(p=>p.id===id)||{}).nombre||'—'; }
  async function crearOT(e){
    e.preventDefault();
    const {data,error}=await supabase.from('work_orders').insert([{customer_id:Number(fOT.customer_id),tipo:'armado_volumen',prioridad:'media',region_id:fOT.region_id?Number(fOT.region_id):null,asignado_company_id:fOT.asignado?Number(fOT.asignado):null,canal:'interno'}]).select();
    if(error) setMsg('Error: '+error.message);
    else { setMsg(''); const id=data[0].id; setFL(v=>({...v,ot_id:String(id)})); setFV(v=>({...v,ot_id:String(id)})); cargar(); }
  }
  async function agregarLinea(e){
    e.preventDefault();
    const {error}=await supabase.from('ot_lines').insert([{ot_id:Number(fL.ot_id),product_id:Number(fL.product_id),cantidad_solicitada:Number(fL.cantidad)}]);
    if(error) setMsg('Error: '+error.message); else { setMsg(''); cargarLineas(fL.ot_id); }
  }
  async function validar(e){
    e.preventDefault();
    setVal(null);
    const {data,error}=await supabase.rpc('validar_cupon',{p_code:fV.code,p_ot_id:Number(fV.ot_id),p_codigo_secundario:fV.serial||null});
    if(error) setVal({ok:false,texto:error.message});
    else { setVal({ok:true,texto:'Cupón '+fV.code+' VALIDADO en OT-'+data.usado_ot_id+' · armado real +1'}); setFV(v=>({...v,code:'',serial:''})); cargarLineas(fV.ot_id); }
  }
  return (
    <main style={{minHeight:'100vh',background:C.fondo,color:C.tinta,fontFamily:'system-ui,sans-serif'}}>
      <header style={{display:'flex',alignItems:'center',gap:14,padding:'14px 22px',borderBottom:`1px solid ${C.borde}`}}>
        <h1 style={{margin:0,fontSize:22,letterSpacing:1}}>TORQUE<span style={{color:C.naranja}}>·OS</span></h1>
        <span style={{fontSize:11,color:C.gris}}>Armado por volumen + validación antifraude</span>
        <nav style={{marginLeft:'auto',display:'flex',gap:8}}><a style={link} href="/panel">Consola</a><a style={link} href="/catalogo">Catálogo</a><a style={link} href="/cupones">Cupones</a></nav>
      </header>
      <section style={{padding:'16px 22px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <div>
          <form onSubmit={crearOT} style={{background:C.panel,border:`1px solid ${C.borde}`,borderRadius:10,padding:16,marginBottom:16}}>
            <h3 style={{margin:'0 0 12px',fontSize:15,letterSpacing:1}}>1 · NUEVA OT DE VOLUMEN</h3>
            <label style={etiqueta}>Cliente *</label><select style={caja} value={fOT.customer_id} onChange={e=>setFOT({...fOT,customer_id:e.target.value})} required><option value="">Elegir…</option>{customers.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
            <label style={etiqueta}>Región</label><select style={caja} value={fOT.region_id} onChange={e=>setFOT({...fOT,region_id:e.target.value})}><option value="">—</option>{regiones.map(r=><option key={r.id} value={r.id}>{r.nombre}</option>)}</select>
            <label style={etiqueta}>Asignar a</label><select style={caja} value={fOT.asignado} onChange={e=>setFOT({...fOT,asignado:e.target.value})}><option value="">Taller central DCG</option>{sats.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}</select>
            {msg && <p style={{color:C.rojo,fontSize:12}}>{msg}</p>}
            <button style={boton} type="submit">Crear OT volumen</button>
          </form>
          <form onSubmit={agregarLinea} style={{background:C.panel,border:`1px solid ${C.borde}`,borderRadius:10,padding:16}}>
            <h3 style={{margin:'0 0 12px',fontSize:15,letterSpacing:1}}>2 · LÍNEAS (qué se pidió armar)</h3>
            <label style={etiqueta}>OT</label><select style={caja} value={fL.ot_id} onChange={e=>{setFL({...fL,ot_id:e.target.value});cargarLineas(e.target.value);}}><option value="">Elegir…</option>{ots.map(o=><option key={o.id} value={o.id}>OT-{o.ot_number} · {nombreCliente(o.customer_id)}</option>)}</select>
            <label style={etiqueta}>Producto</label><select style={caja} value={fL.product_id} onChange={e=>setFL({...fL,product_id:e.target.value})} required><option value="">Elegir…</option>{productos.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}</select>
            <label style={etiqueta}>Cantidad solicitada</label><input style={caja} type="number" min="1" value={fL.cantidad} onChange={e=>setFL({...fL,cantidad:e.target.value})} />
            <button style={boton} type="submit">Agregar línea</button>
            <table style={{width:'100%',borderCollapse:'collapse',marginTop:10}}>
              <thead><tr><th style={th}>Producto</th><th style={th}>Solicitado</th><th style={th}>Armado real</th></tr></thead>
              <tbody>{lineas.map(l=>(<tr key={l.id}><td style={td}>{nombreProducto(l.product_id)}</td><td style={td}>{l.cantidad_solicitada}</td><td style={{...td,color:l.cantidad_armada>=l.cantidad_solicitada?C.verde:C.amarillo,fontFamily:'monospace'}}>{l.cantidad_armada}</td></tr>))}</tbody>
            </table>
          </form>
        </div>
        <div>
          <form onSubmit={validar} style={{background:C.panel,border:`1px solid ${C.borde}`,borderRadius:10,padding:16}}>
            <h3 style={{margin:'0 0 12px',fontSize:15,letterSpacing:1}}>3 · VALIDAR CUPÓN (antifraude)</h3>
            <label style={etiqueta}>OT</label><select style={caja} value={fV.ot_id} onChange={e=>setFV({...fV,ot_id:e.target.value})} required><option value="">Elegir…</option>{ots.map(o=><option key={o.id} value={o.id}>OT-{o.ot_number} · {nombreCliente(o.customer_id)}</option>)}</select>
            <label style={etiqueta}>Código de cupón *</label><input style={caja} value={fV.code} onChange={e=>setFV({...fV,code:e.target.value})} required placeholder="BLI00001" />
            <label style={etiqueta}>Serial / 2º código (opcional)</label><input style={caja} value={fV.serial} onChange={e=>setFV({...fV,serial:e.target.value})} placeholder="BIG515248" />
            <button style={boton} type="submit">Validar cupón</button>
            {val && <p style={{marginTop:12,fontSize:13,color:val.ok?C.verde:C.rojo,background:val.ok?'rgba(87,217,119,.08)':'rgba(255,93,93,.08)',border:`1px solid ${val.ok?C.verde:C.rojo}`,borderRadius:8,padding:10}}>{val.ok?'✓ ':'⛔ '}{val.texto}</p>}
          </form>
          <p style={{color:C.gris,fontSize:12,lineHeight:1.6,marginTop:14}}>Prueba el antifraude: valida un cupón → OK. Valida <b>el mismo otra vez</b> → bloqueo por reutilización. Valida uno que no existe → bloqueo. Uno de otra región → bloqueo.</p>
        </div>
      </section>
    </main>
  );
}
