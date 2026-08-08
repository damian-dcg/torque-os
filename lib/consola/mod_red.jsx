'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S, fmtCLP } from '../ui';

export default function ModRed({avisar}){
  const [sats,setSats]=useState([]); const [regs,setRegs]=useState([]); const [servs,setServs]=useState([]);
  const [rates,setRates]=useState([]); const [liqs,setLiqs]=useState([]); const [ots,setOts]=useState([]);
  const [f,setF]=useState({nombre:'',rut:'',region_id:'',especialidad:'ambos',trayecto:'CONSULTAR',cargo:0});
  const [rt,setRt]=useState({sat_id:'',service_type_id:'',tarifa:''});
  const [lq,setLq]=useState({company_id:'',periodo:'',otros:[]});
  const [nuevoOtro,setNuevoOtro]=useState({concepto:'',monto:''});
  async function cargar(){
    const [s,r,serv,ra,lq2,o]=await Promise.all([
      supabase.from('companies').select('*').eq('tipo','sat'),
      supabase.from('regions').select('*'),
      supabase.from('service_types').select('*'),
      supabase.from('sat_rates').select('*'),
      supabase.from('liquidaciones').select('*').order('id',{ascending:false}),
      supabase.from('work_orders').select('id,ot_number,asignado_company_id,estado,cerrada_at,financial_data').eq('estado','Cerrada').limit(500)
    ]);
    setSats(s.data||[]); setRegs(r.data||[]); setServs(serv.data||[]); setRates(ra.data||[]); setLiqs(lq2.data||[]); setOts(o.data||[]);
  }
  useEffect(()=>{ cargar(); },[]);
  async function crearSat(e){
    e.preventDefault();
    const {error}=await supabase.from('companies').insert([{nombre:f.nombre,rut:f.rut,tipo:'sat',region_id:f.region_id?Number(f.region_id):null,especialidad:f.especialidad,billing_mode:'por_definir',estado:'autorizado',activo:true,cargo_fijo_mensual:Number(f.cargo)||0,trayecto:f.trayecto}]);
    if(error) avisar('⛔ '+error.message,T.danger); else { avisar('✅ SAT creado',T.ok); setF({nombre:'',rut:'',region_id:'',especialidad:'ambos',trayecto:'CONSULTAR',cargo:0}); cargar(); }
  }
  async function toggle(s){ await supabase.from('companies').update({activo:!s.activo}).eq('id',s.id); cargar(); }
  async function setCargo(s,v){ await supabase.from('companies').update({cargo_fijo_mensual:Number(v)||0}).eq('id',s.id); cargar(); }
  async function crearRate(e){
    e.preventDefault();
    const {error}=await supabase.from('sat_rates').insert([{sat_id:Number(rt.sat_id),service_type_id:Number(rt.service_type_id),tarifa:Number(rt.tarifa)}]);
    if(error) avisar('⛔ '+error.message,T.danger); else { avisar('✅ Tarifa pactada',T.ok); setRt({sat_id:'',service_type_id:'',tarifa:''}); cargar(); }
  }
  const otsLiq=ots.filter(o=>o.asignado_company_id===Number(lq.company_id)&&(o.cerrada_at||'').startsWith(lq.periodo));
  const totalOt=otsLiq.reduce((s,o)=>s+Number((o.financial_data&&o.financial_data.totalCost)||0),0);
  const satSel=sats.find(s=>s.id===Number(lq.company_id));
  const totalLiq=Number(satSel&&satSel.cargo_fijo_mensual||0)+totalOt+lq.otros.reduce((s,x)=>s+Number(x.monto)||0,0);
  async function guardarLiq(){
    if(!lq.company_id||!lq.periodo){ avisar('⛔ SAT y período obligatorios',T.danger); return; }
    const {error}=await supabase.from('liquidaciones').insert([{company_id:Number(lq.company_id),periodo:lq.periodo,cargo_fijo:Number(satSel&&satSel.cargo_fijo_mensual||0),total_ot:totalOt,otros:lq.otros,total:totalLiq,estado:'borrador'}]);
    if(error) avisar('⛔ '+error.message,T.danger); else { avisar('✅ Liquidación guardada: '+fmtCLP(totalLiq),T.ok); setLq({company_id:'',periodo:'',otros:[]}); cargar(); }
  }
  async function setEstadoLiq(l,estado){ await supabase.from('liquidaciones').update({estado}).eq('id',l.id); cargar(); }
  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))',gap:14}}>
        <div style={S.card}>
          <h2 style={S.h2}>Nuevo SAT autorizado</h2>
          <form onSubmit={crearSat}>
            <input style={S.input} required placeholder="Nombre empresa" value={f.nombre} onChange={e=>setF({...f,nombre:e.target.value})}/>
            <input style={S.input} required placeholder="RUT" value={f.rut} onChange={e=>setF({...f,rut:e.target.value})}/>
            <select style={S.input} value={f.region_id} onChange={e=>setF({...f,region_id:e.target.value})}><option value="">Región…</option>{regs.map(r=><option key={r.id} value={r.id}>{r.nombre}</option>)}</select>
            <select style={S.input} value={f.especialidad} onChange={e=>setF({...f,especialidad:e.target.value})}><option value="bici">Bicicletas</option><option value="fitness">Fitness</option><option value="ambos">Ambos</option></select>
            <select style={S.input} value={f.trayecto} onChange={e=>setF({...f,trayecto:e.target.value})}><option>SI</option><option>N/A</option><option>CONSULTAR</option></select>
            <input style={S.input} type="number" placeholder="Cargo fijo mensual ($)" value={f.cargo} onChange={e=>setF({...f,cargo:e.target.value})}/>
            <button style={S.btn(T.info)}>Guardar SAT</button>
          </form>
        </div>
        <div style={S.card}>
          <h2 style={S.h2}>Tarifa pactada por servicio</h2>
          <form onSubmit={crearRate}>
            <select style={S.input} required value={rt.sat_id} onChange={e=>setRt({...rt,sat_id:e.target.value})}><option value="">SAT…</option>{sats.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}</select>
            <select style={S.input} required value={rt.service_type_id} onChange={e=>setRt({...rt,service_type_id:e.target.value})}><option value="">Servicio…</option>{servs.map(s=><option key={s.id} value={s.id}>{s.codigo} · {s.nombre}</option>)}</select>
            <input style={S.input} required type="number" placeholder="Tarifa ($)" value={rt.tarifa} onChange={e=>setRt({...rt,tarifa:e.target.value})}/>
            <button style={S.btn(T.ok)}>Guardar tarifa</button>
          </form>
          {rt.sat_id&&<table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr><th style={S.th}>Servicio</th><th style={S.th}>Tarifa</th></tr></thead>
            <tbody>{rates.filter(r=>r.sat_id===Number(rt.sat_id)).map(r=><tr key={r.id}><td style={S.td}>{(servs.find(s=>s.id===r.service_type_id)||{}).nombre||'—'}</td><td style={S.td}>{fmtCLP(r.tarifa)}</td></tr>)}</tbody></table>}
        </div>
      </div>
      <div style={S.card}>
        <h2 style={S.h2}>Red SAT · estado y cargo fijo</h2>
        <div style={{overflow:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr><th style={S.th}>SAT</th><th style={S.th}>RUT</th><th style={S.th}>Especialidad</th><th style={S.th}>Trayecto</th><th style={S.th}>Cargo fijo</th><th style={S.th}>Activo</th></tr></thead>
          <tbody>{sats.map(s=>(
            <tr key={s.id}>
              <td style={S.td}>{s.nombre}</td><td style={S.td}>{s.rut}</td><td style={S.td}>{s.especialidad}</td><td style={S.td}>{s.trayecto}</td>
              <td style={S.td}><input style={{...S.input,width:110,marginBottom:0}} type="number" defaultValue={s.cargo_fijo_mensual} onBlur={e=>setCargo(s,e.target.value)}/></td>
              <td style={S.td}><button onClick={()=>toggle(s)} style={{padding:'6px 12px',borderRadius:8,border:`1.5px solid ${s.activo?T.ok:T.danger}`,background:'transparent',color:s.activo?T.ok:T.danger,fontWeight:800,cursor:'pointer'}}>{s.activo?'ACTIVO':'INACTIVO'}</button></td>
            </tr>))}</tbody>
        </table></div>
      </div>
      <div style={S.card}>
        <h2 style={S.h2}>Liquidación por período</h2>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center',marginBottom:10}}>
          <select style={{...S.input,width:240,marginBottom:0}} value={lq.company_id} onChange={e=>setLq({...lq,company_id:e.target.value})}><option value="">SAT…</option>{sats.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}</select>
          <input style={{...S.input,width:170,marginBottom:0}} type="month" value={lq.periodo} onChange={e=>setLq({...lq,periodo:e.target.value})}/>
        </div>
        {lq.company_id&&lq.periodo&&(
          <div>
            <p style={{color:T.text,fontSize:14}}>Cargo fijo: <b>{fmtCLP(satSel&&satSel.cargo_fijo_mensual)}</b> · OTs cerradas del período: <b>{otsLiq.length}</b> por <b>{fmtCLP(totalOt)}</b></p>
            {lq.otros.map((x,i)=><p key={i} style={{color:T.text,fontSize:14}}>+ {x.concepto}: {fmtCLP(x.monto)}</p>)}
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:10}}>
              <input style={{...S.input,flex:2,marginBottom:0}} placeholder="Concepto (ej: trayectos, repuestos autorizados)" value={nuevoOtro.concepto} onChange={e=>setNuevoOtro({...nuevoOtro,concepto:e.target.value})}/>
              <input style={{...S.input,flex:1,marginBottom:0}} type="number" placeholder="$" value={nuevoOtro.monto} onChange={e=>setNuevoOtro({...nuevoOtro,monto:e.target.value})}/>
              <button style={{...S.btnO(T.info),width:'auto',marginBottom:0}} onClick={()=>{ if(nuevoOtro.concepto&&nuevoOtro.monto){ setLq({...lq,otros:[...lq.otros,{concepto:nuevoOtro.concepto,monto:Number(nuevoOtro.monto)}]}); setNuevoOtro({concepto:'',monto:''}); } }}>+ Línea</button>
            </div>
            <p style={{color:T.ok,fontWeight:800,fontSize:17}}>TOTAL LIQUIDACIÓN: {fmtCLP(totalLiq)}</p>
            <button style={S.btn(T.ok)} onClick={guardarLiq}>Guardar liquidación</button>
          </div>)}
        <h3 style={{...S.h2,marginTop:12}}>Liquidaciones guardadas</h3>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr><th style={S.th}>SAT</th><th style={S.th}>Período</th><th style={S.th}>Total</th><th style={S.th}>Estado</th></tr></thead>
          <tbody>{liqs.map(l=>(
            <tr key={l.id}>
              <td style={S.td}>{(sats.find(s=>s.id===l.company_id)||{}).nombre||l.company_id}</td>
              <td style={S.td}>{l.periodo}</td><td style={S.td}>{fmtCLP(l.total)}</td>
              <td style={S.td}><select style={{...S.input,width:130,marginBottom:0}} value={l.estado} onChange={e=>setEstadoLiq(l,e.target.value)}><option>borrador</option><option>aprobada</option><option>pagada</option></select></td>
            </tr>))}</tbody>
        </table>
      </div>
    </div>);
}
