'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { T, S } from '../../lib/ui';

var SVC_SHORT={'ARMADO':'ARM','GARANTIA':'GAR','EVALUACION':'EVA','MANTENCION':'MAN','POST VENTA':'POS','RECLAMO':'REC','DEVOLUCION':'DEV','CAMBIO':'CAM','DESPACHO':'DES','LEVANTAMIENTO':'LEV','RETIRO':'RET','ANULACION':'ANU'};
var FAM_ELECTRICAS=['BICICLETA ELECTRICA','SCOOTER ELECTRICO','TROTADORA'];
var FLOWS=[['armado_final','Armado · cliente final'],['armado_retail','Armado · retail / volumen'],['garantia','Garantía'],['postventa','Post-venta / reparación']];
var DEF={nombre:'',rut:'',telefono:'',whatsapp:'',email:'',contacto:'',region_id:'',comuna:'',direccion:'',direccion_bodega:'',orden_compra:'',lugar:'domicilio',lugar_id:'',familia_id:'',modelo:'',serie:'',cantidad:1,electrica:false,boleta:'',fecha_compra:'',tienda:'',falla:'',descripcion:''};

export default function Solicitud(){
  var [flow,setFlow]=useState('armado_final');
  var [regs,setRegs]=useState([]); var [coms,setComs]=useState([]); var [lugs,setLugs]=useState([]);
  var [fams,setFams]=useState([]); var [prods,setProds]=useState([]); var [sla,setSla]=useState([]);
  var [f,setF]=useState(DEF); var [fotos,setFotos]=useState([]);
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
  function onFamilia(v){
    var name=''; fams.forEach(function(x){ if(x.id===Number(v)) name=x.name||''; });
    setF(function(o){ var n=Object.assign({},o); n.familia_id=v; n.electrica=FAM_ELECTRICAS.indexOf(name)>=0; return n; });
  }
  var fam=null; fams.forEach(function(x){ if(x.id===Number(f.familia_id)) fam=x; });
  var tipoEq=fam?(f.electrica&&fam.tipo==='BICICLETA'?'BICICLETA ELECTRICA':f.electrica&&fam.tipo==='SCOOTER'?'SCOOTER ELECTRICO':fam.tipo):'';
  var svc=flow==='garantia'?'GARANTIA':flow==='postventa'?'POST VENTA':'ARMADO';
  var mod=Number(f.cantidad)>1?'VOL':(tipoEq==='MAQUINA'?(f.electrica?'ME':'MC'):(tipoEq==='BICICLETA ELECTRICA'||tipoEq==='SCOOTER ELECTRICO'?'BE':'BU'));
  var ck='CK-'+(SVC_SHORT[svc]||'REP')+'-'+mod;
  var slaRow=null; sla.forEach(function(x){ if(x.tipo_servicio===svc&&x.tipo_equipo===tipoEq) slaRow=x; });
  var slaDias=(slaRow&&slaRow.dias)||15;
  var promesa=new Date(Date.now()+slaDias*86400000).toISOString().slice(0,10);
  var comunasDe=coms.filter(function(c){ return c.region_id===Number(f.region_id); });
  var lugaresDe=lugs.filter(function(l){ return l.activo!==false&&(!f.region_id||!l.region_id||l.region_id===Number(f.region_id)); });
  var modelos=prods.filter(function(p){ return p.family_id===Number(f.familia_id); });
  var esRetail=flow==='armado_retail';
  var conBoleta=flow==='armado_final'||flow==='garantia';
  var conFalla=flow==='garantia'||flow==='postventa';

  async function subirFotos(files){
    var urls=[];
    for(var i=0;i<files.length;i++){
      var path='solicitud-'+Date.now()+'-'+i+'-'+files[i].name;
      var up=await supabase.storage.from('portal_fotos').upload(path,files[i]);
      if(!up.error) urls.push(supabase.storage.from('portal_fotos').getPublicUrl(path).data.publicUrl);
    }
    return urls;
  }

  async function enviar(){
    setErr('');
    if(!f.nombre){ setErr('Nombre / razón social es obligatorio.'); return; }
    if(esRetail&&!f.contacto){ setErr('En retail/volumen el contacto es obligatorio.'); return; }
    if(conFalla&&!f.falla){ setErr('Describe la falla.'); return; }
    setBusy(true);
    var urls=await subirFotos(fotos);
    var rut=f.rut||('SINRUT-'+Date.now());
    var ci=await supabase.from('customers').upsert([{tenant_id:'dcg',nombre:f.nombre,rut:rut,tipo:esRetail?'retail':'final',telefono:f.telefono||null,whatsapp:f.whatsapp||null,email:f.email||null,region_id:f.region_id?Number(f.region_id):null,comuna:f.comuna||null,direccion:f.direccion||null}],{onConflict:'rut'}).select();
    var cid=ci.data&&ci.data[0]?ci.data[0].id:null;
    if(!cid){ setErr('No se pudo crear el cliente.'); setBusy(false); return; }
    var num='S_'+Date.now().toString().slice(-5);
    var wi=await supabase.from('work_orders').insert([{
      tenant_id:'dcg',ext_id:num,ot_number:num,customer_id:cid,
      tipo:svc==='ARMADO'?'armado_unidad':svc==='GARANTIA'?'repuesto_garantia':'servicio',
      tipo_equipo:tipoEq||null,modalidad:mod,estado:'Ingresada',canal:'publico',prioridad:'media',
      descripcion:f.descripcion||f.falla||('Solicitud '+flow),
      region_id:f.region_id?Number(f.region_id):null,comuna:f.comuna||null,
      direccion:(esRetail?f.direccion_bodega:f.direccion)||null,
      lugar_tipo:f.lugar,lugar_id:f.lugar_id?Number(f.lugar_id):null,
      modelo:f.modelo||null,modelo_limpio:String(f.modelo||'').replace(/[\s.-]/g,'').toUpperCase()||null,
      cantidad_unidades:Number(f.cantidad)||1,checklist_code:ck,fecha_promesa:promesa,quien_registra:'portal',
      datos_portal:{flujo:flow,contacto:f.contacto||null,orden_compra:f.orden_compra||null,direccion_bodega:f.direccion_bodega||null,boleta:f.boleta||null,fecha_compra:f.fecha_compra||null,tienda:f.tienda||null,producto:fam?fam.name:null,modelo_ot:f.modelo||null,serial:f.serie||null,falla:f.falla||null,cantidad:Number(f.cantidad)||1,fotos:urls},
      kpi:{tipo_servicio:svc,tipo_equipo:tipoEq}
    }]).select();
    setBusy(false);
    if(wi.error){ setErr(wi.error.message); return; }
    setDone(num);
  }

  if(done) return (
    <main style={S.main}><div style={S.wrap}>
      <div style={{...S.card,maxWidth:560,margin:'40px auto',textAlign:'center'}}>
        <h1 style={S.h1}>✅ Solicitud recibida</h1>
        <p style={{...S.sub,margin:'10px 0'}}>Tu orden es <b style={{color:T.brand}}>{done}</b>. Promesa de atención: <b>{promesa}</b>.</p>
        <p style={S.sub}>Haz seguimiento en <a href="/seguimiento" style={{color:T.info}}>/seguimiento</a> con tu RUT o el número de orden.</p>
      </div>
    </div></main>
  );

  return (
    <main style={S.main}><div style={{...S.wrap,maxWidth:760}}>
      <h1 style={S.h1}>TORQUE·OS · Solicitud de Servicio</h1>
      <p style={S.sub}>Bianchi Chile S.A. · Servicio Técnico</p>
      <div style={S.card}>
        <label style={S.label}>Tipo de solicitud</label>
        <select style={S.input} value={flow} onChange={function(e){ setFlow(e.target.value); }}>
          {FLOWS.map(function(x){ return <option key={x[0]} value={x[0]}>{x[1]}</option>; })}
        </select>

        <label style={S.label}>{esRetail?'Razón social *':'Nombre completo *'}</label>
        <input style={S.input} value={f.nombre} onChange={function(e){ set('nombre',e.target.value); }}/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <input style={S.input} placeholder="RUT" value={f.rut} onChange={function(e){ set('rut',e.target.value); }}/>
          <input style={S.input} placeholder="Teléfono" value={f.telefono} onChange={function(e){ set('telefono',e.target.value); }}/>
          <input style={S.input} placeholder="WhatsApp" value={f.whatsapp} onChange={function(e){ set('whatsapp',e.target.value); }}/>
          <input style={S.input} placeholder="Email" value={f.email} onChange={function(e){ set('email',e.target.value); }}/>
        </div>
        {esRetail? <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <input style={S.input} placeholder="Contacto (persona) *" value={f.contacto} onChange={function(e){ set('contacto',e.target.value); }}/>
          <input style={S.input} placeholder="Orden de compra (opc.)" value={f.orden_compra} onChange={function(e){ set('orden_compra',e.target.value); }}/>
        </div> : null}

        {!esRetail? <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <select style={S.input} value={f.region_id} onChange={function(e){ set('region_id',e.target.value); set('comuna',''); set('lugar_id',''); }}>
            <option value="">— Región —</option>
            {regs.map(function(r){ return <option key={r.id} value={r.id}>{r.nombre}</option>; })}
          </select>
          <select style={S.input} value={f.comuna} onChange={function(e){ set('comuna',e.target.value); }} disabled={!f.region_id}>
            <option value="">{f.region_id?'— Comuna —':'Primero región'}</option>
            {comunasDe.map(function(c){ return <option key={c.id} value={c.nombre}>{c.nombre}</option>; })}
          </select>
        </div> : null}
        {!esRetail? <input style={S.input} placeholder="Dirección" value={f.direccion} onChange={function(e){ set('direccion',e.target.value); }}/> : null}
        {esRetail? <input style={S.input} placeholder="Dirección bodega / tienda *" value={f.direccion_bodega} onChange={function(e){ set('direccion_bodega',e.target.value); }}/> : null}

        {!esRetail? <div>
          <label style={S.label}>¿Dónde se realiza el servicio?</label>
          <select style={S.input} value={f.lugar} onChange={function(e){ set('lugar',e.target.value); set('lugar_id',''); }}>
            <option value="domicilio">Domicilio del cliente</option><option value="taller">Taller central</option><option value="lugar">Mall / tienda</option>
          </select>
          {f.lugar==='lugar'? <select style={S.input} value={f.lugar_id} onChange={function(e){ set('lugar_id',e.target.value); }}>
            <option value="">— Selecciona mall / tienda —</option>
            {lugaresDe.map(function(l){ return <option key={l.id} value={l.id}>{l.tipo==='mall'?'🛍 ':'🏬 '}{l.nombre}{l.comuna?' · '+l.comuna:''}</option>; })}
          </select> : null}
        </div> : null}

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <select style={S.input} value={f.familia_id} onChange={function(e){ onFamilia(e.target.value); }}>
            <option value="">— Familia / producto * —</option>
            {fams.map(function(x){ return <option key={x.id} value={x.id}>{x.name} ({x.tipo})</option>; })}
          </select>
          <select style={S.input} value={f.modelo} onChange={function(e){ set('modelo',e.target.value); }}>
            <option value="">— Modelo (opcional) —</option>
            {modelos.map(function(p){ return <option key={p.id} value={p.model}>{p.model} · {p.sku}</option>; })}
          </select>
          <input style={S.input} placeholder="N° de serie" value={f.serie} onChange={function(e){ set('serie',e.target.value); }}/>
          <input style={S.input} type="number" min="1" placeholder="Cantidad" value={f.cantidad} onChange={function(e){ set('cantidad',e.target.value); }}/>
        </div>
        <label style={S.label}><input type="checkbox" checked={f.electrica} onChange={function(e){ set('electrica',e.target.checked); }}/> Equipo eléctrico</label>

        {conBoleta? <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <input style={S.input} placeholder="N° boleta *" value={f.boleta} onChange={function(e){ set('boleta',e.target.value); }}/>
          <input style={S.input} type="date" value={f.fecha_compra} onChange={function(e){ set('fecha_compra',e.target.value); }}/>
          <input style={{...S.input,gridColumn:'1/-1'}} placeholder="Tienda de compra" value={f.tienda} onChange={function(e){ set('tienda',e.target.value); }}/>
        </div> : null}
        {conFalla? <input style={S.input} placeholder="Falla reportada *" value={f.falla} onChange={function(e){ set('falla',e.target.value); }}/> : null}
        <input style={S.input} placeholder="Descripción / comentarios" value={f.descripcion} onChange={function(e){ set('descripcion',e.target.value); }}/>
        <label style={S.label}>Fotos (opcional)</label>
        <input type="file" accept="image/*" multiple onChange={function(e){ setFotos(Array.prototype.slice.call(e.target.files||[])); }}/>

        <div style={{...S.card,background:T.surface2,padding:10,marginTop:10}}>
          <p style={{margin:'2px 0',fontSize:13}}>Checklist automático: <b>{ck}</b> · Promesa: <b>{promesa}</b> (SLA {slaDias} días)</p>
        </div>
        {err? <p style={{color:T.danger,fontWeight:700}}>{err}</p> : null}
        <button style={S.btn(T.ok)} disabled={busy} onClick={enviar}>{busy?'Enviando…':'Enviar solicitud'}</button>
      </div>
    </div></main>
  );
}
