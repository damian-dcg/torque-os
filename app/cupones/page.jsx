'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

const C={fondo:'#0d1216',panel:'#141b21',borde:'#26323d',borde2:'#31404d',tinta:'#e9eef2',gris:'#8b9aa6',naranja:'#ff6b2c',rojo:'#ff5d5d',verde:'#57d977',amarillo:'#ffc53d'};
const caja={width:'100%',padding:10,borderRadius:8,border:`1px solid ${C.borde2}`,background:'#1a232b',color:C.tinta,fontSize:13,marginBottom:10,boxSizing:'border-box'};
const etiqueta={fontSize:10,letterSpacing:1,color:C.gris,textTransform:'uppercase',display:'block',marginBottom:4,fontFamily:'monospace'};
const boton={padding:'10px 18px',borderRadius:8,border:0,background:C.naranja,color:'#14100c',fontWeight:700,cursor:'pointer',fontSize:13};
const th={textAlign:'left',fontSize:10,letterSpacing:1,textTransform:'uppercase',color:C.gris,padding:'8px 10px',borderBottom:`1px solid ${C.borde}`,fontFamily:'monospace'};
const td={padding:'9px 10px',borderBottom:'1px solid rgba(38,50,61,.5)',fontSize:12.5,color:C.tinta};
const link={color:C.gris,fontSize:12,textDecoration:'none',padding:'6px 10px',border:`1px solid ${C.borde2}`,borderRadius:8};

export default function Cupones(){
  const [f,setF]=useState({ref:'',region_id:'',product_id:'',codes:''});
  const [regiones,setRegiones]=useState([]); const [productos,setProductos]=useState([]); const [cupones,setCupones]=useState([]);
  const [msg,setMsg]=useState(''); const [aviso,setAviso]=useState('');
  const router=useRouter();
  useEffect(()=>{ supabase.auth.getSession().then(({data})=>{ if(!data.session) router.replace('/'); else cargar(); }); },[]);
  async function cargar(){
    const [r,p,c]=await Promise.all([
      supabase.from('regions').select('*'),
      supabase.from('products').select('*'),
      supabase.from('coupons').select('*').order('id',{ascending:false}).limit(50)
    ]);
    setRegiones(r.data||[]); setProductos(p.data||[]); setCupones(c.data||[]);
  }
  function avisoY(t){ setAviso(t); setTimeout(()=>setAviso(''),4000); cargar(); }
  async function guardar(e){
    e.preventDefault();
    const codes=f.codes.split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map(x=>x.toUpperCase());
    if(!codes.length){ setMsg('Pega al menos un código de cupón (uno por línea).'); return; }
    if(!f.region_id){ setMsg('Elige la región del lote.'); return; }
    const {data:batch,error:eb}=await supabase.from('coupon_batches').insert([{fabricante_ref:f.ref||null,region_id:Number(f.region_id),cantidad:codes.length}]).select();
    if(eb){ setMsg('Error: '+eb.message); return; }
    const filas=codes.map(c=>({code:c,batch_id:batch[0].id,region_id:Number(f.region_id),product_id:f.product_id?Number(f.product_id):null}));
    const {error:ec}=await supabase.from('coupons').insert(filas);
    if(ec){ setMsg('Error (¿códigos duplicados?): '+ec.message); }
    else { setMsg(''); setF({ref:'',region_id:'',product_id:'',codes:''}); avisoY(codes.length+' cupones cargados al lote '+(f.ref||'s/ref')); }
  }
  return (
    <main style={{minHeight:'100vh',background:C.fondo,color:C.tinta,fontFamily:'system-ui,sans-serif'}}>
      <header style={{display:'flex',alignItems:'center',gap:14,padding:'14px 22px',borderBottom:`1px solid ${C.borde}`}}>
        <h1 style={{margin:0,fontSize:22,letterSpacing:1}}>TORQUE<span style={{color:C.naranja}}>·OS</span></h1>
        <span style={{fontSize:11,color:C.gris}}>Cupones únicos · antifraude</span>
        <nav style={{marginLeft:'auto',display:'flex',gap:8}}><a style={link} href="/panel">Consola</a><a style={link} href="/catalogo">Catálogo</a><a style={link} href="/armado">Armado</a></nav>
      </header>
      <section style={{padding:'16px 22px'}}>
        {aviso && <div style={{marginBottom:12,padding:'10px 14px',borderRadius:8,background:'rgba(87,217,119,.1)',border:`1px solid ${C.verde}`,color:C.verde,fontSize:13}}>{aviso}</div>}
        <form onSubmit={guardar} style={{background:C.panel,border:`1px solid ${C.borde}`,borderRadius:10,padding:16,marginBottom:16}}>
          <h3 style={{margin:'0 0 12px',fontSize:15,letterSpacing:1}}>CARGAR LOTE DE CUPONES (del fabricante)</h3>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
            <div><label style={etiqueta}>Referencia del lote</label><input style={caja} value={f.ref} onChange={e=>setF({...f,ref:e.target.value})} placeholder="REM-2026-080" /></div>
            <div><label style={etiqueta}>Región asignada *</label><select style={caja} value={f.region_id} onChange={e=>setF({...f,region_id:e.target.value})} required><option value="">Elegir…</option>{regiones.map(r=><option key={r.id} value={r.id}>{r.nombre}</option>)}</select></div>
            <div><label style={etiqueta}>Producto (opcional)</label><select style={caja} value={f.product_id} onChange={e=>setF({...f,product_id:e.target.value})}><option value="">—</option>{productos.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}</select></div>
          </div>
          <label style={etiqueta}>Códigos de cupón (uno por línea)</label>
          <textarea style={caja} rows="5" value={f.codes} onChange={e=>setF({...f,codes:e.target.value})} placeholder={'BLI00001\nBLI00002\nBLI00003'} />
          {msg && <p style={{color:C.rojo,fontSize:12}}>{msg}</p>}
          <button style={boton} type="submit">Cargar cupones</button>
        </form>
        <div style={{background:C.panel,border:`1px solid ${C.borde}`,borderRadius:10,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr><th style={th}>Cupón</th><th style={th}>Estado</th><th style={th}>Serial (2º código)</th><th style={th}>Usado en OT</th></tr></thead>
            <tbody>{cupones.map(c=>(<tr key={c.id}><td style={{...td,fontFamily:'monospace'}}>{c.code}</td><td style={{...td,color:c.estado==='disponible'?C.verde:c.estado==='usado'?C.amarillo:C.rojo}}>{c.estado}</td><td style={td}>{c.codigo_secundario||'—'}</td><td style={td}>{c.usado_ot_id?'OT id '+c.usado_ot_id:'—'}</td></tr>))}</tbody>
          </table>
          {cupones.length===0 && <p style={{padding:14,color:C.gris,fontSize:12.5}}>Aún no hay cupones cargados.</p>}
        </div>
      </section>
    </main>
  );
}
