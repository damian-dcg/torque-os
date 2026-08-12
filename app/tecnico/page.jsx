'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { T, S, estColor, fmtCLP } from '../../lib/ui';

function defaultByType(t){
  var x=(t||'').toLowerCase();
  if(x.indexOf('volumen')>=0)return 'CK-ARM-VOL-BICI';
  if(x.indexOf('armado')>=0)return 'CK-ARM-BICI';
  if(x.indexOf('garantia')>=0)return 'CK-EVAL-GARANTIA';
  if(x.indexOf('retiro')>=0)return 'CK-RETIRO';
  if(x.indexOf('manten')>=0)return 'CK-MANT-ELEC';
  return 'CK-REP-CONV';
}
function pasoDe(e){
  if(e==='Ingresada')return 0;
  if(e==='Asignada'||e==='Aceptada'||e==='En Ruta')return 1;
  if(e==='Llegada'||e==='Trabajando'||e==='Esperando Repuesto')return 2;
  return 3;
}
var JUST=['Garantía vencida','Mal uso','Manipulación externa','Golpe','Desgaste normal','Instalación incorrecta','Otro'];

function Firma(props){
  const ref=useRef(null);
  const draw=useRef(false);
  useEffect(function(){
    var c=ref.current;
    var ctx=c.getContext('2d');
    ctx.lineWidth=2.4; ctx.lineCap='round'; ctx.strokeStyle='#111';
    function pos(e){ var r=c.getBoundingClientRect(); var t=e.touches?e.touches[0]:e; return [t.clientX-r.left,t.clientY-r.top]; }
    function dn(e){ draw.current=true; var p=pos(e); ctx.beginPath(); ctx.moveTo(p[0],p[1]); e.preventDefault(); }
    function mv(e){ if(!draw.current)return; var p=pos(e); ctx.lineTo(p[0],p[1]); ctx.stroke(); e.preventDefault(); props.onChange(c.toDataURL('image/png')); }
    function up(){ draw.current=false; }
    c.addEventListener('mousedown',dn); c.addEventListener('mousemove',mv); window.addEventListener('mouseup',up);
    c.addEventListener('touchstart',dn,{passive:false}); c.addEventListener('touchmove',mv,{passive:false}); c.addEventListener('touchend',up);
  },[]);
  return <canvas ref={ref} width={330} height={140} style={{border:'1.5px solid '+T.border,background:'#fff',borderRadius:10,touchAction:'none',maxWidth:'100%'}}/>;
}

function CamScan(props){
  const video=useRef(null);
  const s=useState(''); const err=s[0]; const setErr=s[1];
  useEffect(function(){
    var live=true; var stream=null; var tick=null;
    (async function(){
      try{
        if(!('BarcodeDetector' in window)){ setErr('Navegador sin escáner nativo: usa digitación.'); return; }
        var det=new window.BarcodeDetector({formats:['qr_code','ean_13','ean_8','code_128','code_39']});
        stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
        if(video.current){ video.current.srcObject=stream; await video.current.play(); }
        tick=setInterval(async function(){
          if(!live||!video.current)return;
          try{ var c=await det.detect(video.current); if(c.length) props.onCode(c[0].rawValue); }catch(e){}
        },500);
      }catch(e){ setErr('No se pudo abrir la cámara.'); }
    })();
    return function(){ live=false; if(tick)clearInterval(tick); if(stream)stream.getTracks().forEach(function(t){t.stop();}); };
  },[]);
  if(err) return <p style={{color:T.warn,fontSize:13}}>{err}</p>;
  return <video ref={video} style={{width:'100%',borderRadius:10,background:'#000'}} muted playsInline/>;
}

export default function Tecnico(){
  const [user,setUser]=useState(null);
  const [me,setMe]=useState(null);
  const [tenant,setTenant]=useState(null);
  const [login,setLogin]=useState({email:'',pass:''});
  const [ots,setOts]=useState([]);
  const [cust,setCust]=useState({});
  const [regs,setRegs]=useState({});
  const [blocks,setBlocks]=useState({});
  const [checks,setChecks]=useState([]);
  const [sel,setSel]=useState(null);
  const [answers,setAnswers]=useState({});
  const [cupon,setCupon]=useState('');
  const [caja,setCaja]=useState('');
  const [cajas,setCajas]=useState('');
  const [manual,setManual]=useState(false);
  const [fotoEtq,setFotoEtq]=useState(null);
  const [firma,setFirma]=useState(null);
  const [costos,setCostos]=useState([]);
  const [nuevoCosto,setNuevoCosto]=useState({concepto:'',monto:''});
  const [reps,setReps]=useState([]);
  const [repModal,setRepModal]=useState(false);
  const [rep,setRep]=useState({pieza:'',gar:'si',just:''});
  const [gar,setGar]=useState({aplica:'',causa:''});
  const [cobro,setCobro]=useState({tipo:'',medio:''});
  const [scanOn,setScanOn]=useState(false);
  const [jornada,setJornada]=useState(null);
  const [modal,setModal]=useState(null);
  const [motivo,setMotivo]=useState('');
  const [rechazoOt,setRechazoOt]=useState(null);
  const [nps,setNps]=useState(null);
  const [toast,setToast]=useState(null);
  const [cola,setCola]=useState([]);

  function avisar(t,c){ setToast({t:t,c:c}); setTimeout(function(){ setToast(null); },2600); }
  async function token(){ var d=await supabase.auth.getSession(); return d.session?d.session.access_token:null; }
  function pos(ms){ return new Promise(function(res,rej){ navigator.geolocation.getCurrentPosition(res,rej,{timeout:ms,maximumAge:15000}); }); }

  async function doLogin(e){
    e.preventDefault();
    var d=await supabase.auth.signInWithPassword({email:login.email,password:login.pass});
    if(d.error||!d.data||!d.data.session){ avisar('⛔ Credenciales incorrectas',T.danger); }
    else { setUser(d.data.session.user); }
  }

  async function cargarOTs(){
    var m=me;
    var q=supabase.from('work_orders').select('*').order('id',{ascending:false}).limit(200);
    if(m&&m.rol==='tecnico_sat') q=q.eq('asignado_user_id',m.id);
    else if(m&&m.rol==='sat_admin') q=q.eq('asignado_company_id',m.company_id);
    var d=await q;
    setOts(d.data||[]);
  }

  useEffect(function(){
    supabase.auth.getSession().then(function(d){ if(d.session) setUser(d.session.user); });
    try{ setCola(JSON.parse(localStorage.getItem('tq_queue')||'[]')); }catch(e){}
    window.addEventListener('online',flushCola);
    return function(){ window.removeEventListener('online',flushCola); };
  },[]);

  useEffect(function(){
    if(!user) return;
    (async function(){
      var r=await Promise.all([
        supabase.from('users').select('*').eq('auth_uid',user.id).single(),
        supabase.from('tenants').select('*').eq('activo',true).limit(1),
        supabase.from('customers').select('*').limit(500),
        supabase.from('regions').select('*'),
        supabase.from('checklist_blocks').select('*'),
        supabase.from('checklists').select('*')
      ]);
      setMe(r[0].data);
      setTenant((r[1].data||[])[0]||null);
      var cm={}; (r[2].data||[]).forEach(function(x){cm[x.id]=x;}); setCust(cm);
      var rm={}; (r[3].data||[]).forEach(function(x){rm[x.id]=x.nombre;}); setRegs(rm);
      var bm={}; (r[4].data||[]).forEach(function(x){bm[x.code]=x;}); setBlocks(bm);
      setChecks(r[5].data||[]);
      cargarOTs();
    })();
    var ch=supabase.channel('rt-tec').on('postgres_changes',{event:'*',schema:'public',table:'work_orders'},function(){ cargarOTs(); }).subscribe();
    var ch2=supabase.channel('rt-notif').on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications'},function(p){
      var n=p.new;
      if(me&&(n.user_id===me.id||(me.company_id&&n.company_id===me.company_id))) avisar(n.titulo,T.info);
    }).subscribe();
    return function(){ supabase.removeChannel(ch); supabase.removeChannel(ch2); };
  },[user]);

  useEffect(function(){
    var k='tq_jornada_'+new Date().toDateString();
    setJornada(localStorage.getItem(k));
  },[user]);

  function encolar(otId,body){
    var q=JSON.parse(localStorage.getItem('tq_queue')||'[]');
    q.push({otId:otId,body:body});
    localStorage.setItem('tq_queue',JSON.stringify(q));
    setCola(q);
  }
  async function flushCola(){
    var q=JSON.parse(localStorage.getItem('tq_queue')||'[]');
    if(!q.length)return;
    var tk=await token(); if(!tk)return;
    var rest=[];
    for(var i=0;i<q.length;i++){
      try{
        var r=await fetch('/api/v1/work-orders/'+q[i].otId+'/status',{method:'PATCH',headers:{Authorization:'Bearer '+tk,'Content-Type':'application/json'},body:JSON.stringify(q[i].body)});
        if(!r.ok)rest.push(q[i]);
      }catch(e){ rest.push(q[i]); }
    }
    localStorage.setItem('tq_queue',JSON.stringify(rest));
    setCola(rest);
    if(rest.length<q.length) avisar('✅ Cola sincronizada',T.ok);
  }

  async function parche(ot,estado,extra){
    setOts(function(p){ return p.map(function(x){ return x.id===ot.id?Object.assign({},x,{estado:estado}):x; }); });
    var body=Object.assign({status:estado},extra||{});
    var tk=await token();
    try{
      var r=await fetch('/api/v1/work-orders/'+ot.id+'/status',{method:'PATCH',headers:{Authorization:'Bearer '+tk,'Content-Type':'application/json'},body:JSON.stringify(body)});
      var d=await r.json();
      if(d&&d.error){ avisar('⛔ '+d.error,T.danger); cargarOTs(); }
      else avisar('✅ '+estado,T.ok);
    }catch(e){ encolar(ot.id,body); avisar('⚠ Sin conexión: en cola',T.warn); }
    try{
      var p=await pos(2500);
      await supabase.from('ot_events').insert([{ot_id:ot.id,evento:'geo',detalle:{estado:estado,lat:p.coords.latitude,lng:p.coords.longitude}}]);
    }catch(e){}
  }

  async function subirFoto(otId,file){
    var path='ot-'+otId+'/'+Date.now()+'-'+file.name;
    var e=await supabase.storage.from('evidencia').upload(path,file);
    if(e.error){ avisar('⛔ No se pudo subir',T.danger); return null; }
    return supabase.storage.from('evidencia').getPublicUrl(path).data.publicUrl;
  }

  const ot=ots.find(function(o){return o.id===sel;})||null;
  const cliente=ot?(cust[ot.customer_id]||{}):{};
  const paso=ot?pasoDe(ot.estado):0;
  const grupos=ot?((checks.find(function(c){return c.code===(ot.checklist_code||defaultByType(ot.tipo));})||{blocks:[]}).blocks||[]).map(function(bc){return blocks[bc];}).filter(Boolean):[];
  const esArmado=ot&&String(ot.tipo).indexOf('armado')>=0;
  const esVolumen=ot&&ot.tipo==='armado_volumen';
  const expected=ot?(ot.cantidad_unidades||1):1;
  const leidas=cajas.split(',').map(function(s){return s.trim();}).filter(Boolean).length;
  const subtotal=15000+costos.reduce(function(s,x){return s+(Number(x.monto)||0);},0);
  const iva=Math.round(subtotal*0.19);
  const total=subtotal+iva;
  const pendientes=ots.filter(function(o){return o.estado==='Ingresada';});
  const activas=ots.filter(function(o){return ['Ingresada','Cerrada','Rechazada'].indexOf(o.estado)<0;});
  const ordenadas=activas.slice().sort(function(a,b){ return (a.ruta_orden||999)-(b.ruta_orden||999); });
  const proxima=ordenadas[0]||null;

  function valItem(g,it,i){ return answers[it.id||g.code+'_'+i]; }
  function falta(){
    var f=[];
    grupos.forEach(function(g){
      (g.items||[]).forEach(function(it,i){
        if(it.r){
          var v=valItem(g,it,i);
          if(it.t==='foto'){ if(!(v&&v.length)) f.push(it.l); }
          else if(!v||!String(v).trim()) f.push(it.l);
        }
      });
    });
    return f;
  }
  function setAns(id,val){
    var n={};
    for(var k in answers) n[k]=answers[k];
    n[id]=val;
    setAnswers(n);
  }

  function aceptarTodas(){ pendientes.forEach(function(o){ parche(o,'Asignada'); }); avisar('✅ Ruta aceptada',T.ok); }
  function confirmarRechazo(){
    if(!motivo.trim()){ avisar('⛔ Motivo obligatorio',T.danger); return; }
    parche(rechazoOt,'Rechazada',{motivo:motivo});
    setModal(null); setMotivo('');
    avisar('✅ Rechazada → agente',T.ok);
  }
  function enCamino(o){
    var c=cust[o.customer_id]||{};
    var tel=String(c.telefono||'').replace(/[^\d+]/g,'');
    window.open('https://wa.me/'+tel+'?text='+encodeURIComponent('Hola '+(c.nombre||'')+', su técnico va en camino a su servicio OT-'+o.ot_number+'.'),'_blank');
    parche(o,'En Ruta');
  }
  function confirmarLlegada(o){ parche(o,'Llegada'); }
  function addRep(){
    if(!rep.pieza.trim()){ avisar('⛔ Indica la pieza',T.danger); return; }
    if(rep.gar==='no'&&!rep.just){ avisar('⛔ Justificación obligatoria',T.danger); return; }
    setReps(function(r){ return r.concat([rep]); });
    setRep({pieza:'',gar:'si',just:''});
    setRepModal(false);
  }

  async function finalizar(){
    var pend=falta();
    if(pend.length){ avisar('⛔ Checklist: '+pend.slice(0,3).join(' · '),T.danger); return; }
    if(!firma){ avisar('⛔ Falta firma del cliente',T.danger); return; }
    if(esArmado&&!cupon.trim()){ avisar('⛔ Validación doble: falta Cupón',T.danger); return; }
    if(esArmado&&!esVolumen&&!caja.trim()){ avisar('⛔ Validación doble: falta Caja',T.danger); return; }
    if(esVolumen&&leidas<expected){ avisar('⛔ Faltan cajas ('+leidas+'/'+expected+')',T.danger); return; }
    if(esArmado&&manual&&!fotoEtq){ avisar('⛔ Foto etiqueta dañada obligatoria',T.danger); return; }
    var checklist=Object.assign({},answers,{w_garantia:gar.aplica,w_cobro:cobro.tipo,w_medio:cobro.medio});
    setOts(function(p){ return p.map(function(x){ return x.id===ot.id?Object.assign({},x,{estado:'Revisión QA'}):x; }); });
    var tk=await token();
    var body={status:'Revisión QA',checklist:checklist,couponCode:cupon.trim()||undefined,boxCode:(esVolumen?cajas:caja).trim()||undefined,financials:{baseCost:15000,manualItems:costos,subtotal:subtotal,iva:iva,totalCost:total,garantia:gar.aplica,cobro:cobro.tipo},repuestos:reps,firma:firma};
    try{
      var r=await fetch('/api/v1/work-orders/'+ot.id+'/status',{method:'PATCH',headers:{Authorization:'Bearer '+tk,'Content-Type':'application/json'},body:JSON.stringify(body)});
      var d=await r.json();
      if(d&&d.error){ avisar('⛔ '+d.error,T.danger); cargarOTs(); return; }
      avisar('✅ OT → Revisión QA',T.ok);
      setNps({p:0,a:0,s:0,com:''});
    }catch(e){ encolar(ot.id,body); avisar('⚠ En cola',T.warn); setNps({p:0,a:0,s:0,com:''}); }
  }

  async function enviarNps(){
    var tk=await token();
    await fetch('/api/v1/work-orders/'+ot.id+'/nps',{method:'POST',headers:{Authorization:'Bearer '+tk,'Content-Type':'application/json'},body:JSON.stringify({punctuality:nps.p,attention:nps.a,solution:nps.s,comentario:nps.com})});
    setNps(null);
    avisar('✅ Encuesta registrada',T.ok);
  }

  function pdf(){
    var filas='';
    grupos.forEach(function(g){
      (g.items||[]).forEach(function(it,i){
        var v=valItem(g,it,i);
        if(v==null||v==='')return;
        filas+='<tr><td>'+it.l+'</td><td>'+(Array.isArray(v)?v.length+' foto(s)':v)+'</td></tr>';
      });
    });
    var repRows=reps.map(function(r){ return '<tr><td>'+r.pieza+'</td><td>'+(r.gar==='si'?'Sí':'No · '+r.just)+'</td></tr>'; }).join('');
    var fotos=Object.keys(answers).map(function(k){return answers[k];}).filter(function(v){return Array.isArray(v);}).reduce(function(a,v){return a.concat(v);},[]);
    var brand=(tenant&&tenant.color_primario)||'#FF6B2C';
    var w=window.open('','_blank');
    var html='<html><head><title>OT-'+ot.ot_number+'</title><style>body{font-family:Arial;padding:24px;color:#111}h1{margin:0}table{width:100%;border-collapse:collapse;margin:10px 0}td,th{border:1px solid #ccc;padding:6px;font-size:12px;text-align:left}img{width:110px;height:110px;object-fit:cover;margin:4px}</style></head><body>';
    html+='<div style="border-bottom:4px solid '+brand+';padding-bottom:10px;margin-bottom:12px">';
    if(tenant&&tenant.logo_url) html+='<img src="'+tenant.logo_url+'" style="height:44px;margin-right:10px"/>';
    html+='<b style="font-size:18px">'+(tenant?tenant.nombre:'TORQUE·OS')+'</b><div style="font-size:12px;color:#555">Comprobante de Servicio Técnico</div></div>';
    html+='<p>OT-'+ot.ot_number+' · '+new Date().toLocaleString('es-CL')+' · Técnico: '+((me&&me.nombre)||'')+'</p>';
    html+='<table><tr><th>Cliente</th><td>'+(cliente.nombre||'')+'</td><th>RUT</th><td>'+(cliente.rut||'')+'</td></tr>';
    html+='<tr><th>Dirección</th><td colspan="3">'+(ot.direccion||cliente.direccion||'')+'</td></tr>';
    html+='<tr><th>Tipo</th><td>'+ot.tipo+'</td><th>Garantía/Cobro</th><td>'+(gar.aplica||'—')+' / '+(cobro.tipo||'—')+'</td></tr></table>';
    html+='<table><tr><th>Checklist</th><th>Respuesta</th></tr>'+filas+'</table>';
    if(reps.length) html+='<h3>Repuestos</h3><table><tr><th>Pieza</th><th>Garantía</th></tr>'+repRows+'</table>';
    html+='<table><tr><th>Concepto</th><th>Monto</th></tr><tr><td>Subtotal</td><td>'+fmtCLP(subtotal)+'</td></tr><tr><td>IVA 19%</td><td>'+fmtCLP(iva)+'</td></tr><tr><td><b>TOTAL</b></td><td><b>'+fmtCLP(total)+'</b></td></tr></table>';
    if(firma) html+='<p><b>Firma cliente:</b></p><img src="'+firma+'" style="width:220px;height:90px;object-fit:contain"/>';
    if(fotos.length) html+='<p><b>Anexo fotográfico:</b></p>'+fotos.map(function(f){return '<img src="'+f+'"/>';}).join('');
    html+='<script>window.print()</script></body></html>';
    w.document.write(html);
    w.document.close();
  }

  var brand=(tenant&&tenant.color_primario)||T.brand;
  var Toast=toast? <div style={S.toast(toast.c)}>{toast.t}</div> : null;

  if(!user) return (
    <main style={{...S.main,display:'grid',placeItems:'center',padding:16}}>
      {Toast}
      <form onSubmit={doLogin} style={{...S.card,width:'100%',maxWidth:360,padding:26}}>
        <h1 style={{...S.h1,fontSize:24,marginBottom:2}}>TORQUE<span style={{color:brand}}>·OS</span></h1>
        <p style={{...S.sub,margin:'0 0 18px'}}>Acceso técnico de terreno</p>
        <label style={S.label}>Correo</label>
        <input style={S.input} type="email" value={login.email} onChange={function(e){setLogin({email:e.target.value,pass:login.pass});}} required/>
        <label style={S.label}>Contraseña</label>
        <input style={S.input} type="password" value={login.pass} onChange={function(e){setLogin({email:login.email,pass:e.target.value});}} required/>
        <button style={S.btn(brand)}>Ingresar</button>
      </form>
    </main>);

  if(user&&me&&!jornada) return (
    <main style={{...S.main,display:'grid',placeItems:'center',padding:16}}>
      {Toast}
      <div style={{...S.card,maxWidth:420,width:'100%',textAlign:'center',padding:30}}>
        <h1 style={{...S.h1,fontSize:24}}>Hola, {String(me.nombre||'').split(' ')[0]}</h1>
        <p style={{...S.sub,margin:'10px 0 18px'}}>Hoy tienes {pendientes.length+activas.length} servicio(s) en tu ruta.</p>
        <button style={S.btn(T.ok)} onClick={function(){ var k='tq_jornada_'+new Date().toDateString(); localStorage.setItem(k,'1'); setJornada('1'); }}>Comenzar jornada</button>
      </div>
    </main>);

  if(!ot) return (
    <main style={{...S.main,padding:16,maxWidth:600,margin:'0 auto'}}>
      {Toast}
      <header style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
        <h1 style={S.h1}>TORQUE<span style={{color:brand}}>·OS</span></h1>
        {cola.length>0? <button onClick={flushCola} style={{...S.btnO(T.warn),width:'auto',marginBottom:0,padding:'6px 10px'}}>↻ Cola ({cola.length})</button> : null}
        <button onClick={function(){ setModal('salir'); }} style={{...S.btnO(T.danger),width:'auto',marginLeft:'auto',marginBottom:0,padding:'8px 14px'}}>Salir</button>
      </header>
      {pendientes.length>0? (
        <div style={{...S.card,border:'2px solid '+T.info}}>
          <h4 style={{...S.h2,color:T.info}}>Ruta del día · {pendientes.length} OT(s)</h4>
          <button onClick={aceptarTodas} style={S.btn(T.ok)}>✔ ACEPTAR TODAS ({pendientes.length})</button>
          {pendientes.map(function(o){
            var c=cust[o.customer_id]||{};
            return (
              <div key={o.id} style={{border:'1px solid '+T.border,borderRadius:12,padding:14,marginBottom:10,background:T.surface2}}>
                <div style={{display:'flex',justifyContent:'space-between'}}><b style={{color:brand}}>OT-{o.ot_number}</b><span style={S.pill(estColor(o.estado))}>{o.estado}</span></div>
                <div style={{fontWeight:600,marginTop:6}}>{c.nombre}</div>
                <div style={{...S.sub,marginTop:2}}>{o.tipo} · {o.direccion||c.direccion||''}</div>
                <div style={{display:'flex',gap:8,marginTop:10}}>
                  <button onClick={function(){ parche(o,'Asignada'); }} style={{...S.btn(T.ok),flex:1,marginBottom:0}}>Aceptar</button>
                  <button onClick={function(){ setRechazoOt(o); setMotivo(''); setModal('rechazo'); }} style={{...S.btnO(T.danger),flex:1,marginBottom:0}}>Rechazar</button>
                </div>
              </div>);
          })}
        </div>) : null}
            {proxima? (
        <div style={{...S.card,border:'2px solid '+T.brand}}>
          <h4 style={{...S.h2,color:T.brand,margin:'0 0 6px'}}>📍 Próxima parada {proxima.ruta_orden?('#'+proxima.ruta_orden):''} {proxima.eta?('· ETA '+proxima.eta):''}</h4>
          <p style={{margin:0,fontWeight:700}}>{(cust[proxima.customer_id]||{}).nombre||'Cliente'}</p>
          <p style={{...S.sub,margin:'4px 0'}}>{proxima.direccion||(cust[proxima.customer_id]||{}).direccion||''}</p>
          <div style={{display:'flex',gap:8,marginTop:8}}>
            <a style={{...S.btnO(T.info),flex:1,textAlign:'center',textDecoration:'none',marginBottom:0}} href={'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(proxima.direccion||(cust[proxima.customer_id]||{}).direccion||'')} target="_blank">🗺 Ruta</a>
            <a style={{...S.btnO(T.ok),flex:1,textAlign:'center',textDecoration:'none',marginBottom:0}} href={'tel:'+String((cust[proxima.customer_id]||{}).telefono||'').replace(/[^\d+]/g,'')}>📞 Llamar</a>
            <button style={{...S.btn(T.brand),flex:1,marginBottom:0}} onClick={function(){ setSel(proxima.id); }}>Abrir OT</button>
          </div>
        </div>) : null}
      <h4 style={{...S.sub,fontWeight:700,margin:'4px 0 10px'}}>MIS ÓRDENES ACTIVAS</h4>
      {activas.map(function(o){
        var c=cust[o.customer_id]||{};
        return (
          <button key={o.id} onClick={function(){
            if(pendientes.length){ avisar('⚠ Acepta/rechaza tu ruta primero',T.warn); return; }
            setSel(o.id); setAnswers({}); setCupon(''); setCaja(''); setCajas(''); setCostos([]); setReps([]);
            setFirma(null); setManual(false); setFotoEtq(null); setGar({aplica:'',causa:''}); setCobro({tipo:'',medio:''});
            window.history.pushState({v:'d'},'');
          }} style={{...S.btnO(T.border),textAlign:'left',padding:14,color:T.text}}>
            <div style={{display:'flex',justifyContent:'space-between'}}><b style={{color:brand}}>OT-{o.ot_number}</b><span style={S.pill(estColor(o.estado))}>{o.estado}</span></div>
            <div style={{fontWeight:600,marginTop:6}}>{c.nombre||'Cliente'} · {o.tipo}</div>
                        <div style={{...S.sub,marginTop:2}}>{o.direccion||c.direccion||''}{o.ruta_orden?(' · #'+o.ruta_orden):''}{o.eta?(' · ETA '+o.eta):''}</div>
          </button>);
      })}
      {activas.length===0&&pendientes.length===0? <p style={S.sub}>Sin OTs activas.</p> : null}
      {modal==='rechazo'? (
        <div style={S.modal}><div style={S.modalCard}>
          <h3 style={{...S.h2,color:T.danger}}>Motivo del rechazo *</h3>
          <textarea style={{...S.input,minHeight:90}} value={motivo} onChange={function(e){setMotivo(e.target.value);}}/>
          <button onClick={confirmarRechazo} style={S.btn(T.danger)}>Confirmar</button>
          <button onClick={function(){setModal(null);}} style={S.btnO(T.muted)}>Cancelar</button>
        </div></div>) : null}
      {modal==='salir'? (
        <div style={S.modal}><div style={S.modalCard}>
          <h3 style={S.h2}>¿Cerrar sesión?</h3>
          <button onClick={async function(){ await supabase.auth.signOut(); setUser(null); setSel(null); }} style={S.btn(T.danger)}>Sí, salir</button>
          <button onClick={function(){setModal(null);}} style={S.btnO(T.ok)}>Continuar</button>
        </div></div>) : null}
    </main>);

  return (
    <main style={{...S.main,padding:16,maxWidth:600,margin:'0 auto',paddingBottom:70}}>
      {Toast}
      <button onClick={function(){ setSel(null); }} style={{...S.btnO(T.muted),width:'auto',padding:'8px 14px'}}>← Mis órdenes</button>
      <div style={{display:'flex',gap:6,margin:'12px 0'}}>
        {['Orden','Camino','Servicio','Cierre'].map(function(s,i){
          return <div key={s} style={{flex:1,textAlign:'center',padding:'8px 0',borderRadius:10,fontSize:12,fontWeight:800,background:i===paso?brand:(i<paso?T.ok:T.surface),color:i<=paso?'#fff':T.muted,border:'1px solid '+(i<=paso?'transparent':T.border)}}>{i+1}. {s}</div>;
        })}
      </div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
        <h2 style={{...S.h2,margin:0,color:brand}}>OT-{ot.ot_number}</h2>
        <span style={S.pill(estColor(ot.estado))}>{ot.estado}</span>
      </div>

      {paso===0? (
        <div>
          <div style={S.card}>
            <h4 style={{...S.h2,color:T.info}}>Cliente</h4>
            <p style={{margin:0,fontWeight:700}}>{cliente.nombre}</p>
            <p style={{...S.sub,margin:'4px 0'}}>RUT: {cliente.rut||'—'}</p>
            <p style={{...S.sub,margin:'2px 0'}}>{ot.direccion||cliente.direccion} · {regs[cliente.region_id]||''}</p>
            <div style={{display:'flex',gap:8,marginTop:10}}>
              <a style={{...S.btnO(T.info),flex:1,textAlign:'center',textDecoration:'none',marginBottom:0}} href={'tel:'+String(cliente.telefono||'').replace(/[^\d+]/g,'')}>Llamar</a>
              <a style={{...S.btnO(T.ok),flex:1,textAlign:'center',textDecoration:'none',marginBottom:0}} href={'https://wa.me/'+String(cliente.telefono||'').replace(/[^\d+]/g,'')} target="_blank">WhatsApp</a>
              <a style={{...S.btnO(T.warn),flex:1,textAlign:'center',textDecoration:'none',marginBottom:0}} href={'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(ot.direccion||cliente.direccion||'')} target="_blank">Ruta</a>
            </div>
          </div>
          <div style={S.card}>
            <h4 style={{...S.h2,color:T.info}}>Servicio</h4>
            <p style={{margin:0,fontWeight:600}}>{ot.tipo} · prioridad {ot.prioridad}</p>
            <p style={{...S.sub,margin:'8px 0 0'}}>{ot.descripcion}</p>
          </div>
          <div style={S.card}>
            <h4 style={{...S.h2,color:T.teal}}>Checklist asignado</h4>
            <p style={{fontWeight:700}}>{(checks.find(function(c){return c.code===(ot.checklist_code||defaultByType(ot.tipo));})||{}).nombre||'—'}</p>
            <p style={{...S.sub,margin:0}}>{grupos.length} bloques · se habilita al iniciar servicio.</p>
          </div>
        </div>) : null}

      {paso===1? (
        <div>
          {(ot.estado==='Asignada'||ot.estado==='Aceptada')? <button onClick={function(){ enCamino(ot); }} style={S.btn(brand)}>🚐 En camino (avisa al cliente)</button> : null}
          {ot.estado==='En Ruta'? <button onClick={function(){ confirmarLlegada(ot); }} style={S.btn(T.teal)}>📍 Confirmar llegada</button> : null}
          {ot.estado==='Llegada'? <button onClick={function(){ parche(ot,'Trabajando'); }} style={S.btn(T.warn)}>🔧 Iniciar servicio</button> : null}
        </div>) : null}

      {paso===2? (
        <div>
          <div style={S.card}>
            <h4 style={{...S.h2,color:T.info}}>Garantía y cobro</h4>
            <label style={S.label}>¿Aplica garantía?</label>
            <select style={S.input} value={gar.aplica} onChange={function(e){setGar({aplica:e.target.value,causa:''});}}>
              <option value="">Elegir…</option><option>Si</option><option>No</option>
            </select>
            {gar.aplica==='No'? (
              <div><label style={S.label}>Causa</label>
                <select style={S.input} value={gar.causa} onChange={function(e){setGar({aplica:gar.aplica,causa:e.target.value});}}>
                  <option value="">Elegir…</option><option>Desgaste prematuro</option><option>Daño por tercero</option><option>Falta de mantención</option><option>Garantía vencida</option>
                </select></div>) : null}
            <label style={S.label}>Cobro</label>
            <select style={S.input} value={cobro.tipo} onChange={function(e){setCobro({tipo:e.target.value,medio:''});}}>
              <option value="">Elegir…</option><option>Con cobro</option><option>Sin cobro</option><option>Garantía (no cobra)</option>
            </select>
            {cobro.tipo==='Con cobro'? (
              <div><label style={S.label}>Medio de pago</label>
                <select style={S.input} value={cobro.medio} onChange={function(e){setCobro({tipo:cobro.tipo,medio:e.target.value});}}>
                  <option value="">Elegir…</option><option>Efectivo</option><option>Transferencia</option>
                </select></div>) : null}
            <button onClick={function(){ setRepModal(true); }} style={S.btnO(T.warn)}>🔧 Añadir repuesto</button>
            {reps.map(function(r,i){ return <p key={i} style={{fontSize:13,margin:'4px 0'}}>• {r.pieza} · {r.gar==='si'?'Garantía':'No · '+r.just}</p>; })}
            {ot.estado==='Esperando Repuesto'? <button onClick={function(){ parche(ot,'Trabajando'); }} style={S.btnO(T.ok)}>▶ Reanudar</button> : null}
            <button onClick={function(){ setModal('repuesto'); }} style={{...S.btnO(T.warn),marginTop:6}}>📦 Solicitar repuesto (pausa)</button>
          </div>

          {grupos.map(function(g){
            return (
              <div key={g.code} style={S.card}>
                <h4 style={{...S.h2,color:T.teal}}>{g.nombre}</h4>
                {(g.items||[]).map(function(it,i){
                  var id=it.id||g.code+'_'+i;
                  var v=answers[id];
                  return (
                    <div key={id} style={{marginBottom:12}}>
                      <label style={S.label}>{it.l}{it.r?' *':''}</label>
                      {it.t==='sel'? (
                        <select style={S.input} value={v||''} onChange={function(e){ setAns(id,e.target.value); }}>
                          <option value="">Elegir…</option>
                          {(it.o||[]).map(function(o){ return <option key={o} value={o}>{o}</option>; })}
                        </select>)
                      : it.t==='foto'? (
                        <div>
                          <input type="file" accept="image/*" capture="environment" style={{...S.input,color:T.muted}} onChange={async function(e){
                            var u=await subirFoto(ot.id,e.target.files[0]);
                            if(u) setAns(id,(v||[]).concat([u]));
                          }}/>
                          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                            {(v||[]).map(function(u,k){ return <img key={k} src={u} style={{width:56,height:56,objectFit:'cover',borderRadius:8}}/>; })}
                          </div>
                        </div>)
                      : it.t==='num'? (
                        <input style={S.input} type="number" value={v||''} onChange={function(e){ setAns(id,e.target.value); }}/>)
                      : (
                        <input style={S.input} value={v||''} onChange={function(e){ setAns(id,e.target.value); }}/>)
                      }
                    </div>);
                })}
              </div>);
          })}

          <div style={S.card}>
            <h4 style={{...S.h2,color:T.warn}}>Costos en terreno</h4>
            {costos.map(function(c,i){ return <p key={i} style={{fontSize:14,margin:'2px 0'}}>{c.concepto}: {fmtCLP(c.monto)}</p>; })}
            <div style={{display:'flex',gap:6}}>
              <input style={{...S.input,flex:2}} placeholder="Concepto" value={nuevoCosto.concepto} onChange={function(e){setNuevoCosto({concepto:e.target.value,monto:nuevoCosto.monto});}}/>
              <input style={{...S.input,flex:1}} type="number" placeholder="$" value={nuevoCosto.monto} onChange={function(e){setNuevoCosto({concepto:nuevoCosto.concepto,monto:e.target.value});}}/>
            </div>
            <button style={S.btnO(T.muted)} onClick={function(){
              if(nuevoCosto.concepto&&nuevoCosto.monto){
                setCostos(costos.concat([{concepto:nuevoCosto.concepto,monto:Number(nuevoCosto.monto)}]));
                setNuevoCosto({concepto:'',monto:''});
              }
            }}>+ Agregar</button>
            <p style={{fontSize:14,margin:'4px 0'}}>Subtotal: {fmtCLP(subtotal)}</p>
            <p style={{fontSize:14,margin:'4px 0'}}>IVA 19%: {fmtCLP(iva)}</p>
            <p style={{color:T.ok,fontWeight:800,fontSize:16,margin:0}}>Total: {fmtCLP(total)}</p>
          </div>

          {esArmado? (
            <div style={S.card}>
              <h4 style={{...S.h2,color:T.danger}}>Antifraude (doble validación)</h4>
              {esVolumen? (
                <div>
                  <p style={{fontWeight:700}}>Cajas leídas: {leidas} / {expected}</p>
                  <label style={S.label}>Códigos de caja (coma)</label>
                  <input style={S.input} value={cajas} onChange={function(e){setCajas(e.target.value);}}/>
                  <button style={S.btnO(scanOn?T.danger:T.info)} onClick={function(){setScanOn(!scanOn);}}>{scanOn?'⏹ Detener':'📷 Escáner continuo'}</button>
                  {scanOn? <CamScan onCode={function(v){
                    var list=cajas.split(',').map(function(s){return s.trim();}).filter(Boolean);
                    if(list.indexOf(v)>=0){ if(navigator.vibrate)navigator.vibrate([90,40,90]); avisar('⛔ Duplicado',T.danger); }
                    else { if(navigator.vibrate)navigator.vibrate(120); setCajas(list.concat([v]).join(', ')); avisar('✔ '+v,T.ok); }
                  }}/> : null}
                </div>) : (
                <div><label style={S.label}>Código Caja *</label><input style={S.input} value={caja} onChange={function(e){setCaja(e.target.value);}}/></div>)}
              <label style={S.label}>Código Cupón *</label>
              <input style={S.input} value={cupon} onChange={function(e){setCupon(e.target.value);}} placeholder="BLI00003"/>
              <label style={{...S.label,display:'flex',gap:8,alignItems:'center'}}>
                <input type="checkbox" checked={manual} onChange={function(e){setManual(e.target.checked);}}/> Etiqueta ilegible → ingreso manual
              </label>
              {manual? (
                <div><label style={S.label}>Foto etiqueta dañada *</label>
                  <input type="file" accept="image/*" capture="environment" style={{...S.input,color:T.muted}} onChange={async function(e){ setFotoEtq(await subirFoto(ot.id,e.target.files[0])); }}/>
                  {fotoEtq? <img src={fotoEtq} style={{width:60,height:60,objectFit:'cover',borderRadius:8,marginTop:6}}/> : null}
                </div>) : null}
            </div>) : null}

          <div style={{marginBottom:12}}>
            <label style={S.label}>Firma del cliente *</label>
            <Firma onChange={setFirma}/>
          </div>
          <button onClick={finalizar} style={S.btn(T.ok)}>✅ Finalizar y enviar a Revisión QA</button>
        </div>) : null}

      {paso===3? (
        <div>
          <p style={{color:T.ok,fontWeight:700}}>Servicio completado · en Revisión QA.</p>
          <button onClick={pdf} style={S.btn(T.info)}>📄 Ver / guardar PDF</button>
          <a style={{...S.btnO(T.ok),display:'block',textAlign:'center',textDecoration:'none'}} href={'https://wa.me/'+String(cliente.telefono||'').replace(/[^\d+]/g,'')+'?text='+encodeURIComponent('Hola '+(cliente.nombre||'')+', su OT-'+ot.ot_number+' fue finalizada. Total: '+fmtCLP(total)+'.')} target="_blank">💬 Enviar comprobante</a>
        </div>) : null}

      {repModal? (
        <div style={S.modal}><div style={S.modalCard}>
          <h3 style={S.h2}>Añadir repuesto</h3>
          <input style={S.input} placeholder="Pieza requerida" value={rep.pieza} onChange={function(e){setRep({pieza:e.target.value,gar:rep.gar,just:rep.just});}}/>
          <label style={{...S.label,display:'flex',gap:8,alignItems:'center'}}>
            <input type="checkbox" checked={rep.gar==='si'} onChange={function(e){setRep({pieza:rep.pieza,gar:e.target.checked?'si':'no',just:''});}}/> ¿Aplica garantía?
          </label>
          {rep.gar==='no'? (
            <select style={S.input} value={rep.just} onChange={function(e){setRep({pieza:rep.pieza,gar:rep.gar,just:e.target.value});}}>
              <option value="">Justificación…</option>
              {JUST.map(function(j){ return <option key={j}>{j}</option>; })}
            </select>) : null}
          <button onClick={addRep} style={S.btn(T.ok)}>Agregar</button>
          <button onClick={function(){setRepModal(false);}} style={S.btnO(T.muted)}>Cancelar</button>
        </div></div>) : null}

      {modal==='repuesto'? (
        <div style={S.modal}><div style={S.modalCard}>
          <h3 style={{...S.h2,color:T.warn}}>Repuesto necesario</h3>
          <textarea style={{...S.input,minHeight:80}} value={rep.pieza} onChange={function(e){setRep({pieza:e.target.value,gar:rep.gar,just:rep.just});}} placeholder="Descripción"/>
          <button onClick={async function(){
            if(!rep.pieza.trim()){ avisar('⛔ Describe el repuesto',T.danger); return; }
            await supabase.from('ot_events').insert([{ot_id:ot.id,evento:'alerta_repuesto',detalle:{repuesto:rep.pieza,area:'Bodega'}}]);
            setModal(null);
            parche(ot,'Esperando Repuesto',{area_responsable:'Bodega'});
          }} style={S.btn(T.warn)}>Pausar y alertar</button>
          <button onClick={function(){setModal(null);}} style={S.btnO(T.muted)}>Cancelar</button>
        </div></div>) : null}

      {nps? (
        <div style={S.modal}><div style={S.modalCard}>
          <h3 style={S.h2}>Encuesta al cliente *</h3>
          {[['p','Puntualidad'],['a','Atención'],['s','Solución']].map(function(k){
            return (
              <div key={k[0]} style={{marginBottom:10}}>
                <label style={S.label}>{k[1]}</label>
                <div>{[1,2,3,4,5].map(function(n){
                  return <span key={n} onClick={function(){
                    var o={p:nps.p,a:nps.a,s:nps.s,com:nps.com};
                    o[k[0]]=n;
                    setNps(o);
                  }} style={{fontSize:30,cursor:'pointer',color:n<=nps[k[0]]?T.warn:T.border,marginRight:6}}>★</span>;
                })}</div>
              </div>);
          })}
          <textarea style={{...S.input,minHeight:70}} placeholder="Comentario" value={nps.com} onChange={function(e){setNps({p:nps.p,a:nps.a,s:nps.s,com:e.target.value});}}/>
          <button onClick={function(){
            if(!nps.p||!nps.a||!nps.s){ avisar('⛔ 3 calificaciones obligatorias',T.danger); return; }
            enviarNps();
          }} style={S.btn(T.ok)}>Enviar</button>
        </div></div>) : null}
    </main>);
}
