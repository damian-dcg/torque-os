'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S } from '../ui';

const defaultByType=t=>{const x=(t||'').toLowerCase(); if(x.includes('volumen'))return 'CK-ARM-VOL-BICI'; if(x.includes('armado'))return 'CK-ARM-BICI'; if(x.includes('garantia'))return 'CK-EVAL-GARANTIA'; if(x.includes('retiro'))return 'CK-RETIRO'; if(x.includes('manten'))return 'CK-MANT-ELEC'; return 'CK-REP-CONV';};

export default function ModNuevaOT({avisar,onOk}){
  const [cust,setCust]=useState([]); const [sats,setSats]=useState([]); const [users,setUsers]=useState([]); const [regs,setRegs]=useState([]); const [tipos,setTipos]=useState([]);
  const [f,setF]=useState({customer_id:'',tipo:'servicio',prioridad:'media',region_id:'',direccion:'',descripcion:'',asig_tipo:'',asig_id:''});
  useEffect(()=>{(async()=>{
    const [c,s,u,r,st]=await Promise.all([
      supabase.from('customers').select('id,nombre').order('nombre').limit(400),
      supabase.from('companies').select('id,nombre').eq('tipo','sat'),
      supabase.from('users').select('id,nombre'),
      supabase.from('regions').select('*'),
      supabase.from('settings').select('valor').eq('clave','tipos_ot').single()
    ]);
    setCust(c.data||[]); setSats(s.data||[]); setUsers(u.data||[]); setRegs(r.data||[]);
    setTipos(Array.isArray(st.data&&st.data.valor)?st.data.valor:['servicio']);
  })();},[]);
  async function crear(e){
    e.preventDefault();
    const patch={customer_id:Number(f.customer_id),tipo:f.tipo,prioridad:f.prioridad,region_id:f.region_id?Number(f.region_id):null,direccion:f.direccion||null,descripcion:f.descripcion||null,canal:'interno',checklist_code:defaultByType(f.tipo)};
    if(f.asig_tipo==='sat') patch.asignado_company_id=Number(f.asig_id);
    if(f.asig_tipo==='tec') patch.asignado_user_id=Number(f.asig_id);
    const {data,error}=await supabase.from('work_orders').insert([patch]).select();
    if(error) avisar('⛔ '+error.message,T.danger);
    else { avisar('✅ OT-'+data[0].ot_number+' creada · checklist '+patch.checklist_code,T.ok); onOk&&onOk(); setF({...f,direccion:'',descripcion:''}); }
  }
  return (
    <div style={S.card}>
      <h2 style={S.h2}>Nueva orden de trabajo</h2>
      <form onSubmit={crear} style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:10}}>
        <div><label style={S.label}>Cliente *</label>
          <select style={S.input} required value={f.customer_id} onChange={e=>setF({...f,customer_id:e.target.value})}>
            <option value="">Elegir…</option>{cust.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select></div>
        <div><label style={S.label}>Tipo de servicio</label>
          <select style={S.input} value={f.tipo} onChange={e=>setF({...f,tipo:e.target.value})}>{tipos.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
        <div><label style={S.label}>Prioridad</label>
          <select style={S.input} value={f.prioridad} onChange={e=>setF({...f,prioridad:e.target.value})}><option>alta</option><option>media</option><option>baja</option></select></div>
        <div><label style={S.label}>Región</label>
          <select style={S.input} value={f.region_id} onChange={e=>setF({...f,region_id:e.target.value})}><option value="">—</option>{regs.map(r=><option key={r.id} value={r.id}>{r.nombre}</option>)}</select></div>
        <div style={{gridColumn:'1 / -1'}}><label style={S.label}>Dirección</label>
          <input style={S.input} value={f.direccion} onChange={e=>setF({...f,direccion:e.target.value})} placeholder="Calle, número, comuna"/></div>
        <div style={{gridColumn:'1 / -1'}}><label style={S.label}>Descripción / síntoma</label>
          <textarea style={{...S.input,minHeight:70}} value={f.descripcion} onChange={e=>setF({...f,descripcion:e.target.value})}/></div>
        <div><label style={S.label}>Asignar a</label>
          <select style={S.input} value={f.asig_tipo+':'+f.asig_id} onChange={e=>{const [t,i]=(e.target.value||':').split(':'); setF({...f,asig_tipo:t,asig_id:i});}}>
            <option value="">Sin asignar (ruta del día)</option>
            <optgroup label="Técnicos internos">{users.map(u=><option key={'t'+u.id} value={'tec:'+u.id}>{u.nombre}</option>)}</optgroup>
            <optgroup label="SAT autorizados">{sats.map(s=><option key={'s'+s.id} value={'sat:'+s.id}>{s.nombre}</option>)}</optgroup>
          </select></div>
        <div style={{alignSelf:'end'}}><button style={S.btn(T.info)}>Crear OT (checklist {defaultByType(f.tipo)})</button></div>
      </form>
    </div>);
}
