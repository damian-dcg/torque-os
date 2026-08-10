'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S, estColor, fmtFecha } from '../ui';

export default function ModActivos({avisar}){
  const [acts,setActs]=useState([]); const [cust,setCust]=useState([]); const [fams,setFams]=useState([]); const [ots,setOts]=useState([]);
  const [f,setF]=useState({customer_id:'',family_id:'',serial:'',model:'',purchase_date:'',store:'',warranty_until:'',location:''});
  const [sel,setSel]=useState(null);
  async function cargar(){ const [a,c,fo,o]=await Promise.all([
    supabase.from('assets').select('*').order('id',{ascending:false}).limit(300),
    supabase.from('customers').select('id,nombre').limit(400),
    supabase.from('product_families').select('*'),
    supabase.from('work_orders').select('id,ot_number,estado,tipo,created_at,customer_id').order('id',{ascending:false}).limit(400)]);
    setActs(a.data||[]); setCust(c.data||[]); setFams(fo.data||[]); setOts(o.data||[]); }
  useEffect(()=>{ cargar(); },[]);
  async function crear(e){ e.preventDefault();
    const {error}=await supabase.from('assets').insert([{customer_id:Number(f.customer_id),family_id:Number(f.family_id)||null,serial:f.serial,model:f.model,purchase_date:f.purchase_date||null,store:f.store,warranty_until:f.warranty_until||null,location:f.location}]);
    if(error) avisar('⛔ '+error.message,T.danger); else { avisar('✅ Activo registrado',T.ok); setF({customer_id:'',family_id:'',serial:'',model:'',purchase_date:'',store:'',warranty_until:'',location:''}); cargar(); } }
  const hist=sel? ots.filter(o=>o.customer_id===sel.customer_id):[];
  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(340px,1fr))',gap:14}}>
      <div>
        <div style={S.card}>
          <h2 style={S.h2}>Registrar activo / equipo</h2>
          <form onSubmit={crear}>
            <select style={S.input} required value={f.customer_id} onChange={e=>setF({...f,customer_id:e.target.value})}><option value="">Cliente…</option>{cust.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
            <select style={S.input} value={f.family_id} onChange={e=>setF({...f,family_id:e.target.value})}><option value="">Familia…</option>{fams.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>
            <input style={S.input} placeholder="N° de serie" value={f.serial} onChange={e=>setF({...f,serial:e.target.value})}/>
            <input style={S.input} placeholder="Modelo" value={f.model} onChange={e=>setF({...f,model:e.target.value})}/>
            <label style={S.label}>Fecha de compra</label><input style={S.input} type="date" value={f.purchase_date} onChange={e=>setF({...f,purchase_date:e.target.value})}/>
            <input style={S.input} placeholder="Tienda de compra" value={f.store} onChange={e=>setF({...f,store:e.target.value})}/>
            <label style={S.label}>Garantía hasta</label><input style={S.input} type="date" value={f.warranty_until} onChange={e=>setF({...f,warranty_until:e.target.value})}/>
            <input style={S.input} placeholder="Ubicación actual" value={f.location} onChange={e=>setF({...f,location:e.target.value})}/>
            <button style={S.btn(T.ok)}>Guardar activo</button>
          </form>
        </div>
        <div style={S.card}>
          <h2 style={S.h2}>Activos</h2>
          {acts.map(a=>(
            <button key={a.id} onClick={()=>setSel(a)} style={{...S.btnO(sel&&sel.id===a.id?T.brand:T.border),textAlign:'left',color:T.text}}>
              {a.serial||a.model} · {(cust.find(c=>c.id===a.customer_id)||{}).nombre||''}
            </button>))}
          {acts.length===0&&<p style={S.sub}>Sin activos registrados.</p>}
        </div>
      </div>
      <div style={S.card}>
        <h2 style={S.h2}>Historial del activo</h2>
        {sel? <>
          <p style={{color:T.text,fontSize:15,fontWeight:700}}>{sel.model} · serie {sel.serial||'—'}</p>
          <p style={S.sub}>{(cust.find(c=>c.id===sel.customer_id)||{}).nombre} · comprado {sel.purchase_date||'—'} en {sel.store||'—'} · garantía hasta {sel.warranty_until||'—'}</p>
          <h3 style={{...S.h2,marginTop:12}}>OTs del cliente</h3>
          {hist.map(o=><p key={o.id} style={{color:T.text,fontSize:13,margin:'4px 0'}}>OT-{o.ot_number} · {o.tipo} · <span style={S.pill(estColor(o.estado))}>{o.estado}</span> · {fmtFecha(o.created_at)}</p>)}
          {hist.length===0&&<p style={S.sub}>Sin OTs aún.</p>}
        </>:<p style={S.sub}>Selecciona un activo para ver su historial completo (compra, garantía y todas sus OTs).</p>}
      </div>
    </div>);
}
