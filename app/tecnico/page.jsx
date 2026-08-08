'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';

const C={fondo:'#0d1216',panel:'#141b21',borde:'#26323d',borde2:'#31404d',tinta:'#e9eef2',gris:'#8b9aa6',naranja:'#ff6b2c',verde:'#57d977',rojo:'#ff5d5d',amarillo:'#ffc53d',azul:'#5aa7ff',teal:'#35d0ba'};
const caja={width:'100%',padding:11,borderRadius:8,border:`1px solid ${C.borde2}`,background:'#1a232b',color:C.tinta,fontSize:14,marginBottom:10,boxSizing:'border-box'};
const lab={fontSize:10,letterSpacing:1,color:C.gris,textTransform:'uppercase',display:'block',marginBottom:4,fontFamily:'monospace'};
const btnG={width:'100%',padding:13,borderRadius:10,border:0,background:C.naranja,color:'#14100c',fontWeight:800,fontSize:15,cursor:'pointer',marginBottom:8};
const btnS={width:'100%',padding:11,borderRadius:10,border:`1px solid ${C.borde2}`,background:'transparent',color:C.tinta,fontWeight:700,fontSize:13,cursor:'pointer',marginBottom:8};
const NEXT={'Ingresada':['Aceptada','Rechazada'],'Asignada':['Aceptada','Rechazada','En Ruta'],'Aceptada':['En Ruta'],'En Ruta':['Llegada'],'Llegada':['Trabajando'],'Trabajando':['Esperando Repuesto','Finalizada'],'Esperando Repuesto':['Trabajando','Finalizada'],'Finalizada':['Cerrada']};
const defaultByType=t=>{const x=(t||'').toLowerCase(); if(x.includes('volumen'))return 'CK-ARM-VOL-BICI'; if(x.includes('armado'))return 'CK-ARM-BICI'; if(x.includes('garantia'))return 'CK-EVAL-GARANTIA'; if(x.includes('retiro'))return 'CK-RETIRO'; if(x.includes('manten'))return 'CK-MANT-ELEC'; return 'CK-REP-CONV';};
const colorEst=e=>({'Ingresada':C.azul,'Asignada':C.azul,'Aceptada':C.teal,'Rechazada':C.rojo,'En Ruta':C.naranja,'Llegada':C.teal,'Trabajando':C.amarillo,'Esperando Repuesto':C.rojo,'Finalizada':C.verde,'Cerrada':C.verde}[e]||C.gris);

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
    return ()=>{c.removeEventListener('mousedown',dn);c.removeEventListener('mousemove',mv);window.removeEventListener('mouseup',up);c.removeEventListener('touchstart',dn);c.removeEventListener('touchmove',mv);c.removeEventListener('touchend',up);};
  },[]);
  return <canvas ref={ref} width={330} height={130} style={{border:'1px solid #777',background:'#fff',borderRadius:8,touchAction:'none',maxWidth:'100%'}}/>;
}

export default function Tecnico(){
  const [user,setUser]=useState(null);
  const [me,setMe]=useState(null);
  const [login,setLogin]=useState({email:'',pass:''});
  const [ots,setOts]=useState([]);
  const [cust,setCust]=useState({});
  const [sel,setSel]=useState(null);
  const [blocks,setBlocks]=useState({});
  const [checks,setChecks]=useState([]);
  const [answers,setAnswers]=useState({});
  const [cupon,setCupon]=useState(''); const [cajas,setCajas]=useState('');
  const [firma,setFirma]=useState(null);
  const [costos,setCostos]=useState([]); const [nuevoCosto,setNuevoCosto]=useState({concepto:'',monto:''});
  const [nps,setNps]=useState(null); const [msg,setMsg]=useState('');
  const [busy,setBusy]=useState(false);

  useEffect(()=>{ supabase.auth.getSession().then(({data})=>{ if(data.session) setUser(data.session.user); }); },[]);
  useEffect(()=>{ if(!user) return;
    (async()=>{
      const {data:m}=await supabase.from('users').select('*').eq('auth_uid',user.id).single(); setMe(m);
      const [b,c,cu]=await Promise.all([supabase.from('checklist_blocks').select('*'),supabase.from('checklists').select('*'),supabase.from('customers').select('id,nombre,telefono,direccion')]);
      const bm={}; (b.data||[]).forEach(x=>bm[x.code]=x); setBlocks(bm); setChecks(c.data||[]);
      const cm={}; (cu.data||[]).forEach(x=>cm[x.id]=x); setCust(cm);
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
  },[user,me&&me.rol]);

  async function entrar(e){ e.preventDefault(); setBusy(true);
    const {data,error}=await supabase.auth.signInWithPassword({email:login.email,password:login.pass});
    if(!error) setUser(data.user); setBusy(false);
    if(error) setMsg('Credenciales incorrectas');
  }
  async function salir(){ await supabase.auth.signOut(); setUser(null); setSel(null); }

  async function token(){ const {data}=await supabase.auth.getSession(); return data.session?data.session.access_token:null; }

  async function subirFoto(file){ const ot=sel; const path=`ot-${ot.id}/${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`;
    const {error}=await supabase.storage.from('evidencia').upload(path,file); if(error) return null;
    return supabase.storage.from('evidencia').getPublicUrl(path).data.publicUrl;
  }

  const ot=ots.find(o=>o.id===sel)||null;
  const grupos=ot?((checks.find(c=>c.code===(ot.checklist_code||defaultByType(ot.tipo)))||{blocks:[]}).blocks||[]).map(bc=>blocks[bc]).filter(Boolean):[];
  const esArmado=ot&&((ot.tipo||'').toLowerCase().includes('armado'));
  const total=15000+costos.reduce((s,x)=>s+(Number(x.monto)||0),0);

  function faltaObligatorios(){ const f=[]; grupos.forEach(g=>(g.items||[]).forEach(it=>{ if(it.r){ const v=answers[it.id||g.code+'_'+(g.items||[]).indexOf(it)]; if(it.t==='foto'){ if(!(v&&v.length)) f.push(it.l);} else if(!v||!String(v).trim()) f.push(it.l); } })); return f; }

  async function avanzar(estado){ setBusy(true); setMsg('');
    try{
      const tk=await token(); const body={status:estado};
      if(estado==='Trabajando'){ try{ const p=await new Promise((res,rej)=>navigator.geolocation.getCurrentPosition(res,rej,{timeout:4000})); body.latitude=p.coords.latitude; body.longitude=p.coords.longitude; }catch(e){} }
      if(estado==='Finalizada'){
        const pend=faltaObligatorios(); if(pend.length){ setMsg('⛔ Checklist incompleto: '+pend.join(' · ')); setBusy(false); return; }
        if(esArmado&&!cupon.trim()){ setMsg('⛔ Para finalizar un armado debes ingresar el código de cupón.'); setBusy(false); return; }
        body.checklist=answers; body.couponCode=cupon.trim()||undefined; body.boxCode=cajas.trim()||undefined;
        body.financials={baseCost:15000,manualItems:costos,totalCost:total};
        if(firma){ const b=await (await fetch(firma)).blob(); const url=await subirFoto(new File([b],'firma.png',{type:'image/png'})); if(url) body.firma=url; }
      }
      const r=await fetch(`/api/v1/work-orders/${ot.id}/status`,{method:'PATCH',headers:{Authorization:`Bearer ${tk}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
      const d=await r.json();
      if(!r.ok){ setMsg('⛔ '+(d.error||'No se pudo actualizar')); setBusy(false); return; }
      setMsg('✅ '+estado);
      if(estado==='Finalizada'){ setNps({p:0,a:0,s:0,com:''}); }
      setOts(prev=>prev.map(o=>o.id===ot.id?{...o,estado}:o));
    }catch(e){ setMsg('⛔ '+e.message); }
    setBusy(false);
  }

  async function enviarNps(){ const tk=await token();
    await fetch(`/api/v1/work-orders/${ot.id}/nps`,{method:'POST',headers:{Authorization:`Bearer ${tk}`,'Content-Type':'application/json'},body:JSON.stringify({punctuality:nps.p,attention:nps.a,solution:nps.s,comentario:nps.com})});
    setNps(null);
  }

  function whats(){ const c=cust[ot.customer_id]; const tel=(c&&c.telefono||'').replace(/[^\d+]/g,''); const txt=`Hola ${c?c.nombre:''}, le saluda el técnico. OT finalizada. Total servicio: $${total.toLocaleString('es-CL')}. Gracias por su preferencia.`; window.open(`https://wa.me/${tel}?text=${encodeURIComponent(txt)}`,'_blank'); }

  if(!user) return (
    <main style={{minHeight:'100vh',background:C.fondo,display:'grid',placeItems:'center',fontFamily:'system-ui,sans-serif'}}>
      <form onSubmit={entrar} style={{width:320,background:C.panel,border:`1px solid ${C.borde}`,borderRadius:14,padding:26}}>
        <h1 style={{margin:'0 0 4px',fontSize:26,color:C.tinta,letterSpacing:1}}>TORQUE<span style={{color:C.naranja}}>·OS</span></h1>
        <p style={{margin:'0 0 18px',color:C.gris,fontSize:12}}>Acceso técnico de terreno</p>
        <label style={lab}>Correo</label><input style={caja} type="email" value={login.email} onChange={e=>setLogin({...login,email:e.target.value})} required/>
        <label style={lab}>Contraseña</label><input style={caja} type="password" value={login.pass} onChange={e=>setLogin({...login,pass:e.target.value})} required/>
        {msg&&<p style={{color:C.rojo,fontSize:12}}>{msg}</p>}
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
      {ots.filter(o=>o.estado!=='Cerrada').map(o=>(
        <button key={o.id} onClick={()=>{setSel(o.id);setAnswers({});setCupon('');setCajas('');setCostos([]);setFirma(null);setMsg('');}} style={{...btnS,textAlign:'left',padding:14}}>
          <div style={{display:'flex',justifyContent:'space-between'}}><b style={{color:C.naranja}}>OT-{o.ot_number}</b><span style={{color:colorEst(o.estado),fontWeight:800,fontSize:11}}>{o.estado.toUpperCase()}</span></div>
          <div style={{color:C.tinta,fontSize:13,marginTop:4}}>{(cust[o.customer_id]||{}).nombre||'Cliente'} · {o.tipo}</div>
          <div style={{color:C.gris,fontSize:11,marginTop:2}}>{o.direccion||(cust[o.customer_id]||{}).direccion||''}</div>
        </button>
      ))}
      {ots.filter(o=>o.estado!=='Cerrada').length===0&&<p style={{color:C.gris}}>No tienes OTs activas asignadas.</p>}
    </main>
  );

  return (
    <main style={{minHeight:'100vh',background:C.fondo,fontFamily:'system-ui,sans-serif',padding:16,maxWidth:560,margin:'0 auto'}}>
      <button onClick={()=>setSel(null)} style={{...btnS,width:'auto',padding:'6px 12px'}}>← Mis órdenes</button>
      <h2 style={{color:C.naranja,margin:'8px 0 2px'}}>OT-{ot.ot_number}</h2>
      <p style={{color:C.gris,fontSize:12,margin:0}}>{(cust[ot.customer_id]||{}).nombre} · <span style={{color:colorEst(ot.estado),fontWeight:800}}>{ot.estado}</span></p>
      <p style={{color:C.tinta,fontSize:13}}>{ot.direccion||(cust[ot.customer_id]||{}).direccion||''}</p>
      <div style={{display:'flex',gap:8,marginBottom:12}}>
        <a style={{...btnS,flex:1,textAlign:'center',textDecoration:'none'}} href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ot.direccion||(cust[ot.customer_id]||{}).direccion||'')}`} target="_blank">🗺 Ruta</a>
        <a style={{...btnS,flex:1,textAlign:'center',textDecoration:'none'}} href={`https://wa.me/${((cust[ot.customer_id]||{}).telefono||'').replace(/[^\d+]/g,'')}`} target="_blank">💬 WhatsApp</a>
      </div>
      {(NEXT[ot.estado]||[]).map(st=>(
        st==='Finalizada'?null:
        <button key={st} onClick={()=>avanzar(st)} disabled={busy} style={st==='Rechazada'?{...btnS,borderColor:C.rojo,color:C.rojo}:st==='Trabajando'?{...btnG,background:C.amarillo}:{...btnG,background:st==='Aceptada'?C.teal:C.naranja}}>{st==='En Ruta'?'🚐 Iniciar viaje':st==='Trabajando'?'🔧 Iniciar servicio':st}</button>
      ))}
      {ot.estado==='Trabajando'||ot.estado==='Esperando Repuesto'? (
        <div style={{marginTop:6}}>
          {grupos.map(g=>(
            <div key={g.code} style={{background:C.panel,border:`1px solid ${C.borde}`,borderRadius:10,padding:12,marginBottom:10}}>
              <h4 style={{margin:'0 0 8px',color:C.teal,fontSize:12,letterSpacing:1}}>{g.nombre.toUpperCase()}</h4>
              {(g.items||[]).map((it,i)=>{ const id=it.id||g.code+'_'+i; const v=answers[id];
                return <div key={id} style={{marginBottom:9}}>
                  <label style={lab}>{it.l}{it.r?' *':''}</label>
                  {it.t==='sel'? <select style={caja} value={v||''} onChange={e=>setAnswers({...answers,[id]:e.target.value})}><option value="">Elegir…</option>{(it.o||[]).map(o=><option key={o} value={o}>{o}</option>)}</select>
                  : it.t==='foto'? <div><input type="file" accept="image/*" onChange={async e=>{ const u=await subirFoto(e.target.files[0]); if(u) setAnswers({...answers,[id]:[...(v||[]),u]}); }}/><div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{(v||[]).map((u,k=><img key={k} src={u} style={{width:52,height:52,objectFit:'cover',borderRadius:6}}/>))}</div></div>
                  : it.t==='num'? <input style={caja} type="number" value={v||''} onChange={e=>setAnswers({...answers,[id]:e.target.value})}/>
                  : <input style={caja} value={v||''} onChange={e=>setAnswers({...answers,[id]:e.target.value})}/>}
                </div>;})}
            </div>))}
          <div style={{background:C.panel,border:`1px solid ${C.borde}`,borderRadius:10,padding:12,marginBottom:10}}>
            <h4 style={{margin:'0 0 8px',color:C.amarillo,fontSize:12,letterSpacing:1}}>COSTOS EN TERRENO</h4>
            {costos.map((c,i)=><div key={i} style={{color:C.tinta,fontSize:13}}>{c.concepto}: ${Number(c.monto).toLocaleString('es-CL')}</div>)}
            <div style={{display:'flex',gap:6}}><input style={{...caja,flex:2}} placeholder="Concepto" value={nuevoCosto.concepto} onChange={e=>setNuevoCosto({...nuevoCosto,concepto:e.target.value})}/><input style={{...caja,flex:1}} type="number" placeholder="$" value={nuevoCosto.monto} onChange={e=>setNuevoCosto({...nuevoCosto,monto:e.target.value})}/></div>
            <button style={btnS} onClick={()=>{ if(nuevoCosto.concepto&&nuevoCosto.monto){ setCostos([...costos,nuevoCosto]); setNuevoCosto({concepto:'',monto:''}); } }}>+ Agregar costo</button>
            <p style={{color:C.verde,fontWeight:800}}>Total: ${total.toLocaleString('es-CL')}</p>
          </div>
          {esArmado&&<div><label style={lab}>Código de cupón *</label><input style={caja} value={cupon} onChange={e=>setCupon(e.target.value)} placeholder="BLI00003"/></div>}
          {ot.tipo==='armado_volumen'&&<div><label style={lab}>Códigos de caja (separados por coma)</label><input style={caja} value={cajas} onChange={e=>setCajas(e.target.value)} placeholder="7790000001, 7790000002"/></div>}
          <div style={{marginBottom:10}}><label style={lab}>Firma del cliente</label><Firma onChange={setFirma}/></div>
          <button onClick={()=>avanzar('Finalizada')} disabled={busy} style={{...btnG,background:C.verde}}>✅ Finalizar OT</button>
        </div>
      ):null}
      {msg&&<p style={{color:msg.startsWith('⛔')?C.rojo:C.verde,fontSize:13}}>{msg}</p>}
      {nps&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',display:'grid',placeItems:'center',padding:20}}>
          <div style={{background:C.panel,border:`1px solid ${C.borde}`,borderRadius:14,padding:20,width:'100%',maxWidth:420}}>
            <h3 style={{color:C.tinta,margin:'0 0 12px'}}>Encuesta al cliente</h3>
            {[['p','Puntualidad'],['a','Atención'],['s','Solución']].map(([k,l])=>(
              <div key={k} style={{marginBottom:8}}><label style={lab}>{l}</label>
                <div>{[1,2,3,4,5].map(n=><span key={n} onClick={()=>setNps({...nps,[k]:n})} style={{fontSize:24,cursor:'pointer',color:n<=nps[k]?C.amarillo:C.borde2}}>★</span>)}</div>
              </div>))}
            <textarea style={caja} rows="2" placeholder="Comentario" value={nps.com} onChange={e=>setNps({...nps,com:e.target.value})}/>
            <button style={btnG} onClick={enviarNps}>Enviar encuesta</button>
            <button style={btnS} onClick={()=>setNps(null)}>Omitir</button>
            <button style={{...btnS,borderColor:C.verde,color:C.verde}} onClick={whats}>📄 Enviar comprobante por WhatsApp</button>
          </div>
        </div>)}
    </main>
  );
}
