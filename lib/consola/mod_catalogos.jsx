'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S } from '../ui';

function Crud({titulo,tabla,campos,avisar}){
  const [rows,setRows]=useState([]); const [f,setF]=useState({});
  async function cargar(){ const {data}=await supabase.from(tabla).select('*').order('id'); setRows(data||[]); }
  useEffect(()=>{ cargar(); },[]);
  async function crear(e){ e.preventDefault();
    const {error}=await supabase.from(tabla).insert([f]);
    if(error) avisar('⛔ '+error.message,T.danger); else { avisar('✅ Creado',T.ok); setF({}); cargar(); } }
  async function toggle(r){ await supabase.from(tabla).update({active:!r.active}).eq('id',r.id); cargar(); }
  return (
    <div style={S.card}>
      <h2 style={S.h2}>{titulo}</h2>
      <form onSubmit={crear} style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:10}}>
        {campos.map(([k,l,t])=><input key={k} style={{...S.input,flex:1,minWidth:140,marginBottom:0}} type={t||'text'} placeholder={l} value={f[k]||''} onChange={e=>setF({...f,[k]:e.target.value})} required={t==='req'}/>)}
        <button style={{...S.btn(T.info),width:'auto',marginBottom:0}}>+ Agregar</button>
      </form>
      <table style={{width:'100%',borderCollapse:'collapse'}}>
        <thead><tr>{campos.map(([k,l])=><th key={k} style={S.th}>{l}</th>)}<th style={S.th}>Activo</th></tr></thead>
        <tbody>{rows.map(r=><tr key={r.id}>{campos.map(([k])=><td key={k} style={S.td}>{r[k]??'—'}</td>)}
          <td style={S.td}>{r.active!=null? <button onClick={()=>toggle(r)} style={{padding:'4px 10px',borderRadius:8,border:`1.5px solid ${r.active?T.ok:T.danger}`,background:'transparent',color:r.active?T.ok:T.danger,fontWeight:800,cursor:'pointer'}}>{r.active?'SÍ':'NO'}</button>:'—'}</td></tr>)}</tbody>
      </table>
    </div>);
}

export default function ModCatalogos({avisar}){
  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(340px,1fr))',gap:14}}>
      <Crud titulo="Familias de producto" tabla="product_families" campos={[['code','Código','req'],['name','Nombre','req']]} avisar={avisar}/>
      <Crud titulo="Tiendas retail" tabla="retail_stores" campos={[['name','Nombre','req'],['rut','RUT'],['address','Dirección'],['comuna','Comuna']]} avisar={avisar}/>
      <Crud titulo="Talleres externos" tabla="external_workshops" campos={[['name','Nombre','req'],['rut','RUT'],['contact','Contacto'],['phone','Teléfono']]} avisar={avisar}/>
      <Crud titulo="Fallas comunes (por familia)" tabla="common_faults" campos={[['family_id','ID Familia','number'],['description','Descripción','req']]} avisar={avisar}/>
    </div>);
}
