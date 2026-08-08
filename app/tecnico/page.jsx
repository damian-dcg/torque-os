'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';

const T={fondo:'#0f1418',card:'#161d23',borde:'#2b3540',texto:'#eef2f5',sub:'#9aa7b1',brand:'#ff6b2c',ok:'#22c07a',info:'#3d9df0',warn:'#f5b83d',danger:'#f0564a',violet:'#a78bfa',teal:'#2dd4bf'};
const FAM="-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";
const card={background:T.card,border:`1px solid ${T.borde}`,borderRadius:14,padding:16,marginBottom:12};
const lab={fontSize:13,color:T.sub,fontWeight:600,display:'block',marginBottom:6};
const inp={width:'100%',padding:13,borderRadius:10,border:`1px solid ${T.borde}`,background:T.fondo,color:T.texto,fontSize:16,marginBottom:12,boxSizing:'border-box'};
const btn=bg=>({width:'100%',padding:15,borderRadius:12,border:0,background:bg,color:'#0b0f12',fontWeight:800,fontSize:16,cursor:'pointer',marginBottom:10});
const btnO=c=>({width:'100%',padding:13,borderRadius:12,border:`1.5px solid ${c}`,background:'transparent',color:c,fontWeight:700,fontSize:15,cursor:'pointer',marginBottom:10});
const pill=c=>({display:'inline-block',padding:'4px 10px',borderRadius:999,fontSize:11,fontWeight:800,background:c+'26',color:c});
const estColor=e=>({'Ingresada':T.info,'Asignada':T.info,'Aceptada':T.teal,'Rechazada':T.danger,'En Ruta':T.brand,'Llegada':T.teal,'Trabajando':T.warn,'Esperando Repuesto':T.danger,'Finalizada':T.ok,'Revisión QA':T.violet,'Cerrada':T.ok}[e]||T.sub);
const defaultByType=t=>{const x=(t||'').toLowerCase(); if(x.includes('volumen'))return 'CK-ARM-VOL-BICI'; if(x.includes('armado'))return 'CK-ARM-BICI'; if(x.includes('garantia'))return 'CK-EVAL-GARANTIA'; if(x.includes('retiro'))return 'CK-RETIRO'; if(x.includes('manten'))return 'CK-MANT-ELEC'; return 'CK-REP-CONV';};
const pasoDe=e=>(['Ingresada'].includes(e)?0:['Asignada','Aceptada','En Ruta'].includes(e)?1:['Llegada','Trabajando','Esperando Repuesto'].includes(e)?2:3);
const dist=(a,b,c,d)=>{const R=6371000,r=x=>x*Math.PI/180;const dLa=r(c-a),dLo=r(d-b);const s=Math.sin(dLa/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(dLo/2)**2;return 2*R*Math.asin(Math.sqrt(s));};

function Firma({onChange}){
  const ref=useRef(null); const draw=useRef(false);
  useEffect(()=>{
    const c=ref.current; const ctx=c.getContext('2d'); ctx.lineWidth=2.4; ctx.lineCap='round'; ctx.strokeStyle='#111';
    const pos=e=>{const r=c.getBoundingClientRect(); const t=e.touches?e.touches[0]:e; return [t.clientX-r.left,t.clientY-r.top];};
    const dn=e=>{draw.current=true; const [x,y]=pos(e); ctx.beginPath(); ctx.moveTo(x,y); e.preventDefault();};
    const mv=e=>{ if(!draw.current)return; const [x,y]=pos(e); ctx.lineTo(x,y); ctx.stroke(); e.preventDefault(); onChange(c.toDataURL('image/png'));};
    const up=()=>{draw.current=false;};
    c.addEventListener('mousedown',dn); c.addEventListener('mousemove',mv); window.addEventListener('mouseup',up);
    c.addEventListener('touchstart',dn,{passive:false}); c.addEventListener('touchmove',mv,{passive:false}); c.addEventListener('touchend',up);
  },[]);
  return <canvas ref={ref} width={330} height={140} style={{border:'1.5px solid '+T.borde,background:'#fff',borderRadius:10,touchAction:'none',maxWidth:'100%'}}/>;
}

export default function Tecnico(){
  const [user,setUser]=useState(null); const [me,setMe]=useState(null);
  const [login,setLogin]=useState({email:'',pass:''});
  const [ots,setOts]=useState([]); const [cust,setCust]=useState({}); const [regs,setRegs]=useState({});
  const [sel,setSel]=useState(null);
  const [blocks,setBlocks]=useState({}); const [checks,setChecks]=useState([]);
  const [answers,setAnswers]=useState({});
  const [cupon,setCupon]=useState(''); const [manual,setManual]=useState(false); const [fotoEtiqueta,setFotoEtiqueta]=useState(null); const [cajas,setCajas]=useState('');
  const [firma,setFirma]=useState(null);
  const [costos,setCostos]=useState([]); const [nuevoCosto,setNuevoCosto]=useState({concepto:'',monto:''});
  const [gar,setGar]=useState({aplica:'',causa:''}); const [cobro,setCobro]=useState({tipo:'',medio:''});
  const [modal,setModal]=useState(null); const [motivo,setMotivo]=useState(''); const [repuesto,setRepuesto]=useState('');
  const [rechazoOt,setRechazoOt]=useState(null);
  const [nps,setNps]=useState(null); const [toast,setToast]=useState(null);
  const meRef=useRef(null); const selRef=useRef(null);

  useEffect(()=>{ selRef.current=sel; },[sel]);
  function avisar(txt,color){ setToast({txt,color}); setTimeout(()=>setToast(null),2600); }
  async function token(){ const {data}=await supabase.auth.getSession(); return data.session?data.session.access_token:null; }
  function pos(ms){ return new Promise((res,rej)=>navigator.geolocation.getCurrentPosition(res,rej,{timeout:ms,maximumAge:15000})); }

  async function cargarOTs(){
    const m=meRef.current;
    let q=supabase.from('work_orders').select('*').order('id',{ascending:false}).limit(200);
    if(m&&m.rol==='tecnico_sat') q=q.eq('asignado_user_id',m.id); else if(m&&m.rol==='sat_admin') q=q.eq('asignado_company_id',m.company_id);
    const {data}=await q; setOts(data||[]);
  }

  useEffect(()=>{ supabase.auth.getSession().then(({data})=>{ if(data.session) setUser(data.session.user); }); },[]);
  useEffect(()=>{ if(!user) return;
    (async()=>{
      const {data:m}=await supabase.from('users').select('*').eq('auth_uid',user.id).single();
      meRef.current=m; setMe(m);
      const [b,c,cu,r]=await Promise.all([supabase.from('checklist_blocks').select('*'),supabase.from('checklists').select('*'),supabase.from('customers').select('*'),supabase.from('regions').select('*')]);
      const bm={}; (b.data||[]).forEach(x=>bm[x.code]=x); setBlocks(bm); setChecks(c.data||[]);
      const cm={}; (cu.data||[]).forEach(x=>cm[x.id]=x); setCust(cm);
      const rm={}; (r.data||[]).forEach(x=>rm[x.id]=x.nombre); setRegs(rm);
      await cargarOTs();
    })();
    const ch=supabase.channel('rt-tec').on('postgres_changes',{event:'*',schema:'public',table:'work_orders'},()=>{ cargarOTs(); }).subscribe();
    return ()=>supabase.removeChannel(ch);
  },[user]);

  useEffect(()=>{ if(!user) return;
    window.history.replaceState({v:'list'},'');
    const onPop=()=>{
      if(selRef.current){ setSel(null); window.history.pushState({v:'list'},''); }
      else { setModal('salir'); window.history.pushState({v:'list'},''); }
    };
    window.addEventListener('popstate',onPop);
    return ()=>window.removeEventListener('popstate',onPop);
  },[user]);

  async function entrar(e){ e.preventDefault();
    const {data,error}=await supabase.auth.signInWithPassword({email:login.email,password:login.pass});
    if(error) avisar('Credenciales incorrectas',T.danger); else setUser(data.user);
  }
  async function salir(){ await supabase.auth.signOut(); setUser(null); setSel(null); setModal(null); }
  async function subirFoto(otId,file){ const path=`ot-${otId}/${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`;
    const {error}=await supabase.storage.from('evidencia').upload(path,file); if(error){ avisar('No se pudo subir la foto',T.danger); return null; }
    return supabase.storage.from('evidencia').getPublicUrl(path).data.publicUrl; }

  async function parche(ot,estado,extra){
    setOts(prev=>prev.map(x=>x.id===ot.id?{...x,estado}:x));
    const tk=await token();
    fetch(`/api/v1/work-orders/${ot.id}/status`,{method:'PATCH',headers:{Authorization:`Bearer ${tk}`,'Content-Type':'application/json'},body:JSON.stringify({status:estado,...(extra||{})})})
      .then(r=>r.json()).then(d=>{ if(d&&d.error){ avisar(d.error,T.danger); cargarOTs(); } else avisar('Estado: '+estado,T.ok); })
      .catch(()=>avisar('Sin conexión: se reintentará',T.warn));
    try{ const p=await pos(2500); await supabase.from('ot_events').insert([{ot_id:ot.id,evento:'geo',detalle:{estado,lat:p.coords.latitude,lng:p.coords.longitude}}]); }catch(e){}
  }

  async function geocodificar(ot,dir){ if(ot.geo_cliente||!dir) return;
    try{ const r=await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(dir+', Chile')}`); const j=await r.json();
      if(j&&j[0]){ await supabase.from('work_orders').update({geo_cliente:{lat:parseFloat(j[0].lat),lng:parseFloat(j[0].lon)}}).eq('id',ot.id); } }catch(e){}
  }

  function enCamino(ot){ const c=cust[ot.customer_id]||{}; const tel=(c.telefono||'').replace(/[^\d+]/g,'');
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(`Hola ${c.nombre||''}, le saluda el técnico de Bianchi. Voy en camino a su servicio OT-${ot.ot_number}.`)}`,'_blank');
    geocodificar(ot, ot.direccion||c.direccion);
    parche(ot,'En Ruta');
  }

  async function confirmarLlegada(ot){
    if(ot.geo_cliente){ try{ const p=await pos(3000); const d=dist(p.coords.latitude,p.coords.longitude,ot.geo_cliente.lat,ot.geo_cliente.lng);
      if(d>100) avisar('A '+Math.round(d)+' m de la dirección (radio 100 m). Registrado con observación.',T.warn);
    }catch(e){ avisar('Sin GPS: llegada sin validación de radio.',T.warn); } }
    parche(ot,'Llegada');
  }

  function abrirDetalle(o){
    if(pendientes.length){ avisar('Primero acepta o rechaza tu ruta del día',T.warn); return; }
    setSel(o.id); setAnswers({}); setCupon(''); setCajas(''); setCostos([]); setFirma(null); setManual(false); setFotoEtiqueta(null); setGar({aplica:'',causa:''}); setCobro({tipo:'',medio:''});
    window.history.pushState({v:'detail'},'');
  }

  const ot=ots.find(o=>o.id===sel)||null;
  const cliente=ot?cust[ot.customer_id]||{}:{};
  const paso=ot?pasoDe(ot.estado):0;
  const grupos=ot?((checks.find(c=>c.code===(ot.checklist_code||defaultByType(ot.tipo)))||{blocks:[]}).blocks||[]).map(bc=>blocks[bc]).filter(Boolean):[];
  const esArmado=ot&&((ot.tipo||'').toLowerCase().includes('armado'));
  const total=15000+costos.reduce((s,x)=>s+(Number(x.monto)||0),0);
  const pendientes=ots.filter(o=>o.estado==='Ingresada');
  const activas=ots.filter(o=>!['Ingresada','Cerrada','Rechazada'].includes(o.estado));

  function valItem(g,it,i){ const id=it.id||g.code+'_'+i; return answers[id]; }
  function faltaObligatorios(){ const f=[]; grupos.forEach(g=>(g.items||[]).forEach((it,i)=>{ if(it.r){ const v=valItem(g,it,i); if(it.t==='foto'){ if(!(v&&v.length)) f.push(it.l); } else if(!v||!String(v).trim()) f.push(it.l); } })); return f; }

  function aceptarTodas(){ pendientes.forEach(o=>parche(o,'Asignada')); avisar('Ruta aceptada: '+pendientes.length+' OT(s)',T.ok); }
  function confirmarRechazo(){ if(!motivo.trim()){ avisar('El motivo es obligatorio',T.danger); return; }
    parche(rechazoOt,'Rechazada',{motivo}); setModal(null); setMotivo(''); avisar('Rechazada con motivo → pasa al agente',T.ok); }

  async function solicitarRepuesto(){ if(!repuesto.trim()){ avisar('Describe el repuesto',T.danger); return; }
    await supabase.from('ot_events').insert([{ot_id:ot.id,evento:'alerta_repuesto',detalle:{repuesto,area:'Bodega'}}]);
    setModal(null); setRepuesto('');
    parche(ot,'Esperando Repuesto',{area_responsable:'Bodega'});
  }

  async function finalizar(){
    const pend=faltaObligatorios(); if(pend.length){ avisar('Checklist incompleto: '+pend.slice(0,3).join(' · '),T.danger); return; }
    if(!firma){ avisar('Falta la firma del cliente',T.danger); return; }
    if(esArmado&&!cupon.trim()){ avisar('Falta el código de cupón',T.danger); return; }
    if(esArmado&&manual&&!fotoEtiqueta){ avisar('Ingreso manual exige foto de la etiqueta',T.danger); return; }
    const checklist={...answers,w_garantia:gar.aplica,w_causa:gar.causa,w_cobro:cobro.tipo,w_medio:cobro.medio};
    const tk=await token();
    setOts(prev=>prev.map(x=>x.id===ot.id?{...x,estado:'Revisión QA'}:x));
    const r=await fetch(`/api/v1/work-orders/${ot.id}/status`,{method:'PATCH',headers:{Authorization:`Bearer ${tk}`,'Content-Type':'application/json'},body:JSON.stringify({status:'Revisión QA',checklist,couponCode:cupon.trim()||undefined,boxCode:cajas.trim()||undefined,financials:{baseCost:15000,manualItems:costos,totalCost:total,garantia:gar.aplica,cobro:cobro.tipo},firma})});
    const d=await r.json();
    if(d&&d.error){ avisar(d.error,T.danger); cargarOTs(); return; }
    avisar('OT finalizada → Revisión QA',T.ok);
    setNps({p:0,a:0,s:0,com:''});
  }

  async function enviarNps(){ const tk=await token();
    await fetch(`/api/v1/work-orders/${ot.id}/nps`,{method:'POST',headers:{Authorization:`Bearer ${tk}`,'Content-Type':'application/json'},body:JSON.stringify({punctuality:nps.p,attention:nps.a,solution:nps.s,comentario:nps.com})});
    setNps(null); avisar('Encuesta registrada',T.ok);
  }

  function pdf(){
    const filas=grupos.map(g=>(g.items||[]).map((it,i)=>{ const v=valItem(g,it,i); if(v==null||v==='') return '';
      return `<tr><td>${it.l}</td><td>${Array.isArray(v)?v.length+' foto(s)':v}</td></tr>`; }).join('')).join('');
    const fotos=Object.values(answers).filter(v=>Array.isArray(v)).flat();
    const w=window.open('','_blank');
    w.document.write(`<html><head><title>OT-${ot.ot_number}</title><style>body{font-family:Arial;padding:24px;color:#111}h1{margin:0;font-size:20px}table{width:100%;border-collapse:collapse;margin:10px 0}td,th{border:1px solid #ccc;padding:6px;font-size:12px;text-align:left}img{width:110px;height:110px;object-fit:cover;margin:4px}</style></head><body>
<h1>TORQUE·OS — Comprobante de Servicio Técnico</h1>
<p>OT-${ot.ot_number} · ${new Date().toLocaleString('es-CL')} · Técnico: ${(me&&me.nombre)||''}</p>
<table><tr><th>Cliente</th><td>${cliente.nombre||''}</td><th>RUT</th><td>${cliente.rut||''}</td></tr>
<tr><th>Teléfono</th><td>${cliente.telefono||''}</td><th>Región</th><td>${regs[cliente.region_id]||''}</td></tr>
<tr><th>Dirección</th><td colspan="3">${ot.direccion||cliente.direccion||''}</td></tr>
<tr><th>Tipo</th><td>${ot.tipo}</td><th>Garantía/Cobro</th><td>${gar.aplica||'—'} / ${cobro.tipo||'—'}</td></tr></table>
<table><tr><th>Checklist</th><th>Respuesta</th></tr>${filas}</table>
<table><tr><th>Concepto</th><th>Monto</th></tr><tr><td>Costo base visita</td><td>$15.000</td></tr>${costos.map(x=>`<tr><td>${x.concepto}</td><td>$${Number(x.monto).toLocaleString('es-CL')}</td></tr>`).join('')}<tr><td><b>TOTAL</b></td><td><b>$${total.toLocaleString('es-CL')}</b></td></tr></table>
${firma?`<p><b>Firma del cliente:</b></p><img src="${firma}" style="width:220px;height:90px;object-fit:contain"/>`:''}
${fotos.length?`<p><b>Anexo fotográfico:</b></p>${fotos.map(f=>`<img src="${f}"/>`).join('')}`:''}
<script>window.print()</script></body></html>`);
    w.document.close();
  }

  const Overlays=(<>
    {toast&&<div style={{position:'fixed',bottom:26,left:16,right:16,zIndex:99,background:T.card,border:`2px solid ${toast.color}`,color:toast.color,borderRadius:12,padding:'14px 18px',fontWeight:800,fontSize:15,boxShadow:'0 8px 30px rgba(0,0,0,.55)',pointerEvents:'none',textAlign:'center',fontFamily:FAM}}>{toast.txt}</div>}
    {modal==='rechazo'&&(
      <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',display:'grid',placeItems:'center',padding:20,zIndex:60}}>
        <div style={{...card,width:'100%',maxWidth:430,marginBottom:0}}>
          <h3 style={{margin:'0 0 12px',color:T.danger,fontSize:17,fontFamily:FAM}}>Motivo del rechazo (obligatorio)</h3>
          <p style={{margin:'0 0 10px',color:T.sub,fontSize:13,fontFamily:FAM}}>OT-{rechazoOt?rechazoOt.ot_number:''} · pasará al agente para reasignar o reagendar.</p>
          <textarea style={{...inp,minHeight:90}} placeholder="Ej: ruta muy larga, vehículo averiado, sin acceso al cliente…" value={motivo} onChange={e=>setMotivo(e.target.value)}/>
          <button onClick={confirmarRechazo} style={btn(T.danger)}>Confirmar rechazo</button>
          <button onClick={()=>setModal(null)} style={btnO(T.sub)}>Cancelar</button>
        </div>
      </div>)}
    {modal==='repuesto'&&(
      <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',display:'grid',placeItems:'center',padding:20,zIndex:60}}>
        <div style={{...card,width:'100%',maxWidth:430,marginBottom:0}}>
          <h3 style={{margin:'0 0 12px',color:T.warn,fontSize:17,fontFamily:FAM}}>Repuesto necesario</h3>
          <textarea style={{...inp,minHeight:80}} placeholder="Ej: Banda de trote 2070x360 (2018G00176)…" value={repuesto} onChange={e=>setRepuesto(e.target.value)}/>
          <button onClick={solicitarRepuesto} style={btn(T.warn)}>Pausar OT y alertar al agente</button>
          <button onClick={()=>setModal(null)} style={btnO(T.sub)}>Cancelar</button>
        </div>
      </div>)}
    {modal==='salir'&&(
      <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',display:'grid',placeItems:'center',padding:20,zIndex:60}}>
        <div style={{...card,width:'100%',maxWidth:430,marginBottom:0}}>
          <h3 style={{margin:'0 0 12px',fontSize:17,fontFamily:FAM,color:T.texto}}>¿Cerrar sesión?</h3>
          <p style={{margin:'0 0 14px',color:T.sub,fontSize:14,fontFamily:FAM}}>Tus OTs quedan guardadas y sincronizadas.</p>
          <button onClick={salir} style={btn(T.danger)}>Sí, cerrar sesión</button>
          <button onClick={()=>setModal(null)} style={btnO(T.ok)}>No, continuar trabajando</button>
        </div>
      </div>)}
    {nps&&(
      <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',display:'grid',placeItems:'center',padding:20,zIndex:60}}>
        <div style={{...card,width:'100%',maxWidth:430,marginBottom:0}}>
          <h3 style={{margin:'0 0 12px',fontSize:17,fontFamily:FAM,color:T.texto}}>Encuesta al cliente (obligatoria)</h3>
          {[['p','Puntualidad'],['a','Atención'],['s','Solución del problema']].map(([k,l])=>(
            <div key={k} style={{marginBottom:10}}><label style={lab}>{l}</label>
              <div>{[1,2,3,4,5].map(n=><span key={n} onClick={()=>setNps({...nps,[k]:n})} style={{fontSize:30,cursor:'pointer',color:n<=nps[k]?T.warn:T.borde,marginRight:6}}>★</span>)}</div>
            </div>))}
          <textarea style={{...inp,minHeight:70}} placeholder="Comentario del cliente (opcional)" value={nps.com} onChange={e=>setNps({...nps,com:e.target.value})}/>
          <button onClick={()=>{ if(!nps.p||!nps.a||!nps.s){ avisar('Las 3 calificaciones son obligatorias',T.danger); return; } enviarNps(); }} style={btn(T.ok)}>Enviar encuesta</button>
        </div>
      </div>)}
  </>);

  if(!user) return (
    <main style={{minHeight:'100vh',background:T.fondo,display:'grid',placeItems:'center',fontFamily:FAM,padding:16}}>
      {Overlays}
      <form onSubmit={entrar} style={{...card,width:'100%',maxWidth:360}}>
        <h1 style={{margin:'0 0 2px',fontSize:26,color:T.texto,letterSpacing:.5}}>TORQUE<span style={{color:T.brand}}>·OS</span></h1>
        <p style={{margin:'0 0 18px',color:T.sub,fontSize:13}}>Acceso técnico de terreno</p>
        <label style={lab}>Correo</label>
        <input style={inp} type="email" value={login.email} onChange={e=>setLogin({...login,email:e.target.value})} required/>
        <label style={lab}>Contraseña</label>
        <input style={inp} type="password" value={login.pass} onChange={e=>setLogin({...login,pass:e.target.value})} required/>
        <button style={btn(T.info)}>Ingresar</button>
      </form>
    </main>
  );

  if(!ot) return (
    <main style={{minHeight:'100vh',background:T.fondo,fontFamily:FAM,padding:16,maxWidth:600,margin:'0 auto'}}>
      {Overlays}
      <header style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
        <h1 style={{margin:0,fontSize:21,color:T.texto}}>TORQUE<span style={{color:T.brand}}>·OS</span></h1>
        <span style={{color:T.sub,fontSize:13}}>{(me&&me.nombre)||''}</span>
        <button onClick={()=>setModal('salir')} style={{...btnO(T.danger),width:'auto',marginLeft:'auto',marginBottom:0,padding:'8px 14px'}}>Salir</button>
      </header>
      {pendientes.length>0&&(
        <div style={{...card,border:`2px solid ${T.info}`}}>
          <h4 style={{margin:'0 0 12px',color:T.info,fontSize:14}}>Ruta del día · {pendientes.length} OT(s) por aceptar</h4>
          <button onClick={aceptarTodas} style={btn(T.ok)}>✔ ACEPTAR TODAS ({pendientes.length})</button>
          {pendientes.map(o=>{ const c=cust[o.customer_id]||{}; return (
            <div key={o.id} style={{border:`1px solid ${T.borde}`,borderRadius:12,padding:14,marginBottom:10,background:T.fondo}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><b style={{color:T.brand,fontSize:15}}>OT-{o.ot_number}</b><span style={pill(estColor(o.estado))}>{o.estado}</span></div>
              <div style={{color:T.texto,fontSize:15,marginTop:6,fontWeight:600}}>{c.nombre}</div>
              <div style={{color:T.sub,fontSize:13,marginTop:2}}>{o.tipo} · {o.direccion||c.direccion||''}</div>
              <div style={{display:'flex',gap:8,marginTop:10}}>
                <button onClick={()=>parche(o,'Asignada')} style={{...btn(T.ok),flex:1,marginBottom:0}}>Aceptar</button>
                <button onClick={()=>{setRechazoOt(o);setMotivo('');setModal('rechazo');}} style={{...btnO(T.danger),flex:1,marginBottom:0}}>Rechazar</button>
              </div>
            </div>);})}
        </div>)}
      <h4 style={{margin:'4px 0 10px',color:T.sub,fontSize:13,fontWeight:700}}>MIS ÓRDENES ACTIVAS</h4>
      {activas.map(o=>{ const c=cust[o.customer_id]||{}; return (
        <button key={o.id} onClick={()=>abrirDetalle(o)} style={{...btnO(T.borde),textAlign:'left',padding:14,color:T.texto}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><b style={{color:T.brand,fontSize:15}}>OT-{o.ot_number}</b><span style={pill(estColor(o.estado))}>{o.estado}</span></div>
          <div style={{color:T.texto,fontSize:15,marginTop:6,fontWeight:600}}>{c.nombre||'Cliente'} · {o.tipo}</div>
          <div style={{color:T.sub,fontSize:13,marginTop:2}}>{o.direccion||c.direccion||''}</div>
        </button>);})}
      {activas.length===0&&pendientes.length===0&&<p style={{color:T.sub,fontSize:14}}>Sin OTs activas por ahora.</p>}
    </main>
  );

  return (
    <main style={{minHeight:'100vh',background:T.fondo,fontFamily:FAM,padding:16,maxWidth:600,margin:'0 auto',paddingBottom:70}}>
      {Overlays}
      <button onClick={()=>setSel(null)} style={{...btnO(T.sub),width:'auto',padding:'8px 14px'}}>← Mis órdenes</button>
      <div style={{display:'flex',gap:6,margin:'12px 0'}}>
        {['Orden','Camino','Servicio','Cierre'].map((s,i)=><div key={s} style={{flex:1,textAlign:'center',padding:'8px 0',borderRadius:10,fontSize:12,fontWeight:800,background:i===paso?T.brand:i<paso?T.ok:T.card,color:i===paso?'#0b0f12':i<paso?'#0b0f12':T.sub,border:`1px solid ${i<=paso?'transparent':T.borde}`}}>{i+1}. {s}</div>)}
      </div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
        <h2 style={{color:T.brand,margin:0,fontSize:19}}>OT-{ot.ot_number}</h2>
        <span style={pill(estColor(ot.estado))}>{ot.estado}</span>
      </div>

      {paso===0&&(
        <div>
          <div style={card}>
            <h4 style={{margin:'0 0 10px',color:T.info,fontSize:14}}>Cliente</h4>
            <p style={{margin:0,color:T.texto,fontWeight:700,fontSize:16}}>{cliente.nombre}</p>
            <p style={{margin:'4px 0',color:T.sub,fontSize:14}}>RUT: {cliente.rut||'—'}</p>
            <p style={{margin:'2px 0',color:T.sub,fontSize:14}}>{ot.direccion||cliente.direccion} · {regs[cliente.region_id]||''}</p>
            <div style={{display:'flex',gap:8,marginTop:10}}>
              <a style={{...btnO(T.info),flex:1,textAlign:'center',textDecoration:'none',marginBottom:0}} href={`tel:${(cliente.telefono||'').replace(/[^\d+]/g,'')}`}>Llamar</a>
              <a style={{...btnO(T.ok),flex:1,textAlign:'center',textDecoration:'none',marginBottom:0}} href={`https://wa.me/${(cliente.telefono||'').replace(/[^\d+]/g,'')}`} target="_blank">WhatsApp</a>
              <a style={{...btnO(T.brand),flex:1,textAlign:'center',textDecoration:'none',marginBottom:0}} href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ot.direccion||cliente.direccion||'')}`} target="_blank">Ruta</a>
            </div>
          </div>
          <div style={card}>
            <h4 style={{margin:'0 0 8px',color:T.info,fontSize:14}}>Servicio</h4>
            <p style={{margin:0,color:T.texto,fontSize:15,fontWeight:600}}>{ot.tipo} · prioridad {ot.prioridad}</p>
            <p style={{margin:'8px 0 0',color:T.sub,fontSize:14}}>{ot.descripcion}</p>
          </div>
        </div>
      )}

      {paso===1&&(
        <div>
          {(ot.estado==='Asignada'||ot.estado==='Aceptada')? <button onClick={()=>enCamino(ot)} style={btn(T.brand)}>🚐 En camino (avisa al cliente por WhatsApp)</button>:null}
          {ot.estado==='En Ruta'? <button onClick={()=>confirmarLlegada(ot)} style={btn(T.teal)}>📍 Confirmar llegada (geocerca 100 m)</button>:null}
          {ot.estado==='Llegada'? <button onClick={()=>parche(ot,'Trabajando')} style={btn(T.warn)}>🔧 Iniciar servicio</button>:null}
          <p style={{color:T.sub,fontSize:13}}>Los cambios se reflejan al instante en tu pantalla y en mesa central.</p>
        </div>
      )}

      {paso===2&&(
        <div>
          <div style={card}>
            <h4 style={{margin:'0 0 10px',color:T.info,fontSize:14}}>Garantía y cobro</h4>
            <label style={lab}>¿Aplica garantía?</label>
            <select style={inp} value={gar.aplica} onChange={e=>setGar({...gar,aplica:e.target.value})}><option value="">Elegir…</option><option>Si</option><option>No</option></select>
            {gar.aplica==='No'&&<div><label style={lab}>Causa (no garantía)</label><select style={inp} value={gar.causa} onChange={e=>setGar({...gar,causa:e.target.value})}><option value="">Elegir…</option><option>Desgaste prematuro</option><option>Daño por tercero o uso inadecuado</option><option>Falta de mantención</option><option>Garantía vencida</option></select></div>}
            <label style={lab}>Cobro</label>
            <select style={inp} value={cobro.tipo} onChange={e=>setCobro({...cobro,tipo:e.target.value})}><option value="">Elegir…</option><option>Con cobro</option><option>Sin cobro</option><option>Garantía (no cobra)</option></select>
            {cobro.tipo==='Con cobro'&&<div><label style={lab}>Medio de pago</label><select style={inp} value={cobro.medio} onChange={e=>setCobro({...cobro,medio:e.target.value})}><option value="">Elegir…</option><option>Efectivo</option><option>Transferencia</option></select></div>}
            <button onClick={()=>setModal('repuesto')} style={btnO(T.warn)}>📦 Solicitar repuesto (pausa y alerta al agente)</button>
            {ot.estado==='Esperando Repuesto'&&<button onClick={()=>parche(ot,'Trabajando')} style={btnO(T.ok)}>▶ Reanudar servicio</button>}
          </div>
          {grupos.map(g=>(
            <div key={g.code} style={card}>
              <h4 style={{margin:'0 0 12px',color:T.teal,fontSize:14}}>{g.nombre}</h4>
              {(g.items||[]).map((it,i)=>{ const id=it.id||g.code+'_'+i; const v=answers[id];
                return <div key={id} style={{marginBottom:12}}>
                  <label style={lab}>{it.l}{it.r?' *':''}</label>
                  {it.t==='sel'? <select style={inp} value={v||''} onChange={e=>setAnswers({...answers,[id]:e.target.value})}><option value="">Elegir…</option>{(it.o||[]).map(o=><option key={o} value={o}>{o}</option>)}</select>
                  : it.t==='foto'? <div><input type="file" accept="image/*" capture="environment" style={{...inp,color:T.sub}} onChange={async e=>{ const u=await subirFoto(ot.id,e.target.files[0]); if(u) setAnswers({...answers,[id]:[...(v||[]),u]}); }}/><div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{(v||[]).map((u,k)=><img key={k} src={u} style={{width:56,height:56,objectFit:'cover',borderRadius:8}}/>)}</div></div>
                  : it.t==='num'? <input style={inp} type="number" value={v||''} onChange={e=>setAnswers({...answers,[id]:e.target.value})}/>
                  : <input style={inp} value={v||''} onChange={e=>setAnswers({...answers,[id]:e.target.value})}/>}
                </div>;})}
            </div>))}
          <div style={card}>
            <h4 style={{margin:'0 0 10px',color:T.warn,fontSize:14}}>Costos en terreno</h4>
            {costos.map((c,i)=><p key={i} style={{margin:'2px 0',color:T.texto,fontSize:14}}>{c.concepto}: ${Number(c.monto).toLocaleString('es-CL')}</p>)}
            <div style={{display:'flex',gap:6}}>
              <input style={{...inp,flex:2}} placeholder="Concepto" value={nuevoCosto.concepto} onChange={e=>setNuevoCosto({...nuevoCosto,concepto:e.target.value})}/>
              <input style={{...inp,flex:1}} type="number" placeholder="$" value={nuevoCosto.monto} onChange={e=>setNuevoCosto({...nuevoCosto,monto:e.target.value})}/>
            </div>
            <button style={btnO(T.sub)} onClick={()=>{ if(nuevoCosto.concepto&&nuevoCosto.monto){ setCostos([...costos,nuevoCosto]); setNuevoCosto({concepto:'',monto:''}); } }}>+ Agregar costo</button>
            <p style={{color:T.ok,fontWeight:800,margin:0,fontSize:16}}>Total: ${total.toLocaleString('es-CL')}</p>
          </div>
          {esArmado&&(
            <div style={card}>
              <h4 style={{margin:'0 0 10px',color:T.danger,fontSize:14}}>Antifraude</h4>
              {ot.tipo==='armado_volumen'&&<div><label style={lab}>Códigos de caja (separados por coma)</label><input style={inp} value={cajas} onChange={e=>setCajas(e.target.value)}/></div>}
              <label style={lab}>Código de cupón *</label>
              <input style={inp} value={cupon} onChange={e=>setCupon(e.target.value)} placeholder="BLI00003"/>
              <label style={{...lab,display:'flex',gap:8,alignItems:'center'}}><input type="checkbox" checked={manual} onChange={e=>setManual(e.target.checked)}/> Etiqueta ilegible → ingreso manual</label>
              {manual&&<div><label style={lab}>Foto etiqueta dañada *</label><input type="file" accept="image/*" capture="environment" style={{...inp,color:T.sub}} onChange={async e=>{ setFotoEtiqueta(await subirFoto(ot.id,e.target.files[0])); }}/>{fotoEtiqueta&&<img src={fotoEtiqueta} style={{width:60,height:60,objectFit:'cover',borderRadius:8,marginTop:6}}/>}</div>}
            </div>)}
          <div style={{marginBottom:12}}><label style={lab}>Firma del cliente *</label><Firma onChange={setFirma}/></div>
          <button onClick={finalizar} style={btn(T.ok)}>✅ Finalizar y enviar a Revisión QA</button>
        </div>
      )}

      {paso===3&&(
        <div>
          <p style={{color:T.ok,fontWeight:700,fontSize:15}}>Servicio completado. La OT está en Revisión QA de mesa central.</p>
          <button onClick={pdf} style={btn(T.info)}>📄 Ver / guardar comprobante PDF</button>
          <a style={{...btnO(T.ok),display:'block',textAlign:'center',textDecoration:'none'}} href={`https://wa.me/${(cliente.telefono||'').replace(/[^\d+]/g,'')}?text=${encodeURIComponent(`Hola ${cliente.nombre||''}, su OT-${ot.ot_number} fue finalizada. Total: $${total.toLocaleString('es-CL')}. Gracias por su preferencia.`)}`} target="_blank">💬 Enviar comprobante por WhatsApp</a>
        </div>
      )}
    </main>
  );
}
