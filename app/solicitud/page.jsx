'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

var SVC_SHORT={'ARMADO':'ARM','GARANTIA':'GAR','POST VENTA':'POS'};
var FAM_ELECTRICAS=['BICICLETA ELECTRICA','SCOOTER ELECTRICO','TROTADORA'];
var FLOWS={
  final:{label:'Armado Cliente Final',svc:'ARMADO',boleta:true,compra:true,modelo:true,cantidad:false,lugar:false,falla:false,ot:false},
  retail:{label:'Armado Retail / Volumen',svc:'ARMADO',boleta:false,compra:false,modelo:false,cantidad:true,lugar:true,falla:false,ot:false},
  garantia:{label:'Garantía',svc:'GARANTIA',boleta:true,compra:true,modelo:true,cantidad:false,lugar:false,falla:true,ot:true},
  post:{label:'Post Garantía',svc:'POST VENTA',boleta:false,compra:false,modelo:true,cantidad:false,lugar:false,falla:true,ot:false}
};
var wrap={minHeight:'100vh',background:'#F4F6F8',fontFamily:"'Segoe UI',system-ui,Arial,sans-serif",display:'flex',flexDirection:'column'};
var header={background:'#141414',padding:'14px 20px',display:'flex',alignItems:'center',gap:10};
var mainS={flex:1,width:'100%',maxWidth:680,margin:'0 auto',padding:'28px 16px',boxSizing:'border-box'};
var h1={textAlign:'center',fontSize:22,fontWeight:900,color:'#141414',margin:'6px 0 4px'};
var sub={textAlign:'center',color:'#5A6470',fontSize:13,margin:'0 0 20px'};
var inp={width:'100%',boxSizing:'border-box',padding:'11px 16px',borderRadius:999,border:'1px solid #C9CFD6',background:'#fff',fontSize:14,marginBottom:12,color:'#141414',outline:'none'};
var lab={fontSize:12,color:'#333',margin:'0 0 4px'};
var btn={display:'inline-block',background:'#3EC6B2',color:'#fff',border:0,borderRadius:999,padding:'12px 24px',fontWeight:700,fontSize:14,cursor:'pointer'};
var fileBox={width:'100%',boxSizing:'border-box',padding:'9px 16px',borderRadius:999,border:'1px solid #C9CFD6',background:'#fff',fontSize:13,marginBottom:12};
var infoBox={background:'#EDEFF2',borderRadius:14,padding:'10px 14px',fontSize:12,color:'#333',margin:'4px 0 14px'};
var footer={background:'#141414',color:'#fff',textAlign:'center',padding:'18px 12px 26px'};
function chan(on){ return {flex:'1 1 46%',textAlign:'center',padding:'11px 6px',borderRadius:999,border:on?'0':'1px solid #C9CFD6',background:on?'#3EC6B2':'#fff',color:on?'#fff':'#333',fontWeight:700,fontSize:12,cursor:'pointer',marginBottom:10}; }

export default function Solicitud(){
  var [flow,setFlow]=useState('final');
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
  var C=FLOWS[flow];
  var fam=null; fams.forEach(function(x){ if(x.id===Number(f.tipo_producto)) fam=x; });
  var electrica=fam?FAM_ELECTRICAS.indexOf(fam.name)>=0:false;
  var tipoEq=fam?(electrica&&fam.tipo==='BICICLETA'?'BICICLETA ELECTRICA':electrica&&fam.tipo==='SCOOTER'?'SCOOTER ELECTRICO':fam.tipo):'';
  var mod=Number(f.cantidad)>1?'VOL':(tipoEq==='MAQUINA'?(electrica?'ME':'MC'):(tipoEq==='BICICLETA ELECTRICA'||tipoEq==='SCOOTER ELECTRICO'?'BE':'BU'));
  var ck='CK-'+(SVC_SHORT[C.svc]||'REP')+'-'+mod;
  var slaRow=null; sla.forEach(function(x){ if(x.tipo_servicio===C.svc&&x.tipo_equipo===tipoEq) slaRow=x; });
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
    if(!f.nombre) return setErr('Nombre / razón social es obligatorio.');
    if(!f.rut) return setErr('RUT es obligatorio.');
    if(!f.region_id||!f.comuna||!f.direccion) return setErr('Dirección, comuna y región son obligatorios.');
    if(!f.telefono||!f.mail) return setErr('Teléfono y mail son obligatorios.');
    if(!f.tipo_producto) return setErr('Tipo de producto es obligatorio.');
    if(C.modelo&&!f.modelo) return setErr('Modelo del producto es obligatorio.');
    if(C.boleta&&!f.boleta) return setErr('N° de boleta es obligatorio.');
    if(C.compra&&(!f.fecha_compra||!f.tienda)) return setErr('Fecha y tienda de compra son obligatorias.');
    if(C.cantidad&&(!Number(f.cantidad)||Number(f.cantidad)<1)) return setErr('Cantidad de productos es obligatoria.');
    if(C.lugar&&!f.lugar) return setErr('Indica dónde se debe realizar el servicio.');
    if(C.falla&&!f.falla) return setErr('Describe el detalle de la falla.');
    setBusy(true);
    var boletaUrl=await up(boletaFile,'boleta');
    var fallaUrls=[]; for(var i=0;i<fallaFiles.length;i++){ var u=await up(fallaFiles[i],'falla'); if(u) fallaUrls.push(u); }
    var otUrl=await up(otFile,'ot');
    var ci=await supabase.from('customers').upsert([{tenant_id:'dcg',nombre:f.nombre,rut:f.rut,tipo:flow==='retail'?'retail':'final',telefono:f.telefono,email:f.mail,region_id:Number(f.region_id),comuna:f.comuna,direccion:f.direccion}],{onConflict:'rut'}).select();
    var cid=ci.data&&ci.data[0]?ci.data[0].id:null;
    if(!cid){ setErr('No se pudo crear el cliente.'); setBusy(false); return; }
    var num='S_'+Date.now().toString().slice(-5);
    var wi=await supabase.from('work_orders').insert([{
      tenant_id:'dcg',ext_id:num,ot_number:num,customer_id:cid,
      tipo:C.svc==='ARMADO'?(flow==='retail'?'armado_volumen':'armado_unidad'):C.svc==='GARANTIA'?'repuesto_garantia':'servicio',
      tipo_equipo:tipoEq||null,modalidad:mod,estado:'Ingresada',canal:'publico',prioridad:'media',
      descripcion:f.falla||('Solicitud '+C.label),
      region_id:Number(f.region_id),comuna:f.comuna,direccion:f.direccion,
      lugar_tipo:f.lugar||null,lugar_id:f.lugar_id?Number(f.lugar_id):null,
      modelo:f.modelo||null,modelo_limpio:String(f.modelo||'').replace(/[\s.-]/g,'').toUpperCase()||null,
      cantidad_unidades:Number(f.cantidad)||1,checklist_code:ck,fecha_promesa:promesa,quien_registra:'portal',
      datos_portal:{flujo:flow,boleta:f.boleta||null,boleta_url:boletaUrl,fecha_compra:f.fecha_compra||null,tienda:f.tienda||null,
        producto:fam?fam.name:null,modelo_ot:f.modelo||null,cantidad:Number(f.cantidad)||1,lugar:f.lugar||null,
        falla:f.falla||null,falla_urls:fallaUrls,ot_inicial:f.ot_inicial||null,ot_inicial_url:otUrl},
      kpi:{tipo_servicio:C.svc,tipo_equipo:tipoEq}
    }]).select();
    setBusy(false);
    if(wi.error){ setErr(wi.error.message); return; }
    setDone(num);
  }

  return (
    <div style={wrap}>
      <div style={header}><span style={{color:'#fff',fontWeight:900,fontSize:22,letterSpacing:1}}>BIANCHI</span></div>
      <div style={mainS}>
        <h1 style={h1}>SERVICIO TÉCNICO BIANCHI</h1>
        <p style={sub}>Tu Bianchi lista para usar</p>
        <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:14}}>
          {Object.keys(FLOWS).map(function(k){ return <button key={k} style={chan(flow===k)} onClick={function(){ setFlow(k); setErr(''); }}>{FLOWS[k].label}</button>; })}
        </div>

        <input style={inp} placeholder={flow==='retail'?'Razón Social / Tienda *':'Nombre Completo / Razón Social *'} value={f.nombre} onChange={function(e){ set('nombre',e.target.value); }}/>
        <input style={inp} placeholder="RUT *" value={f.rut} onChange={function(e){ set('rut',e.target.value); }}/>
        <select style={inp} value={f.region_id} onChange={function(e){ set('region_id',e.target.value); set('comuna',''); set('lugar_id',''); }}>
          <option value="">Selecciona una región *</option>
          {regs.map(function(r){ return <option key={r.id} value={r.id}>{r.nombre}</option>; })}
        </select>
        <select style={inp} value={f.comuna} onChange={function(e){ set('comuna',e.target.value); }} disabled={!f.region_id}>
          <option value="">{f.region_id?'Selecciona una comuna *':'Primero selecciona una región'}</option>
          {comunasDe.map(function(c){ return <option key={c.id} value={c.nombre}>{c.nombre}</option>; })}
        </select>
        <input style={inp} placeholder="Dirección (Calle y Número) *" value={f.direccion} onChange={function(e){ set('direccion',e.target.value); }}/>
        <input style={inp} placeholder="Número de teléfono (ej: +56912345678) *" value={f.telefono} onChange={function(e){ set('telefono',e.target.value); }}/>
        <input style={inp} type="email" placeholder="Correo electrónico *" value={f.mail} onChange={function(e){ set('mail',e.target.value); }}/>

        <select style={inp} value={f.tipo_producto} onChange={function(e){ set('tipo_producto',e.target.value); }}>
          <option value="">Tipo de Producto *</option>
          {fams.map(function(x){ return <option key={x.id} value={x.id}>{x.name} ({x.tipo})</option>; })}
        </select>
        {C.modelo? <div>
          <input style={inp} list="lista-modelos" placeholder="Modelo o SKU del Producto *" value={f.modelo} onChange={function(e){ set('modelo',e.target.value); }}/>
          <datalist id="lista-modelos">{modelos.map(function(p){ return <option key={p.id} value={p.model}/>; })}</datalist>
        </div> : null}
        {C.cantidad? <input style={inp} type="number" min="1" placeholder="Cantidad de Productos *" value={f.cantidad} onChange={function(e){ set('cantidad',e.target.value); }}/> : null}

        {C.boleta? <div>
          <input style={inp} placeholder="Número de Boleta / Factura *" value={f.boleta} onChange={function(e){ set('boleta',e.target.value); }}/>
          <p style={lab}>Adjuntar Boleta (PDF, JPG, PNG)</p>
          <input style={fileBox} type="file" accept=".pdf,image/*" onChange={function(e){ setBoletaFile(e.target.files[0]||null); }}/>
        </div> : null}
        {C.compra? <div>
          <p style={lab}>Fecha de Compra *</p>
          <input style={inp} type="date" value={f.fecha_compra} onChange={function(e){ set('fecha_compra',e.target.value); }}/>
          <input style={inp} placeholder="Tienda de Compra *" value={f.tienda} onChange={function(e){ set('tienda',e.target.value); }}/>
        </div> : null}

        {C.lugar? <div>
          <p style={lab}>¿Dónde se debe realizar el servicio? *</p>
          <select style={inp} value={f.lugar} onChange={function(e){ set('lugar',e.target.value); set('lugar_id',''); }}>
            <option value="">Selecciona…</option>
            <option value="bodega">Bodega / tienda (propia)</option>
            <option value="taller">Taller central Bianchi</option>
            <option value="lugar">Mall / punto de venta (maestro)</option>
          </select>
          {f.lugar==='lugar'? <select style={inp} value={f.lugar_id} onChange={function(e){ set('lugar_id',e.target.value); }}>
            <option value="">— Selecciona mall / tienda —</option>
            {lugaresDe.map(function(l){ return <option key={l.id} value={l.id}>{l.tipo==='mall'?'🛍 ':'🏬 '}{l.nombre}{l.comuna?' · '+l.comuna:''}</option>; })}
          </select> : null}
        </div> : null}

        {C.falla? <div>
          <p style={lab}>Detalle de Falla * (fotos, videos y descripción)</p>
          <textarea style={Object.assign({},inp,{borderRadius:18,minHeight:90})} placeholder="Describe la falla…" value={f.falla} onChange={function(e){ set('falla',e.target.value); }}/>
          <input style={fileBox} type="file" accept="image/*,video/*" multiple onChange={function(e){ setFallaFiles(Array.prototype.slice.call(e.target.files||[])); }}/>
        </div> : null}
        {C.ot? <div>
          <input style={inp} placeholder="Orden de Trabajo del armado inicial" value={f.ot_inicial} onChange={function(e){ set('ot_inicial',e.target.value); }}/>
          <p style={lab}>Adjuntar OT inicial (PDF, JPG, PNG)</p>
          <input style={fileBox} type="file" accept=".pdf,image/*" onChange={function(e){ setOtFile(e.target.files[0]||null); }}/>
        </div> : null}

        <div style={infoBox}>Checklist automático: <b>{ck}</b> · Promesa de atención: <b>{promesa}</b> (SLA {slaDias} días)</div>
        <p style={{fontSize:11,color:'#666',margin:'0 0 12px'}}>Todos los campos marcados con (*) son obligatorios.</p>
        {err? <p style={{color:'#B91C1C',fontWeight:700,fontSize:13}}>{err}</p> : null}
        <button style={btn} disabled={busy} onClick={enviar}>{busy?'Enviando…':'Enviar Solicitud de '+C.label}</button>
        {done? <div style={Object.assign({},infoBox,{marginTop:14})}>✅ Solicitud <b>{done}</b> recibida. Haz seguimiento en /seguimiento con tu RUT o el número de orden.</div> : null}
      </div>
      <div style={footer}>
        <p style={{margin:'0 0 6px',fontWeight:800}}>No te pierdas las novedades</p>
        <p style={{margin:0,fontSize:11,color:'#9fb3af'}}>© 2026 Bianchi Store. Todos los derechos reservados.</p>
      </div>
    </div>
  );
}
