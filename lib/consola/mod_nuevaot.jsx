'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S } from '../ui';
import Mapa from './Mapa';
import { geocode } from './geo';

const defaultByType=t=>{const x=(t||'').toLowerCase(); if(x.includes('volumen'))return 'CK-ARM-VOL-BICI'; if(x.includes('armado'))return 'CK-ARM-BICI'; if(x.includes('garantia'))return 'CK-EVAL-GARANTIA'; if(x.includes('retiro'))return 'CK-RETIRO'; if(x.includes('manten'))return 'CK-MANT-ELEC'; return 'CK-REP-CONV';};

export default function ModNuevaOT({avisar,onOk}){
  const [paso,setPaso]=useState(1);
  const [cust,setCust]=useState([]); const [acts,setActs]=useState([]); const [fams,setFams]=useState([]);
  const [sats,setSats]=useState([]); const [users,setUsers]=useState([]); const [cov,setCov]=useState([]);
  const [ots,setOts]=useState([]); const [regs,setRegs]=useState([]); const [tipos,setTipos]=useState([]);
  const [f,setF]=useState({customer_id:'',asset_id:'',tipo:'servicio',prioridad:'media',direccion:'',descripcion:'',fecha:'',asig_tipo:'',asig_id:''});
  const [nc,setNc]=useState({nombre:'',rut:'',telefono:''});
  const [na,setNa]=useState({serial:'',model:'',family_id:'',store:'',warranty_until:''});
    const [mapOpen,setMapOpen]=useState(false); const [mapMk,setMapMk]=useState([]);
  async function verMapa(){ var dir=f.direccion||(cliente?cliente.direccion:''); if(!dir){ avisar('⛗ Sin dirección',T.danger); return; } var g=await geocode(dir); setMapMk(g?[{lat:g.lat,lng:g.lng,popup:dir}]:[]); setMapOpen(true); }

  async function cargar(){ const [c,a,fo,s,u,cv,o,r,st]=await Promise.all([
    supabase.from('customers').select('*').order('nombre').limit(400),
    supabase.from('assets').select('*').limit(400),
    supabase.from('product_families').select('*'),
    supabase.from('companies').select('*').eq('tipo','sat'),
    supabase.from('users').select('*'),
    supabase.from('company_coverage').select('*'),
    supabase.from('work_orders').select('id,estado,asignado_user_id,asignado_company_id').limit(500),
    supabase.from('regions').select('*'),
    supabase.from('settings').select('valor').eq('clave','tipos_ot').single()]);
    setCust(c.data||[]); setActs(a.data||[]); setFams(fo.data||[]); setSats(s.data||[]); setUsers(u.data||[]);
    setCov(cv.data||[]); setOts(o.data||[]); setRegs(r.data||[]);
    setTipos(Array.isArray(st.data&&st.data.valor)?st.data.valor:['servicio']);
  }
  useEffect(()=>{ cargar(); },[]);

  const cliente=cust.find(c=>c.id===Number(f.customer_id));
  const activos=acts.filter(a=>a.customer_id===Number(f.customer_id));
  const region=cliente?cliente.region_id:null;
  const carga={}; ots.filter(o=>!['Cerrada','Anulada','Rechazada'].includes(o.estado)).forEach(o=>{ const k=o.asignado_company_id?('s'+o.asignado_company_id):o.asignado_user_id?('u'+o.asignado_user_id):null; if(k) carga[k]=(carga[k]||0)+1; });
  const famCode=fams.find(x=>x.id===Number((acts.find(a=>a.id===Number(f.asset_id))||{}).family_id))?.code;
  const espReq=(famCode==='FP003'||famCode==='FP004')?'fitness':(famCode==='FP001'||famCode==='FP002')?'bici':null;
  const sugeridos=[
    ...sats.filter(s=>s.activo&&cov.some(c=>c.company_id===s.id&&c.region_id===region)).map(s=>({t:'sat',id:s.id,n:s.nombre,esp:s.especialidad,c:carga['s'+s.id]||0,ok:!espReq||s.especialidad==='ambos'||s.especialidad===espReq})),
    ...users.filter(u=>u.rol==='tecnico_sat').map(u=>({t:'tec',id:u.id,n:u.nombre,esp:null,c:carga['u'+u.id]||0,ok:true}))
  ].sort((a,b)=>(b.ok?1:0)-(a.ok?1:0)||a.c-b.c).slice(0,4);

  async function crearCliente(){ if(!nc.nombre){ avisar('⛔ Nombre obligatorio',T.danger); return; }
    const {data,error}=await supabase.from('customers').insert([{nombre:nc.nombre,rut:nc.rut||null,telefono:nc.telefono||null,tipo:'final',region_id:region||null}]).select();
    if(error) avisar('⛔ '+error.message,T.danger); else { avisar('✅ Cliente creado',T.ok); setNc({nombre:'',rut:'',telefono:''}); await cargar(); setF({...f,customer_id:String(data[0].id)}); } }
  async function crearActivo(){ if(!na.serial&&!na.model){ avisar('⛔ Serie o modelo obligatorio',T.danger); return; }
    const {error}=await supabase.from('assets').insert([{customer_id:Number(f.customer_id),family_id:Number(na.family_id)||null,serial:na.serial,model:na.model,store:na.store,warranty_until:na.warranty_until||null}]);
    if(error) avisar('⛔ '+error.message,T.danger); else { avisar('✅ Activo registrado',T.ok); setNa({serial:'',model:'',family_id:'',store:'',warranty_until:''}); await cargar(); } }

  async function crear(){
    const patch={customer_id:Number(f.customer_id),tipo:f.tipo,prioridad:f.prioridad,canal:'interno',estado:'Ingresada',
      region_id:region,direccion:f.direccion||cliente?.direccion||null,descripcion:f.descripcion||('OT '+f.tipo),
      checklist_code:defaultByType(f.tipo),asset_id:f.asset_id?Number(f.asset_id):null,fecha_programada:f.fecha||null};
    if(f.asig_tipo==='sat'){ patch.asignado_company_id=Number(f.asig_id); patch.estado='Asignada'; }
    if(f.asig_tipo==='tec'){ patch.asignado_user_id=Number(f.asig_id); patch.estado='Asignada'; }
    const {data,error}=await supabase.from('work_orders').insert([patch]).select();
    if(error) avisar('⛔ '+error.message,T.danger);
    else { avisar('✅ OT-'+data[0].ot_number+' creada'+(patch.estado==='Asignada'?' y asignada':' en ruta del día'),T.ok); onOk&&onOk();
      setF({customer_id:'',asset_id:'',tipo:'servicio',prioridad:'media',direccion:'',descripcion:'',fecha:'',asig_tipo:'',asig_id:''}); setPaso(1); }
  }

  const pasoBtn=(n,hab)=> <button disabled={!hab} style={{...S.btn(hab?T.info:T.border),width:'auto',marginBottom:0,opacity:hab?1:.5}} onClick={()=>setPaso(n)}>{n}</button>;

  return (
    <div style={S.card}>
      <h2 style={S.h2}>Nueva OT · asistente</h2>
      <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
        {['Cliente','Activo','Servicio','Asignación','Confirmar'].map((l,i)=><div key={l} style={{padding:'6px 12px',borderRadius:999,fontSize:12,fontWeight:800,background:paso===i+1?T.brand:paso>i+1?T.ok:T.card,color:paso===i+1?'#0B1220':paso>i+1?'#0B1220':T.sub,border:`1px solid ${paso<=i+1?'transparent':T.border}`}}>{i+1}·{l}</div>)}
      </div>

      {paso===1&&(
        <div>
          <label style={S.label}>Cliente *</label>
          <select style={S.input} value={f.customer_id} onChange={e=>setF({...f,customer_id:e.target.value})}>
            <option value="">Elegir…</option>{cust.map(c=><option key={c.id} value={c.id}>{c.nombre} · {c.rut||''}</option>)}
          </select>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <input style={{...S.input,flex:2,marginBottom:0}} placeholder="Nuevo cliente: nombre" value={nc.nombre} onChange={e=>setNc({...nc,nombre:e.target.value})}/>
            <input style={{...S.input,flex:1,marginBottom:0}} placeholder="RUT" value={nc.rut} onChange={e=>setNc({...nc,rut:e.target.value})}/>
            <input style={{...S.input,flex:1,marginBottom:0}} placeholder="Teléfono" value={nc.telefono} onChange={e=>setNc({...nc,telefono:e.target.value})}/>
            <button style={{...S.btnO(T.info),width:'auto',marginBottom:0}} onClick={crearCliente}>+ Cliente</button>
          </div>
          <div style={{marginTop:12}}><button style={{...S.btn(T.info),width:'auto'}} disabled={!f.customer_id} onClick={()=>setPaso(2)}>Siguiente →</button></div>
        </div>)}

      {paso===2&&(
        <div>
          <label style={S.label}>Activo / equipo (opcional)</label>
          <select style={S.input} value={f.asset_id} onChange={e=>setF({...f,asset_id:e.target.value})}>
            <option value="">Sin activo (servicio general)</option>{activos.map(a=><option key={a.id} value={a.id}>{a.model||a.serial} · {a.serial||''}</option>)}
          </select>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <input style={{...S.input,flex:1,marginBottom:0}} placeholder="N° serie" value={na.serial} onChange={e=>setNa({...na,serial:e.target.value})}/>
            <input style={{...S.input,flex:1,marginBottom:0}} placeholder="Modelo" value={na.model} onChange={e=>setNa({...na,model:e.target.value})}/>
            <select style={{...S.input,flex:1,marginBottom:0}} value={na.family_id} onChange={e=>setNa({...na,family_id:e.target.value})}><option value="">Familia…</option>{fams.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>
            <button style={{...S.btnO(T.info),width:'auto',marginBottom:0}} onClick={crearActivo}>+ Activo</button>
          </div>
          <div style={{display:'flex',gap:8,marginTop:12}}>{pasoBtn(1,true)}<button style={{...S.btn(T.info),width:'auto',marginBottom:0}} onClick={()=>setPaso(3)}>Siguiente →</button></div>
        </div>)}

      {paso===3&&(
        <div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <div style={{flex:1}}><label style={S.label}>Tipo de servicio</label>
              <select style={S.input} value={f.tipo} onChange={e=>setF({...f,tipo:e.target.value})}>{tipos.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
            <div style={{flex:1}}><label style={S.label}>Prioridad</label>
              <select style={S.input} value={f.prioridad} onChange={e=>setF({...f,prioridad:e.target.value})}><option>alta</option><option>media</option><option>baja</option></select></div>
          </div>
          <label style={S.label}>Dirección (si difiere del cliente)</label>
          <input style={S.input} value={f.direccion} onChange={e=>setF({...f,direccion:e.target.value})} placeholder={cliente?cliente.direccion||'':''}/>
          <button type="button" style={{...S.btnO(T.info),width:'auto',marginBottom:10}} onClick={verMapa}>🗺 Ver ubicación en mapa</button>
          <label style={S.label}>Descripción / síntoma</label>
          <textarea style={{...S.input,minHeight:80}} value={f.descripcion} onChange={e=>setF({...f,descripcion:e.target.value})}/>
          <p style={{...S.sub,margin:'0 0 10px'}}>Checklist automático: <b style={{color:T.teal}}>{defaultByType(f.tipo)}</b></p>
          <div style={{display:'flex',gap:8}}>{pasoBtn(2,true)}<button style={{...S.btn(T.info),width:'auto',marginBottom:0}} onClick={()=>setPaso(4)}>Siguiente →</button></div>
        </div>)}

      {paso===4&&(
        <div>
          <label style={S.label}>Asignación sugerida (región + especialidad + carga)</label>
          {sugeridos.map(s=>(
            <button key={s.t+s.id} onClick={()=>setF({...f,asig_tipo:s.t,asig_id:String(s.id)})} style={{...S.btnO(f.asig_tipo===s.t&&f.asig_id===String(s.id)?T.ok:T.border),textAlign:'left',color:T.text}}>
              {s.ok&&<span style={{color:T.ok}}>★ </span>}{s.n} {s.esp&&<span style={S.pill(T.teal)}>{s.esp}</span>} <span style={S.sub}>· carga {s.c}</span>
            </button>))}
          <button onClick={()=>setF({...f,asig_tipo:'',asig_id:''})} style={{...S.btnO(T.sub),textAlign:'left',color:T.text}}>📥 Sin asignar (ruta del día del técnico)</button>
          <label style={S.label}>Fecha programada (opcional)</label>
          <input style={S.input} type="date" value={f.fecha} onChange={e=>setF({...f,fecha:e.target.value})}/>
          <div style={{display:'flex',gap:8}}>{pasoBtn(3,true)}<button style={{...S.btn(T.info),width:'auto',marginBottom:0}} onClick={()=>setPaso(5)}>Siguiente →</button></div>
        </div>)}

      {paso===5&&(
        <div>
          <p style={{color:T.text,fontSize:15}}>Cliente: <b>{cliente?cliente.nombre:''}</b></p>
          <p style={S.sub}>Tipo {f.tipo} · prioridad {f.prioridad} · checklist {defaultByType(f.tipo)}</p>
          <p style={S.sub}>Asignación: {f.asig_tipo? (f.asig_tipo==='sat'? sats.find(s=>s.id===Number(f.asig_id))?.nombre : users.find(u=>u.id===Number(f.asig_id))?.nombre) : 'ruta del día'} {f.fecha&&('· '+f.fecha)}</p>
          <div style={{display:'flex',gap:8,marginTop:10}}>{pasoBtn(4,true)}<button style={{...S.btn(T.ok),width:'auto',marginBottom:0}} onClick={crear}>✅ Crear OT</button></div>
        </div>)}
    </div>);
}
