'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S } from '../ui';
import Mapa from './Mapa';
import { geocode } from './geo';

function defaultByType(t){
  var x=(t||'').toLowerCase();
  if(x.indexOf('volumen')>=0) return 'CK-ARM-VOL-BICI';
  if(x.indexOf('armado')>=0) return 'CK-ARM-BICI';
  if(x.indexOf('garantia')>=0) return 'CK-EVAL-GARANTIA';
  if(x.indexOf('retiro')>=0) return 'CK-RETIRO';
  if(x.indexOf('manten')>=0) return 'CK-MANT-ELEC';
  return 'CK-REP-CONV';
}

export default function ModNuevaOT(props){
  var avisar=props.avisar||function(){};
  var onOk=props.onOk||function(){};
  var s1=useState(1),paso=s1[0],setPaso=s1[1];
  var s2=useState([]),cust=s2[0],setCust=s2[1];
  var s3=useState([]),acts=s3[0],setActs=s3[1];
  var s4=useState([]),fams=s4[0],setFams=s4[1];
  var s5=useState([]),sats=s5[0],setSats=s5[1];
  var s6=useState([]),users=s6[0],setUsers=s6[1];
  var s7=useState([]),cov=s7[0],setCov=s7[1];
  var s8=useState([]),ots=s8[0],setOts=s8[1];
  var s9=useState([]),regs=s9[0],setRegs=s9[1];
  var s10=useState([]),tipos=s10[0],setTipos=s10[1];
  var s11=useState([]),paqs=s11[0],setPaqs=s11[1];
  var s12=useState(''),paq=s12[0],setPaq=s12[1];
  var s13=useState({customer_id:'',asset_id:'',tipo:'servicio',prioridad:'media',direccion:'',descripcion:'',fecha:'',asig_tipo:'',asig_id:''}),f=s13[0],setF=s13[1];
  var s14=useState({nombre:'',rut:'',telefono:''}),nc=s14[0],setNc=s14[1];
  var s15=useState({serial:'',model:'',family_id:'',store:'',warranty_until:''}),na=s15[0],setNa=s15[1];
  var s16=useState(false),mapOpen=s16[0],setMapOpen=s16[1];
  var s17=useState([]),mapMk=s17[0],setMapMk=s17[1];

  async function cargar(){
    var r=await Promise.all([
      supabase.from('customers').select('*').order('nombre').limit(400),
      supabase.from('assets').select('*').limit(400),
      supabase.from('product_families').select('*'),
      supabase.from('companies').select('*').eq('tipo','sat'),
      supabase.from('users').select('*'),
      supabase.from('company_coverage').select('*'),
      supabase.from('work_orders').select('id,estado,asignado_user_id,asignado_company_id').limit(500),
      supabase.from('regions').select('*'),
      supabase.from('settings').select('valor').eq('clave','tipos_ot').single(),
      supabase.from('paquetes').select('*')
    ]);
    setCust(r[0].data||[]); setActs(r[1].data||[]); setFams(r[2].data||[]); setSats(r[3].data||[]);
    setUsers(r[4].data||[]); setCov(r[5].data||[]); setOts(r[6].data||[]); setRegs(r[7].data||[]);
    setTipos(Array.isArray(r[8].data&&r[8].data.valor)?r[8].data.valor:['servicio','armado_unidad','armado_volumen','mantencion','retiro','evaluacion']);
    setPaqs(r[9].data||[]);
  }
  useEffect(function(){ cargar(); },[]);

  var cliente=cust.find(function(c){ return c.id===Number(f.customer_id); })||null;
  var activos=acts.filter(function(a){ return a.customer_id===Number(f.customer_id); });
  var region=cliente?cliente.region_id:null;
  var carga={};
  ots.forEach(function(o){
    if(['Cerrada','Anulada','Rechazada'].indexOf(o.estado)>=0) return;
    var k=o.asignado_company_id?('s'+o.asignado_company_id):(o.asignado_user_id?('u'+o.asignado_user_id):null);
    if(k) carga[k]=(carga[k]||0)+1;
  });
  var famSel=acts.find(function(a){ return a.id===Number(f.asset_id); })||{};
  var famCode=(fams.find(function(x){ return x.id===famSel.family_id; })||{}).code||null;
  var espReq=(famCode==='FP003'||famCode==='FP004')?'fitness':((famCode==='FP001'||famCode==='FP002')?'bici':null);
  var sugeridos=sats.filter(function(s){ return s.activo&&cov.some(function(c){ return c.company_id===s.id&&c.region_id===region; }); })
    .map(function(s){ return {t:'sat',id:s.id,n:s.nombre,esp:s.especialidad,c:carga['s'+s.id]||0,ok:!espReq||s.especialidad==='ambos'||s.especialidad===espReq}; })
    .concat(users.filter(function(u){ return u.rol==='tecnico_sat'; }).map(function(u){ return {t:'tec',id:u.id,n:u.nombre,esp:null,c:carga['u'+u.id]||0,ok:true}; }))
    .sort(function(a,b){ return (b.ok?1:0)-(a.ok?1:0)||a.c-b.c; }).slice(0,4);

  async function crearCliente(){
    if(!nc.nombre){ avisar('⛗ Nombre obligatorio',T.danger); return; }
    var d=await supabase.from('customers').insert([{nombre:nc.nombre,rut:nc.rut||null,telefono:nc.telefono||null,tipo:'final',region_id:region||null}]).select();
    if(d.error) avisar('⛗ '+d.error.message,T.danger);
    else { avisar('✅ Cliente creado',T.ok); setNc({nombre:'',rut:'',telefono:''}); await cargar(); setF(Object.assign({},f,{customer_id:String(d.data[0].id)})); }
  }
  async function crearActivo(){
    if(!na.serial&&!na.model){ avisar('⛗ Serie o modelo obligatorio',T.danger); return; }
    var d=await supabase.from('assets').insert([{customer_id:Number(f.customer_id),family_id:Number(na.family_id)||null,serial:na.serial,model:na.model,store:na.store,warranty_until:na.warranty_until||null}]);
    if(d.error) avisar('⛗ '+d.error.message,T.danger);
    else { avisar('✅ Activo registrado',T.ok); setNa({serial:'',model:'',family_id:'',store:'',warranty_until:''}); await cargar(); }
  }
  async function verMapa(){
    var dir=f.direccion||(cliente?cliente.direccion:'');
    if(!dir){ avisar('⛗ Sin dirección',T.danger); return; }
    var g=await geocode(dir);
    setMapMk(g?[{lat:g.lat,lng:g.lng,popup:dir}]:[]);
    setMapOpen(true);
  }
  function elegirPaquete(id){
    setPaq(id);
    var p=paqs.find(function(x){ return String(x.id)===id; });
    if(p) setF(Object.assign({},f,{descripcion:'PAQUETE: '+p.nombre+' · '+p.horas+' h · '+(p.tareas||[]).map(function(t){ return t.t; }).join(', ')}));
  }
  async function crear(){
    var patch={
      customer_id:Number(f.customer_id),
      tipo:f.tipo, prioridad:f.prioridad, canal:'interno', estado:'Ingresada',
      region_id:region,
      direccion:f.direccion||(cliente?cliente.direccion:null),
      descripcion:f.descripcion||('OT '+f.tipo),
      checklist_code:defaultByType(f.tipo),
      asset_id:f.asset_id?Number(f.asset_id):null,
      fecha_programada:f.fecha||null,
      paquete_id:paq?Number(paq):null
    };
    if(f.asig_tipo==='sat'){ patch.asignado_company_id=Number(f.asig_id); patch.estado='Asignada'; }
    if(f.asig_tipo==='tec'){ patch.asignado_user_id=Number(f.asig_id); patch.estado='Asignada'; }
    var d=await supabase.from('work_orders').insert([patch]).select();
    if(d.error) avisar('⛗ '+d.error.message,T.danger);
    else {
      avisar('✅ OT-'+d.data[0].ot_number+' creada'+(patch.estado==='Asignada'?' y asignada':' en ruta del día'),T.ok);
      onOk();
      setF({customer_id:'',asset_id:'',tipo:'servicio',prioridad:'media',direccion:'',descripcion:'',fecha:'',asig_tipo:'',asig_id:''});
      setPaq(''); setPaso(1);
    }
  }

  return (
    <div style={S.card}>
      <h2 style={S.h2}>Nueva OT · asistente</h2>
      <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
        {['Cliente','Activo','Servicio','Asignación','Confirmar'].map(function(l,i){
          return <div key={l} style={{padding:'6px 12px',borderRadius:999,fontSize:12,fontWeight:800,background:paso===i+1?T.brand:(paso>i+1?T.ok:T.surface),color:paso<=i+1?'#0B1220':T.sub,border:'1px solid '+(paso<=i+1?'transparent':T.border)}}>{i+1}·{l}</div>;
        })}
      </div>

      {paso===1? <div>
        <label style={S.label}>Cliente *</label>
        <select style={S.input} value={f.customer_id} onChange={function(e){ setF(Object.assign({},f,{customer_id:e.target.value})); }}>
          <option value="">Elegir…</option>
          {cust.map(function(c){ return <option key={c.id} value={c.id}>{c.nombre} · {c.rut||''}</option>; })}
        </select>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <input style={{...S.input,flex:2,marginBottom:0}} placeholder="Nuevo cliente: nombre" value={nc.nombre} onChange={function(e){ setNc({nombre:e.target.value,rut:nc.rut,telefono:nc.telefono}); }}/>
          <input style={{...S.input,flex:1,marginBottom:0}} placeholder="RUT" value={nc.rut} onChange={function(e){ setNc({nombre:nc.nombre,rut:e.target.value,telefono:nc.telefono}); }}/>
          <input style={{...S.input,flex:1,marginBottom:0}} placeholder="Teléfono" value={nc.telefono} onChange={function(e){ setNc({nombre:nc.nombre,rut:nc.rut,telefono:e.target.value}); }}/>
          <button style={{...S.btnO(T.info),width:'auto',marginBottom:0}} onClick={crearCliente}>+ Cliente</button>
        </div>
        <div style={{marginTop:12}}><button style={{...S.btn(T.info),width:'auto'}} disabled={!f.customer_id} onClick={function(){ setPaso(2); }}>Siguiente →</button></div>
      </div> : null}

      {paso===2? <div>
        <label style={S.label}>Activo / equipo (opcional)</label>
        <select style={S.input} value={f.asset_id} onChange={function(e){ setF(Object.assign({},f,{asset_id:e.target.value})); }}>
          <option value="">Sin activo (servicio general)</option>
          {activos.map(function(a){ return <option key={a.id} value={a.id}>{a.model||a.serial} · {a.serial||''}</option>; })}
        </select>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <input style={{...S.input,flex:1,marginBottom:0}} placeholder="N° serie" value={na.serial} onChange={function(e){ setNa({serial:e.target.value,model:na.model,family_id:na.family_id,store:na.store,warranty_until:na.warranty_until}); }}/>
          <input style={{...S.input,flex:1,marginBottom:0}} placeholder="Modelo" value={na.model} onChange={function(e){ setNa({serial:na.serial,model:e.target.value,family_id:na.family_id,store:na.store,warranty_until:na.warranty_until}); }}/>
          <select style={{...S.input,flex:1,marginBottom:0}} value={na.family_id} onChange={function(e){ setNa({serial:na.serial,model:na.model,family_id:e.target.value,store:na.store,warranty_until:na.warranty_until}); }}><option value="">Familia…</option>{fams.map(function(x){ return <option key={x.id} value={x.id}>{x.name}</option>; })}</select>
          <button style={{...S.btnO(T.info),width:'auto',marginBottom:0}} onClick={crearActivo}>+ Activo</button>
        </div>
        <div style={{display:'flex',gap:8,marginTop:12}}>
          <button style={{...S.btn(T.muted),width:'auto',marginBottom:0}} onClick={function(){ setPaso(1); }}>←</button>
          <button style={{...S.btn(T.info),width:'auto',marginBottom:0}} onClick={function(){ setPaso(3); }}>Siguiente →</button>
        </div>
      </div> : null}

      {paso===3? <div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <div style={{flex:1}}><label style={S.label}>Tipo de servicio</label>
            <select style={S.input} value={f.tipo} onChange={function(e){ setF(Object.assign({},f,{tipo:e.target.value})); }}>{tipos.map(function(t){ return <option key={t} value={t}>{t}</option>; })}</select></div>
          <div style={{flex:1}}><label style={S.label}>Prioridad</label>
            <select style={S.input} value={f.prioridad} onChange={function(e){ setF(Object.assign({},f,{prioridad:e.target.value})); }}><option>alta</option><option>media</option><option>baja</option></select></div>
        </div>
        <label style={S.label}>Paquete de servicio (opcional · autocompleta tareas/precio)</label>
        <select style={S.input} value={paq} onChange={function(e){ elegirPaquete(e.target.value); }}>
          <option value="">Sin paquete</option>
          {paqs.map(function(p){ return <option key={p.id} value={p.id}>{p.nombre} · {p.familia}</option>; })}
        </select>
        <label style={S.label}>Dirección (si difiere del cliente)</label>
        <input style={S.input} value={f.direccion} onChange={function(e){ setF(Object.assign({},f,{direccion:e.target.value})); }} placeholder={cliente?(cliente.direccion||''):''}/>
        <button type="button" style={{...S.btnO(T.info),width:'auto',marginBottom:10}} onClick={verMapa}>🗺 Ver ubicación en mapa</button>
        <label style={S.label}>Descripción / síntoma</label>
        <textarea style={{...S.input,minHeight:80}} value={f.descripcion} onChange={function(e){ setF(Object.assign({},f,{descripcion:e.target.value})); }}/>
        <p style={{...S.sub,margin:'0 0 10px'}}>Checklist automático: <b style={{color:T.teal}}>{defaultByType(f.tipo)}</b></p>
        <div style={{display:'flex',gap:8}}>
          <button style={{...S.btn(T.muted),width:'auto',marginBottom:0}} onClick={function(){ setPaso(2); }}>←</button>
          <button style={{...S.btn(T.info),width:'auto',marginBottom:0}} onClick={function(){ setPaso(4); }}>Siguiente →</button>
        </div>
      </div> : null}

      {paso===4? <div>
        <label style={S.label}>Asignación sugerida (región + especialidad + carga)</label>
        {sugeridos.map(function(s){
          return <button key={s.t+s.id} onClick={function(){ setF(Object.assign({},f,{asig_tipo:s.t,asig_id:String(s.id)})); }} style={{...S.btnO(f.asig_tipo===s.t&&f.asig_id===String(s.id)?T.ok:T.border),textAlign:'left',color:T.text}}>
            {s.ok?'★ ':''}{s.n} {s.esp? <span style={S.pill(T.teal)}>{s.esp}</span> : null} <span style={S.sub}>· carga {s.c}</span>
          </button>;
        })}
        <button onClick={function(){ setF(Object.assign({},f,{asig_tipo:'',asig_id:''})); }} style={{...S.btnO(T.sub),textAlign:'left',color:T.text}}>📥 Sin asignar (ruta del día del técnico)</button>
        <label style={S.label}>Fecha programada (opcional)</label>
        <input style={S.input} type="date" value={f.fecha} onChange={function(e){ setF(Object.assign({},f,{fecha:e.target.value})); }}/>
        <div style={{display:'flex',gap:8}}>
          <button style={{...S.btn(T.muted),width:'auto',marginBottom:0}} onClick={function(){ setPaso(3); }}>←</button>
          <button style={{...S.btn(T.info),width:'auto',marginBottom:0}} onClick={function(){ setPaso(5); }}>Siguiente →</button>
        </div>
      </div> : null}

      {paso===5? <div>
        <p style={{color:T.text,fontSize:15}}>Cliente: <b>{cliente?cliente.nombre:''}</b></p>
        <p style={S.sub}>Tipo {f.tipo} · prioridad {f.prioridad} · checklist {defaultByType(f.tipo)}</p>
        <p style={S.sub}>Asignación: {f.asig_tipo?((f.asig_tipo==='sat'?((sats.find(function(s){ return s.id===Number(f.asig_id); })||{}).nombre):((users.find(function(u){ return u.id===Number(f.asig_id); })||{}).nombre))):'ruta del día'} {f.fecha?('· '+f.fecha):''}</p>
        <div style={{display:'flex',gap:8,marginTop:10}}>
          <button style={{...S.btn(T.muted),width:'auto',marginBottom:0}} onClick={function(){ setPaso(4); }}>←</button>
          <button style={{...S.btn(T.ok),width:'auto',marginBottom:0}} onClick={crear}>✅ Crear OT</button>
        </div>
      </div> : null}

      {mapOpen? <div style={S.modal} onClick={function(){ setMapOpen(false); }}><div style={{...S.modalCard,maxWidth:700}} onClick={function(e){ e.stopPropagation(); }}><h3 style={S.h2}>Ubicación</h3><Mapa markers={mapMk}/><button style={S.btn(T.muted)} onClick={function(){ setMapOpen(false); }}>Cerrar</button></div></div> : null}
    </div>);
}
