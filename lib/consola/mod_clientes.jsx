'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S } from '../ui';

export default function ModClientes(props){
  var avisar=props.avisar||function(){};
  var onOpen=props.onOpenCliente||function(){};
  var s1=useState([]),rows=s1[0],setRows=s1[1];
  var s2=useState([]),regs=s2[0],setRegs=s2[1];
  var s3=useState(''),q=s3[0],setQ=s3[1];
  var s4=useState({nombre:'',rut:'',tipo:'final',telefono:'',email:'',direccion:'',comuna:'',region_id:''}),f=s4[0],setF=s4[1];
  async function cargar(){
    var r=await Promise.all([
      supabase.from('customers').select('*').order('id',{ascending:false}).limit(500),
      supabase.from('regions').select('*')
    ]);
    setRows(r[0].data||[]); setRegs(r[1].data||[]);
  }
  useEffect(function(){ cargar(); },[]);
  async function crear(e){
    e.preventDefault();
    if(!f.nombre){ avisar('⛗ Nombre obligatorio',T.danger); return; }
    var payload={nombre:f.nombre,rut:f.rut||null,tipo:f.tipo,telefono:f.telefono||null,email:f.email||null,direccion:f.direccion||null,comuna:f.comuna||null,region_id:f.region_id?Number(f.region_id):null};
    var r=await supabase.from('customers').insert([payload]);
    if(r.error) avisar('⛗ '+r.error.message,T.danger);
    else { avisar('✅ Cliente creado',T.ok); setF({nombre:'',rut:'',tipo:'final',telefono:'',email:'',direccion:'',comuna:'',region_id:''}); cargar(); }
  }
  var vis=rows.filter(function(r){
    var t=q.toLowerCase();
    return !t||(r.nombre||'').toLowerCase().indexOf(t)>=0||String(r.rut||'').indexOf(t)>=0;
  });
  return (
    <div>
      <div style={S.card}>
        <h2 style={S.h2}>Nuevo cliente</h2>
        <form onSubmit={crear} style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:8}}>
          <input style={S.input} placeholder="Nombre / Razón social *" value={f.nombre} onChange={function(e){ setF(Object.assign({},f,{nombre:e.target.value})); }}/>
          <input style={S.input} placeholder="RUT" value={f.rut} onChange={function(e){ setF(Object.assign({},f,{rut:e.target.value})); }}/>
          <select style={S.input} value={f.tipo} onChange={function(e){ setF(Object.assign({},f,{tipo:e.target.value})); }}><option value="final">Final</option><option value="retail">Retail</option><option value="mayorista">Mayorista</option><option value="empresa">Empresa</option></select>
          <input style={S.input} placeholder="Teléfono" value={f.telefono} onChange={function(e){ setF(Object.assign({},f,{telefono:e.target.value})); }}/>
          <input style={S.input} placeholder="Email" value={f.email} onChange={function(e){ setF(Object.assign({},f,{email:e.target.value})); }}/>
          <select style={S.input} value={f.region_id} onChange={function(e){ setF(Object.assign({},f,{region_id:e.target.value})); }}><option value="">Región…</option>{regs.map(function(r){ return <option key={r.id} value={r.id}>{r.nombre}</option>; })}</select>
          <input style={S.input} placeholder="Comuna" value={f.comuna} onChange={function(e){ setF(Object.assign({},f,{comuna:e.target.value})); }}/>
          <input style={S.input} placeholder="Dirección" value={f.direccion} onChange={function(e){ setF(Object.assign({},f,{direccion:e.target.value})); }}/>
          <button style={{...S.btn(T.ok),marginBottom:0}}>Crear cliente</button>
        </form>
      </div>
      <div style={S.card}>
        <div style={{display:'flex',gap:8,marginBottom:10}}>
          <input style={{...S.input,flex:1,marginBottom:0}} placeholder="Buscar por nombre o RUT…" value={q} onChange={function(e){ setQ(e.target.value); }}/>
        </div>
        <div style={{overflow:'auto',maxHeight:480}}><table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr><th style={S.th}>Nombre</th><th style={S.th}>RUT</th><th style={S.th}>Tipo</th><th style={S.th}>Teléfono</th><th style={S.th}>Comuna</th></tr></thead>
          <tbody>{vis.map(function(r){
            return <tr key={r.id} onClick={function(){ onOpen(r); }} style={{cursor:'pointer'}}>
              <td style={{...S.td,fontWeight:700,color:T.brand}}>{r.nombre}</td>
              <td style={S.td}>{r.rut||'—'}</td>
              <td style={S.td}>{r.tipo}</td>
              <td style={S.td}>{r.telefono||'—'}</td>
              <td style={S.td}>{r.comuna||'—'}</td>
            </tr>;
          })}</tbody>
        </table></div>
        {vis.length===0? <p style={{...S.sub,padding:10}}>Sin clientes. Haz clic en una fila para abrir su ficha con OTs, máquinas y reincidencia.</p> : null}
      </div>
    </div>);
}
