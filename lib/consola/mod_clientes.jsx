'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S } from '../ui';

export default function ModClientes({avisar}){
  const [rows,setRows]=useState([]); const [q,setQ]=useState(''); const [regs,setRegs]=useState([]);
  const [f,setF]=useState({nombre:'',rut:'',tipo:'final',region_id:'',telefono:'',email:'',direccion:''});
  useEffect(()=>{(async()=>{
    const [c,r]=await Promise.all([supabase.from('customers').select('*').order('id',{ascending:false}).limit(400),supabase.from('regions').select('*')]);
    setRows(c.data||[]); setRegs(r.data||[]);
  })();},[]);
  async function guardar(e){
    e.preventDefault();
    const {error}=await supabase.from('customers').insert([{nombre:f.nombre,rut:f.rut||null,tipo:f.tipo,region_id:f.region_id?Number(f.region_id):null,telefono:f.telefono||null,email:f.email||null,direccion:f.direccion||null}]);
    if(error) avisar('⛔ '+error.message,T.danger);
    else { avisar('✅ Cliente creado',T.ok); setF({nombre:'',rut:'',tipo:'final',region_id:'',telefono:'',email:'',direccion:''});
      const {data}=await supabase.from('customers').select('*').order('id',{ascending:false}).limit(400); setRows(data||[]); }
  }
  const vis=rows.filter(r=>{const t=q.toLowerCase(); return !t||(r.nombre||'').toLowerCase().includes(t)||(r.rut||'').toLowerCase().includes(t);});
  return (
    <div>
      <div style={S.card}>
        <h2 style={S.h2}>Nuevo cliente</h2>
        <form onSubmit={guardar} style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10}}>
          <input style={S.input} required placeholder="Nombre / razón social" value={f.nombre} onChange={e=>setF({...f,nombre:e.target.value})}/>
          <input style={S.input} placeholder="RUT" value={f.rut} onChange={e=>setF({...f,rut:e.target.value})}/>
          <select style={S.input} value={f.tipo} onChange={e=>setF({...f,tipo:e.target.value})}><option value="final">final</option><option value="retail">retail</option><option value="mayorista">mayorista</option><option value="proveedor">proveedor</option></select>
          <select style={S.input} value={f.region_id} onChange={e=>setF({...f,region_id:e.target.value})}><option value="">Región…</option>{regs.map(r=><option key={r.id} value={r.id}>{r.nombre}</option>)}</select>
          <input style={S.input} placeholder="Teléfono" value={f.telefono} onChange={e=>setF({...f,telefono:e.target.value})}/>
          <input style={S.input} type="email" placeholder="Email" value={f.email} onChange={e=>setF({...f,email:e.target.value})}/>
          <input style={S.input} placeholder="Dirección" value={f.direccion} onChange={e=>setF({...f,direccion:e.target.value})}/>
          <button style={S.btn(T.ok)}>Guardar</button>
        </form>
      </div>
      <div style={S.card}>
        <input style={{...S.input,maxWidth:320}} placeholder="Buscar nombre o RUT…" value={q} onChange={e=>setQ(e.target.value)}/>
        <div style={{overflow:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr><th style={S.th}>Nombre</th><th style={S.th}>Tipo</th><th style={S.th}>RUT</th><th style={S.th}>Teléfono</th><th style={S.th}>Dirección</th></tr></thead>
          <tbody>{vis.map(r=><tr key={r.id}><td style={S.td}>{r.nombre}</td><td style={S.td}>{r.tipo}</td><td style={S.td}>{r.rut||'—'}</td><td style={S.td}>{r.telefono||'—'}</td><td style={S.td}>{r.direccion||'—'}</td></tr>)}</tbody>
        </table></div>
      </div>
    </div>);
}
