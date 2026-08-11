'use client';
import { useState } from 'react';
import { supabase } from '../supabase';
import { T, S } from '../ui';
import { emit } from '../data';

var mapTipo={'ARMADO':'armado_unidad','GARANTIA':'repuesto_garantia','EVALUACION':'evaluacion','POST VENTA':'servicio','DEVOLUCION':'devolucion_dinero','RETIRO':'retiro','RECLAMO':'reclamo','MANTENCION':'mantencion'};
function money(s){ if(s==null)return 0; var t=String(s).replace(/[^0-9.,-]/g,''); if(t===''||t==='-')return 0; if(t.indexOf(',')>=0)t=t.replace(/,/g,''); return parseFloat(t)||0; }
function fdate(s){ if(!s)return null; var p=String(s).split('/'); if(p.length===3){ var m=parseInt(p[0],10),d=parseInt(p[1],10),y=parseInt(p[2],10); if(y<100)y+=2000; return y+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0'); } var dt=new Date(s); return isNaN(dt)?null:dt.toISOString().slice(0,10); }
var HEAD=['ID OT','Fecha Ingreso','Cliente','RUT Cliente','RUT Limpio','Tipo Equipo','Quien Registra','Modelo','Tipo Servicio','Técnico Asignado','Fecha Promesa','Fecha Inicio','Fecha Fin Técnico','Fecha Entrega Cliente','Estado','Cantidad Unidades','Venta MO','Costo Rep','Venta Rep','Costo Tras','Venta Tras','Costo Otros','Venta Otros','Costo Total','Venta Total','Margen','% Margen','FTF','Días','Reincidencia','Reclamo','Nota','Nivel','Usa Rep','Alerta','Estado Data','Mes','Año','Detalle','Cantidad','Repuesto','Modelo Limpio','Falla Fábrica'];

export default function ModImportar(props){
  var avisar=props.avisar||function(){};
  var s1=useState(false),busy=s1[0],setBusy=s1[1];
  var s2=useState(''),log=s2[0],setLog=s2[1];
  function plantilla(){
    var a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob(['\uFEFF'+HEAD.join(';')+'\n'],{type:'text/csv'}));
    a.download='PLANTILLA_TORQUE-OS.csv'; a.click();
  }
  async function procesar(file){
    setBusy(true); setLog('Leyendo archivo…');
    var text=await file.text();
    var lines=text.split(/\r?\n/).filter(function(l){return l.trim();});
    var sep=lines[0].indexOf('|')>=0?'|':(lines[0].indexOf(';')>=0?';':',');
    var rows=lines.map(function(l){return l.split(sep).map(function(x){return x.trim();});})
      .filter(function(r){ return r[0]&&(r[0].indexOf('S_')===0||/^[0-9]+$/.test(r[0]))&&r[2]; });
    setLog('Filas OT detectadas: '+rows.length+'. Creando clientes…');
    var cmap={};
    rows.forEach(function(r){
      var rut=String(r[4]||r[3]||'').replace(/[^0-9kK]/g,'');
      var key=rut||('N'+(r[2]||''));
      if(key&&!cmap[key]) cmap[key]={rut:rut||null,nombre:r[2]||'Cliente'};
    });
    var existentes=await supabase.from('customers').select('id,rut,nombre').limit(1000);
    var byRut={},byName={};
    (existentes.data||[]).forEach(function(c){ if(c.rut)byRut[String(c.rut).replace(/[^0-9kK]/g,'')]=c.id; byName[(c.nombre||'').toUpperCase()]=c.id; });
    var nuevos=Object.keys(cmap).filter(function(k){ var c=cmap[k]; return !(c.rut&&byRut[c.rut])&&!byName[(c.nombre||'').toUpperCase()]; })
      .map(function(k){ return {rut:cmap[k].rut,nombre:cmap[k].nombre,tipo:'final'}; });
    if(nuevos.length){ var ins=await supabase.from('customers').insert(nuevos).select('id,rut,nombre'); (ins.data||[]).forEach(function(c){ if(c.rut)byRut[String(c.rut).replace(/[^0-9kK]/g,'')]=c.id; byName[(c.nombre||'').toUpperCase()]=c.id; }); }
    setLog('Clientes listos. Cargando OTs…');
    var ots=[]; var saltadas=0;
    rows.forEach(function(r){
      var rut=String(r[4]||r[3]||'').replace(/[^0-9kK]/g,'');
      var cid=rut?byRut[rut]:null; if(!cid) cid=byName[(r[2]||'').toUpperCase()]||null;
      if(!cid){ saltadas++; return; }
      ots.push({ ext_id:r[0], customer_id:cid, tipo:mapTipo[String(r[8]||'').toUpperCase()]||'servicio',
        estado:String(r[14]||'').toLowerCase().indexOf('cerrada')>=0?'Cerrada':'Ingresada',
        creado_en:fdate(r[1])?fdate(r[1])+'T12:00:00':null, descripcion:r[38]||null, canal:'vba',
        tecnico_nombre:r[9]||null, quien_registra:r[6]||null, modelo_limpio:r[41]||r[7]||null,
        fecha_promesa:fdate(r[10]), fecha_inicio:fdate(r[11]), fecha_fin_tecnico:fdate(r[12]), fecha_entrega_cliente:fdate(r[13]),
        cantidad_unidades:parseInt(r[39],10)||parseInt(r[15],10)||1,
        kpi:{tipo_equipo:r[5],tipo_servicio:r[8],horas:parseFloat(r[15])||0,venta_mo:money(r[16]),costo_rep:money(r[17]),venta_rep:money(r[18]),costo_tras:money(r[19]),venta_tras:money(r[20]),costo_otros:money(r[21]),venta_otros:money(r[22]),costo_total:money(r[23]),venta_total:money(r[24]),margen:money(r[25]),pct_margen:r[26],ftf:r[27],dias:parseFloat(r[28])||0,reincidencia:r[29],reclamo:r[30],nota:parseInt(r[31],10)||0,nivel:r[32],usa_rep:r[33],alerta:r[34],mes:r[37],anio:r[38],repuesto:r[40],falla:r[43]} });
    });
    var ok=0; var primerError='';
    for(var i=0;i<ots.length;i+=200){
      var res=await supabase.from('work_orders').upsert(ots.slice(i,i+200),{onConflict:'ext_id'});
      if(res.error){ if(!primerError) primerError=res.error.message; }
      else ok+=Math.min(200,ots.length-i);
      setLog('OTs '+Math.min(i+200,ots.length)+'/'+ots.length+'…');
    }
    setLog('✅ Cargadas: '+ok+' OTs · saltadas sin cliente: '+saltadas+(primerError?(' · ERROR: '+primerError):''));
    avisar(primerError?'⛗ Revisa el log':'✅ Historial importado', primerError?T.danger:T.ok);
    emit(); if(props.onOk) props.onOk();
    setBusy(false);
  }
  return (
    <div style={S.card}>
      <h2 style={S.h2}>Importar historial KPIs (CSV/TXT)</h2>
      <p style={S.sub}>Crea clientes por RUT o nombre y carga todas las OTs con sus KPIs. Re-ejecutable: no duplica (clave = ID OT).</p>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <label style={{...S.btnO(T.ok),cursor:'pointer',display:'inline-block',width:'auto',marginBottom:0}}>📥 Seleccionar archivo
          <input type="file" accept=".csv,.txt" style={{display:'none'}} disabled={busy} onChange={function(e){ procesar(e.target.files[0]); }}/>
        </label>
        <button style={{...S.btnO(T.info),width:'auto',marginBottom:0}} onClick={plantilla}>⬇ Plantilla CSV (encabezados listos)</button>
      </div>
      {log? <p style={{color:T.info,marginTop:10,fontWeight:700}}>{log}</p> : null}
    </div>);
}
