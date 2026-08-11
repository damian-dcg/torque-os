'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S, fmtCLP } from '../ui';

function Tabla({titulo,tabla,campos,avisar,onFmt}){
  const [rows,setRows]=useState([]); const [f,setF]=useState({});
  async function cargar(){ const {data}=await supabase.from(tabla).select('*').order('id'); setRows(data||[]); }
  useEffect(()=>{ cargar(); },[]);
  async function crear(e){ e.preventDefault(); const {error}=await supabase.from(tabla).insert([f]);
    if(error) avisar('⛔ '+error.message,T.danger); else { avisar('✅ Guardado',T.ok); setF({}); cargar(); } }
  async function upd(r,k,v){ await supabase.from(tabla).update({[k]:v}).eq('id',r.id); cargar(); }
  async function del(r){ if(!window.confirm('¿Eliminar?')) return; await supabase.from(tabla).delete().eq('id',r.id); cargar(); }
  return (
    <div style={S.card}>
      <h2 style={S.h2}>{titulo}</h2>
      <form onSubmit={crear} style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:10}}>
        {campos.map(([k,l,t])=><input key={k} style={{...S.input,flex:1,minWidth:110,marginBottom:0}} type={t==='num'?'number':'text'} placeholder={l} value={f[k]||''} onChange={e=>setF({...f,[k]:t==='num'?Number(e.target.value):e.target.value})} required/>)}
        <button style={{...S.btn(T.info),width:'auto',marginBottom:0}}>+ Agregar</button>
      </form>
      <div style={{overflow:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}>
        <thead><tr>{campos.map(([k,l])=><th key={k} style={S.th}>{l}</th>)}<th style={S.th}>✕</th></tr></thead>
        <tbody>{rows.map(r=><tr key={r.id}>
          {campos.map(([k,l,t])=><td key={k} style={S.td}>{t==='num'? <input style={{...S.input,width:110,marginBottom:0}} type="number" defaultValue={r[k]} onBlur={e=>upd(r,k,Number(e.target.value))}/> : <input style={{...S.input,minWidth:120,marginBottom:0}} defaultValue={r[k]} onBlur={e=>upd(r,k,e.target.value)}/>}</td>)}
          <td style={S.td}><button onClick={()=>del(r)} style={{border:0,background:'transparent',color:T.danger,cursor:'pointer'}}>🗑</button></td>
        </tr>)}</tbody>
      </table></div>
    </div>);
}

export default function ModParametros({avisar}){
  const [tab,setTab]=useState('tec');
  return (
    <div>
      <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
        {[['tec','Técnicos (costos)'],['sla','SLA (días)'],['gar','Garantías (períodos)'],['bon','Bonos']].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{padding:'8px 14px',borderRadius:999,border:tab===k?'0':`1px solid ${T.border}`,background:tab===k?T.brand:'transparent',color:tab===k?'#0B1220':T.muted,fontWeight:700,fontSize:13,cursor:'pointer'}}>{l}</button>))}
      </div>
      {tab==='tec'&&<Tabla titulo="Tarifas por técnico (PARAMETROS)" tabla="tech_rates" campos={[['technician','Técnico'],['costo_sueldo_mensual','Sueldo mensual','num'],['horas_mes','Horas/mes','num'],['costo_x_hora','Costo×hora','num'],['venta_x_hora','Venta×hora','num']]} avisar={avisar}/>}
      {tab==='sla'&&<Tabla titulo="Matriz SLA · días por tipo servicio × equipo" tabla="sla_matrix" campos={[['tipo_servicio','Tipo servicio'],['tipo_equipo','Tipo equipo'],['dias','Días','num']]} avisar={avisar}/>}
      {tab==='gar'&&<Tabla titulo="Períodos de garantía por familia" tabla="warranty_rules" campos={[['family_id','ID familia','num'],['meses','Meses','num'],['condiciones','Condiciones']]} avisar={avisar}/>}
      {tab==='bon'&&<Tabla titulo="Reglas de bonos (clave/valor JSON)" tabla="bonus_rules" campos={[['clave','Clave'],['valor','Valor JSON']]} avisar={avisar}/>}
    </div>);
}
