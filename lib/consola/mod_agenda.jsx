'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S, estColor } from '../ui';

export default function ModAgenda({avisar}){
  const [ots,setOts]=useState([]); const [users,setUsers]=useState([]); const [avail,setAvail]=useState([]);
  const [mes,setMes]=useState(()=>{ const d=new Date(); return new Date(d.getFullYear(),d.getMonth(),1); });
  const [dia,setDia]=useState(null);
  const [prog,setProg]=useState({ot:'',tec:''});
  async function cargar(){ const [o,u,a]=await Promise.all([
    supabase.from('work_orders').select('id,ot_number,estado,tipo,fecha_programada,asignado_user_id').order('ot_number').limit(500),
    supabase.from('users').select('id,nombre,rol'),
    supabase.from('technician_availability').select('*')]);
    setOts(o.data||[]); setUsers(u.data||[]); setAvail(a.data||[]); }
  useEffect(()=>{ cargar(); },[]);
  const fkey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const dias=new Date(mes.getFullYear(),mes.getMonth()+1,0).getDate();
  const delDia=ots.filter(o=>o.fecha_programada===dia);
  const sinFecha=ots.filter(o=>!o.fecha_programada&&!['Cerrada','Anulada'].includes(o.estado));
  async function programar(){ if(!prog.ot||!dia){ avisar('⛔ Elige OT y día',T.danger); return; }
    const {error}=await supabase.from('work_orders').update({fecha_programada:dia}).eq('id',Number(prog.ot));
    if(error) avisar('⛔ '+error.message,T.danger); else { avisar('✅ OT programada',T.ok); setProg({ot:'',tec:''}); cargar(); } }
  async function asignar(o){ const tec=Number(prog.tec||o.asignado_user_id); if(!tec){ avisar('⛔ Elige técnico',T.danger); return; }
    const patch={asignado_user_id:tec}; if(o.estado==='Ingresada') patch.estado='Asignada';
    const {error}=await supabase.from('work_orders').update(patch).eq('id',o.id);
    if(error) avisar('⛔ '+error.message,T.danger); else { avisar('✅ Asignada',T.ok); cargar(); } }
  return (
    <div>
      <div style={{...S.card,display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
        <button style={S.btnO(T.info)} onClick={()=>setMes(new Date(mes.getFullYear(),mes.getMonth()-1,1))}>←</button>
        <b style={{flex:1,textAlign:'center',color:T.text,fontSize:16}}>{mes.toLocaleDateString('es-CL',{month:'long',year:'numeric'})}</b>
        <button style={S.btnO(T.info)} onClick={()=>setMes(new Date(mes.getFullYear(),mes.getMonth()+1,1))}>→</button>
      </div>
      <div style={{...S.card,display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:6}}>
        {Array.from({length:dias},(_,i)=>{ const d=new Date(mes.getFullYear(),mes.getMonth(),i+1); const k=fkey(d);
          const n=ots.filter(o=>o.fecha_programada===k).length;
          const ind=avail.filter(a=>{ const ds=new Date(a.desde+'T00:00:00'),de=new Date(a.hasta+'T23:59:59'); return d>=ds&&d<=de; });
          return <button key={i} onClick={()=>setDia(k)} style={{minHeight:64,borderRadius:10,border:`1.5px solid ${dia===k?T.brand:T.borde}`,background:T.bg,color:T.text,cursor:'pointer',padding:6}}>
            <div style={{fontSize:12,color:T.sub}}>{i+1}</div>
            {n>0&&<div style={{fontSize:13,fontWeight:800,color:T.info}}>{n} OT</div>}
            {ind.length>0&&<div style={{fontSize:10,color:T.danger}}>{ind.length} indispon.</div>}
          </button>;})}
      </div>
      {dia&&(
        <div style={S.card}>
          <h2 style={S.h2}>OTs del {dia}</h2>
          {delDia.map(o=>(
            <div key={o.id} style={{display:'flex',gap:8,alignItems:'center',marginBottom:8,flexWrap:'wrap'}}>
              <b style={{color:T.brand}}>OT-{o.ot_number}</b><span style={S.pill(estColor(o.estado))}>{o.estado}</span>
              <span style={{...S.sub,flex:1}}>{(users.find(u=>u.id===o.asignado_user_id)||{}).nombre||'Sin técnico'}</span>
              <select style={{...S.input,width:180,marginBottom:0}} value={prog.tec} onChange={e=>setProg({...prog,tec:e.target.value})}>
                <option value="">Técnico…</option>{users.filter(u=>u.rol==='tecnico_sat'||u.rol==='admin').map(u=><option key={u.id} value={u.id}>{u.nombre}</option>)}
              </select>
              <button style={{...S.btnO(T.ok),width:'auto',marginBottom:0}} onClick={()=>asignar(o)}>Asignar</button>
            </div>))}
          {delDia.length===0&&<p style={S.sub}>Sin OTs este día.</p>}
          <h3 style={{...S.h2,marginTop:12}}>Programar OT sin fecha</h3>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <select style={{...S.input,flex:1,marginBottom:0}} value={prog.ot} onChange={e=>setProg({...prog,ot:e.target.value})}>
              <option value="">Elegir OT…</option>{sinFecha.map(o=><option key={o.id} value={o.id}>OT-{o.ot_number} · {o.tipo}</option>)}
            </select>
            <button style={{...S.btn(T.info),width:'auto',marginBottom:0}} onClick={programar}>Programar al {dia}</button>
          </div>
        </div>)}
    </div>);
}
