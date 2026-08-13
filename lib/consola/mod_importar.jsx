'use client';
import { useState } from 'react';
import { supabase } from '../supabase';
import { T, S } from '../ui';
import { emit } from '../data';

var MAP={idot:'id',otid:'id',id:'id',fechaingreso:'fing',cliente:'cli',rutcliente:'rut',rutlimpio:'rutl',tipoequipo:'eq',quienregistra:'reg',modelo:'mod',tiposervicio:'sv',tecnicoasignado:'tec',fechapromesa:'fp',fechainicio:'fi',fechafintecnico:'ff',fechaentregacliente:'fe',estadoot:'est',horastrabajadas:'horas',costomanoobra:'cmo',ventamanoobra:'vmo',costorepuestos:'crep',ventarepuestos:'vrep',ventatotal:'vtot',iva:'iva',totalapagar:'tpag',costototal:'ctot',margenbruto:'mar',margen:'pmar',entregaatiempo:'ent',diasreparacion:'dias',reincidencia:'rei',reclamocliente:'rec',notacliente110:'nota',notacliente:'nota',nivelsatisfaccion:'niv',firsttimefix:'ftf',usarepuestos:'urep',alertarepuestos:'ale',mesingreso:'mes',anoingreso:'anio',anioingreso:'anio',detalle:'det',cantidadunidades:'cant',repuesto:'rep',modelolimpio:'mlim',falladefabrica:'falla'};
function norm(h){ return String(h||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,''); }
function clean(c){ return String(c==null?'':c).replace(/^"+|"+$/g,'').trim(); }
function money(s){ var t=String(s).replace(/[^0-9-]/g,''); return (t===''||t==='-')?0:parseInt(t,10); }
function num(s){ var t=String(s).replace(',','.'); var n=parseFloat(t); return isNaN(n)?0:n; }
function normRut(x){ var s=String(x||'').replace(/[.\s]/g,'').toUpperCase(); if(s&&s.indexOf('-')<0&&s.length>1) s=s.slice(0,-1)+'-'+s.slice(-1); return s; }
function fdate(s){
  if(!s) return null;
  var t=String(s).trim();
  var m=t.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if(m){ var a=+m[1],b=+m[2],y=+m[3]; if(y<100)y+=2000; var d,mo; if(a>12){d=a;mo=b;} else {mo=a;d=b;} return y+'-'+String(mo).padStart(2,'0')+'-'+String(d).padStart(2,'0'); }
  var dt=new Date(t); return isNaN(dt)?null:dt.toISOString().slice(0,10);
}

export default function ModImportar(props){
  var avisar=props.avisar||function(){};
  var [busy,setBusy]=useState(false);
  var [log,setLog]=useState('');
  var [txt,setTxt]=useState('');

  function plantilla(){
    var h=['OT_ID','Fecha Ingreso','Cliente','RUT Cliente','Tipo Equipo','Quien Registra','Modelo','Tipo Servicio','Tecnico Asignado','Fecha Inicio','Fecha Fin Tecnico','Fecha Entrega Cliente','Estado OT','Cantidad Unidades','Detalle','Repuesto'];
    var a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob(['\uFEFF'+h.join(';')+'\n'],{type:'text/csv'}));
    a.download='PLANTILLA_OT.csv'; a.click();
  }

  function procesarTexto(text){
    var lines=text.split(/\r?\n/).filter(function(l){ return l.trim(); });
    if(!lines.length){ setLog('Nada que leer.'); return; }
    var sep=lines[0].indexOf('\t')>=0?'\t':(lines[0].indexOf(';')>=0?';':(lines[0].indexOf('|')>=0?'|':','));
    var first=lines[0].split(sep).map(clean);
    var hasHeader=norm(first[0]).indexOf('id')>=0||norm(first[0]).indexOf('ot')>=0;
    var idx={};
    if(hasHeader) first.forEach(function(h,i){ var k=norm(h); if(MAP[k]&&idx[MAP[k]]==null) idx[MAP[k]]=i; });
    var start=hasHeader?1:0;
    function C(r,key,pos){ var i=idx[key]!=null?idx[key]:pos; return clean(r[i]); }
    var rows=lines.slice(start).map(function(l){ return l.split(sep).map(clean); })
      .filter(function(r){ var id=C(r,'id',0); return id&&(/^\d+$/.test(id)||id.indexOf('S_')===0); });
    if(!rows.length){ setLog('No se detectaron filas válidas. Copia desde Excel con encabezados.'); return; }
    setLog('Filas: '+rows.length+'. Creando clientes…');
    var cmap={};
    rows.forEach(function(r){ var rut=normRut(C(r,'rut',3)||C(r,'rutl',4)); var nom=C(r,'cli',2)||'Cliente'; var k=rut||('N'+nom); if(k&&!cmap[k]) cmap[k]={rut:rut||null,nombre:nom}; });
    run(rows,C,cmap);
  }

  async function run(rows,C,cmap){
    var byRut={},byName={};
    var ex=await supabase.from('customers').select('id,rut,nombre').limit(5000);
    (ex.data||[]).forEach(function(c){ if(c.rut)byRut[normRut(c.rut)]=c.id; byName[String(c.nombre||'').toUpperCase()]=c.id; });
    var nuevos=Object.keys(cmap).filter(function(k){ var c=cmap[k]; var id=(c.rut&&byRut[c.rut])||byName[String(c.nombre).toUpperCase()]; if(id){c.id=id; return false;} return true; })
      .map(function(k){ return {rut:cmap[k].rut||null,nombre:cmap[k].nombre,tipo:'final'}; });
    for(var a=0;a<nuevos.length;a+=200){ await supabase.from('customers').insert(nuevos.slice(a,a+200)); }
    var ex2=await supabase.from('customers').select('id,rut,nombre').limit(5000);
    byRut={}; byName={};
    (ex2.data||[]).forEach(function(c){ if(c.rut)byRut[normRut(c.rut)]=c.id; byName[String(c.nombre||'').toUpperCase()]=c.id; });
    setLog('Clientes listos. Cargando OTs…');
    var ots=[]; var salt=0;
    rows.forEach(function(r){
      var id=C(r,'id',0);
      var rut=normRut(C(r,'rut',3)||C(r,'rutl',4));
      var cid=(rut&&byRut[rut])||byName[String(C(r,'cli',2)).toUpperCase()]||null;
      if(!cid){ salt++; return; }
      ots.push({
        ext_id:id, customer_id:cid,
        tipo:C(r,'sv',8)||'servicio', tipo_equipo:C(r,'eq',5),
        estado:String(C(r,'est',14)).toLowerCase().indexOf('cerr')>=0?'Cerrada':'Ingresada',
        creado_en:fdate(C(r,'fing',1)),
        descripcion:C(r,'det',38)||null, canal:'vba',
        tecnico_nombre:C(r,'tec',9)||null, quien_registra:C(r,'reg',6)||null,
        modelo:C(r,'mod',7)||null, modelo_limpio:C(r,'mlim',41)||null,
        fecha_promesa:fdate(C(r,'fp',10)), fecha_inicio:fdate(C(r,'fi',11)), fecha_fin_tecnico:fdate(C(r,'ff',12)), fecha_entrega_cliente:fdate(C(r,'fe',13)),
        cantidad_unidades:parseInt(C(r,'cant',39),10)||1,
        venta_total:money(C(r,'vtot',20)), costo_total:money(C(r,'ctot',23)), margen:money(C(r,'mar',24)),
        kpi:{ tipo_equipo:C(r,'eq',5), tipo_servicio:C(r,'sv',8), horas:num(C(r,'horas',15)),
          venta_mo:money(C(r,'vmo',17)), costo_rep:money(C(r,'crep',18)), venta_rep:money(C(r,'vrep',19)),
          venta_total:money(C(r,'vtot',20)), costo_total:money(C(r,'ctot',23)), margen:money(C(r,'mar',24)), pct_margen:C(r,'pmar',25),
          ftf:C(r,'ftf',32), dias:num(C(r,'dias',27)), reincidencia:C(r,'rei',28), reclamo:C(r,'rec',29),
          nota:parseInt(C(r,'nota',30),10)||0, nivel:C(r,'niv',31), usa_rep:C(r,'urep',33), alerta:C(r,'ale',34),
          mes:C(r,'mes',36), anio:C(r,'anio',37), repuesto:C(r,'rep',40), falla:C(r,'falla',43) }
      });
    });
    var ok=0; var err='';
    for(var b=0;b<ots.length;b+=200){
      var res=await supabase.from('work_orders').upsert(ots.slice(b,b+200),{onConflict:'ext_id'});
      if(res.error){ err=res.error.message; break; }
      ok+=Math.min(200,ots.length-b);
      setLog('OTs '+Math.min(b+200,ots.length)+'/'+ots.length+'…');
    }
    setLog('✅ Cargadas: '+ok+' OTs · clientes: '+Object.keys(cmap).length+(salt?(' · sin cliente: '+salt):'')+(err?(' · ERR: '+err):''));
    avisar(err?'⛗ '+err:'✅ Historial importado', err?T.danger:T.ok);
    emit(); if(props.onOk) props.onOk();
  }

  return (
    <div style={S.card}>
      <h2 style={S.h2}>Importar historial KPIs</h2>
      <p style={S.sub}><b>Método recomendado:</b> en Excel selecciona desde la fila de encabezados hasta la última fila con datos → Ctrl+C → pega en el recuadro → “Cargar desde portapapeles”. También puedes subir CSV/TXT.</p>
      <textarea style={{...S.input,minHeight:140,fontFamily:'monospace',fontSize:12}} placeholder="Pega aquí los datos copiados desde Excel…" value={txt} onChange={function(e){ setTxt(e.target.value); }}/>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:8}}>
        <button style={{...S.btn(T.brand),width:'auto',marginBottom:0}} disabled={busy||!txt} onClick={function(){ setBusy(true); procesarTexto(txt); setBusy(false); }}>📋 Cargar desde portapapeles</button>
        <label style={{...S.btnO(T.ok),width:'auto',marginBottom:0,cursor:'pointer'}}>📥 Subir CSV/TXT
          <input type="file" accept=".csv,.txt" style={{display:'none'}} disabled={busy} onChange={function(e){ setBusy(true); e.target.files[0].text().then(function(t){ procesarTexto(t); setBusy(false); }); }}/>
        </label>
        <button style={{...S.btnO(T.info),width:'auto',marginBottom:0}} onClick={plantilla}>⬇ Plantilla CSV</button>
      </div>
      {log? <p style={{color:T.info,marginTop:10,fontWeight:700}}>{log}</p> : null}
    </div>);
}
