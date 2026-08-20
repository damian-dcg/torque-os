'use client';
import { useState } from 'react';
import { supabase } from '../supabase';
import { T, S } from '../ui';

var BIANCHI=['968088807','96808880-7'];
var TIPOS={'ARMADO':'armado_unidad','GARANTIA':'repuesto_garantia','EVALUACION':'evaluacion','POST VENTA':'servicio','DEVOLUCION':'devolucion_dinero','RETIRO':'retiro','RECLAMO':'reclamo','MANTENCION':'mantencion','CAMBIO':'cambio_producto','DESPACHO':'despacho','LEVANTAMIENTO':'levantamiento','ANULACION':'anulacion'};

function splitLine(line){
  var out=[],cur='',q=false;
  for(var i=0;i<line.length;i++){
    var ch=line[i];
    if(ch==='"'){ q=!q; }
    else if(ch===';'&&!q){ out.push(cur); cur=''; }
    else { cur+=ch; }
  }
  out.push(cur); return out;
}
function clean(s){ return String(s==null?'':s).replace(/¥/g,'Ñ').replace(/\s+/g,' ').trim(); }
function money(v){ var s=String(v==null?'':v).replace(/[^0-9-]/g,''); if(s===''||s==='-') return 0; return parseInt(s,10); }
function num(v){ return parseFloat(String(v==null?'0':v).replace(',','.'))||0; }
function fdate(v){
  var s=String(v||'').trim(); var m;
  m=s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/); if(m) return m[3]+'-'+('0'+m[2]).slice(-2)+'-'+('0'+m[1]).slice(-2);
  m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if(m) return m[1]+'-'+('0'+m[2]).slice(-2)+'-'+('0'+m[3]).slice(-2);
  m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/); if(m){ var y=m[3].length===2?('20'+m[3]):m[3]; return y+'-'+('0'+m[2]).slice(-2)+'-'+('0'+m[1]).slice(-2); }
  return null;
}

export default function ModImportar(props){
  var avisar=props.avisar||function(){};
  var onOk=props.onOk||function(){};
  var [log,setLog]=useState(''); var [busy,setBusy]=useState(false);
  function add(s){ setLog(function(l){ return l+s+'\n'; }); }

  async function processFile(file){
    var text=await file.text();
    var lines=text.split(/\r?\n/).filter(function(l){ return l.trim()!==''; });
    var rows=[];
    lines.forEach(function(l,ix){
      var r=splitLine(l);
      var first=clean(r[0]).toUpperCase();
      if(ix===0&&(first==='ID OT'||first.indexOf('ID OT')===0)) return;
      if(!clean(r[0])) return;
      rows.push(r);
    });
    var seen={};
    rows=rows.filter(function(r){ var k=clean(r[0]); if(seen[k]) return false; seen[k]=true; return true; });
    add(file.name+': '+rows.length+' filas únicas.');

    var custMap={};
    rows.forEach(function(r){
      var rut=clean(r[4])||clean(r[3])||('SINRUT-'+clean(r[0]));
      if(!custMap[rut]) custMap[rut]=clean(r[2])||('CLIENTE '+rut);
    });
    var custArr=Object.keys(custMap).map(function(rut){
      return { tenant_id:'dcg', tipo:BIANCHI.indexOf(rut)>=0?'mayorista':'final', rut:rut, nombre:custMap[rut] };
    });
    var cOk=0;
    for(var c=0;c<custArr.length;c+=50){
      var cb=custArr.slice(c,c+50);
      var cr=await supabase.from('customers').upsert(cb,{onConflict:'rut'});
      if(cr.error) add('⚠ Clientes lote '+c+': '+cr.error.message); else cOk+=cb.length;
    }
    add('Clientes asegurados: '+cOk+' de '+custArr.length+'.');
    var sel=await supabase.from('customers').select('id,rut').in('rut',Object.keys(custMap));
    var byRut={}; (sel.data||[]).forEach(function(x){ byRut[x.rut]=x.id; });

    var ots=[],salt=0;
    rows.forEach(function(r){
      var rut=clean(r[4])||clean(r[3])||('SINRUT-'+clean(r[0]));
      var cid=byRut[rut]||null;
      if(!cid){ salt++; return; }
      var ext=clean(r[0]);
      var fing=fdate(r[1]);
      var est=String(r[14]||'').toLowerCase().indexOf('cerr')>=0?'Cerrada':'Ingresada';
      ots.push({
        tenant_id:'dcg', ext_id:ext, ot_number:ext, customer_id:cid,
        tipo:TIPOS[clean(r[8]).toUpperCase()]||'servicio',
        tipo_equipo:clean(r[5]), estado:est, canal:'vba',
        created_at:fing?(fing+'T12:00:00'):null, cerrada_at:est==='Cerrada'?(fdate(r[13])?fdate(r[13])+'T12:00:00':null):null,
        descripcion:clean(r[38])||null, tecnico_nombre:clean(r[9])||null, quien_registra:clean(r[6])||null,
        modelo:clean(r[7])||null, modelo_limpio:clean(r[41])||clean(r[42])||null,
        fecha_promesa:fdate(r[10]), fecha_inicio:fdate(r[11]), fecha_fin_tecnico:fdate(r[12]), fecha_entrega_cliente:fdate(r[13]),
        cantidad_unidades:parseInt(r[39],10)||1,
        horas:num(r[15]), costo_mo:money(r[16]), venta_mo:money(r[17]), costo_rep:money(r[18]), venta_rep:money(r[19]),
        venta_total:money(r[20]), iva:money(r[21]), total_pagar:money(r[22]), costo_total:money(r[23]),
        margen:money(r[24]), pct_margen:clean(r[25]),
        entrega_tiempo:clean(r[26])||'Pendiente', dias_reparacion:num(r[27]),
        reincidencia:clean(r[28])||'NO', reclamo:clean(r[29])||'NO',
        nota:parseInt(r[30],10)||0, nivel:clean(r[31])||'PENDIENTE',
        ftf:clean(r[32])||'SI', usa_repuestos:clean(r[33])||'NO',
        alerta:clean(r[34])||'OK', mes:clean(r[36]), anio:clean(r[37]),
        repuesto:clean(r[40]), falla_fabrica:clean(r[43])||'NO', falla:clean(r[43])||'NO',
        kpi:{ tipo_equipo:clean(r[5]), tipo_servicio:clean(r[8]), horas:num(r[15]), venta_mo:money(r[17]),
          costo_rep:money(r[18]), venta_rep:money(r[19]), venta_total:money(r[20]), costo_total:money(r[23]),
          margen:money(r[24]), pct_margen:clean(r[25]), ftf:clean(r[32]), dias:num(r[27]),
          reincidencia:clean(r[28]), reclamo:clean(r[29]), nota:parseInt(r[30],10)||0, nivel:clean(r[31]),
          usa_rep:clean(r[33]), alerta:clean(r[34]), entrega_tiempo:clean(r[26]), mes:clean(r[36]), anio:clean(r[37]),
          repuesto:clean(r[40]), falla:clean(r[43]) }
      });
    });
    add('OTs preparadas: '+ots.length+' · sin cliente: '+salt+'.');
    var ok=0,err='';
    for(var b=0;b<ots.length;b+=100){
      var lote=ots.slice(b,b+100);
      var res=await supabase.from('work_orders').upsert(lote,{onConflict:'ext_id'});
      if(res.error) err+='Lote '+b+': '+res.error.message+' · '; else ok+=lote.length;
    }
    add('OTs cargadas: '+ok+' de '+ots.length+(err?' · ERRORES: '+err:'')+'.');
  }

  async function onFiles(e){
    var files=Array.prototype.slice.call(e.target.files||[]);
    if(!files.length) return;
    setBusy(true); setLog('');
    add('Iniciando import ('+files.length+' archivo(s))…');
    for(var i=0;i<files.length;i++){ await processFile(files[i]); }
    var fin=await supabase.from('work_orders').select('estado,cantidad_unidades,kpi');
    var rows=fin.data||[];
    var cerr=rows.filter(function(o){return o.estado==='Cerrada';});
    var uni=rows.reduce(function(s,o){return s+(Number(o.cantidad_unidades)||0);},0);
    var ftf=cerr.filter(function(o){return String(((o.kpi)||{}).ftf||'').toUpperCase()==='SI';}).length;
    var alta=cerr.filter(function(o){return ((o.kpi)||{}).nivel==='ALTA';}).length;
    add('— PARIDAD vs EXCEL —');
    add('OTs: '+rows.length+' (Excel 153) · Unidades: '+uni+' (Excel 260)');
    add('Cerradas: '+cerr.length+' (Excel 144) · FTF SI: '+ftf+' (Excel 142) · SLA ALTA: '+alta+' (Excel 142)');
    add('✔ Proceso terminado.');
    setBusy(false); onOk();
    avisar('Import terminado',T.ok);
  }

  return (
    <div style={S.card}>
      <h2 style={S.h2}>Importar historial KPIs (CSV de tu Excel)</h2>
      <p style={S.sub}>Selecciona tus CSV (hoja OT_SERVICIO exportada como CSV UTF-8, separador ;). Dedupe por ID OT · clientes por RUT (sin RUT → SINRUT-id) · upsert por ext_id en lotes de 100. Al terminar muestra la tabla de paridad contra tu Excel.</p>
      <input type="file" accept=".csv" multiple disabled={busy} onChange={onFiles}/>
      {busy? <p style={{...S.sub,color:T.info}}>Procesando… no cierres esta pestaña.</p> : null}
      <pre style={{background:T.surface2,borderRadius:8,padding:10,fontSize:12,whiteSpace:'pre-wrap',minHeight:160}}>{log}</pre>
    </div>
  );
}
