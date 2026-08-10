'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S, fmtCLP } from '../ui';

export default function ModPresupuestos({avisar,tenant}){
  const [rows,setRows]=useState([]); const [cust,setCust]=useState([]);
  const [f,setF]=useState({customer_id:'',items:[{concepto:'',cantidad:1,precio:0}]});
  async function cargar(){ const [p,c]=await Promise.all([
    supabase.from('presupuestos').select('*').order('id',{ascending:false}).limit(200),
    supabase.from('customers').select('id,nombre').limit(400)]);
    setRows(p.data||[]); setCust(c.data||[]); }
  useEffect(()=>{ cargar(); },[]);
  const total=f.items.reduce((s,x)=>s+(Number(x.cantidad)||0)*(Number(x.precio)||0),0);
  async function crear(){ if(!f.customer_id){ avisar('⛔ Cliente obligatorio',T.danger); return; }
    const items=f.items.filter(x=>x.concepto);
    if(!items.length){ avisar('⛔ Agrega al menos un ítem',T.danger); return; }
    const {error}=await supabase.from('presupuestos').insert([{customer_id:Number(f.customer_id),items,total}]);
    if(error) avisar('⛔ '+error.message,T.danger); else { avisar('✅ Presupuesto creado',T.ok); setF({customer_id:'',items:[{concepto:'',cantidad:1,precio:0}]}); cargar(); } }
  async function setEstado(p,e){ await supabase.from('presupuestos').update({estado:e}).eq('id',p.id); cargar(); }
  function pdf(p){ const c=cust.find(x=>x.id===p.customer_id); const w=window.open('','_blank');
    w.document.write(`<html><head><title>Presupuesto ${p.id}</title><style>body{font-family:Arial;padding:24px}h1{margin:0}table{width:100%;border-collapse:collapse;margin:12px 0}td,th{border:1px solid #ccc;padding:6px;font-size:12px;text-align:left}</style></head><body>
<h1 style="color:${(tenant&&tenant.color_primario)||'#FF6B2C'}">${tenant?tenant.nombre:'TORQUE·OS'}</h1>
<p>Presupuesto N° ${p.id} · ${new Date(p.creado_en).toLocaleDateString('es-CL')} · Cliente: ${c?c.nombre:''}</p>
<table><tr><th>Concepto</th><th>Cant.</th><th>Precio</th><th>Total</th></tr>${(p.items||[]).map(i=>`<tr><td>${i.concepto}</td><td>${i.cantidad}</td><td>${fmtCLP(i.precio)}</td><td>${fmtCLP(i.cantidad*i.precio)}</td></tr>`).join('')}
<tr><td colspan="3"><b>TOTAL</b></td><td><b>${fmtCLP(p.total)}</b></td></tr></table>
<p>Validez 15 días. Este documento no constituye boleta ni factura.</p><script>window.print()</script></body></html>`);
    w.document.close(); }
  return (
    <div>
      <div style={S.card}>
        <h2 style={S.h2}>Nuevo presupuesto</h2>
        <select style={S.input} value={f.customer_id} onChange={e=>setF({...f,customer_id:e.target.value})}><option value="">Cliente…</option>{cust.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
        {f.items.map((it,i)=>(
          <div key={i} style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:8}}>
            <input style={{...S.input,flex:2,marginBottom:0}} placeholder="Concepto (ej: Cambio de banda de trote)" value={it.concepto} onChange={e=>{const c=[...f.items]; c[i]={...c[i],concepto:e.target.value}; setF({...f,items:c});}}/>
            <input style={{...S.input,width:80,marginBottom:0}} type="number" value={it.cantidad} onChange={e=>{const c=[...f.items]; c[i]={...c[i],cantidad:e.target.value}; setF({...f,items:c});}}/>
            <input style={{...S.input,width:120,marginBottom:0}} type="number" placeholder="$" value={it.precio} onChange={e=>{const c=[...f.items]; c[i]={...c[i],precio:e.target.value}; setF({...f,items:c});}}/>
            <button style={{...S.btnO(T.danger),width:'auto',marginBottom:0}} onClick={()=>setF({...f,items:f.items.filter((_,k)=>k!==i)})}>✕</button>
          </div>))}
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <button style={{...S.btnO(T.info),width:'auto',marginBottom:0}} onClick={()=>setF({...f,items:[...f.items,{concepto:'',cantidad:1,precio:0}]})}>+ Ítem</button>
          <b style={{color:T.ok,fontSize:16}}>Total: {fmtCLP(total)}</b>
          <button style={{...S.btn(T.ok),width:'auto',marginBottom:0,marginLeft:'auto'}} onClick={crear}>Crear</button>
        </div>
      </div>
      <div style={S.card}>
        <h2 style={S.h2}>Presupuestos</h2>
        {rows.map(p=>(
          <div key={p.id} style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:8,border:`1px solid ${T.border}`,borderRadius:10,padding:10}}>
            <b style={{color:T.brand}}>#{p.id}</b>
            <span style={{flex:1,color:T.text}}>{(cust.find(c=>c.id===p.customer_id)||{}).nombre||''} · {p.items.length} ítem(s)</span>
            <b style={{color:T.ok}}>{fmtCLP(p.total)}</b>
            <select style={{...S.input,width:130,marginBottom:0}} value={p.estado} onChange={e=>setEstado(p,e.target.value)}><option>borrador</option><option>enviado</option><option>aceptado</option><option>rechazado</option></select>
            <button style={{...S.btnO(T.info),width:'auto',marginBottom:0}} onClick={()=>pdf(p)}>PDF</button>
            <a style={{...S.btnO(T.ok),width:'auto',marginBottom:0,textDecoration:'none'}} target="_blank" href={`https://wa.me/?text=${encodeURIComponent('Presupuesto N° '+p.id+' por '+fmtCLP(p.total)+'. '+((cust.find(c=>c.id===p.customer_id)||{}).nombre||''))}`}>WA</a>
          </div>))}
        {rows.length===0&&<p style={S.sub}>Sin presupuestos aún.</p>}
      </div>
    </div>);
}
