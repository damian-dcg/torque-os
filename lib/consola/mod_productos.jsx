'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S } from '../ui';

export default function ModProductos({avisar}){
  const [rows,setRows]=useState([]); const [fams,setFams]=useState([]); const [q,setQ]=useState('');
  const [f,setF]=useState({family_id:'',brand:'',model:'',sku:'',warranty_months:6,warranty_conditions:''});
  async function cargar(){ const [p,fo]=await Promise.all([supabase.from('product_catalog').select('*').order('id',{ascending:false}).limit(400), supabase.from('product_families').select('*')]); setRows(p.data||[]); setFams(fo.data||[]); }
  useEffect(()=>{ cargar(); },[]);
  async function crear(e){ e.preventDefault(); const {error}=await supabase.from('product_catalog').insert([f]);
    if(error) avisar('⛔ '+error.message,T.danger); else { avisar('✅ Ficha creada',T.ok); setF({family_id:'',brand:'',model:'',sku:'',warranty_months:6,warranty_conditions:''}); cargar(); } }
  async function upd(r,k,v){ await supabase.from('product_catalog').update({[k]:v}).eq('id',r.id); cargar(); }
  const vis=rows.filter(r=>{ const t=q.toLowerCase(); return !t||(r.model||'').toLowerCase().includes(t)||(r.sku||'').toLowerCase().includes(t)||(r.brand||'').toLowerCase().includes(t); });
  return (
    <div>
      <div style={S.card}>
        <h2 style={S.h2}>Nueva ficha de producto</h2>
        <form onSubmit={crear} style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:8}}>
          <select style={S.input} required value={f.family_id} onChange={e=>setF({...f,family_id:e.target.value})}><option value="">Familia…</option>{fams.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>
          <input style={S.input} placeholder="Marca" value={f.brand} onChange={e=>setF({...f,brand:e.target.value})}/>
          <input style={S.input} required placeholder="Modelo" value={f.model} onChange={e=>setF({...f,model:e.target.value})}/>
          <input style={S.input} placeholder="SKU/Código" value={f.sku} onChange={e=>setF({...f,sku:e.target.value})}/>
          <input style={S.input} type="number" placeholder="Meses garantía" value={f.warranty_months} onChange={e=>setF({...f,warranty_months:Number(e.target.value)})}/>
          <input style={S.input} placeholder="Condiciones de garantía" value={f.warranty_conditions} onChange={e=>setF({...f,warranty_conditions:e.target.value})}/>
          <button style={S.btn(T.ok)}>Crear ficha</button>
        </form>
      </div>
      <div style={S.card}>
        <input style={{...S.input,maxWidth:320}} placeholder="Buscar modelo/SKU/marca…" value={q} onChange={e=>setQ(e.target.value)}/>
        <div style={{overflow:'auto',maxHeight:460}}><table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr><th style={S.th}>Familia</th><th style={S.th}>Marca</th><th style={S.th}>Modelo</th><th style={S.th}>SKU</th><th style={S.th}>Garantía (meses)</th><th style={S.th}>Condiciones</th></tr></thead>
          <tbody>{vis.map(r=><tr key={r.id}>
            <td style={S.td}>{(fams.find(x=>x.id===r.family_id)||{}).name||'—'}</td>
            <td style={S.td}><input style={{...S.input,minWidth:90,marginBottom:0}} defaultValue={r.brand} onBlur={e=>upd(r,'brand',e.target.value)}/></td>
            <td style={S.td}><input style={{...S.input,minWidth:140,marginBottom:0}} defaultValue={r.model} onBlur={e=>upd(r,'model',e.target.value)}/></td>
            <td style={S.td}>{r.sku||'—'}</td>
            <td style={S.td}><input style={{...S.input,width:70,marginBottom:0}} type="number" defaultValue={r.warranty_months} onBlur={e=>upd(r,'warranty_months',Number(e.target.value))}/></td>
            <td style={S.td}><input style={{...S.input,minWidth:200,marginBottom:0}} defaultValue={r.warranty_conditions} onBlur={e=>upd(r,'warranty_conditions',e.target.value)}/></td>
          </tr>)}</tbody>
        </table></div>
      </div>
    </div>);
}
