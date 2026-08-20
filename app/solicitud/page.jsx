'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

var SVC_SHORT={'ARMADO':'ARM','GARANTIA':'GAR','POST VENTA':'POS'};
var FAM_ELECTRICAS=['BICICLETA ELECTRICA','SCOOTER ELECTRICO','TROTADORA'];
var FLOWS={
  final:{label:'ARMADO CLIENTE FINAL',svc:'ARMADO',boleta:true,compra:true,modelo:true,cantidad:false,lugar:false,falla:false,ot:false},
  retail:{label:'RETAIL/VOLUMEN',svc:'ARMADO',boleta:false,compra:false,modelo:false,cantidad:true,lugar:true,falla:false,ot:false},
  garantia:{label:'GARANTÍA',svc:'GARANTIA',boleta:true,compra:true,modelo:true,cantidad:false,lugar:false,falla:true,ot:true},
  post:{label:'POST GARANTÍA',svc:'POST VENTA',boleta:false,compra:false,modelo:true,cantidad:false,lugar:false,falla:true,ot:false}
};
var wrap={minHeight:'100vh',background:'#F4F6F8',fontFamily:"'Segoe UI',system-ui,Arial,sans-serif",display:'flex',flexDirection:'column'};
var header={background:'#141414',padding:'14px 20px'};
var mainS={flex:1,width:'100%',maxWidth:720,margin:'0 auto',padding:'28px 16px',boxSizing:'border-box'};
var h1={textAlign:'center',fontSize:24,fontWeight:900,color:'#141414',margin:'6px 0 4px',letterSpacing:.5};
var sub={textAlign:'center',color:'#5A6470',fontSize:13,margin:'0 0 22px',letterSpacing:.3};
var lab={display:'block',fontSize:11,fontWeight:700,color:'#3A4450',margin:'0 0 5px',letterSpacing:.6,textTransform:'uppercase'};
var inp={width:'100%',boxSizing:'border-box',padding:'11px 16px',borderRadius:999,border:'1px solid #C9CFD6',background:'#fff',fontSize:14,marginBottom:12,color:'#141414',outline:'none',letterSpacing:.2};
var attBox={border:'1.5px dashed #B9C2CC',borderRadius:16,padding:'10px 16px',background:'#fff',marginBottom:12};
var btn={display:'inline-block',background:'#3EC6B2',color:'#fff',border:0,borderRadius:999,padding:'12px 26px',fontWeight:800,fontSize:13,cursor:'pointer',letterSpacing:.8,textTransform:'uppercase'};
var btnO={display:'inline-block',background:'#fff',color:'#141414',border:'1.5px solid #C9CFD6',borderRadius:999,padding:'11px 22px',fontWeight:700,fontSize:12,cursor:'pointer',letterSpacing:.6,textTransform:'uppercase',textDecoration:'none',marginRight:8};
var footer={background:'#141414',color:'#fff',textAlign:'center',padding:'18px 12px 26px'};
function chan(on){ return {flex:'1 1 46%',textAlign:'center',padding:'12px 6px',borderRadius:999,border:on?'0':'1.5px solid #C9CFD6',background:on?'#3EC6B2':'#fff',color:on?'#fff':'#333',fontWeight:800,fontSize:12,cursor:'pointer',marginBottom:10,letterSpacing:.6}; }
function UP(v){ return String(v||'').toUpperCase(); }

export default function Solicitud(){
  var [flow,setFlow]=useState(null);
  var [regs,setRegs]=useState([]); var [coms,setComs]=useState([]); var [lugs,setLugs]=useState([]);
  var [fams,setFams]=useState([]); var [prods,setProds]=useState([]); var [sla,setSla]=useState([]);
  var [f,setF]=useState({nombre:'',rut:'',direccion:'',comuna:'',region_id:'',telefono:'',mail:'',boleta:'',fecha_compra:'',tienda:'',tipo_producto:'',modelo:'',cantidad:1,lugar:'',lugar_id:'',falla:'',ot_inicial:''});
  var [boletaFile,setBoletaFile]=useState(null); var [fallaFiles,setFallaFiles]=useState([]); var [otFile,setOtFile]=useState(null);
  var [done,setDone]=useState(null); var [busy,setBusy]=useState(false); var [err,setErr]=useState('');

  useEffect(function(){ (async function(){
    var r=await Promise.all([
      supabase.from('regions').select('*').order('id'),
      supabase.from('comunas').select('*').order('nombre'),
      supabase.from('lugares').select('*').order('nombre'),
      supabase.from('product_families').select('*').order('id'),
      supabase.from('product_catalog').select('*'),
      supabase.from('sla_matrix').select('*')
    ]);
    setRegs(r[0].data||[]); setComs(r[1].data||[]); setLugs(r[2].data||[]);
    setFams(r[3].data||[]); setProds(r[4].data||[]); setSla(r[5].data||[]);
  })(); },[]);

  function set(k,v){ setF(function(o){ var n=Object.assign({},o); n[k]=v; return n; }); }
  function setU(k,v){ setF(function(o){ var n=Object.assign({},o); n[k]=UP(v); return n; }); }
  var C=flow?FLOWS[flow]:null;
  var fam=null; fams.forEach(function(x){ if(x.id===Number(f.tipo_producto)) fam=x; });
  var electrica=fam?FAM_ELECTRICAS.indexOf(fam.name)>=0:false;
  var tipoEq=fam?(electrica&&fam.tipo==='BICICLETA'?'BICICLETA ELECTRICA':electrica&&fam.tipo==='SCOOTER'?'SCOOTER ELECTRICO':fam.tipo):'';
  var mod=Number(f.cantidad)>1?'VOL':(tipoEq==='MAQUINA'?(electrica?'ME':'MC'):(tipoEq==='BICICLETA ELECTRICA'||tipoEq==='SCOOTER ELECTRICO'?'BE':'BU'));
  var ck='CK-'+(SVC_SHORT[C?C.svc:'ARMADO']||'REP')+'-'+mod;
  var slaRow=null; if(C) sla.forEach(function(x){ if(x.tipo_servicio===C.svc&&x.tipo_equipo===tipoEq) slaRow=x; });
  var slaDias=(slaRow&&slaRow.dias)||15;
  var promesa=new Date(Date.now()+slaDias*86400000).toISOString().slice(0,10);
  var comunasDe=coms.filter(function(c){ return c.region_id===Number(f.region_id); });
  var lugaresDe=lugs.filter(function(l){ return l.activo!==false&&(!f.region_id||!l.region_id||l.region_id===Number(f.region_id)); });
  var modelos=prods.filter(function(p){ return p.family_id===Number(f.tipo_producto); });

  async function up(file,pref){
    if(!file) return null;
    var path=pref+'-'+Date.now()+'-'+file.name;
    var u=await supabase.storage.from('portal_fotos').upload(path,file);
    if(u.error) return null;
    return supabase.storage.from('portal_fotos').getPublicUrl(path).data.publicUrl;
  }

  async function enviar(){
    setErr('');
    if(!f.nombre) return setErr('NOMBRE / RAZÓN SOCIAL ES OBLIGATORIO.');
    if(!f.rut) return setErr('RUT ES OBLIGATORIO.');
    if(!f.region_id||!f.comuna||!f.direccion) return setErr('DIRECCIÓN, COMUNA Y REGIÓN SON OBLIGATORIOS.');
    if(!f.telefono||!f.mail) return setErr('TELÉFONO Y MAIL SON OBLIGATORIOS.');
    if(!f.tipo_producto) return setErr('TIPO DE PRODUCTO ES OBLIGATORIO.');
    if(C.modelo&&!f.modelo) return setErr('MODELO DEL PRODUCTO ES OBLIGATORIO.');
    if(C.boleta&&!f.boleta) return setErr('N° DE BOLETA ES OBLIGATORIO.');
    if(C.compra&&(!f.fecha_compra||!f.tienda)) return setErr('FECHA Y TIENDA DE COMPRA SON OBLIGATORIOS.');
    if(C.cantidad&&(!Number(f.cantidad)||Number(f.cantidad)<1)) return setErr('CANTIDAD DE PRODUCTOS ES OBLIGATORIA.');
    if(C.lugar&&!f.lugar) return setErr('INDICA DÓNDE SE DEBE REALIZAR EL SERVICIO.');
    if(C.falla&&!f.falla) return setErr('DESCRIBE EL DETALLE DE LA FALLA.');
    setBusy(true);
    var boletaUrl=await up(boletaFile,'boleta');
    var fallaUrls=[]; for(var i=0;i<fallaFiles.length;i++){ var u=await up(fallaFiles[i],'falla'); if(u) fallaUrls.push(u); }
    var otUrl=await up(otFile,'ot');
    var ci=await supabase.from('customers').upsert([{tenant_id:'dcg',nombre:f.nombre,rut:f.rut,tipo:flow==='retail'?'retail':'final',telefono:f.telefono,email:f.mail,region_id:Number(f.region_id),comuna:f.comuna,direccion:f.direccion}],{onConflict:'rut'}).select();
    var cid=ci.data&&ci.data[0]?ci.data[0].id:null;
    if(!cid){ setErr('NO SE PUDO CREAR EL CLIENTE.'); setBusy(false); return; }
    var num='S_'+Date.now().toString().slice(-5);
    var wi=await supabase.from('work_orders').insert([{
      tenant_id:'dcg',ext_id:num,ot_number:num,customer_id:cid,
      tipo:C.svc==='ARMADO'?(flow==='retail'?'armado_volumen':'armado_unidad'):C.svc==='GARANTIA'?'repuesto_garantia':'servicio',
      tipo_equipo:tipoEq||null,modalidad:mod,estado:'Ingresada',canal:'publico',prioridad:'media',
      descripcion:f.falla||('SOLICITUD '+C.label),
      region_id:Number(f.region_id),comuna:f.comuna,direccion:f.direccion,
      lugar_tipo:f.lugar||null,lugar_id:f.lugar_id?Number(f.lugar_id):null,
      modelo:f.modelo||null,modelo_limpio:String(f.modelo||'').replace(/[\s.-]/g,'').toUpperCase()||null,
      cantidad_unidades:Number(f.cantidad)||1,checklist_code:ck,fecha_promesa:promesa,quien_registra:'portal',
      datos_portal:{flujo:flow,boleta:f.boleta||null,boleta_url:boletaUrl,fecha_compra:f.fecha_compra||null,tienda:f.tienda||null,
        producto:fam?fam.name:null,modelo_ot:f.modelo||null,cantidad:Number(f.cantidad)||1,lugar:f.lugar||null,
        falla:f.falla||null,falla_urls:fallaUrls,ot_inicial:f.ot_inicial||null,ot_inicial_url:otUrl},
      kpi:{tipo_servicio:C.svc,tipo_equipo:tipoEq}
    }]).select();
    if(wi.error){ setErr(wi.error.message); setBusy(false); return; }
    await supabase.from('notifications').insert([{rol_destino:'agente',tipo:'solicitud_portal',titulo:'NUEVA SOLICITUD '+C.label+' · '+num,ot_id:wi.data[0].id}]);
    setBusy(false); setDone(num);
  }

  return (
    <div style={wrap}>
      <div style={header}><span style={{color:'#fff',fontWeight:900,fontSize:22,letterSpacing:1.2}}>BIANCHI</span></div>
      <div style={mainS}>
        <h1 style={h1}>SERVICIO TÉCNICO BIANCHI</h1>
        <p style={sub}>TU BIANCHI LISTA PARA USAR</p>
        <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:16}}>
          {Object.keys(FLOWS).map(function(k){ return <button key={k} style={chan(flow===k)} onClick={function(){ setFlow(k); setErr(''); }}>{FLOWS[k].label}</button>; })}
        </div>

        {!flow? <p style={{textAlign:'center',color:'#5A6470',fontSize:13,padding:'18px 0'}}>PRESIONA UN TIPO DE SOLICITUD PARA DESPLEGAR EL FORMULARIO.</p> : null}

        {flow? <div>
          <button style={btnO} onClick={function(){ setFlow(null); }}>← CAMBIAR CANAL</button>
          <div style={{height:10}}/>
          <label style={lab}>{flow==='retail'?'RAZÓN SOCIAL / TIENDA *':'NOMBRE COMPLETO / RAZÓN SOCIAL *'}</label>
          <input style={inp} value={f.nombre} onChange={function(e){ setU('nombre',e.target.value); }}/>
          <label style={lab}>RUT *</label>
          <input style={inp} value={f.rut} onChange={function(e){ setU('rut',e.target.value); }}/>
          <label style={lab}>REGIÓN *</label>
          <select style={inp} value={f.region_id} onChange={function(e){ set('region_id',e.target.value); set('comuna',''); set('lugar_id',''); }}>
            <option value="">SELECCIONA UNA REGIÓN</option>
            {regs.map(function(r){ return <option key={r.id} value={r.id}>{r.nombre.toUpperCase()}</option>; })}
          </select>
          <label style={lab}>COMUNA *</label>
          <select style={inp} value={f.comuna} onChange={function(e){ set('comuna',e.target.value); }} disabled={!f.region_id}>
            <option value="">{f.region_id?'SELECCIONA UNA COMUNA':'PRIMERO SELECCIONA UNA REGIÓN'}</option>
            {comunasDe.map(function(c){ return <option key={c.id} value={c.nombre}>{c.nombre.toUpperCase()}</option>; })}
          </select>
          <label style={lab}>DIRECCIÓN (CALLE Y NÚMERO) *</label>
          <input style={inp} value={f.direccion} onChange={function(e){ setU('direccion',e.target.value); }}/>
          <label style={lab}>TELÉFONO *</label>
          <input style={inp} value={f.telefono} onChange={function(e){ set('telefono',e.target.value); }}/>
          <label style={lab}>MAIL *</label>
          <input style={inp} type="email" value={f.mail} onChange={function(e){ set('mail',e.target.value); }}/>

          <label style={lab}>TIPO DE PRODUCTO *</label>
          <select style={inp} value={f.tipo_producto} onChange={function(e){ set('tipo_producto',e.target.value); }}>
            <option value="">SELECCIONA TIPO DE PRODUCTO</option>
            {fams.map(function(x){ return <option key={x.id} value={x.id}>{x.name.toUpperCase()} ({x.tipo})</option>; })}
          </select>
          {C.modelo? <div>
            <label style={lab}>MODELO O SKU DEL PRODUCTO *</label>
            <input style={inp} list="lista-modelos" value={f.modelo} onChange={function(e){ setU('modelo',e.target.value); }}/>
            <datalist id="lista-modelos">{modelos.map(function(p){ return <option key={p.id} value={p.model}/>; })}</datalist>
          </div> : null}
          {C.cantidad? <div>
            <label style={lab}>CANTIDAD DE PRODUCTOS *</label>
            <input style={inp} type="number" min="1" value={f.cantidad} onChange={function(e){ set('cantidad',e.target.value); }}/>
          </div> : null}

          {C.boleta? <div>
            <label style={lab}>NÚMERO DE BOLETA / FACTURA *</label>
            <input style={inp} value={f.boleta} onChange={function(e){ setU('boleta',e.target.value); }}/>
          </div> : null}
          {C.compra? <div>
            <label style={lab}>FECHA DE COMPRA *</label>
            <input style={inp} type="date" value={f.fecha_compra} onChange={function(e){ set('fecha_compra',e.target.value); }}/>
            <label style={lab}>TIENDA DE COMPRA *</label>
            <input style={inp} value={f.tienda} onChange={function(e){ setU('tienda',e.target.value); }}/>
          </div> : null}

          {C.lugar? <div>
            <label style={lab}>¿DÓNDE SE DEBE REALIZAR EL SERVICIO? *</label>
            <select style={inp} value={f.lugar} onChange={function(e){ set('lugar',e.target.value); set('lugar_id',''); }}>
              <option value="">SELECCIONA…</option>
              <option value="bodega">BODEGA / TIENDA PROPIA</option>
              <option value="taller">TALLER CENTRAL BIANCHI</option>
              <option value="lugar">MALL / PUNTO DE VENTA</option>
            </select>
            {f.lugar==='lugar'? <select style={inp} value={f.lugar_id} onChange={function(e){ set('lugar_id',e.target.value); }}>
              <option value="">— SELECCIONA MALL / TIENDA —</option>
              {lugaresDe.map(function(l){ return <option key={l.id} value={l.id}>{l.nombre.toUpperCase()}{l.comuna?' · '+l.comuna.toUpperCase():''}</option>; })}
            </select> : null}
          </div> : null}

          {C.falla? <div>
            <label style={lab}>DETALLE DE FALLA *</label>
            <textarea style={Object.assign({},inp,{borderRadius:18,minHeight:90})} value={f.falla} onChange={function(e){ setU('falla',e.target.value); }}/>
          </div> : null}
          {C.ot? <div>
            <label style={lab}>ORDEN DE TRABAJO DEL ARMADO INICIAL</label>
            <input style={inp} value={f.ot_inicial} onChange={function(e){ setU('ot_inicial',e.target.value); }}/>
          </div> : null}

          {C.boleta? <div style={attBox}>
            <label style={lab}>ADJUNTAR BOLETA (PDF, JPG, PNG)</label>
            <input type="file" accept=".pdf,image/*" onChange={function(e){ setBoletaFile(e.target.files[0]||null); }}/>
          </div> : null}
          {C.falla? <div style={attBox}>
            <label style={lab}>ADJUNTAR FOTOS / VIDEOS DE LA FALLA</label>
            <input type="file" accept="image/*,video/*" multiple onChange={function(e){ setFallaFiles(Array.prototype.slice.call(e.target.files||[])); }}/>
          </div> : null}
          {C.ot? <div style={attBox}>
            <label style={lab}>ADJUNTAR OT INICIAL (PDF, JPG, PNG)</label>
            <input type="file" accept=".pdf,image/*" onChange={function(e){ setOtFile(e.target.files[0]||null); }}/>
          </div> : null}

          <p style={{fontSize:11,color:'#666',margin:'0 0 12px'}}>TODOS LOS CAMPOS MARCADOS CON (*) SON OBLIGATORIOS.</p>
          {err? <p style={{color:'#B91C1C',fontWeight:800,fontSize:13}}>{err}</p> : null}
          <button style={btn} disabled={busy} onClick={enviar}>{busy?'ENVIANDO…':'ENVIAR SOLICITUD'}</button>
        </div> : null}

        {done? <div style={{textAlign:'center',padding:'26px 0'}}>
          <h1 style={h1}>✅ SOLICITUD RECIBIDA</h1>
          <p style={{...sub,margin:'8px 0 18px'}}>TU ORDEN ES <b style={{color:'#0E8074'}}>{done}</b> · PROMESA DE ATENCIÓN: <b>{promesa}</b>.<br/>TU CASO YA FUE NOTIFICADO AL EQUIPO DE SERVICIO.</p>
          <a href="/seguimiento" style={btn}>🔎 SEGUIMIENTO DE MI CASO</a>
          <button style={Object.assign({},btnO,{marginLeft:8})} onClick={function(){ setDone(null); setFlow(null); setF({nombre:'',rut:'',direccion:'',comuna:'',region_id:'',telefono:'',mail:'',boleta:'',fecha_compra:'',tienda:'',tipo_producto:'',modelo:'',cantidad:1,lugar:'',lugar_id:'',falla:'',ot_inicial:''}); }}>NUEVA SOLICITUD</button>
        </div> : null}
      </div>
      <div style={footer}>
        <p style={{margin:'0 0 6px',fontWeight:800,letterSpacing:.5}}>NO TE PIERDAS LAS NOVEDADES</p>
        <p style={{margin:0,fontSize:11,color:'#9fb3af'}}>© 2026 BIANCHI STORE. TODOS LOS DERECHOS RESERVADOS.</p>
      </div>
    </div>
  );
}
