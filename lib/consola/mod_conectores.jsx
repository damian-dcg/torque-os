'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S } from '../ui';

export default function ModConectores({avisar}){
  const [cons,setCons]=useState([]);
  const [f,setF]=useState({nombre:'',tipo:'csv',url:''});
  useEffect(()=>{(async()=>{ const {data}=await supabase.from('settings').select('valor').eq('tenant_id','dcg').eq('clave','conectores').single(); setCons(data&&data.valor?data.valor:[]); })();},[]);
  async function guardar(){ if(!f.nombre){ avisar('⛔ Nombre obligatorio',T.danger); return; }
    const next=[...cons,{...f,creado:new Date().toISOString()}];
    const {error}=await supabase.from('settings').upsert({tenant_id:'dcg',clave:'conectores',valor:next});
    if(error) avisar('⛔ '+error.message,T.danger); else { avisar('✅ Conector registrado',T.ok); setCons(next); setF({nombre:'',tipo:'csv',url:''}); } }
  async function importarClientes(file){
    const text=await file.text();
    const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(l=>l.trim());
    let ok=0, dup=0;
    for(const l of lines){ const c=l.split(';'); const rut=(c[1]||'').trim(); const nombre=(c[0]||'').trim();
      if(!nombre||nombre.toLowerCase().includes('nombre')) continue;
      const {data}=await supabase.from('customers').select('id').eq('rut',rut).limit(1);
      if(data&&data.length){ dup++; continue; }
      const {error}=await supabase.from('customers').insert([{nombre,rut:rut||null,tipo:'final',telefono:(c[4]||'').trim()||null,email:(c[3]||'').trim()||null,direccion:(c[6]||'').trim()||null}]);
      if(!error) ok++; }
    avisar(`✅ Clientes importados: ${ok} · duplicados omitidos: ${dup}`,T.ok);
  }
  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))',gap:14}}>
      <div style={S.card}>
        <h2 style={S.h2}>Conectores de solo lectura</h2>
        <p style={S.sub}>Registra las fuentes externas (SAP, Bsale, Excel) desde las que el sistema importa maestros. La operación real nunca escribe hacia afuera.</p>
        {cons.map((c,i)=><p key={i} style={{color:T.text,fontSize:14,margin:'6px 0'}}><b style={{color:T.brand}}>{c.nombre}</b> · {c.tipo} {c.url&&('· '+c.url)}</p>)}
        {cons.length===0&&<p style={S.sub}>Sin conectores registrados.</p>}
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:10}}>
          <input style={{...S.input,flex:2,marginBottom:0}} placeholder="Nombre (ej: SAP Bianchi)" value={f.nombre} onChange={e=>setF({...f,nombre:e.target.value})}/>
          <select style={{...S.input,width:110,marginBottom:0}} value={f.tipo} onChange={e=>setF({...f,tipo:e.target.value})}><option value="csv">CSV</option><option value="sap">SAP</option><option value="bsale">Bsale</option></select>
          <input style={{...S.input,flex:2,marginBottom:0}} placeholder="URL / ruta export" value={f.url} onChange={e=>setF({...f,url:e.target.value})}/>
          <button style={{...S.btn(T.info),width:'auto',marginBottom:0}} onClick={guardar}>+ Registrar</button>
        </div>
      </div>
      <div style={S.card}>
        <h2 style={S.h2}>Importador CSV (maestros)</h2>
        <p style={S.sub}>Carga masiva de clientes desde tu ERP (formato: nombre;rut;…;telefono;email;…;direccion). Los duplicados por RUT se omiten.</p>
        <label style={{...S.btnO(T.ok),cursor:'pointer',display:'inline-block'}}>📥 Importar clientes (CSV)
          <input type="file" accept=".csv,.txt" style={{display:'none'}} onChange={e=>importarClientes(e.target.files[0])}/></label>
        <p style={{...S.sub,marginTop:12}}>El stock de repuestos ya se sincroniza desde <b>Inventario → Subir stock</b> (espejo exacto de tu planilla A–M).</p>
      </div>
    </div>);
}
