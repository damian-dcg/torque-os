'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';

const C={fondo:'#0d1216',panel:'#141b21',borde:'#26323d',borde2:'#31404d',tinta:'#e9eef2',gris:'#8b9aa6',naranja:'#ff6b2c',verde:'#57d977',rojo:'#ff5d5d',amarillo:'#ffc53d',azul:'#5aa7ff',teal:'#35d0ba'};
const caja={width:'100%',padding:11,borderRadius:8,border:`1px solid ${C.borde2}`,background:'#1a232b',color:C.tinta,fontSize:14,marginBottom:10,boxSizing:'border-box'};
const lab={fontSize:10,letterSpacing:1,color:C.gris,textTransform:'uppercase',display:'block',marginBottom:4,fontFamily:'monospace'};
const btnG={width:'100%',padding:14,borderRadius:12,border:0,background:C.naranja,color:'#14100c',fontWeight:800,fontSize:15,cursor:'pointer',marginBottom:8};
const btnS={width:'100%',padding:12,borderRadius:12,border:`1px solid ${C.borde2}`,background:'transparent',color:C.tinta,fontWeight:700,fontSize:13,cursor:'pointer',marginBottom:8};
const TECH_NEXT={'Ingresada':['Aceptada','Rechazada'],'Asignada':['Aceptada','Rechazada'],'Aceptada':['En Ruta'],'En Ruta':['Llegada'],'Llegada':['Trabajando'],'Trabajando':['Esperando Repuesto','Revisión QA'],'Esperando Repuesto':['Trabajando','Revisión QA']};
const defaultByType=t=>{const x=(t||'').toLowerCase(); if(x.includes('volumen'))return 'CK-ARM-VOL-BICI'; if(x.includes('armado'))return 'CK-ARM-BICI'; if(x.includes('garantia'))return 'CK-EVAL-GARANTIA'; if(x.includes('retiro'))return 'CK-RETIRO'; if(x.includes('manten'))return 'CK-MANT-ELEC'; return 'CK-REP-CONV';};
const colorEst=e=>({'Ingresada':C.azul,'Asignada':C.azul,'Aceptada':C.teal,'Rechazada':C.rojo,'En Ruta':C.naranja,'Llegada':C.teal,'Trabajando':C.amarillo,'Esperando Repuesto':C.rojo,'Finalizada':C.verde,'Revisión QA':C.teal,'Cerrada':C.verde}[e]||C.gris);
const pasoDe=e=>(['Ingresada','Asignada','Rechazada'].includes(e)?0:['Aceptada','En Ruta'].includes(e)?1:['Llegada','Trabajando','Esperando Repuesto'].includes(e)?2:3);

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
  const [modal,setModal]=useState(null); const [motivo,setMotivo]=useState(''); const [area,setArea]=useState('');
  const [nps,setNps]=useState(null);
  const [toast,setToast]=useState(null);
  const [busy,setBusy]=useState(false);
  const [events,setEvents]=useState([]);

  function avisar(txt,color){ setToast({txt,color}); setTimeout(()=>setToast(null),2600); }

  useEffect(()=>{ supabase.auth.getSession().then(({data})=>{ if(data.session) setUser(data.session.user); }); },[]);
  useEffect(()=>{ if(!user) return;
    (async()=>{
      const {data:m}=await supabase.from('users').select('*').eq('auth_uid',user.id).single(); setMe(m);
      const [b,c,cu,r]=await Promise.all([supabase.from('checklist_blocks').select('*'),supabase.from('checklists').select('*'),supabase.from('customers').select('*'),supabase.from('regions').select('*')]);
      const bm={}; (b.data||[]).forEach(x=>bm[x.code]=x); setBlocks(bm); setChecks(c.data||[]);
      const cm={}; (cu.data||[]).forEach(x=>cm[x.id]=x); setCust(cm);
      const rm={}; (r.data||[]).forEach(x=>rm[x.id]=x.nombre); setRegs(rm);
      let q=supabase.from('work_orders').select('*').order('id',{ascending:false}).limit(200);
      if(m&&m.rol==='tecnico_sat') q=q.eq('asignado_user_id',m.id); else if(m&&m.rol==='sat_admin') q=q.eq('asignado_company_id',m.company_id);
      const {data:o}=await q; setOts(o||[]);
    })();
    const ch=supabase.channel('rt-tec').on('postgres_changes',{event:'*',schema:'public',table:'work_orders'},async()=>{
      let q=supabase.from('work_orders').select('*').order('id',{ascending:false}).limit(200);
      if(me&&me.rol==='tecnico_sat') q=q.eq('asignado_user_id',me.id); else if(me&&me.rol==='sat_admin') q=q.eq('asignado_company_id',me.company_id);
      const {data:o}=await q; setOts(o||[]);
    }).subscribe();
    return ()=>supabase.removeChannel(ch);
  },[user]);

  useEffect(()=>{ if(sel){ supabase.from('ot_events').select('*').eq('ot_id',sel).order('created_at').then(({data})=>setEvents(data||[])); } },[sel,ots]);

  async function entrar(e){ e.preventDefault(); setBusy(true);
    const {data,error}=await supabase.auth.signInWithPassword({email:login.email,password:login.pass});
    if(error){ avisar('⛔ Credenciales incorrectas',C.rojo); } else setUser(data.user);
    setBusy(false);
  }
  async function salir(){ await supabase.auth.signOut(); setUser(null); setSel(null); }
  async function token(){ const {data}=await supabase.auth.getSession(); return data.session?data.session.access_token:null; }
  async function subirFoto(file){ const path=`ot-${sel}/${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`;
    const {error}=await supabase.storage.from('evidencia').upload(path,file); if(error){ avisar('⛔ No se pudo subir la foto',C.rojo); return null; }
    return supabase.storage.from('evidencia').getPublicUrl(path).data.publicUrl; }

  const ot=ots.find(o=>o.id===sel)||null;
  const cliente=ot?cust[ot.customer_id]||{}:{};
  const paso=ot?pasoDe(ot.estado):0;
  const grupos=ot?((checks.find(c=>c.code===(ot.checklist_code||defaultByType(ot.tipo)))||{blocks:[]}).blocks||[]).map(bc=>blocks[bc]).filter(Boolean):[];
  const esArmado=ot&&((ot.tipo||'').toLowerCase().includes('armado'));
  const total=15000+costos.reduce((s,x)=>s+(Number(x.monto)||0),0);

  function valItem(g,it,i){ const id=it.id||g.code+'_'+i; return answers[id]; }
  function faltaObligatorios(){ const f=[]; grupos.forEach(g=>(g.items||[]).forEach((it,i)=>{ if(it.r){ const v=valItem(g,it,i); if(it.t==='foto'){ if(!(v&&v.length)) f.push(it.l); } else if(!v||!String(v).trim()) f.push(it.l); } })); return f; }

  async function avanzar(estado,extra){ setBusy(true);
    try{
      const tk=await token(); const body={status:estado,...(extra||{})};
      if(estado==='En Ruta'||estado==='Llegada'||estado==='Revisión QA'){ try{ const p=await new Promise((res,rej)=>navigator.geolocation.getCurrentPosition(res,rej,{timeout:4000})); body.latitude=p.coords.latitude; body.longitude=p.coords.longitude; }catch(e){} }
      if(estado==='Revisión QA'){
        const pend=faltaObligatorios(); if(pend.length){ avisar('⛔ Checklist incompleto: '+pend.slice(0,3).join(' · ')+(pend.length>3?' (+'+(pend.length-3)+')':''),C.rojo); setBusy(false); return; }
        if(!firma){ avisar('⛔ Falta la firma del cliente',C.rojo); setBusy(false); return; }
        if(esArmado){ if(!cupon.trim()){ avisar('⛔ Falta el código de cupón',C.rojo); setBusy(false); return; }
          if(manual&&!fotoEtiqueta){ avisar('⛔ Ingreso manual exige foto de la etiqueta dañada',C.rojo); setBusy(false); return; } }
        body.checklist=answers; body.couponCode=cupon.trim()||undefined; body.boxCode=cajas.trim()||undefined;
        body.financials={baseCost:15000,manualItems:costos,totalCost:total};
        body.firma=firma;
      }
      const r=await fetch(`/api/v1/work-orders/${ot.id}/status`,{method:'PATCH',headers:{Authorization:`Bearer ${tk}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
      const d=await r.json();
      if(!r.ok){ avisar('⛔ '+(d.error||'No se pudo actualizar'),C.rojo); setBusy(false); return; }
      avisar(estado==='Rechazada'?'OT rechazada':estado==='Revisión QA'?'✅ OT finalizada → enviada a Revisión QA':'✅ '+estado,C.verde);
      if(estado==='Revisión QA') setNps({p:0,a:0,s:0,com:''});
      setOts(prev=>prev.map(o=>o.id===ot.id?{...o,estado}:o));
    }catch(e){ avisar('⛔ '+e.message,C.rojo); }
    setBusy(false);
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
<tr><th>Tipo de servicio</th><td>${ot.tipo}</td><th>Estado</th><td>${ot.estado}</td></tr></table>
<table><tr><th>Checklist</th><th>Respuesta</th></tr>${filas}</table>
${costos.length||true?`<table><tr><th>Concepto</th><th>Monto</th></tr><tr><td>Costo base visita</td><td>$15.000</td></tr>${costos.map(x=>`<tr><td>${x.concepto}</td><td>$${Number(x.monto).toLocaleString('es-CL')}</td></tr>`).join('')}<tr><td><b>TOTAL</b></td><td><b>$${total.toLocaleString('es-CL')}</b></td></tr></table>`:''}
${firma?`<p><b>Firma del cliente:</b></p><img src="${firma}" style="width:220px;height:90px;object-fit:contain"/>`:''}
${fotos.length?`<p><b>Anexo fotográfico:</b></p>${fotos.map(f=>`<img src="${f}"/>`).join('')}`:''}
<script>window.print()</script></body></html>`);
    w.document.close();
  }

  function whats(){ const tel=(cliente.telefono||'').replace(/[^\d+]/g,''); const txt=`Hola ${cliente.nombre||''}, le saluda el técnico de Bianchi. OT-${ot.ot_number} finalizada. Total servicio: $${total.toLocaleString('es-CL')}. Gracias por su preferencia.`; window.open(`https://wa.me/${tel}?text=${encodeURIComponent(txt)}`,'_blank'); }

  if(toast) return <div style={{position:'fixed',bottom:24,left:'50%',transform:'translateX(-50%)',background:C.panel,border:`2px solid ${toast.color}`,color:toast.color,padding:'12px 22px',borderRadius:12,fontWeight:800,zIndex:99,fontSize:14,boxShadow:'0 6px 24px rgba(0,0,0,.5)'}}>{toast.txt}</div>, null;

  if(!user) return (
    <main style={{minHeight:'100vh',background:C.fondo,display:'grid',placeItems:'center',fontFamily:'system-ui,sans-serif'}}>
      <form onSubmit={entrar} style={{width:320,background:C.panel,border:`1px solid ${C.borde}`,borderRadius:14,padding:26}}>
        <h1 style={{margin:'0 0 4px',fontSize:26,color:C.tinta,letterSpacing:1}}>TORQUE<span style={{color:C.naranja}}>·OS</span></h1>
        <p style={{margin:'0 0 18px',color:C.gris,fontSize:12}}>Acceso técnico de terreno</p>
        <label style={lab}>Correo</label><input style={caja} type="email" value={login.email} onChange={e=>setLogin({...login,email:e.target.value})} required/>
        <label style={lab}>Contraseña</label><input style={caja} type="password" value={login.pass} onChange={e=>setLogin({...login,pass:e.target.value})} required/>
        <button style={btnG} disabled={busy}>{busy?'Entrando…':'Ingresar'}</button>
      </form>
    </main>
  );

  if(!ot) return (
    <main style={{minHeight:'100vh',background:C.fondo,fontFamily:'system-ui,sans-serif',padding:16,maxWidth:560,margin:'0 auto'}}>
      <header style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
        <h1 style={{margin:0,fontSize:20,color:C.tinta}}>TORQUE<span style={{color:C.naranja}}>·OS</span></h1>
        <span style={{color:C.gris,fontSize:11}}>Mis órdenes</span>
        <button onClick={salir} style={{...btnS,width:'auto',marginLeft:'auto',marginBottom:0,padding:'6px 12px'}}>Salir</button>
      </header>
      {me&&me.rol!=='tecnico_sat'&&<p style={{color:C.amarillo,fontSize:11,background:'rgba(255,197,61,.08)',border:`1px solid ${C.amarillo}`,borderRadius:8,padding:8}}>Vista demo: estás viendo la pantalla del técnico.</p>}
      {ots.filter(o=>o.estado!=='Cerrada'&&o.estado!=='Rechazada').map(o=>(
        <button key={o.id} onClick={()=>{setSel(o.id);setAnswers({});setCupon('');setCajas('');setCostos([]);setFirma(null);setManual(false);setFotoEtiqueta(null);}} style={{...btnS,textAlign:'left',padding:14}}>
          <div style={{display:'flex',justifyContent:'space-between'}}><b style={{color:C.naranja}}>OT-{o.ot_number}</b><span style={{color:colorEst(o.estado),fontWeight:800,fontSize:11}}>{o.estado.toUpperCase()}</span></div>
          <div style={{color:C.tinta,fontSize:13,marginTop:4}}>{(cust[o.customer_id]||{}).nombre||'Cliente'} · {o.tipo}</div>
          <div style={{color:C.gris,fontSize:11,marginTop:2}}>{o.direccion||(cust[o.customer_id]||{}).direccion||''}</div>
        </button>
      ))}
      {ots.filter(o=>o.estado!=='Cerrada'&&o.estado!=='Rechazada').length===0&&<p style={{color:C.gris}}>No tienes OTs activas.</p>}
    </main>
  );

  return (
    <main style={{minHeight:'100vh',background:C.fondo,fontFamily:'system-ui,sans-serif',padding:16,maxWidth:560,margin:'0 auto',paddingBottom:60}}>
      <button onClick={()=>setSel(null)} style={{...btnS,width:'auto',padding:'6px 12px'}}>← Mis órdenes</button>
      <div style={{display:'flex',gap:6,margin:'10px 0'}}>
        {['Orden','Llegada','Servicio','Cierre'].map((s,i)=><div key={s} style={{flex:1,textAlign:'center',padding:'7px 0',borderRadius:8,fontSize:11,fontWeight:800,background:i===paso?C.naranja:i<paso?C.verde:C.panel,color:i===paso?'#14100c':i<paso?'#14100c':C.gris,border:`1px solid ${i<=paso?'transparent':C.borde}`}}>{i+1}·{s}</div>)}
      </div>
      <h2 style={{color:C.naranja,margin:'4px 0 2px'}}>OT-{ot.ot_number} <span style={{color:colorEst(ot.estado),fontSize:12}}>({ot.estado})</span></h2>

      {paso===0&&(
        <div>
          <div style={{background:C.panel,border:`1px solid ${C.borde}`,borderRadius:12,padding:14,marginBottom:10}}>
            <h4 style={{margin:'0 0 8px',color:C.teal,fontSize:12,letterSpacing:1}}>CLIENTE</h4>
            <p style={{margin:0,color:C.tinta,fontWeight:700}}>{cliente.nombre}</p>
            <p style={{margin:'2px 0',color:C.gris,fontSize:12}}>RUT: {cliente.rut||'—'} · {cliente.tipo}</p>
            <p style={{margin:'2px 0',color:C.gris,fontSize:12}}>{ot.direccion||cliente.direccion} · {regs[cliente.region_id]||''}</p>
            <div style={{display:'flex',gap:8,marginTop:8}}>
              <a style={{...btnS,flex:1,textAlign:'center',textDecoration:'none',marginBottom:0}} href={`tel:${(cliente.telefono||'').replace(/[^\d+]/g,'')}`}>📞 Llamar</a>
              <a style={{...btnS,flex:1,textAlign:'center',textDecoration:'none',marginBottom:0}} href={`https://wa.me/${(cliente.telefono||'').replace(/[^\d+]/g,'')}`} target="_blank">💬 WhatsApp</a>
              <a style={{...btnS,flex:1,textAlign:'center',textDecoration:'none',marginBottom:0}} href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ot.direccion||cliente.direccion||'')}`} target="_blank">🗺 Ruta</a>
            </div>
          </div>
          <div style={{background:C.panel,border:`1px solid ${C.borde}`,borderRadius:12,padding:14,marginBottom:10}}>
            <h4 style={{margin:'0 0 8px',color:C.teal,fontSize:12,letterSpacing:1}}>SERVICIO</h4>
            <p style={{margin:0,color:C.tinta,fontSize:13}}>{ot.tipo} · prioridad {ot.prioridad}</p>
            <p style={{margin:'6px 0 0',color:C.gris,fontSize:12}}>{ot.descripcion}</p>
          </div>
          {events.length>0&&<div style={{background:C.panel,border:`1px solid ${C.borde}`,borderRadius:12,padding:14,marginBottom:10}}>
            <h4 style={{margin:'0 0 8px',color:C.teal,fontSize:12,letterSpacing:1}}>HISTORIAL</h4>
            {events.slice(-5).map(ev=><p key={ev.id} style={{margin:'2px 0',color:C.gris,fontSize:11}}>{new Date(ev.created_at).toLocaleString('es-CL')} · {ev.evento}{ev.detalle&&ev.detalle.motivo?': '+ev.detalle.motivo:''}</p>)}
          </div>}
          {(TECH_NEXT[ot.estado]||[]).map(st=> st==='Rechazada'?
            <button key={st} onClick={()=>setModal('rechazo')} style={{...btnS,borderColor:C.rojo,color:C.rojo}}>✖ Rechazar (exige motivo)</button>:
            st==='Aceptada'? <button key={st} onClick={()=>avanzar('Aceptada')} disabled={busy} style={{...btnG,background:C.teal}}>✔ Aceptar OT</button>:
            <button key={st} onClick={()=>avanzar(st)} disabled={busy} style={btnG}>🚐 Iniciar viaje (En Ruta)</button>)}
        </div>
      )}

      {paso===1&&(
        <div>
          <p style={{color:C.gris,fontSize:13}}>Ruta iniciada. Al llegar al domicilio confirma tu llegada (captura GPS).</p>
          <button onClick={()=>avanzar('Llegada')} disabled={busy} style={{...btnG,background:C.teal}}>📍 Confirmar llegada</button>
          {ot.estado==='Llegada'&&<button onClick={()=>avanzar('Trabajando')} disabled={busy} style={{...btnG,background:C.amarillo}}>🔧 Iniciar servicio</button>}
        </div>
      )}

      {paso===2&&(
        <div>
          {grupos.length===0&&<p style={{color:C.rojo}}>⛔ Esta OT no tiene checklist asignado. Contacta a mesa central.</p>}
          {grupos.map(g=>(
            <div key={g.code} style={{background:C.panel,border:`1px solid ${C.borde}`,borderRadius:12,padding:14,marginBottom:10}}>
              <h4 style={{margin:'0 0 10px',color:C.teal,fontSize:12,letterSpacing:1}}>{g.nombre.toUpperCase()}</h4>
              {(g.items||[]).map((it,i)=>{ const id=it.id||g.code+'_'+i; const v=answers[id];
                return <div key={id} style={{marginBottom:10}}>
                  <label style={lab}>{it.l}{it.r?' *':''}</label>
                  {it.t==='sel'? <select style={caja} value={v||''} onChange={e=>setAnswers({...answers,[id]:e.target.value})}><option value="">Elegir…</option>{(it.o||[]).map(o=><option key={o} value={o}>{o}</option>)}</select>
                  : it.t==='foto'? <div><input type="file" accept="image/*" capture="environment" onChange={async e=>{ const u=await subirFoto(e.target.files[0]); if(u) setAnswers({...answers,[id]:[...(v||[]),u]}); }}/><div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:6}}>{(v||[]).map((u,k)=><img key={k} src={u} style={{width:52,height:52,objectFit:'cover',borderRadius:6}}/>)}</div></div>
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
              {ot.tipo==='armado_volumen'&&<div><label style={lab}>Códigos de caja (separados por coma)</label><input style={caja} value={cajas} onChange={e=>setCajas(e.target.value)} placeholder="7790000001, 7790000002"/></div>}
              <label style={lab}>Código de cupón *</label><input style={caja} value={cupon} onChange={e=>setCupon(e.target.value)} placeholder="BLI00003"/>
              <label style={{...lab,display:'flex',gap:6,alignItems:'center'}}><input type="checkbox" checked={manual} onChange={e=>setManual(e.target.checked)}/> Etiqueta ilegible → ingreso manual</label>
              {manual&&<div><label style={lab}>Foto de la etiqueta dañada (obligatoria) *</label><input type="file" accept="image/*" capture="environment" onChange={async e=>{ const u=await subirFoto(e.target.files[0]); setFotoEtiqueta(u); }}/>{fotoEtiqueta&&<img src={fotoEtiqueta} style={{width:60,height:60,objectFit:'cover',borderRadius:6,marginTop:6}}/>}</div>}
            </div>)}
          <div style={{marginBottom:10}}><label style={lab}>Firma del cliente *</label><Firma onChange={setFirma}/></div>
          <button onClick={()=>setModal('pausa')} style={{...btnS,borderColor:C.amarillo,color:C.amarillo}}>⏸ Pausar: esperando repuesto</button>
          <button onClick={()=>avanzar('Revisión QA')} disabled={busy} style={{...btnG,background:C.verde}}>✅ Finalizar y enviar a Revisión QA</button>
        </div>
      )}

      {paso===3&&(
        <div>
          <p style={{color:C.verde,fontWeight:700}}>Servicio completado. La OT está en Revisión QA de mesa central.</p>
          <button onClick={pdf} style={btnG}>📄 Ver / guardar comprobante PDF</button>
          <button onClick={whats} style={{...btnS,borderColor:C.verde,color:C.verde}}>💬 Enviar comprobante por WhatsApp</button>
        </div>
      )}

      {modal==='rechazo'&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',display:'grid',placeItems:'center',padding:20,zIndex:50}}>
          <div style={{background:C.panel,border:`1px solid ${C.rojo}`,borderRadius:14,padding:20,width:'100%',maxWidth:420}}>
            <h3 style={{color:C.rojo,margin:'0 0 10px'}}>Motivo del rechazo *</h3>
            <textarea style={caja} rows="3" placeholder="Ej: ruta muy larga, vehículo averiado, sin acceso al cliente…" value={motivo} onChange={e=>setMotivo(e.target.value)}/>
            <button onClick={()=>{ if(!motivo.trim()){ avisar('⛔ El motivo es obligatorio',C.rojo); return; } setModal(null); avanzar('Rechazada',{motivo}); }} style={{...btnG,background:C.rojo,color:'#fff'}}>Confirmar rechazo</button>
            <button onClick={()=>setModal(null)} style={btnS}>Cancelar</button>
          </div>
        </div>)}
      {modal==='pausa'&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',display:'grid',placeItems:'center',padding:20,zIndex:50}}>
          <div style={{background:C.panel,border:`1px solid ${C.amarillo}`,borderRadius:14,padding:20,width:'100%',maxWidth:420}}>
            <h3 style={{color:C.amarillo,margin:'0 0 10px'}}>Área responsable de la pausa *</h3>
            <select style={caja} value={area} onChange={e=>setArea(e.target.value)}><option value="">Elegir…</option><option>Bodega</option><option>Transporte</option><option>Cliente</option></select>
            <button onClick={()=>{ if(!area){ avisar('⛔ Selecciona el área responsable',C.rojo); return; } setModal(null); avanzar('Esperando Repuesto',{area_responsable:area}); }} style={{...btnG,background:C.amarillo}}>Confirmar pausa</button>
            <button onClick={()=>setModal(null)} style={btnS}>Cancelar</button>
          </div>
        </div>)}
      {nps&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',display:'grid',placeItems:'center',padding:20,zIndex:50}}>
          <div style={{background:C.panel,border:`1px solid ${C.borde}`,borderRadius:14,padding:20,width:'100%',maxWidth:420}}>
            <h3 style={{color:C.tinta,margin:'0 0 12px'}}>Encuesta al cliente (obligatoria)</h3>
            {[['p','Puntualidad'],['a','Atención'],['s','Solución']].map(([k,l])=>(
              <div key={k} style={{marginBottom:8}}><label style={lab}>{l} *</label>
                <div>{[1,2,3,4,5].map(n=><span key={n} onClick={()=>setNps({...nps,[k]:n})} style={{fontSize:26,cursor:'pointer',color:n<=nps[k]?C.amarillo:C.borde2}}>★</span>)}</div>
              </div>))}
            <textarea style={caja} rows="2" placeholder="Comentario del cliente" value={nps.com} onChange={e=>setNps({...nps,com:e.target.value})}/>
            <button onClick={()=>{ if(!nps.p||!nps.a||!nps.s){ avisar('⛔ Las 3 calificaciones son obligatorias',C.rojo); return; } enviarNps(); }} style={btnG}>Enviar encuesta</button>
          </div>
        </div>)}
    </main>
  );
}
