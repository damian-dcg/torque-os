'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';

const C={fondo:'#0d1216',panel:'#141b21',borde:'#26323d',borde2:'#31404d',tinta:'#e9eef2',gris:'#8b9aa6',naranja:'#ff6b2c',verde:'#57d977',rojo:'#ff5d5d',amarillo:'#ffc53d',azul:'#5aa7ff',teal:'#35d0ba'};
const caja={width:'100%',padding:11,borderRadius:8,border:`1px solid ${C.borde2}`,background:'#1a232b',color:C.tinta,fontSize:14,marginBottom:10,boxSizing:'border-box'};
const lab={fontSize:10,letterSpacing:1,color:C.gris,textTransform:'uppercase',display:'block',marginBottom:4,fontFamily:'monospace'};
const btnG={width:'100%',padding:14,borderRadius:12,border:0,background:C.naranja,color:'#14100c',fontWeight:800,fontSize:15,cursor:'pointer',marginBottom:8};
const btnS={width:'100%',padding:12,borderRadius:12,border:`1px solid ${C.borde2}`,background:'transparent',color:C.tinta,fontWeight:700,fontSize:13,cursor:'pointer',marginBottom:8};
const defaultByType=t=>{const x=(t||'').toLowerCase(); if(x.includes('volumen'))return 'CK-ARM-VOL-BICI'; if(x.includes('armado'))return 'CK-ARM-BICI'; if(x.includes('garantia'))return 'CK-EVAL-GARANTIA'; if(x.includes('retiro'))return 'CK-RETIRO'; if(x.includes('manten'))return 'CK-MANT-ELEC'; return 'CK-REP-CONV';};
const colorEst=e=>({'Ingresada':C.azul,'Asignada':C.azul,'Aceptada':C.teal,'Rechazada':C.rojo,'En Ruta':C.naranja,'Llegada':C.teal,'Trabajando':C.amarillo,'Esperando Repuesto':C.rojo,'Finalizada':C.verde,'Revisión QA':C.teal,'Cerrada':C.verde}[e]||C.gris);
const pasoDe=e=>(['Ingresada'].includes(e)?0:['Asignada','Aceptada','En Ruta'].includes(e)?1:['Llegada','Trabajando','Esperando Repuesto'].includes(e)?2:3);
const dist=(a,b,c,d)=>{const R=6371000,r=x=>x*Math.PI/180;const dLa=r(c-a),dLo=r(d-b);const s=Math.sin(dLa/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(dLo/2)**2;return 2*R*Math.asin(Math.sqrt(s));};

function Firma({onChange}){
  const ref=useRef(null); const draw=useRef(false);
  useEffect(()=>{
    const c=ref.current; const ctx=c.getContext('2d'); ctx.lineWidth=2.2; ctx.lineCap='round'; ctx.strokeStyle='#111';
    const pos=e=>{const r=c.getBoundingClientRect(); const t=e.touches?e.touches[0]:e; return [t.clientX-r.left,t.clientY-r.top];};
    const dn=e=>{draw.current=true; const [x,y]=pos(e); ctx.beginPath(); ctx.moveTo(x,y); e.preventDefault();};
    const mv=e=>{ if(!draw.current)return; const [x,y]=pos(e); ctx.lineTo(x,y); ctx.stroke(); e.preventDefault(); onChange(c.toDataURL('image/png'));};
    const up=()=>{draw.current=false;};
    c.addEventListener('mousedown',dn); c.addEventListener('mousemove',mv); window.addEventListener('mouseup',up);
    c.addEventListener('touchstart',dn,{passive:false}); c.addEventListener('touchmove',mv,{passive:false}); c.addEventListener('touchend',up);
  },[]);
  return <canvas ref={ref} width={330} height={130} style={{border:'1px solid #777',background:'#fff',borderRadius:8,touchAction:'none',maxWidth:'100%'}}/>;
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
  const meRef=useRef(null);

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

  async function entrar(e){ e.preventDefault();
    const {data,error}=await supabase.auth.signInWithPassword({email:login.email,password:login.pass});
    if(error) avisar('⛔ Credenciales incorrectas',C.rojo); else setUser(data.user);
  }
  async function salir(){ await supabase.auth.signOut(); setUser(null); setSel(null); }
  async function subirFoto(otId,file){ const path=`ot-${otId}/${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`;
    const {error}=await supabase.storage.from('evidencia').upload(path,file); if(error){ avisar('⛔ No se pudo subir la foto',C.rojo); return null; }
    return supabase.storage.from('evidencia').getPublicUrl(path).data.publicUrl; }

  async function parche(ot,estado,extra){
    setOts(prev=>prev.map(x=>x.id===ot.id?{...x,estado}:x));
    const tk=await token();
    fetch(`/api/v1/work-orders/${ot.id}/status`,{method:'PATCH',headers:{Authorization:`Bearer ${tk}`,'Content-Type':'application/json'},body:JSON.stringify({status:estado,...(extra||{})})})
      .then(r=>r.json()).then(d=>{ if(d&&d.error){ avisar('⛔ '+d.error,C.rojo); cargarOTs(); } else avisar('✅ '+estado,C.verde); })
      .catch(()=>avisar('⚠ Sin conexión: se reintentará',C.amarillo));
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
      if(d>100) avisar('⚠ A '+Math.round(d)+' m (radio 100 m). Llegada registrada con observación.',C.amarillo);
    }catch(e){ avisar('⚠ Sin GPS: llegada sin validación de radio.',C.amarillo); } }
    parche(ot,'Llegada');
  }

  const ot=ots.find(o=>o.id===sel)||null;
  const cliente=ot?cust[ot.customer_id]||{}:{};
  const paso=ot?pasoDe(ot.estado):0;
  const grupos=ot?((checks.find(c=>c.code===(ot.checklist_code||defaultByType(ot.tipo)))||{blocks:[]}).blocks||[]).map(bc=>blocks[bc]).filter(Boolean):[];
  const esArmado=ot&&((ot.tipo||'').toLowerCase().includes('armado'));
  const total=15000+costos.reduce((s,x)=>s+(Number(x.monto)||0),0);
  const pendientes=ots.filter(o=>o.estado==='Ingresada');
  const activas=ots.filter(o=>!['Ingresada','Cerrada','Rechazada'].includes(o.estado));
  const Toast=toast? <div style={{position:'fixed',bottom:24,left:'50%',transform:'translateX(-50%)',background:C.panel,border:`2px solid ${toast.color}`,color:toast.color,padding:'12px 22px',borderRadius:12,fontWeight:800,zIndex:99,fontSize:14,boxShadow:'0 6px 24px rgba(0,0,0,.5)',pointerEvents:'none',maxWidth:'90%'}}>{toast.txt}</div> : null;

  function valItem(g,it,i){ const id=it.id||g.code+'_'+i; return answers[id]; }
  function faltaObligatorios(){ const f=[]; grupos.forEach(g=>(g.items||[]).forEach((it,i)=>{ if(it.r){ const v=valItem(g,it,i); if(it.t==='foto'){ if(!(v&&v.length)) f.push(it.l); } else if(!v||!String(v).trim()) f.push(it.l); } })); return f; }

  function aceptarTodas(){ pendientes.forEach(o=>parche(o,'Asignada')); avisar('✅ Ruta aceptada: '+pendientes.length+' OT(s)',C.verde); }
  function confirmarRechazo(){ if(!motivo.trim()){ avisar('⛔ El motivo es obligatorio',C.rojo); return; }
    parche(rechazoOt,'Rechazada',{motivo}); setModal(null); setMotivo(''); avisar('✅ Rechazada con motivo → pasa al agente',C.verde); }

  async function solicitarRepuesto(){ if(!repuesto.trim()){ avisar('⛔ Describe el repuesto',C.rojo); return; }
    await supabase.from('ot_events').insert([{ot_id:ot.id,evento:'alerta_repuesto',detalle:{repuesto,area:'Bodega'}}]);
    setModal(null); setRepuesto('');
    parche(ot,'Esperando Repuesto',{area_responsable:'Bodega'});
  }

  async function finalizar(){
    const pend=faltaObligatorios(); if(pend.length){ avisar('⛔ Checklist incompleto: '+pend.slice(0,3).join(' · '),C.rojo); return; }
    if(!firma){ avisar('⛔ Falta la firma del cliente',C.rojo); return; }
    if(esArmado&&!cupon.trim()){ avisar('⛔ Falta el código de cupón',C.rojo); return; }
    if(esArmado&&manual&&!fotoEtiqueta){ avisar('⛔ Ingreso manual exige foto de la etiqueta',C.rojo); return; }
    const checklist={...answers,w_garantia:gar.aplica,w_causa:gar.causa,w_cobro:cobro.tipo,w_medio:cobro.medio};
    const tk=await token();
    setOts(prev=>prev.map(x=>x.id===ot.id?{...x,estado:'Revisión QA'}:x));
    const r=await fetch(`/api/v1/work-orders/${ot.id}/status`,{method:'PATCH',headers:{Authorization:`Bearer ${tk}`,'Content-Type':'application/json'},body:JSON.stringify({status:'Revisión QA',checklist,couponCode:cupon.trim()||undefined,boxCode:cajas.trim()||undefined,financials:{baseCost:15000,manualItems:costos,totalCost:total,garantia:gar.aplica,cobro:cobro.tipo},firma})});
    const d=await r.json();
    if(d&&d.error){ avisar('⛔ '+d.error,C.rojo); cargarOTs(); return; }
    avisar('✅ OT finalizada → Revisión QA',C.verde);
    setNps({p:0,a:0,s:0,com:''});
  }

  async function enviarNps(){ const tk=await token();
    await fetch(`/api/v1/work-orders/${ot.id}/nps`,{method:'POST',headers:{Authorization:`Bearer ${tk}`,'Content-Type':'application/json'},body:JSON.stringify({punctuality:nps.p,attention:nps.a,solution:nps.s,comentario:nps.com})});
    setNps(null); avisar('✅ Encuesta registrada',C.verde);
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

  if(!user) return (
    <main style={{minHeight:'100vh',background:C.fondo,display:'grid',placeItems:'center',fontFamily:'system-ui,sans-serif'}}>
      {Toast}
      <form onSubmit={entrar} style={{width:320,background:C.panel,border:`1px solid ${C.borde}`,borderRadius:14,padding:26}}>
        <h1 style={{margin:'0 0 4px',fontSize:26,color:C.tinta,letterSpacing:1}}>TORQUE<span style={{color:C.naranja}}>·OS</span></h1>
        <p style={{margin:'0 0 18px',color:C.gris,fontSize:12}}>Acceso técnico de terreno</p>
        <label style={lab}>Correo</label><input style={caja} type="email" value={login.email} onChange={e=>setLogin({...login,email:e.target.value})} required/>
        <label style={lab}>Contraseña</label><input style={caja} type="password" value={login.pass} onChange={e=>setLogin({...login,pass:e.target.value})} required/>
        <button style={btnG}>Ingresar</button>
      </form>
    </main>
  );

  if(!ot) return (
    <main style={{minHeight:'100vh',background:C.fondo,fontFamily:'system-ui,sans-serif',padding:16,maxWidth:560,margin:'0 auto'}}>
      {Toast}
      <header style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
        <h1 style={{margin:0,fontSize:20,color:C.tinta}}>TORQUE<span style={{color:C.naranja}}>·OS</span></h1>
        <span style={{color:C.gris,fontSize:11}}>Hola {(me&&me.nombre)||''}</span>
        <button onClick={salir} style={{...btnS,width:'auto',marginLeft:'auto',marginBottom:0,padding:'6px 12px'}}>Salir</button>
      </header>
      {pendientes.length>0&&(
        <div style={{background:C.panel,border:`2px solid ${C.azul}`,borderRadius:12,padding:14,marginBottom:12}}>
          <h4 style={{margin:'0 0 10px',color:C.azul,fontSize:12,letterSpacing:1}}>📋 RUTA DEL DÍA · {pendientes.length} OT(S) POR ACEPTAR</h4>
          <button onClick={aceptarTodas} style={{...btnG,background:C.teal}}>✔ ACEPTAR TODAS ({pendientes.length})</button>
          {pendientes.map(o=>{ const c=cust[o.customer_id]||{}; return (
            <div key={o.id} style={{border:`1px solid ${C.borde2}`,borderRadius:10,padding:12,marginBottom:10,background:'#101820'}}>
              <div style={{display:'flex',justifyContent:'space-between'}}><b style={{color:C.naranja}}>OT-{o.ot_number}</b><span style={{color:C.gris,fontSize:11}}>{o.tipo}</span></div>
              <div style={{color:C.tinta,fontSize:13,marginTop:2}}>{c.nombre}</div>
              <div style={{color:C.gris,fontSize:11,marginTop:2}}>{o.direccion||c.direccion||''}</div>
              <div style={{display:'flex',gap:8,marginTop:8}}>
                <button onClick={()=>parche(o,'Asignada')} style={{...btnS,flex:1,marginBottom:0,borderColor:C.teal,color:C.teal}}>✔ Aceptar</button>
                <button onClick={()=>{setRechazoOt(o);setMotivo('');setModal('rechazo');}} style={{...btnS,flex:1,marginBottom:0,borderColor:C.rojo,color:C.rojo}}>✖ Rechazar</button>
              </div>
            </div>);})}
        </div>)}
      {activas.map(o=>{ const c=cust[o.customer_id]||{}; return (
        <button key={o.id} onClick={()=>{setSel(o.id);setAnswers({});setCupon('');setCajas('');setCostos([]);setFirma(null);setManual(false);setFotoEtiqueta(null);setGar({aplica:'',causa:''});setCobro({tipo:'',medio:''});}} style={{...btnS,textAlign:'left',padding:14}}>
          <div style={{display:'flex',justifyContent:'space-between'}}><b style={{color:C.naranja}}>OT-{o.ot_number}</b><span style={{color:colorEst(o.estado),fontWeight:800,fontSize:11}}>{o.estado.toUpperCase()}</span></div>
          <div style={{color:C.tinta,fontSize:13,marginTop:4}}>{c.nombre||'Cliente'} · {o.tipo}</div>
          <div style={{color:C.gris,fontSize:11,marginTop:2}}>{o.direccion||c.direccion||''}</div>
        </button>);})}
      {activas.length===0&&pendientes.length===0&&<p style={{color:C.gris}}>Sin OTs activas por ahora.</p>}
    </main>
  );

  return (
    <main style={{minHeight:'100vh',background:C.fondo,fontFamily:'system-ui,sans-serif',padding:16,maxWidth:560,margin:'0 auto',paddingBottom:60}}>
      {Toast}
      <button onClick={()=>setSel(null)} style={{...btnS,width:'auto',padding:'6px 12px'}}>← Mis órdenes</button>
      <div style={{display:'flex',gap:6,margin:'10px 0'}}>
        {['Orden','Camino','Servicio','Cierre'].map((s,i)=><div key={s} style={{flex:1,textAlign:'center',padding:'7px 0',borderRadius:8,fontSize:11,fontWeight:800,background:i===paso?C.naranja:i<paso?C.verde:C.panel,color:i<=paso?'#14100c':C.gris,border:`1px solid ${i<=paso?'transparent':C.borde}`}}>{i+1}·{s}</div>)}
      </div>
      <h2 style={{color:C.naranja,margin:'4px 0 2px'}}>OT-{ot.ot_number} <span style={{color:colorEst(ot.estado),fontSize:12}}>({ot.estado})</span></h2>

      {paso===0&&(
        <div>
          <div style={{background:C.panel,border:`1px solid ${C.borde}`,borderRadius:12,padding:14,marginBottom:10}}>
            <h4 style={{margin:'0 0 8px',color:C.teal,fontSize:12,letterSpacing:1}}>CLIENTE</h4>
            <p style={{margin:0,color:C.tinta,fontWeight:700}}>{cliente.nombre}</p>
            <p style={{margin:'2px 0',color:C.gris,fontSize:12}}>RUT: {cliente.rut||'—'}</p>
            <p style={{margin:'2px 0',color:C.gris,fontSize:12}}>{ot.direccion||cliente.direccion} · {regs[cliente.region_id]||''}</p>
            <div style={{display:'flex',gap:8,marginTop:8}}>
              <a style={{...btnS,flex:1,textAlign:'center',textDecoration:'none',marginBottom:0}} href={`tel:${(cliente.telefono||'').replace(/[^\d+]/g,'')}`}>📞 Llamar</a>
              <a style={{...btnS,flex:1,textAlign:'center',textDecoration:'none',marginBottom:0}} href={`https://wa.me/${(cliente.telefono||'').replace(/[^\d+]/g,'')}`} target="_blank">💬 WhatsApp</a>
              <a style={{...btnS,flex:1,textAlign:'center',textDecoration:'none',marginBottom:0}} href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ot.direccion||cliente.direccion||'')}`} target="_blank">🗺 Ruta</a>
            </div>
          </div>
          <div style={{background:C.panel,border:`1px solid ${C.borde}`,borderRadius:12,padding:14}}>
            <p style={{margin:0,color:C.tinta,fontSize:13}}>{ot.tipo} · prioridad {ot.prioridad}</p>
            <p style={{margin:'6px 0 0',color:C.gris,fontSize:12}}>{ot.descripcion}</p>
          </div>
        </div>
      )}

      {paso===1&&(
        <div>
          {(ot.estado==='Asignada'||ot.estado==='Aceptada')? <button onClick={()=>enCamino(ot)} style={btnG}>🚐 En camino (avisa al cliente por WhatsApp)</button>:null}
          {ot.estado==='En Ruta'? <button onClick={()=>confirmarLlegada(ot)} style={{...btnG,background:C.teal}}>📍 Confirmar llegada (geocerca 100 m)</button>:null}
          {ot.estado==='Llegada'? <button onClick={()=>parche(ot,'Trabajando')} style={{...btnG,background:C.amarillo}}>🔧 Iniciar servicio</button>:null}
          <p style={{color:C.gris,fontSize:12}}>Los cambios son inmediatos en tu pantalla y en mesa central.</p>
        </div>
      )}

      {paso===2&&(
        <div>
          <div style={{background:C.panel,border:`1px solid ${C.borde}`,borderRadius:12,padding:14,marginBottom:10}}>
            <h4 style={{margin:'0 0 8px',color:C.teal,fontSize:12,letterSpacing:1}}>GARANTÍA Y COBRO</h4>
            <label style={lab}>¿Aplica garantía?</label>
            <select style={caja} value={gar.aplica} onChange={e=>setGar({...gar,aplica:e.target.value})}><option value="">Elegir…</option><option>Si</option><option>No</option></select>
            {gar.aplica==='No'&&<div><label style={lab}>Causa (no garantía)</label><select style={caja} value={gar.causa} onChange={e=>setGar({...gar,causa:e.target.value})}><option value="">Elegir…</option><option>Desgaste prematuro</option><option>Daño por tercero o uso inadecuado</option><option>Falta de mantención</option><option>Garantía vencida</option></select></div>}
            <label style={lab}>Cobro</label>
            <select style={caja} value={cobro.tipo} onChange={e=>setCobro({...cobro,tipo:e.target.value})}><option value="">Elegir…</option><option>Con cobro</option><option>Sin cobro</option><option>Garantía (no cobra)</option></select>
            {cobro.tipo==='Con cobro'&&<div><label style={lab}>Medio de pago</label><select style={caja} value={cobro.medio} onChange={e=>setCobro({...cobro,medio:e.target.value})}><option value="">Elegir…</option><option>Efectivo</option><option>Transferencia</option></select></div>}
            <button onClick={()=>setModal('repuesto')} style={{...btnS,borderColor:C.amarillo,color:C.amarillo}}>📦 Solicitar repuesto (pausa y alerta al agente)</button>
            {ot.estado==='Esperando Repuesto'&&<button onClick={()=>parche(ot,'Trabajando')} style={{...btnS,borderColor:C.verde,color:C.verde}}>▶ Reanudar servicio</button>}
          </div>
          {grupos.map(g=>(
            <div key={g.code} style={{background:C.panel,border:`1px solid ${C.borde}`,borderRadius:12,padding:14,marginBottom:10}}>
              <h4 style={{margin:'0 0 10px',color:C.teal,fontSize:12,letterSpacing:1}}>{g.nombre.toUpperCase()}</h4>
              {(g.items||[]).map((it,i)=>{ const id=it.id||g.code+'_'+i; const v=answers[id];
                return <div key={id} style={{marginBottom:10}}>
                  <label style={lab}>{it.l}{it.r?' *':''}</label>
                  {it.t==='sel'? <select style={caja} value={v||''} onChange={e=>setAnswers({...answers,[id]:e.target.value})}><option value="">Elegir…</option>{(it.o||[]).map(o=><option key={o} value={o}>{o}</option>)}</select>
                  : it.t==='foto'? <div><input type="file" accept="image/*" capture="environment" onChange={async e=>{ const u=await subirFoto(ot.id,e.target.files[0]); if(u) setAnswers({...answers,[id]:[...(v||[]),u]}); }}/><div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:6}}>{(v||[]).map((u,k)=><img key={k} src={u} style={{width:52,height:52,objectFit:'cover',borderRadius:6}}/>)}</div></div>
                  : it.t==='num'? <input style={caja} type="number" value={v||''} onChange={e=>setAnswers({...answers,[id]:e.target.value})}/>
                  : <input style={caja} value={v||''} onChange={e=>setAnswers({...answers,[id]:e.target.value})}/>}
                </div>;})}
            </div>))}
          <div style={{background:C.panel,border:`1px solid ${C.borde}`,borderRadius:12,padding:14,marginBottom:10}}>
            <h4 style={{margin:'0 0 8px',color:C.amarillo,fontSize:12,letterSpacing:1}}>COSTOS EN TERRENO</h4>
            {costos.map((c,i)=><p key={i} style={{margin:'2px 0',color:C.tinta,fontSize:13}}>{c.concepto}: ${Number(c.monto).toLocaleString('es-CL')}</p>)}
            <div style={{display:'flex',gap:6}}><input style={{...caja,flex:2}} placeholder="Concepto" value={nuevoCosto.concepto} onChange={e=>setNuevoCosto({...nuevoCosto,concepto:e.target.value})}/><input style={{...caja,flex:1}} type="number" placeholder="$" value={nuevoCosto.monto} onChange={e=>setNuevoCosto({...nuevoCosto,monto:e.target.value})}/></div>
            <button style={btnS} onClick={()=>{ if(nuevoCosto.concepto&&nuevoCosto.monto){ setCostos([...costos,nuevoCosto]); setNuevoCosto({concepto:'',monto:''}); } }}>+ Agregar costo</button>
            <p style={{color:C.verde,fontWeight:800,margin:0}}>Total: ${total.toLocaleString('es-CL')}</p>
          </div>
          {esArmado&&(
            <div style={{background:C.panel,border:`1px solid ${C.borde}`,borderRadius:12,padding:14,marginBottom:10}}>
              <h4 style={{margin:'0 0 8px',color:C.rojo,fontSize:12,letterSpacing:1}}>ANTIFRAUDE</h4>
              {ot.tipo==='armado_volumen'&&<div><label style={lab}>Códigos de caja (coma)</label><input style={caja} value={cajas} onChange={e=>setCajas(e.target.value)}/></div>}
              <label style={lab}>Código de cupón *</label><input style={caja} value={cupon} onChange={e=>setCupon(e.target.value)} placeholder="BLI00003"/>
              <label style={{...lab,display:'flex',gap:6,alignItems:'center'}}><input type="checkbox" checked={manual} onChange={e=>setManual(e.target.checked)}/> Etiqueta ilegible → ingreso manual</label>
              {manual&&<div><label style={lab}>Foto etiqueta dañada *</label><input type="file" accept="image/*" capture="environment" onChange={async e=>{ setFotoEtiqueta(await subirFoto(ot.id,e.target.files[0])); }}/>{fotoEtiqueta&&<img src={fotoEtiqueta} style={{width:60,height:60,objectFit:'cover',borderRadius:6,marginTop:6}}/>}</div>}
            </div>)}
          <div style={{marginBottom:10}}><label style={lab}>Firma del cliente *</label><Firma onChange={setFirma}/></div>
          <button onClick={finalizar} style={{...btnG,background:C.verde}}>✅ Finalizar y enviar a Revisión QA</button>
        </div>
      )}

      {paso===3&&(
        <div>
          <p style={{color:C.verde,fontWeight:700}}>Servicio completado. La OT está en Revisión QA de mesa central.</p>
          <button onClick={pdf} style={btnG}>📄 Ver / guardar comprobante PDF</button>
          <a style={{...btnS,borderColor:C.verde,color:C.verde,textDecoration:'none',display:'block',textAlign:'center'}} href={`https://wa.me/${(cliente.telefono||'').replace(/[^\d+]/g,'')}?text=${encodeURIComponent(`Hola ${cliente.nombre||''}, su OT-${ot.ot_number} fue finalizada. Total: $${total.toLocaleString('es-CL')}. Gracias por su preferencia.`)}`} target="_blank">💬 Enviar comprobante por WhatsApp</a>
        </div>
      )}

      {modal==='rechazo'&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',display:'grid',placeItems:'center',padding:20,zIndex:50}}>
          <div style={{background:C.panel,border:`1px solid ${C.rojo}`,borderRadius:14,padding:20,width:'100%',maxWidth:420}}>
            <h3 style={{color:C.rojo,margin:'0 0 10px'}}>Motivo del rechazo * (OT-{rechazoOt?rechazoOt.ot_number:''})</h3>
            <textarea style={caja} rows="3" placeholder="Ej: ruta muy larga, vehículo averiado, sin acceso al cliente…" value={motivo} onChange={e=>setMotivo(e.target.value)}/>
            <button onClick={confirmarRechazo} style={{...btnG,background:C.rojo,color:'#fff'}}>Confirmar rechazo</button>
            <button onClick={()=>setModal(null)} style={btnS}>Cancelar</button>
          </div>
        </div>)}
      {modal==='repuesto'&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',display:'grid',placeItems:'center',padding:20,zIndex:50}}>
          <div style={{background:C.panel,border:`1px solid ${C.amarillo}`,borderRadius:14,padding:20,width:'100%',maxWidth:420}}>
            <h3 style={{color:C.amarillo,margin:'0 0 10px'}}>Repuesto necesario *</h3>
            <textarea style={caja} rows="2" placeholder="Ej: Banda de trote 2070x360 (2018G00176)…" value={repuesto} onChange={e=>setRepuesto(e.target.value)}/>
            <button onClick={solicitarRepuesto} style={{...btnG,background:C.amarillo}}>Pausar OT y alertar al agente</button>
            <button onClick={()=>setModal(null)} style={btnS}>Cancelar</button>
          </div>
        </div>)}
      {nps&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',display:'grid',placeItems:'center',padding:20,zIndex:50}}>
          <div style={{background:C.panel,border:`1px solid ${C.borde}`,borderRadius:14,padding:20,width:'100%',maxWidth:420}}>
            <h3 style={{color:C.tinta,margin:'0 0 12px'}}>Encuesta al cliente *</h3>
            {[['p','Puntualidad'],['a','Atención'],['s','Solución']].map(([k,l])=>(
              <div key={k} style={{marginBottom:8}}><label style={lab}>{l}</label>
                <div>{[1,2,3,4,5].map(n=><span key={n} onClick={()=>setNps({...nps,[k]:n})} style={{fontSize:26,cursor:'pointer',color:n<=nps[k]?C.amarillo:C.borde2}}>★</span>)}</div>
              </div>))}
            <textarea style={caja} rows="2" placeholder="Comentario" value={nps.com} onChange={e=>setNps({...nps,com:e.target.value})}/>
            <button onClick={()=>{ if(!nps.p||!nps.a||!nps.s){ avisar('⛔ Las 3 calificaciones son obligatorias',C.rojo); return; } enviarNps(); }} style={btnG}>Enviar encuesta</button>
          </div>
        </div>)}
    </main>
  );
}
