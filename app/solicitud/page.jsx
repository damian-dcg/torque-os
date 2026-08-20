'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

var SVC_SHORT={'ARMADO':'ARM','GARANTIA':'GAR','POST VENTA':'POS'};
var FAM_ELECTRICAS=['BICICLETA ELECTRICA','SCOOTER ELECTRICO','TROTADORA'];
var FLOWS={
  final:{label:'ARMADO CLIENTE FINAL',svc:'ARMADO',boleta:true,compra:true,modelo:true,cantidad:false,lugar:false,falla:false,ot:false},
  retail:{label:'RETAIL / VOLUMEN',svc:'ARMADO',boleta:false,compra:false,modelo:false,cantidad:true,lugar:true,falla:false,ot:false},
  garantia:{label:'GARANTÍA',svc:'GARANTIA',boleta:true,compra:true,modelo:true,cantidad:false,lugar:false,falla:true,ot:true},
  post:{label:'POST GARANTÍA',svc:'POST VENTA',boleta:false,compra:false,modelo:true,cantidad:false,lugar:false,falla:true,ot:false}
};
var wrap={minHeight:'100vh',background:'#F4F6F8',fontFamily:"'Segoe UI',system-ui,Arial,sans-serif",display:'flex',flexDirection:'column'};
var header={background:'#141414',padding:'16px 22px',display:'flex',alignItems:'center'};
var mainS={flex:1,width:'100%',maxWidth:720,margin:'0 auto',padding:'30px 18px',boxSizing:'border-box'};
var h1={textAlign:'center',fontSize:26,fontWeight:900,color:'#141414',margin:'6px 0 6px',letterSpacing:.5};
var sub={textAlign:'center',color:'#5A6470',fontSize:14,margin:'0 0 22px'};
var inp={width:'100%',boxSizing:'border-box',padding:'12px 18px',borderRadius:999,border:'1px solid #C9CFD6',background:'#fff',fontSize:15,marginBottom:13,color:'#141414',outline:'none',textTransform:'uppercase'};
var inpMail={width:'100%',boxSizing:'border-box',padding:'12px 18px',borderRadius:999,border:'1px solid #C9CFD6',background:'#fff',fontSize:15,marginBottom:13,color:'#141414',outline:'none'};
var lab={fontSize:13,fontWeight:700,color:'#333',margin:'0 0 5px'};
var secTitle={fontSize:14,fontWeight:900,color:'#141414',margin:'16px 0 10px',letterSpacing:.5};
var sep={height:1,background:'#D5DAE0',margin:'16px 0 20px'};
var btn={display:'inline-block',background:'#3EC6B2',color:'#fff',border:0,borderRadius:999,padding:'14px 28px',fontWeight:800,fontSize:15,cursor:'pointer',textDecoration:'none',letterSpacing:.5};
var fileRow={display:'flex',alignItems:'center',gap:10,padding:'10px 18px',borderRadius:999,border:'1px solid #C9CFD6',background:'#fff',marginBottom:10};
var footer={background:'#141414',color:'#fff',textAlign:'center',padding:'20px 12px 28px'};
function chanBtn(on){ return {flex:1,textAlign:'center',padding:'12px 4px',borderRadius:999,border:on?'0':'1px solid #C9CFD6',background:on?'#3EC6B2':'#fff',color:on?'#fff':'#333',fontWeight:800,fontSize:12,cursor:'pointer',whiteSpace:'nowrap',letterSpacing:.3}; }
function up(v){ return String(v==null?'':v).toUpperCase(); }
function FileRow(props){
  return (
    <div style={fileRow}>
      <span style={{flex:1,fontSize:13,fontWeight:700,color:'#333'}}>{props.label}</span>
      <input style={{fontSize:12,maxWidth:220}} type="file" accept={props.accept||'.pdf,image/*,video/*'} multiple={props.multiple} onChange={function(e){ props.onFile(props.multiple?Array.prototype.slice.call(e.target.files||[]):(e.target.files[0]||null)); }}/>
    </div>
  );
}

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

  async function upl(file,pref){
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
    var boletaUrl=await upl(boletaFile,'boleta');
    var fallaUrls=[]; for(var i=0;i<fallaFiles.length;i++){ var u=await upl(fallaFiles[i],'falla'); if(u) fallaUrls.push(u); }
    var otUrl=await upl(otFile,'ot');
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
    setBusy(false);
    if(wi.error){ setErr(wi.error.message); return; }
    setDone(num);
  }

  if(done) return (
    <div style={wrap}>
      <div style={header}><span style={{color:'#fff',fontWeight:900,fontSize:24,letterSpacing:1}}>BIANCHI</span></div>
      <div style={mainS}>
        <div style={{background:'#fff',border:'1px solid #D5DAE0',borderRadius:18,padding:'38px 24px',textAlign:'center'}}>
          <div style={{fontSize:44}}>✅</div>
          <h1 style={h1}>SOLICITUD RECIBIDA</h1>
          <p style={{fontSize:16,color:'#333',margin:'10px 0 4px'}}>TU ORDEN ES <b style={{color:'#0E8074'}}>{done}</b></p>
          <p style={{fontSize:13,color:'#5A6470',margin:'0 0 22px'}}>TU CASO YA FUE NOTIFICADO A NUESTRO EQUIPO (BUZÓN DEL AGENTE).</p>
          <a href="/seguimiento" style={btn}>SEGUIMIENTO DE MI CASO</a>
        </div>
      </div>
      <div style={footer}>
        <p style={{margin:'0 0 6px',fontWeight:800,fontSize:15}}>NO TE PIERDAS LAS NOVEDADES</p>
        <p style={{margin:0,fontSize:12,color:'#9fb3af'}}>© 2026 BIANCHI STORE. TODOS LOS DERECHOS RESERVADOS.</p>
      </div>
    </div>
  );

  return (
    <div style={wrap}>
      <div style={header}><span style={{color:'#fff',fontWeight:900,fontSize:24,letterSpacing:1}}>BIANCHI</span></div>
      <div style={mainS}>
        <h1 style={h1}>SERVICIO TÉCNICO BIANCHI</h1>
        <p style={sub}>TU BIANCHI LISTA PARA USAR</p>

        <div style={{display:'flex',gap:8}}>
          {Object.keys(FLOWS).map(function(k){ return <button key={k} style={chanBtn(flow===k)} onClick={function(){ setFlow(k); setErr(''); }}>{FLOWS[k].label}</button>; })}
        </div>
        <div style={sep}/>

        <label style={lab}>{flow==='retail'?'RAZÓN SOCIAL / TIENDA *':'NOMBRE COMPLETO / RAZÓN SOCIAL *'}</label>
        <input style={inp} value={f.nombre} onChange={function(e){ set('nombre',up(e.target.value)); }}/>
        <input style={inp} placeholder="RUT *" value={f.rut} onChange={function(e){ set('rut',up(e.target.value)); }}/>
        <select style={inp} value={f.region_id} onChange={function(e){ set('region_id',e.target.value); set('comuna',''); set('lugar_id',''); }}>
          <option value="">SELECCIONA UNA REGIÓN *</option>
          {regs.map(function(r){ return <option key={r.id} value={r.id}>{r.nombre}</option>; })}
        </select>
        <select style={inp} value={f.comuna} onChange={function(e){ set('comuna',e.target.value); }} disabled={!f.region_id}>
          <option value="">{f.region_id?'SELECCIONA UNA COMUNA *':'PRIMERO SELECCIONA UNA REGIÓN'}</option>
          {comunasDe.map(function(c){ return <option key={c.id} value={c.nombre}>{c.nombre}</option>; })}
        </select>
        <input style={inp} placeholder="DIRECCIÓN (CALLE Y NÚMERO) *" value={f.direccion} onChange={function(e){ set('direccion',up(e.target.value)); }}/>
        <input style={inp} placeholder="NÚMERO DE TELÉFONO (EJ: +56912345678) *" value={f.telefono} onChange={function(e){ set('telefono',e.target.value); }}/>
        <input style={inpMail} type="email" placeholder="CORREO ELECTRÓNICO *" value={f.mail} onChange={function(e){ set('mail',e.target.value); }}/>

        <label style={lab}>TIPO DE PRODUCTO *</label>
        <select style={inp} value={f.tipo_producto} onChange={function(e){ set('tipo_producto',e.target.value); }}>
          <option value="">SELECCIONA…</option>
          {fams.map(function(x){ return <option key={x.id} value={x.id}>{x.name} ({x.tipo})</option>; })}
        </select>
        {C.modelo? <div>
          <input style={inp} list="lista-modelos" placeholder="MODELO O SKU DEL PRODUCTO *" value={f.modelo} onChange={function(e){ set('modelo',up(e.target.value)); }}/>
          <datalist id="lista-modelos">{modelos.map(function(p){ return <option key={p.id} value={p.model}/>; })}</datalist>
        </div> : null}
        {C.cantidad? <input style={inp} type="number" min="1" placeholder="CANTIDAD DE PRODUCTOS *" value={f.cantidad} onChange={function(e){ set('cantidad',e.target.value); }}/> : null}

        {C.boleta? <div>
          <input style={inp} placeholder="NÚMERO DE BOLETA / FACTURA *" value={f.boleta} onChange={function(e){ set('boleta',up(e.target.value)); }}/>
        </div> : null}
        {C.compra? <div>
          <label style={lab}>FECHA DE COMPRA *</label>
          <input style={inp} type="date" value={f.fecha_compra} onChange={function(e){ set('fecha_compra',e.target.value); }}/>
          <input style={inp} placeholder="TIENDA DE COMPRA *" value={f.tienda} onChange={function(e){ set('tienda',up(e.target.value)); }}/>
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
            {lugaresDe.map(function(l){ return <option key={l.id} value={l.id}>{l.nombre}{l.comuna?' · '+l.comuna:''}</option>; })}
          </select> : null}
        </div> : null}

        {C.falla? <div>
          <label style={lab}>DETALLE DE FALLA *</label>
          <textarea style={Object.assign({},inp,{borderRadius:18,minHeight:100})} placeholder="DESCRIBE LA FALLA…" value={f.falla} onChange={function(e){ set('falla',up(e.target.value)); }}/>
        </div> : null}
        {C.ot? <input style={inp} placeholder="ORDEN DE TRABAJO DEL ARMADO INICIAL" value={f.ot_inicial} onChange={function(e){ set('ot_inicial',up(e.target.value)); }}/> : null}

        {(C.boleta||C.falla||C.ot)? <div>
          <p style={secTitle}>ADJUNTOS</p>
          {C.boleta? <FileRow label="BOLETA / FACTURA (PDF, JPG, PNG)" accept=".pdf,image/*" file={boletaFile} onFile={setBoletaFile}/> : null}
          {C.falla? <FileRow label="FOTOS / VIDEOS DE LA FALLA" accept="image/*,video/*" multiple files={fallaFiles} onFile={setFallaFiles}/> : null}
          {C.ot? <FileRow label="OT INICIAL (PDF, JPG, PNG)" accept=".pdf,image/*" file={otFile} onFile={setOtFile}/> : null}
        </div> : null}

        <p style={{fontSize:12,color:'#666',margin:'6px 0 14px'}}>TODOS LOS CAMPOS MARCADOS CON (*) SON OBLIGATORIOS.</p>
        {err? <p style={{color:'#B91C1C',fontWeight:800,fontSize:14}}>{err}</p> : null}
        <button style={btn} disabled={busy} onClick={enviar}>{busy?'ENVIANDO…':'ENVIAR SOLICITUD DE '+C.label}</button>
      </div>
      <div style={footer}>
        <p style={{margin:'0 0 6px',fontWeight:800,fontSize:15}}>NO TE PIERDAS LAS NOVEDADES</p>
        <p style={{margin:0,fontSize:12,color:'#9fb3af'}}>© 2026 BIANCHI STORE. TODOS LOS DERECHOS RESERVADOS.</p>
      </div>
    </div>
  );
}
