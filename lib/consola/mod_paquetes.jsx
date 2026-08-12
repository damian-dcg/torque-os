'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S, fmtCLP } from '../ui';

export default function ModPaquetes(props){
  var avisar=props.avisar||function(){};
  var s1=useState([]),rows=s1[0],setRows=s1[1];
  var s2=useState(null),sel=s2[0],setSel=s2[1];
  var s3=useState({nombre:'',familia:'',precio:0,horas:0,tareas:''}),f=s3[0],setF=s3[1];
  async function cargar(){ var r=await supabase.from('paquetes').select('*').order('id'); setRows(r.data||[]); }
  useEffect(function(){ cargar(); },[]);
  function editar(p){
    setSel(p);
    setF({nombre:p.nombre,familia:p.familia,precio:p.precio,horas:p.horas,tareas:(p.tareas||[]).map(function(x){ return x.t+'|'+x.min; }).join('\n')});
  }
  async function guardar(){
    if(!f.nombre){ avisar('⛗ Nombre obligatorio',T.danger); return; }
    var tareas=f.tareas.split('\n').filter(function(x){ return x.trim(); }).map(function(x){ var p=x.split('|'); return {t:p[0].trim(),min:Number(p[1])||15}; });
    var payload={nombre:f.nombre,familia:f.familia,precio:Number(f.precio)||0,horas:Number(f.horas)||0,tareas:tareas};
    if(sel) await supabase.from('paquetes').update(payload).eq('id',sel.id);
    else await supabase.from('paquetes').insert([payload]);
    avisar('✅ Paquete guardado',T.ok);
    setF({nombre:'',familia:'',precio:0,horas:0,tareas:''}); setSel(null); cargar();
  }
  async function del(p){ if(!window.confirm('¿Eliminar '+p.nombre+'?')) return; await supabase.from('paquetes').delete().eq('id',p.id); cargar(); }
  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(340px,1fr))',gap:14}}>
      <div style={S.card}>
        <h2 style={S.h2}>{sel? 'Editar paquete':'Nuevo paquete de servicio'}</h2>
        <input style={S.input} placeholder="Nombre (ej: Puesta a punto)" value={f.nombre} onChange={function(e){ setF(Object.assign({},f,{nombre:e.target.value})); }}/>
        <select style={S.input} value={f.familia} onChange={function(e){ setF(Object.assign({},f,{familia:e.target.value})); }}>
          <option value="">Familia…</option><option>BICICLETA</option><option>BICICLETA ELECTRICA</option><option>MAQUINA</option><option>SCOOTER ELECTRICO</option><option>ACCESORIO</option>
        </select>
        <div style={{display:'flex',gap:8}}>
          <input style={S.input} type="number" placeholder="Precio $" value={f.precio} onChange={function(e){ setF(Object.assign({},f,{precio:e.target.value})); }}/>
          <input style={S.input} type="number" step="0.1" placeholder="Horas" value={f.horas} onChange={function(e){ setF(Object.assign({},f,{horas:e.target.value})); }}/>
        </div>
        <label style={S.label}>Tareas (una por línea: tarea|minutos)</label>
        <textarea style={{...S.input,minHeight:110}} value={f.tareas} onChange={function(e){ setF(Object.assign({},f,{tareas:e.target.value})); }} placeholder={'Ajuste frenos|15\nLubricación|10'}/>
        <div style={{display:'flex',gap:8}}>
          <button style={{...S.btn(T.ok),flex:1,marginBottom:0}} onClick={guardar}>{sel?'Guardar cambios':'Crear paquete'}</button>
          {sel? <button style={{...S.btnO(T.muted),width:'auto',marginBottom:0}} onClick={function(){ setSel(null); setF({nombre:'',familia:'',precio:0,horas:0,tareas:''}); }}>Cancelar</button> : null}
        </div>
      </div>
      <div style={S.card}>
        <h2 style={S.h2}>Menú de servicios ({rows.length})</h2>
        {rows.map(function(p){
          return <div key={p.id} style={{border:'1px solid '+T.border,borderRadius:10,padding:10,marginBottom:8,background:T.surface2}}>
            <div style={{display:'flex',justifyContent:'space-between',gap:8}}>
              <b style={{color:T.brand}}>{p.nombre}</b>
              <span style={{fontWeight:800,color:T.ok}}>{fmtCLP(p.precio)}</span>
            </div>
            <p style={{...S.sub,margin:'4px 0'}}>{p.familia} · {p.horas} h · {(p.tareas||[]).length} tareas</p>
            <div style={{display:'flex',gap:8}}>
              <button style={{...S.btnO(T.info),width:'auto',marginBottom:0}} onClick={function(){ editar(p); }}>✏️ Editar</button>
              <button style={{...S.btnO(T.danger),width:'auto',marginBottom:0}} onClick={function(){ del(p); }}>🗑</button>
            </div>
          </div>;
        })}
        {rows.length===0? <p style={S.sub}>Sin paquetes.</p> : null}
      </div>
    </div>);
}
