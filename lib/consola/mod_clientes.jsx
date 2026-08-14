'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S } from '../ui';
export default function ModClientes(props){
  var avisar=props.avisar||function(){};
  var onOpenCliente=props.onOpenCliente||function(){};
  var [custs,setCusts]=useState([]); var [regions,setRegions]=useState({}); var [ots,setOts]=useState([]);
  var [q,setQ]=useState(''); var [sel,setSel]=useState({}); var [edit,setEdit]=useState(null);
  async function cargar(){
    var r=await Promise.all([
      supabase.from('customers').select('*').order('id',{ascending:false}).limit(1000),
      supabase.from('regions').select('*'),
      supabase.from('work_orders').select('id,customer_id,estado,created_at')
    ]);
    setCusts(r[0].data||[]);
    var rm={}; (r[1].data||[]).forEach(function(x){rm[x.id]=x.nombre;}); setRegions(rm);
    setOts(r[2].data||[]);
  }
  useEffect(function(){ cargar(); },[]);
  function otsDe(id){ return ots.filter(function(o){return o.customer_id===id;}).length; }
  var visibles=custs.filter(function(c){ var t=q.toLowerCase(); return !t||String(c.nombre||'').toLowerCase().indexOf(t)>=0||String(c.rut||'').indexOf(t)>=0; });
  function toggle(id){ var c=Object.assign({},sel); if(c[id]) delete c[id]; else c[id]=true; setSel(c); }
  function todos(){ var all=visibles.every(function(c){return sel[c.id];}); var c={}; if(!all) visibles.forEach(function(v){c[v.id]=true;}); setSel(c); }
  var selIds=Object.keys(sel).map(Number);
  async function eliminar(ids){ if(!ids.length)return; if(!window.confirm('Eliminar '+ids.length+' cliente(s) y sus OTs?'))return;
    await supabase.from('work_orders').delete().in('customer_id',ids); await supabase.from('customers').delete().in('id',ids);
    avisar('✅ Eliminados',T.ok); setSel({}); cargar(); }
  async function guardar(){ var e=await supabase.from('customers').update(edit).eq('id',edit.id);
    if(e.error) avisar('⛗ '+e.error.message,T.danger); else { avisar('✅ Cliente actualizado',T.ok); setEdit(null); cargar(); } }
  function exportar(){
    var head=['ID','Nombre','RUT','Tipo','Teléfono','Email','Dirección','Comuna','Región','Creado','OTs'];
    var rows=visibles.map(function(c){ return [c.id,c.nombre,c.rut,c.tipo,c.telefono,c.email,c.direccion,c.comuna,regions[c.region_id]||'',(c.created_at||'').slice(0,10),otsDe(c.id)].join(';'); });
    var a=document.createElement('a'); a.href=URL.createObjectURL(new Blob(['\uFEFF'+head.join(';')+'\n'+rows.join('\n')],{type:'text/csv'})); a.download='clientes.csv'; a.click();
  }
  return (
    <div>
      <div style={S.card}>
        <h2 style={S.h2}>Nuevo cliente</h2>
        <NuevoCliente onOk={cargar} avisar={avisar} regions={regions}/>
      </div>
      <div style={S.card}>
        <div style={{display:'flex',gap:8,marginBottom:10,flexWrap:'wrap'}}>
          <input style={{...S.input,flex:2,minWidth:200,marginBottom:0}} placeholder="Buscar por nombre o RUT…" value={q} onChange={function(e){ setQ(e.target.value); }}/>
          <button style={{...S.btnO(T.info),width:'auto',marginBottom:0}} onClick={todos}>{visibles.every(function(c){return sel[c.id];})?'Desmarcar todos':'Seleccionar todos'}</button>
          <button style={{...S.btnO(T.danger),width:'auto',marginBottom:0}} onClick={function(){ eliminar(selIds); }}>🗑 Eliminar seleccionados ({selIds.length})</button>
          <button style={{...S.btnO(T.ok),width:'auto',marginBottom:0}} onClick={exportar}> Exportar clientes</button>
        </div>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr><th style={S.th}></th><th style={S.th}>Nombre</th><th style={S.th}>RUT</th><th style={S.th}>Tipo</th><th style={S.th}>Teléfono</th><th style={S.th}>Email</th><th style={S.th}>Comuna</th><th style={S.th}>Región</th><th style={S.th}>OTs</th><th style={S.th}>Acciones</th></tr></thead>
          <tbody>{visibles.map(function(c){ return <tr key={c.id}>
            <td style={S.td}><input type="checkbox" checked={!!sel[c.id]} onChange={function(){ toggle(c.id); }}/></td>
            <td style={{...S.td,color:brand0(),fontWeight:700,cursor:'pointer'}} onClick={function(){ onOpenCliente(c); }}>{c.nombre}</td>
            <td style={S.td}>{c.rut||'—'}</td><td style={S.td}>{c.tipo||'—'}</td>
            <td style={S.td}>{c.telefono||'—'}</td><td style={S.td}>{c.email||'—'}</td>
            <td style={S.td}>{c.comuna||'—'}</td><td style={S.td}>{regions[c.region_id]||'—'}</td>
            <td style={S.td}>{otsDe(c.id)}</td>
            <td style={S.td}><div style={{display:'flex',gap:4}}>
              <button style={{...S.btnO(T.info),width:'auto',marginBottom:0,fontSize:11,padding:'3px 8px'}} onClick={function(){ setEdit(Object.assign({},c)); }}>✏ Editar</button>
              <button style={{...S.btnO(T.danger),width:'auto',marginBottom:0,fontSize:11,padding:'3px 8px'}} onClick={function(){ eliminar([c.id]); }}>🗑</button>
            </div></td>
          </tr>; })}</tbody>
        </table>
      </div>
      {edit? <div style={S.modal} onClick={function(){ setEdit(null); }}><div style={S.modalCard} onClick={function(e){ e.stopPropagation(); }}>
        <h3 style={S.h2}>Editar cliente #{edit.id}</h3>
        <label style={S.label}>Nombre</label><input style={S.input} value={edit.nombre||''} onChange={function(e){ setEdit(Object.assign({},edit,{nombre:e.target.value})); }}/>
        <label style={S.label}>RUT</label><input style={S.input} value={edit.rut||''} onChange={function(e){ setEdit(Object.assign({},edit,{rut:e.target.value})); }}/>
        <div style={{display:'flex',gap:8}}>
          <div style={{flex:1}}><label style={S.label}>Tipo</label><select style={S.input} value={edit.tipo||'final'} onChange={function(e){ setEdit(Object.assign({},edit,{tipo:e.target.value})); }}><option>final</option><option>retail</option><option>mayorista</option><option>proveedor</option></select></div>
          <div style={{flex:1}}><label style={S.label}>Teléfono</label><input style={S.input} value={edit.telefono||''} onChange={function(e){ setEdit(Object.assign({},edit,{telefono:e.target.value})); }}/></div>
        </div>
        <label style={S.label}>Email</label><input style={S.input} value={edit.email||''} onChange={function(e){ setEdit(Object.assign({},edit,{email:e.target.value})); }}/>
        <label style={S.label}>Dirección</label><input style={S.input} value={edit.direccion||''} onChange={function(e){ setEdit(Object.assign({},edit,{direccion:e.target.value})); }}/>
        <div style={{display:'flex',gap:8}}>
          <div style={{flex:1}}><label style={S.label}>Comuna</label><input style={S.input} value={edit.comuna||''} onChange={function(e){ setEdit(Object.assign({},edit,{comuna:e.target.value})); }}/></div>
          <div style={{flex:1}}><label style={S.label}>Región</label><select style={S.input} value={edit.region_id||''} onChange={function(e){ setEdit(Object.assign({},edit,{region_id:e.target.value?Number(e.target.value):null})); }}><option value="">—</option>{Object.keys(regions).map(function(k){ return <option key={k} value={k}>{regions[k]}</option>; })}</select></div>
        </div>
        <div style={{display:'flex',gap:8}}><button style={S.btn(T.ok)} onClick={guardar}>Guardar</button><button style={S.btn(T.muted)} onClick={function(){ setEdit(null); }}>Cancelar</button></div>
      </div></div> : null}
    </div>);
  function brand0(){ return T.brand; }
}
function NuevoCliente(props){
  var [f,setF]=useState({nombre:'',rut:'',tipo:'final',telefono:'',email:'',region_id:'',comuna:'',direccion:''});
  async function crear(e){ e.preventDefault(); if(!f.nombre){ props.avisar('⛗ Nombre obligatorio',T.danger); return; }
    var e2=await supabase.from('customers').insert([Object.assign({},f,{region_id:f.region_id?Number(f.region_id):null})]);
    if(e2.error) props.avisar('⛗ '+e2.error.message,T.danger); else { props.avisar('✅ Cliente creado',T.ok); setF({nombre:'',rut:'',tipo:'final',telefono:'',email:'',region_id:'',comuna:'',direccion:''}); props.onOk(); } }
  return (<form onSubmit={crear} style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:8}}>
    <input style={S.input} placeholder="Nombre / Razón social *" value={f.nombre} onChange={function(e){ setF(Object.assign({},f,{nombre:e.target.value})); }}/>
    <input style={S.input} placeholder="RUT" value={f.rut} onChange={function(e){ setF(Object.assign({},f,{rut:e.target.value})); }}/>
    <select style={S.input} value={f.tipo} onChange={function(e){ setF(Object.assign({},f,{tipo:e.target.value})); }}><option>final</option><option>retail</option><option>mayorista</option><option>proveedor</option></select>
    <input style={S.input} placeholder="Teléfono" value={f.telefono} onChange={function(e){ setF(Object.assign({},f,{telefono:e.target.value})); }}/>
    <input style={S.input} placeholder="Email" value={f.email} onChange={function(e){ setF(Object.assign({},f,{email:e.target.value})); }}/>
    <select style={S.input} value={f.region_id} onChange={function(e){ setF(Object.assign({},f,{region_id:e.target.value})); }}><option value="">Región…</option>{Object.keys(props.regions).map(function(k){ return <option key={k} value={k}>{props.regions[k]}</option>; })}</select>
    <input style={S.input} placeholder="Comuna" value={f.comuna} onChange={function(e){ setF(Object.assign({},f,{comuna:e.target.value})); }}/>
    <input style={S.input} placeholder="Dirección" value={f.direccion} onChange={function(e){ setF(Object.assign({},f,{direccion:e.target.value})); }}/>
    <button style={S.btn(T.ok)} type="submit">Crear cliente</button>
  </form>);
}
