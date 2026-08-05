'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

const C={fondo:'#0d1216',panel:'#141b21',borde:'#26323d',borde2:'#31404d',tinta:'#e9eef2',gris:'#8b9aa6',naranja:'#ff6b2c',rojo:'#ff5d5d',verde:'#57d977'};
const caja={width:'100%',padding:10,borderRadius:8,border:`1px solid ${C.borde2}`,background:'#1a232b',color:C.tinta,fontSize:13,marginBottom:10,boxSizing:'border-box'};
const etiqueta={fontSize:10,letterSpacing:1,color:C.gris,textTransform:'uppercase',display:'block',marginBottom:4,fontFamily:'monospace'};
const boton={padding:'10px 18px',borderRadius:8,border:0,background:C.naranja,color:'#14100c',fontWeight:700,cursor:'pointer',fontSize:13};
const th={textAlign:'left',fontSize:10,letterSpacing:1,textTransform:'uppercase',color:C.gris,padding:'8px 10px',borderBottom:`1px solid ${C.borde}`,fontFamily:'monospace'};
const td={padding:'9px 10px',borderBottom:'1px solid rgba(38,50,61,.5)',fontSize:12.5,color:C.tinta};
const link={color:C.gris,fontSize:12,textDecoration:'none',padding:'6px 10px',border:`1px solid ${C.borde2}`,borderRadius:8};

export default function Catalogo(){
  const [f,setF]=useState({marca:'',nombre:'',sku:'',ean_caja:'',tipo:'bici'});
  const [productos,setProductos]=useState([]);
  const [msg,setMsg]=useState(''); const [aviso,setAviso]=useState('');
  const router=useRouter();
  useEffect(()=>{ supabase.auth.getSession().then(({data})=>{ if(!data.session) router.replace('/'); else cargar(); }); },[]);
  async function cargar(){
    const {data}=await supabase.from('products').select('*, brands(nombre)').order('id',{ascending:false}).limit(100);
    setProductos(data||[]);
  }
  function avisoY(t){ setAviso(t); setTimeout(()=>setAviso(''),4000); cargar(); }
  async function guardar(e){
    e.preventDefault();
    let brand_id=null;
    if(f.marca){
      const {data}=await supabase.from('brands').select('id').ilike('nombre',f.marca).limit(1);
      if(data&&data.length) brand_id=data[0].id;
      else { const {data:nb}=await supabase.from('brands').insert([{nombre:f.marca}]).select(); if(nb) brand_id=nb[0].id; }
    }
    const {data:cat}=await supabase.from('product_categories').select('id').eq('tipo',f.tipo).limit(1);
    const {error}=await supabase.from('products').insert([{brand_id,category_id:cat&&cat.length?cat[0].id:null,nombre:f.nombre,sku:f.sku||null,ean_caja:f.ean_caja||null}]);
    if(error) setMsg('Error: '+error.message);
    else { setMsg(''); setF({marca:'',nombre:'',sku:'',ean_caja:'',tipo:'bici'}); avisoY('Producto creado: '+f.nombre); }
  }
  return (
    <main style={{minHeight:'100vh',background:C.fondo,color:C.tinta,fontFamily:'system-ui,sans-serif'}}>
      <header style={{display:'flex',alignItems:'center',gap:14,padding:'14px 22px',borderBottom:`1px solid ${C.borde}`}}>
        <h1 style={{margin:0,fontSize:22,letterSpacing:1}}>TORQUE<span style={{color:C.naranja}}>·OS</span></h1>
        <span style={{fontSize:11,color:C.gris}}>Catálogo de productos</span>
        <nav style={{marginLeft:'auto',display:'flex',gap:8}}><a style={link} href="/panel">Consola</a><a style={link} href="/cupones">Cupones</a><a style={link} href="/armado">Armado</a></nav>
      </header>
      <section style={{padding:'16px 22px'}}>
        {aviso && <div style={{marginBottom:12,padding:'10px 14px',borderRadius:8,background:'rgba(87,217,119,.1)',border:`1px solid ${C.verde}`,color:C.verde,fontSize:13}}>{aviso}</div>}
        <form onSubmit={guardar} style={{background:C.panel,border:`1px solid ${C.borde}`,borderRadius:10,padding:16,marginBottom:16}}>
          <h3 style={{margin:'0 0 12px',fontSize:15,letterSpacing:1}}>NUEVO PRODUCTO</h3>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div><label style={etiqueta}>Marca</label><input style={caja} value={f.marca} onChange={e=>setF({...f,marca:e.target.value})} placeholder="Bianchi" /></div>
            <div><label style={etiqueta}>Nombre / modelo *</label><input style={caja} value={f.nombre} onChange={e=>setF({...f,nombre:e.target.value})} required placeholder="Hotwheels 16 Negro" /></div>
            <div><label style={etiqueta}>SKU interno</label><input style={caja} value={f.sku} onChange={e=>setF({...f,sku:e.target.value})} placeholder="BIA-HW16" /></div>
            <div><label style={etiqueta}>Código de caja (EAN)</label><input style={caja} value={f.ean_caja} onChange={e=>setF({...f,ean_caja:e.target.value})} placeholder="BIG-CAJA-HW16" /></div>
            <div><label style={etiqueta}>Categoría</label><select style={caja} value={f.tipo} onChange={e=>setF({...f,tipo:e.target.value})}><option value="bici">Bicicleta</option><option value="fitness">Fitness</option><option value="ebike">E-bike</option><option value="otro">Otro</option></select></div>
          </div>
          {msg && <p style={{color:C.rojo,fontSize:12}}>{msg}</p>}
          <button style={boton} type="submit">Guardar producto</button>
        </form>
        <div style={{background:C.panel,border:`1px solid ${C.borde}`,borderRadius:10,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr><th style={th}>Producto</th><th style={th}>Marca</th><th style={th}>SKU</th><th style={th}>Código caja</th></tr></thead>
            <tbody>{productos.map(p=>(<tr key={p.id}><td style={td}>{p.nombre}</td><td style={td}>{p.brands?p.brands.nombre:'—'}</td><td style={td}>{p.sku||'—'}</td><td style={td}>{p.ean_caja||'—'}</td></tr>))}</tbody>
          </table>
          {productos.length===0 && <p style={{padding:14,color:C.gris,fontSize:12.5}}>Aún no hay productos.</p>}
        </div>
      </section>
    </main>
  );
}
