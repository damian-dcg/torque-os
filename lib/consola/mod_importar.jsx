'use client';
import { useState } from 'react';
import { supabase } from '../supabase';
import { T, S } from '../ui';
import { emit } from '../data';

var MAP={'id ot':'id','fecha ingreso':'fing','cliente':'cli','rut cliente':'rut','rut limpio':'rutl','tipo equipo':'eq','quien registra':'reg','modelo':'mod','tipo servicio':'sv','técnico asignado':'tec','tecnico asignado':'tec','fecha promesa':'fp','fecha inicio':'fi','fecha fin técnico':'ff','fecha fin tecnico':'ff','fecha entrega cliente':'fe','estado':'est','cantidad unidades':'cant','venta mano obra':'vmo','costo repuestos':'crep','venta repuestos':'vrep','costo traslado':'ctra','venta traslado':'vtra','costo otros':'cotr','venta otros':'votr','costo total':'ctot','venta total':'vtot','margen bruto $':'mar','margen bruto':'mar','% margen':'pmar','first time fix':'ftf','días reparación':'dias','dias reparación':'dias','dias reparacion':'dias','reincidencia':'rei','reclamo cliente':'rec','nota cliente':'nota','nivel satisfacción':'niv','nivel satisfaccion':'niv','usa repuestos':'urep','alerta repuestos':'ale','mes ingreso':'mes','año ingreso':'anio','ano ingreso':'anio','detalle':'det','repuesto':'rep','modelo limpio':'mlim','falla de fábrica':'falla','falla de fabrica':'falla'};
function money(s){ if(s==null)return 0; var t=String(s).replace(/[^0-9.,-]/g,''); if(t===''||t==='-')return 0; if(t.indexOf(',')>=0)t=t.replace(/,/g,''); return parseFloat(t)||0; }
function fdate(s){ if(!s)return null; var p=String(s).split('/'); if(p.length===3){ var m=parseInt(p[0],10),d=parseInt(p[1],10),y=parseInt(p[2],10); if(y<100)y+=2000; return y+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0'); } var dt=new Date(s); return isNaN(dt)?null:dt.toISOString().slice(0,10); }
function normRut(x){ var s=String(x||'').replace(/[.\s]/g,'').toUpperCase(); if(s&&s.indexOf('-')<0&&s.length>1) s=s.slice(0,-1)+'-'+s.slice(-1); return s; }

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
    setLog('Filas OT: '+rows.length+'. Normalizando clientes…');
    var cmap={};
    rows.forEach(function(r){
      var rut=normRut(C(r,'rutl',4)||C(r,'rut',3));
      var nom=C(r,'cli',2)||'Cliente';
      var key=rut||('N'+nom);
      if(key&&!cmap[key]) cmap[key]={rut:rut||null,nombre:nom};
    });
    var ex=await supabase.from('customers').select('id,rut,nombre').limit(5000);
    var byRut={},byName={};
    (ex.data||[]).forEach(function(c){ if(c.rut)byRut[normRut(c.rut)]=c.id; byName[String(c.nombre||'').toUpperCase()]=c.id; });
    var nuevos=[];
    Object.keys(cmap).forEach(function(k){ var c=cmap[k]; var id=(c.rut&&byRut[c.rut])||byName[String(c.nombre).toUpperCase()]; if(id){ c.id=id; } else { nuevos.push({rut:c.rut,nombre:c.nombre,tipo:'final'}); } });
    if(nuevos.length){
      var ins=await supabase.from('customers').insert(nuevos).select('id,rut,nombre');
      if(ins.error) setLog('⚠ Clientes: '+ins.error.message);
      (ins.data||[]).forEach(function(c){ if(c.rut)byRut[normRut(c.rut)]=c.id; byName[String(c.nombre||'').toUpperCase()]=c.id; });
    }
    setLog('Clientes listos. Cargando OTs…');
    var TIPOS={'ARMADO':'armado_unidad','GARANTIA':'repuesto_garantia','EVALUACION':'evaluacion','POST VENTA':'servicio','DEVOLUCION':'devolucion_dinero','RETIRO':'retiro','RECLAMO':'reclamo','MANTENCION':'mantencion'};
    var ots=[]; var saltadas=0;
    rows.forEach(function(r){
      var rut=normRut(C(r,'rutl',4)||C(r,'rut',3));
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
    for(var i=0;i<ots.length;i+=200){
      var res=await supabase.from('work_orders').upsert(ots.slice(i,i+200),{onConflict:'ext_id'});
      if(res.error){ errOt=res.error.message; break; }
      ok+=Math.min(200,ots.length-i);
      setLog('OTs '+Math.min(i+200,ots.length)+'/'+ots.length+'…');
    }
    setLog('✅ Cargadas: '+ok+' OTs · saltadas sin cliente: '+saltadas+(errOt?(' · ERR: '+errOt):''));
    avisar(errOt?'⛗ Revisa el log':'✅ Historial importado', errOt?T.danger:T.ok);
    emit(); if(props.onOk) props.onOk();
    setBusy(false);
  }
  return (
    <div style={S.card}>
      <h2 style={S.h2}>Importar historial KPIs (CSV/TXT)</h2>
      <p style={S.sub}>RUTs normalizados sin puntos y con guion (ej. 15900071-0). No duplica (clave = ID OT).</p>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <label style={{...S.btnO(T.ok),width:'auto',marginBottom:0,cursor:'pointer'}}>📥 Seleccionar archivo
          <input type="file" accept=".csv,.txt" style={{display:'none'}} disabled={busy} onChange={function(e){ procesar(e.target.files[0]); }}/>
        </label>
        <button style={{...S.btnO(T.info),width:'auto',marginBottom:0}} onClick={plantilla}>⬇ Plantilla CSV</button>
      </div>
      {log? <p style={{color:T.info,marginTop:10,fontWeight:700}}>{log}</p> : null}
    </div>);
}
