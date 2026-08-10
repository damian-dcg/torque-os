'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { T, S, estColor, fmtCLP, fmtFecha } from '../../lib/ui';
import ModNuevaOT from '../../lib/consola/mod_nuevaot';
import ModClientes from '../../lib/consola/mod_clientes';
import ModConfig from '../../lib/consola/mod_config';
import ModChecklists from '../../lib/consola/mod_checklists';
import ModRed from '../../lib/consola/mod_red';
import ModReportes from '../../lib/consola/mod_reportes';
import ModCatalogos from '../../lib/consola/mod_catalogos';
import ModAgenda from '../../lib/consola/mod_agenda';
import ModActivos from '../../lib/consola/mod_activos';
import ModPresupuestos from '../../lib/consola/mod_presupuestos';
import ModBodega from '../../lib/consola/mod_bodega';
import ModKpis from '../../lib/consola/mod_kpis';
import ModConectores from '../../lib/consola/mod_conectores';

export default function Consola(){
  const [me,setMe]=useState(null); const [tenant,setTenant]=useState(null);
  const [tab,setTab]=useState('dash');
  const [ots,setOts]=useState([]); const [cust,setCust]=useState({});
  const [events,setEvents]=useState([]); const [ins,setIns]=useState([]); const [nps,setNps]=useState([]);
  const [blocks,setBlocks]=useState({}); const [users,setUsers]=useState([]); const [sats,setSats]=useState([]); const [avail,setAvail]=useState([]);
  const [sel,setSel]=useState(null); const [q,setQ]=useState(''); const [fEst,setFEst]=useState('');
  const [asig,setAsig]=useState({tipo:'',id:''});
  const [availForm,setAvailForm]=useState({user_id:'',desde:'',hasta:'',motivo:''});
  const [toast,setToast]=useState(null);
  const router=useRouter();
  const brand=(tenant&&tenant.color_primario)||T.brand;
  function avisar(txt,color){ setToast({txt,color}); setTimeout(()=>setToast(null),2600); }

  useEffect(()=>{ supabase.auth.getSession().then(({data})=>{ if(!data.session) router.replace('/'); else cargar(data.session.user.id); }); },[]);

  async function cargar(uid){
    const [m,ten,o,c,ev,i,n,b,u,s,av]=await Promise.all([
      supabase.from('users').select('*').eq('auth_uid',uid).single(),
      supabase.from('tenants').select('*').eq('activo',true).limit(1),
      supabase.from('work_orders').select('*').order('id',{ascending:false}).limit(300),
      supabase.from('customers').select('*').limit(500),
      supabase.from('ot_events').select('*').order('created_at',{ascending:false}).limit(300),
      supabase.from('insistencias').select('*').order('created_at',{ascending:false}).limit(200),
      supabase.from('surveys_nps').select('*').limit(500),
      supabase.from('checklist_blocks').select('*'),
      supabase.from('users').select('*'),
      supabase.from('companies').select('*').eq('tipo','sat'),
      supabase.from('technician_availability').select('*').order('id',{ascending:false}).limit(100)
    ]);
    setMe(m.data); setTenant((ten.data||[])[0]||null); setOts(o.data||[]);
    const cm={}; (c.data||[]).forEach(x=>cm[x.id]=x); setCust(cm);
    setEvents(ev.data||[]); setIns(i.data||[]); setNps(n.data||[]);
    const bm={}; (b.data||[]).forEach(x=>bm[x.code]=x); setBlocks(bm);
    setUsers(u.data||[]); setSats(s.data||[]); setAvail(av.data||[]);
  }

  const buzón=events.filter(e=>['alerta_repuesto','motivo','pausa_repuesto'].includes(e.evento));
  const labelMap={}; Object.values(blocks).forEach(b=>{(b.items||[]).forEach((it,i)=>{ labelMap[it.id||b.code+'_'+i]=it.l; });});
  const activas=ots.filter(o=>!['Cerrada','Anulada','Rechazada'].includes(o.estado));
  const npsProm=nps.length? (nps.reduce((s,x)=>s+Number(x.nota||0),0)/nps.length).toFixed(1):'—';

  async function cambiarEstado(ot,estado){
    const {error}=await supabase.rpc('cambiar_estado_ot',{p_ot_id:ot.id,p_estado:estado});
    if(error) avisar('⛔ '+error.message,T.danger); else { setSel(null); cargar(me.auth_uid); }
  }
  async function asignar(ot){
    const patch={estado:'Asignada'};
    if(asig.tipo==='sat') patch.asignado_company_id=Number(asig.id);
    if(asig.tipo==='tec') patch.asignado_user_id=Number(asig.id);
    const {error}=await supabase.from('work_orders').update(patch).eq('id',ot.id);
    if(error) avisar('⛔ '+error.message,T.danger); else { setSel(null); cargar(me.auth_uid); }
  }
  async function guardarAvail(e){
    e.preventDefault();
    const {error}=await supabase.from('technician_availability').insert([{user_id:Number(availForm.user_id),desde:availForm.desde,hasta:availForm.hasta,motivo:availForm.motivo||null}]);
    if(error) avisar('⛔ '+error.message,T.danger); else { setAvailForm({user_id:'',desde:'',hasta:'',motivo:''}); cargar(me.auth_uid); }
  }

  const visibles=ots.filter(o=>{
    const t=q.toLowerCase();
    const okQ=!t||('ot-'+o.ot_number).toLowerCase().includes(t)||((cust[o.customer_id]||{}).nombre||'').toLowerCase().includes(t);
    return okQ&&(!fEst||o.estado===fEst);
  });

  const TABS=[['dash','Dashboard'],['buzon','Buzón ('+buzón.length+')'],['ots','Órdenes'],['nueva','Nueva OT'],['clientes','Clientes'],['agenda','Agenda'],['checklists','Checklists'],['red','Red SAT'],['reportes','Reportes'],['catalogos','Catálogos'],['agenda2','Agenda visual'],['activos','Activos'],['presupuestos','Presupuestos'],['bodega','Bodega'],['config','Configuración']];
  return (
    <main style={S.main}>
      {toast&&<div style={S.toast(toast.color)}>{toast.txt}</div>}
      <header style={{position:'sticky',top:0,zIndex:20,background:T.surface,borderBottom:`1px solid ${T.border}`,padding:'12px 16px',display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
        <h1 style={S.h1}>TORQUE<span style={{color:brand}}>·OS</span></h1>
        <span style={S.sub}>{tenant?tenant.nombre:''}</span>
        <nav style={{display:'flex',gap:6,marginLeft:'auto',flexWrap:'wrap'}}>
          {TABS.map(([k,l])=><button key={k} onClick={()=>setTab(k)} style={{padding:'8px 13px',borderRadius:10,border:tab===k?'0':`1px solid ${T.border}`,background:tab===k?brand:'transparent',color:tab===k?'#0B1220':T.muted,fontWeight:700,fontSize:13,cursor:'pointer'}}>{l}</button>)}
          <a href="/tecnico" style={{padding:'8px 13px',borderRadius:10,border:`1px solid ${T.border}`,color:T.muted,fontSize:13,textDecoration:'none'}}>Vista técnico</a>
          <button onClick={async()=>{await supabase.auth.signOut(); router.replace('/');}} style={{padding:'8px 13px',borderRadius:10,border:`1px solid ${T.danger}`,background:'transparent',color:T.danger,fontSize:13,cursor:'pointer'}}>Salir</button>
        </nav>
      </header>
      <div style={S.wrap}>

        {tab==='dash'&&(
          <div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12,marginBottom:14}}>
              {[['OTs activas',activas.length,T.info],['En Revisión QA',ots.filter(o=>o.estado==='Revisión QA').length,T.violet],['Esperando repuesto',ots.filter(o=>o.estado==='Esperando Repuesto').length,T.danger],['Rechazadas',ots.filter(o=>o.estado==='Rechazada').length,T.danger],['Insistencias',ins.length,T.warn],['NPS prom.',npsProm,T.ok]].map(([l,v,c],i)=>(
                <div key={i} style={{...S.card,marginBottom:0,borderTop:`3px solid ${c}`}}>
                  <div style={S.sub}>{l}</div><div style={{fontSize:26,fontWeight:800}}>{v}</div>
                </div>))}
            </div>
            <div style={S.card}><h2 style={S.h2}>Últimas OTs</h2>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr><th style={S.th}>OT</th><th style={S.th}>Cliente</th><th style={S.th}>Tipo</th><th style={S.th}>Estado</th><th style={S.th}>Ingreso</th></tr></thead>
                <tbody>{ots.slice(0,10).map(o=>(
                  <tr key={o.id} onClick={()=>{setSel(o);setTab('ots');}} style={{cursor:'pointer'}}>
                    <td style={{...S.td,color:brand,fontWeight:700}}>OT-{o.ot_number}</td>
                    <td style={S.td}>{(cust[o.customer_id]||{}).nombre||'—'}</td>
                    <td style={S.td}>{o.tipo}</td>
                    <td style={S.td}><span style={S.pill(estColor(o.estado))}>{o.estado}</span></td>
                    <td style={S.td}>{fmtFecha(o.created_at)}</td>
                  </tr>))}</tbody>
              </table></div>
          </div>)}

        {tab==='buzon'&&(
          <div style={S.card}><h2 style={S.h2}>Buzón del agente</h2>
            {buzón.length===0&&<p style={S.sub}>Sin pendientes.</p>}
            {buzón.map(e=>(
              <div key={e.id} style={{border:`1px solid ${T.border}`,borderRadius:10,padding:12,marginBottom:10,background:T.surface2}}>
                <div style={{display:'flex',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}>
                  <b style={{color:e.evento==='motivo'?T.danger:T.warn,fontSize:14}}>{e.evento==='motivo'?'RECHAZO':e.evento==='alerta_repuesto'?'REPUESTO SOLICITADO':'PAUSA'} · OT-{(ots.find(o=>o.id===e.ot_id)||{}).ot_number||e.ot_id}</b>
                  <span style={S.sub}>{fmtFecha(e.created_at)}</span></div>
                <p style={{margin:'6px 0 0',color:T.text,fontSize:14}}>{e.detalle?(e.detalle.motivo||e.detalle.repuesto||('Área: '+(e.detalle.area||'—'))):''}</p>
              </div>))}
          </div>)}

        {tab==='ots'&&(
          <div>
            <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
              <input style={{...S.input,flex:2,minWidth:200,marginBottom:0}} placeholder="Buscar por N° o cliente…" value={q} onChange={e=>setQ(e.target.value)}/>
              <select style={{...S.input,flex:1,minWidth:160,marginBottom:0}} value={fEst} onChange={e=>setFEst(e.target.value)}>
                <option value="">Todos los estados</option>
                {['Ingresada','Asignada','Aceptada','Rechazada','En Ruta','Llegada','Trabajando','Esperando Repuesto','Finalizada','Revisión QA','Cerrada','Anulada'].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={S.card}><table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr><th style={S.th}>OT</th><th style={S.th}>Cliente</th><th style={S.th}>Tipo</th><th style={S.th}>Estado</th><th style={S.th}>Ingreso</th></tr></thead>
              <tbody>{visibles.map(o=>(
                <tr key={o.id} onClick={()=>setSel(o)} style={{cursor:'pointer'}}>
                  <td style={{...S.td,color:brand,fontWeight:700}}>OT-{o.ot_number}</td>
                  <td style={S.td}>{(cust[o.customer_id]||{}).nombre||'—'}</td>
                  <td style={S.td}>{o.tipo}</td>
                  <td style={S.td}><span style={S.pill(estColor(o.estado))}>{o.estado}</span></td>
                  <td style={S.td}>{fmtFecha(o.created_at)}</td>
                </tr>))}</tbody>
            </table></div>
          </div>)}

        {tab==='nueva'&&<ModNuevaOT avisar={avisar} onOk={()=>cargar(me.auth_uid)}/>}
        {tab==='clientes'&&<ModClientes avisar={avisar}/>}
        {tab==='agenda'&&(
          <div>
            <div style={S.card}><h2 style={S.h2}>Registrar indisponibilidad</h2>
              <form onSubmit={guardarAvail} style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:8}}>
                <select style={S.input} required value={availForm.user_id} onChange={e=>setAvailForm({...availForm,user_id:e.target.value})}><option value="">Técnico…</option>{users.map(u=><option key={u.id} value={u.id}>{u.nombre}</option>)}</select>
                <input style={S.input} type="date" required value={availForm.desde} onChange={e=>setAvailForm({...availForm,desde:e.target.value})}/>
                <input style={S.input} type="date" required value={availForm.hasta} onChange={e=>setAvailForm({...availForm,hasta:e.target.value})}/>
                <input style={S.input} placeholder="Motivo / zona" value={availForm.motivo} onChange={e=>setAvailForm({...availForm,motivo:e.target.value})}/>
                <button style={S.btn(T.info)}>Guardar</button>
              </form></div>
            <div style={S.card}><h2 style={S.h2}>Indisponibilidades</h2>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr><th style={S.th}>Técnico</th><th style={S.th}>Desde</th><th style={S.th}>Hasta</th><th style={S.th}>Motivo</th></tr></thead>
                <tbody>{avail.map(a=><tr key={a.id}><td style={S.td}>{(users.find(u=>u.id===a.user_id)||{}).nombre||a.user_id}</td><td style={S.td}>{a.desde}</td><td style={S.td}>{a.hasta}</td><td style={S.td}>{a.motivo||'—'}</td></tr>)}</tbody>
              </table></div>
          </div>)}

        {tab==='checklists'&&<ModChecklists avisar={avisar}/>}
        {tab==='red'&&<ModRed avisar={avisar}/>}
        {tab==='reportes'&&<ModReportes/>}
        {tab==='catalogos'&&<ModCatalogos avisar={avisar}/>}
        {tab==='agenda2'&&<ModAgenda avisar={avisar}/>}
        {tab==='activos'&&<ModActivos avisar={avisar}/>}
        {tab==='presupuestos'&&<ModPresupuestos avisar={avisar} tenant={tenant}/>}
        {tab==='bodega'&&<ModBodega avisar={avisar}/>}
        {tab==='config'&&<ModConfig tenant={tenant} avisar={avisar} onTenant={setTenant}/>}
      </div>

      {sel&&(
        <div style={S.modal} onClick={()=>setSel(null)}>
          <div style={{...S.modalCard,maxWidth:760,maxHeight:'88vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <h2 style={{...S.h2,margin:0,color:brand}}>OT-{sel.ot_number}</h2>
              <span style={S.pill(estColor(sel.estado))}>{sel.estado}</span></div>
            <p style={S.sub}>{(cust[sel.customer_id]||{}).nombre} · {(cust[sel.customer_id]||{}).rut||''} · {(cust[sel.customer_id]||{}).telefono||''}</p>
            <p style={S.sub}>{sel.direccion||(cust[sel.customer_id]||{}).direccion||''} · {sel.tipo} · prioridad {sel.prioridad}</p>
            <p style={{color:T.text,fontSize:14}}>{sel.descripcion}</p>
            {(sel.estado==='Ingresada'||sel.estado==='Asignada')&&(
              <div style={{...S.card,background:T.surface2}}>
                <h3 style={{...S.h2,color:T.info}}>Asignar</h3>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  <select style={{...S.input,flex:1,marginBottom:0}} value={asig.tipo+':'+asig.id} onChange={e=>{const [t,i]=(e.target.value||':').split(':'); setAsig({tipo:t,id:i});}}>
                    <option value="">Elegir destino…</option>
                    <optgroup label="Técnicos">{users.map(u=><option key={'t'+u.id} value={'tec:'+u.id}>{u.nombre}</option>)}</optgroup>
                    <optgroup label="SAT">{sats.map(s=><option key={'s'+s.id} value={'sat:'+s.id}>{s.nombre}</option>)}</optgroup>
                  </select>
                  <button style={{...S.btn(T.info),width:'auto',marginBottom:0}} onClick={()=>asignar(sel)}>Asignar</button>
                </div></div>)}
            {sel.estado==='Revisión QA'&&(
              <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:10}}>
                <button style={{...S.btn(T.ok),flex:1}} onClick={()=>cambiarEstado(sel,'Cerrada')}>✔ Aprobar y cerrar</button>
                <button style={{...S.btnO(T.warn),flex:1}} onClick={()=>cambiarEstado(sel,'Trabajando')}>↩ Devolver</button>
              </div>)}
            {sel.estado!=='Cerrada'&&sel.estado!=='Anulada'&&(
              <button style={S.btnO(T.danger)} onClick={()=>{ if(window.confirm('¿Anular esta OT?')) cambiarEstado(sel,'Anulada'); }}>Anular OT</button>)}
            <h3 style={{...S.h2,color:T.teal,marginTop:14}}>Checklist respondido</h3>
            {Object.entries(sel.checklist_responses||{}).filter(([k])=>!k.startsWith('w_')).map(([k,v])=>(
              <div key={k} style={{marginBottom:8}}>
                <div style={S.sub}>{labelMap[k]||k}</div>
                {Array.isArray(v)? <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{v.map((u,i)=><img key={i} src={u} style={{width:64,height:64,objectFit:'cover',borderRadius:8}}/>)}</div>
                : <div style={{color:T.text,fontSize:14}}>{String(v)}</div>}
              </div>))}
            {sel.checklist_responses&&sel.checklist_responses.w_garantia!=null&&(
              <p style={S.sub}>Garantía: {sel.checklist_responses.w_garantia||'—'} · Causa: {sel.checklist_responses.w_causa||'—'} · Cobro: {sel.checklist_responses.w_cobro||'—'} ({sel.checklist_responses.w_medio||'—'})</p>)}
            {(sel.evidence_urls||[]).length>0&&(
              <div><h3 style={{...S.h2,color:T.teal}}>Anexo (fotos y firma)</h3>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{sel.evidence_urls.map((u,i)=><img key={i} src={u} style={{width:64,height:64,objectFit:'cover',borderRadius:8}}/>)}</div></div>)}
            {sel.financial_data&&sel.financial_data.totalCost!=null&&(
              <p style={{color:T.ok,fontWeight:800,marginTop:10}}>Total terreno: {fmtCLP(sel.financial_data.totalCost)}</p>)}
                        <a style={{...S.btnO(T.ok),display:'inline-block',marginTop:10,textDecoration:'none'}} target="_blank"
   href={'https://wa.me/'+((cust[sel.customer_id]||{}).telefono||'').replace(/[^\d+]/g,'')+'?text='+encodeURIComponent('Bianchi Servicio Técnico: su OT-'+sel.ot_number+' está en estado '+sel.estado+'.')}>
   💬 Avisar cliente por WhatsApp</a>
            <h3 style={{...S.h2,color:T.violet,marginTop:14}}>Insistencias del cliente</h3>
            {ins.filter(i=>i.ot_id===sel.id).map(i=><p key={i.id} style={{color:T.text,fontSize:14,margin:'4px 0'}}>{fmtFecha(i.created_at)} — {i.mensaje}</p>)}
            {ins.filter(i=>i.ot_id===sel.id).length===0&&<p style={S.sub}>Sin insistencias.</p>}
            <h3 style={{...S.h2,color:T.warn,marginTop:14}}>Encuesta (NPS)</h3>
            {nps.filter(n=>n.ot_id===sel.id).map(n=><p key={n.id} style={{color:T.text,fontSize:14,margin:'4px 0'}}>★ {n.nota} · P{n.punctuality}/A{n.attention}/S{n.solution} {n.comentario?('— '+n.comentario):''}</p>)}
            {nps.filter(n=>n.ot_id===sel.id).length===0&&<p style={S.sub}>Sin encuesta.</p>}
            <h3 style={{...S.h2,color:T.muted,marginTop:14}}>Bitácora</h3>
            {events.filter(e=>e.ot_id===sel.id).map(e=><p key={e.id} style={{color:T.sub,fontSize:12,margin:'3px 0'}}>{fmtFecha(e.created_at)} · {e.evento}</p>)}
          </div>
        </div>)}
    </main>
  );
}
