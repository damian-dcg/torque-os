'use client';
import { useState } from 'react';
import { supabase } from '../supabase';
import { T, S } from '../ui';
import { emit } from '../data';

var MAP={'id ot':'id','fecha ingreso':'fing','cliente':'cli','rut cliente':'rut','rut limpio':'rutl','tipo equipo':'eq','quien registra':'reg','modelo':'mod','tipo servicio':'sv','técnico asignado':'tec','tecnico asignado':'tec','fecha promesa':'fp','fecha inicio':'fi','fecha fin técnico':'ff','fecha fin tecnico':'ff','fecha entrega cliente':'fe','estado':'est','cantidad unidades':'cant','venta mano obra':'vmo','costo repuestos':'crep','venta repuestos':'vrep','costo traslado':'ctra','venta traslado':'vtra','costo otros':'cotr','venta otros':'votr','costo total':'ctot','venta total':'vtot','margen bruto $':'mar','margen bruto':'mar','% margen':'pmar','first time fix':'ftf','días reparación':'dias','dias reparación':'dias','dias reparacion':'dias','reincidencia':'rei','reclamo cliente':'rec','nota cliente':'nota','nivel satisfacción':'niv','nivel satisfaccion':'niv','usa repuestos':'urep','alerta repuestos':'ale','mes ingreso':'mes','año ingreso':'anio','ano ingreso':'anio','detalle':'det','repuesto':'rep','modelo limpio':'mlim','falla de fábrica':'falla','falla de fabrica':'falla'};
function money(s){ if(s==null)return 0; var t=String(s).replace(/[^0-9.,-]/g,''); if(t===''||t==='-')return 0; if(t.indexOf(',')>=0)t=t.replace(/,/g,''); return parseFloat(t)||0; }
function fdate(s){ if(!s)return null; var p=String(s).split('/'); if(p.length===3){ var m=parseInt(p[0],10),d=parseInt(p[1],10),y=parseInt(p[2],10); if(y<100)y+=2000; return y+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0'); } var dt=new Date(s); return isNaN(dt)?null:dt.toISOString().slice(0,10); }

export default function ModImportar(props){
  var avisar=props.avisar||function(){};
  var s1=useState(false),busy=s1[0],setBusy=s1[1];
  var s2=useState(''),log=s2[0],setLog=s2[1];
  function plantilla(){
    var h=['ID OT','Fecha Ingreso','Cliente','RUT Cliente','RUT Limpio','Tipo Equipo','Quien Registra','Modelo','Tipo Servicio','Técnico Asignado','Fecha Promesa','Fecha Inicio','Fecha Fin Técnico','Fecha Entrega Cliente','Estado','Cantidad Unidades','Venta Mano Obra','Costo Repuestos','Venta Repuestos','Costo Traslado','Venta Traslado','Costo Otros','Venta Otros','Costo Total','Venta Total','Margen Bruto $','% Margen','First Time Fix','Días Reparación','Reincidencia','Reclamo Cliente','Nota Cliente','Nivel Satisfacción','Usa Repuestos','Alerta Repuestos','Mes Ingreso','Año Ingreso','Detalle','Repuesto','Modelo Limpio','Falla de Fábrica'];
    var a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob(['\uFEFF'+h.join(';')+'\n'],{type:'text/csv'}));
    a.download='PLANTILLA_KPIs.csv'; a.click();
  }
  async function procesar(file){
    setBusy(true); setLog('Leyendo archivo…');
    var text=await file.text();
    var lines=text.split(/\r?\n/).filter(function(l){ return l.trim(); });
    var sep=lines[0].indexOf(';')>=0?';':(lines[0].indexOf('|')>=0?'|':',');
    var head=lines[0].split(sep).map(function(h){ return h.trim().toLowerCase(); });
    var idx={};
    head.forEach(function(h,i){ var k=MAP[h]; if(k&&idx[k]==null) idx[k]=i; });
    var hasHead=Object.keys(idx).length>=5;
    function C(r,key,pos){ var i=(hasHead&&idx[key]!=null)?idx[key]:pos; return String(r[i]||'').trim(); }
    var rows=lines.slice(1).filter(function(r){ var id=C(r,'id',0); return id&&(/^[0-9]+$/.test(id)||id.indexOf('S_')===0); });
    setLog('Filas OT: '+rows.length+'. Creando clientes…');
    var cmap={};
    rows.forEach(function(r){
      var rut=String(C(r,'rutl',4)||C(r,'rut',3)).replace(/[^0-9kK]/g,'');
      var nom=C(r,'cli',2)||'Cliente';
      var key=rut||('N'+nom);
      if(key&&!cmap[key]) cmap[key]={rut:rut||null,nombre:nom};
    });
    var nuevos=Object.keys(cmap).map(function(k){ return cmap[k]; });
    var errCli='';
    for(var a=0;a<nuevos.length;a+=200){
      var ins=await supabase.from('customers').insert(nuevos.slice(a,a+200));
      if(ins.error){ errCli=ins.error.message; break; }
    }
    var ex=await supabase.from('customers').select('id,rut,nombre').limit(5000);
    var byRut={},byName={};
    (ex.data||[]).forEach(function(c){ if(c.rut)byRut[String(c.rut).replace(/[^0-9kK]/g,'')]=c.id; byName[String(c.nombre||'').toUpperCase()]=c.id; });
    setLog('Clientes en base: '+(ex.data||[]).length+(errCli?(' · ERR clientes: '+errCli):'')+'. Cargando OTs…');
    var TIPOS={'ARMADO':'armado_unidad','GARANTIA':'repuesto_garantia','EVALUACION':'evaluacion','POST VENTA':'servicio','DEVOLUCION':'devolucion_dinero','RETIRO':'retiro','RECLAMO':'reclamo','MANTENCION':'mantencion'};
    var ots=[]; var saltadas=0;
    rows.forEach(function(r){
      var rut=String(C(r,'rutl',4)||C(r,'rut',3)).replace(/[^0-9kK]/g,'');
      var cid=(rut&&byRut[rut])||byName[String(C(r,'cli',2)).toUpperCase()]||null;
      if(!cid){ saltadas++; return; }
      ots.push({
        ext_id:C(r,'id',0), customer_id:cid,
        tipo:TIPOS[String(C(r,'sv',8)).toUpperCase()]||'servicio',
        estado:String(C(r,'est',14)).toLowerCase().indexOf('cerrada')>=0?'Cerrada':'Ingresada',
        creado_en:(function(){ var f=fdate(C(r,'fing',1)); return f?f+'T12:00:00':null; })(),
        descripcion:C(r,'det',39)||null, canal:'vba',
        tecnico_nombre:C(r,'tec',9)||null, quien_registra:C(r,'reg',6)||null,
        modelo_limpio:C(r,'mlim',42)||C(r,'mod',7)||null,
        fecha_promesa:fdate(C(r,'fp',10)), fecha_inicio:fdate(C(r,'fi',11)), fecha_fin_tecnico:fdate(C(r,'ff',12)), fecha_entrega_cliente:fdate(C(r,'fe',13)),
        cantidad_unidades:parseInt(C(r,'cant',15),10)||1,
        kpi:{tipo_equipo:C(r,'eq',5),tipo_servicio:C(r,'sv',8),horas:0,
          venta_mo:money(C(r,'vmo',16)),costo_rep:money(C(r,'crep',17)),venta_rep:money(C(r,'vrep',18)),
          costo_tras:money(C(r,'ctra',19)),venta_tras:money(C(r,'vtra',20)),costo_otros:money(C(r,'cotr',21)),venta_otros:money(C(r,'votr',22)),
          costo_total:money(C(r,'ctot',23)),venta_total:money(C(r,'vtot',24)),margen:money(C(r,'mar',25)),pct_margen:C(r,'pmar',26),
          ftf:C(r,'ftf',27),dias:parseFloat(C(r,'dias',28))||0,reincidencia:C(r,'rei',29),reclamo:C(r,'rec',30),
          nota:parseInt(C(r,'nota',31),10)||0,nivel:C(r,'niv',32),usa_rep:C(r,'urep',33),alerta:C(r,'ale',34),
          mes:C(r,'mes',37),anio:C(r,'anio',38),repuesto:C(r,'rep',41),falla:C(r,'falla',44)}
      });
    });
    var ok=0; var errOt='';
    for(var b=0;b<ots.length;b+=200){
      var res=await supabase.from('work_orders').upsert(ots.slice(b,b+200),{onConflict:'ext_id'});
      if(res.error){ errOt=res.error.message; break; }
      ok+=Math.min(200,ots.length-b);
      setLog('OTs '+Math.min(b+200,ots.length)+'/'+ots.length+'…');
    }
    setLog('✅ Cargadas: '+ok+' OTs · saltadas sin cliente: '+saltadas+(errOt?(' · ERR OTs: '+errOt):''));
    avisar(errOt?'⛗ Revisa el log':'✅ Historial importado', errOt?T.danger:T.ok);
    emit(); if(props.onOk) props.onOk();
    setBusy(false);
  }
  return (
    <div style={S.card}>
      <h2 style={S.h2}>Importar historial KPIs (CSV/TXT)</h2>
      <p style={S.sub}>Crea clientes por RUT o nombre y carga todas las OTs con sus KPIs. Re-ejecutable: no duplica (clave = ID OT).</p>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <label style={{...S.btnO(T.ok),width:'auto',marginBottom:0,cursor:'pointer'}}>📥 Seleccionar archivo
          <input type="file" accept=".csv,.txt" style={{display:'none'}} disabled={busy} onChange={function(e){ procesar(e.target.files[0]); }}/>
        </label>
        <button style={{...S.btnO(T.info),width:'auto',marginBottom:0}} onClick={plantilla}>⬇ Plantilla CSV (encabezados listos)</button>
      </div>
      {log? <p style={{color:T.info,marginTop:10,fontWeight:700}}>{log}</p> : null}
    </div>);
}
