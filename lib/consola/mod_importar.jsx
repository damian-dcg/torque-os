'use client';
import { useState } from 'react';
import { supabase } from '../supabase';
import { T, S } from '../ui';
import { emit } from '../data';

function norm(h){ return String(h||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,''); }
function money(s){ if(s==null)return 0; var t=String(s).replace(/[^0-9.,-]/g,''); if(t===''||t==='-')return 0; if(t.indexOf(',')>=0)t=t.replace(/,/g,''); return parseFloat(t)||0; }
function fdate(s){ if(!s)return null; var p=String(s).split('/'); if(p.length===3){ var m=+p[0],d=+p[1],y=+p[2]; if(y<100)y+=2000; return y+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0'); } var d2=new Date(s); return isNaN(d2)?null:d2.toISOString().slice(0,10); }
function normRut(x){ var s=String(x||'').replace(/[.\s]/g,'').toUpperCase(); if(s&&s.indexOf('-')<0&&s.length>1)s=s.slice(0,-1)+'-'+s.slice(-1); return s; }

export default function ModImportar(props){
  var avisar=props.avisar||function(){};
  var [busy,setBusy]=useState(false); var [log,setLog]=useState('');
  async function procesar(file){
    setBusy(true); setLog('Leyendo…');
    var text=await file.text();
    var lines=text.split(/\r?\n/).filter(function(l){ return l.trim(); });
    var sep=lines[0].indexOf(';')>=0?';':(lines[0].indexOf('|')>=0?'|':',');
    var head=lines[0].split(sep).map(norm);
    var idx={}; head.forEach(function(h,i){ idx[h]=i; });
    function C(r,k){ var i=idx[norm(k)]; return i!=null?String(r[i]||'').trim():''; }
    var rows=lines.slice(1).filter(function(r){ return C(r,'ID OT'); });
    setLog('Filas: '+rows.length+'. Vinculando clientes…');
    var cmap={};
    rows.forEach(function(r){ var rut=normRut(C(r,'RUT Cliente')||C(r,'RUT Limpio')); var nom=C(r,'Cliente')||'Cliente'; var k=rut||('N'+nom); if(k&&!cmap[k])cmap[k]={rut:rut||null,nombre:nom}; });
    var ex=await supabase.from('customers').select('id,rut,nombre').limit(5000);
    var byRut={},byName={}; (ex.data||[]).forEach(function(c){ if(c.rut)byRut[normRut(c.rut)]=c.id; byName[String(c.nombre||'').toUpperCase()]=c.id; });
    var nuevos=[]; Object.keys(cmap).forEach(function(k){ var c=cmap[k]; var id=(c.rut&&byRut[c.rut])||byName[String(c.nombre).toUpperCase()]; if(id)c.id=id; else nuevos.push({rut:c.rut,nombre:c.nombre,tipo:'final'}); });
    if(nuevos.length){ var ins=await supabase.from('customers').insert(nuevos).select('id,rut,nombre'); (ins.data||[]).forEach(function(c){ if(c.rut)byRut[normRut(c.rut)]=c.id; byName[String(c.nombre||'').toUpperCase()]=c.id; }); }
    setLog('Clientes OK. Cargando OTs…');
    var ots=[]; var salt=0;
    rows.forEach(function(r){
      var rut=normRut(C(r,'RUT Cliente')||C(r,'RUT Limpio'));
      var cid=(rut&&byRut[rut])||byName[String(C(r,'Cliente')).toUpperCase()]||null;
      if(!cid){ salt++; return; }
      var est=String(C(r,'Estado OT')).toLowerCase();
      ots.push({
        ext_id:C(r,'ID OT'), customer_id:cid,
        tipo:C(r,'Tipo Servicio')||'servicio', tipo_equipo:C(r,'Tipo Equipo'),
        estado:est.indexOf('cerrada')>=0?'Cerrada':'Ingresada',
        creado_en:(function(){ var f=fdate(C(r,'Fecha Ingreso')); return f?f+'T12:00:00':null; })(),
        descripcion:C(r,'Detalle')||null, canal:'vba',
        tecnico_nombre:C(r,'Técnico Asignado')||null, quien_registra:C(r,'¿Quien Registra?')||null,
        modelo:C(r,'Modelo')||null, modelo_limpio:C(r,'Modelo Limpio')||null,
        cantidad_unidades:parseInt(C(r,'Cantidad Unidades'),10)||1,
        usa_repuestos:C(r,'¿Usa Repuestos?')||null, repuesto:C(r,'Repuesto')||null, falla_fabrica:C(r,'¿Falla de Fábrica?')||null,
        fecha_promesa:fdate(C(r,'Fecha Promesa')), fecha_inicio:fdate(C(r,'Fecha Inicio')),
        fecha_fin_tecnico:fdate(C(r,'Fecha Fin Técnico')), fecha_entrega_cliente:fdate(C(r,'Fecha Entrega Cliente')),
        horas:parseFloat(C(r,'Horas Trabajadas'))||0,
        costo_mo:money(C(r,'Costo Mano Obra')), venta_mo:money(C(r,'Venta Mano Obra')),
        costo_rep:money(C(r,'Costo Repuestos')), venta_rep:money(C(r,'Venta Repuestos')),
        costo_tras:money(C(r,'Costo Traslado')), venta_tras:money(C(r,'Venta Traslado')),
        costo_otros:money(C(r,'Costo Otros')), venta_otros:money(C(r,'Venta Otros')),
        venta_total:money(C(r,'Venta Total')), costo_total:money(C(r,'Costo Total')),
        margen:money(C(r,'Margen Bruto')), pct_margen:C(r,'% Margen'),
        iva:money(C(r,'IVA')), total_pagar:money(C(r,'Total a Pagar')),
        entrega_tiempo:C(r,'Entrega a Tiempo')||null, dias_reparacion:parseFloat(C(r,'Días Reparación'))||0,
        reclamo:C(r,'Reclamo Cliente')||null, nota:parseInt(C(r,'Nota Cliente'),10)||0, nivel:C(r,'Nivel Satisfacción')||null,
        kpi:{ tipo_equipo:C(r,'Tipo Equipo'), tipo_servicio:C(r,'Tipo Servicio'), horas:parseFloat(C(r,'Horas Trabajadas'))||0,
          venta_mo:money(C(r,'Venta Mano Obra')), costo_rep:money(C(r,'Costo Repuestos')), venta_rep:money(C(r,'Venta Repuestos')),
          venta_total:money(C(r,'Venta Total')), costo_total:money(C(r,'Costo Total')), margen:money(C(r,'Margen Bruto')),
          pct_margen:C(r,'% Margen'), ftf:C(r,'First Time Fix'), dias:parseFloat(C(r,'Días Reparación'))||0,
          reincidencia:C(r,'Reincidencia'), reclamo:C(r,'Reclamo Cliente'), nota:parseInt(C(r,'Nota Cliente'),10)||0,
          nivel:C(r,'Nivel Satisfacción'), usa_rep:C(r,'¿Usa Repuestos?'), alerta:C(r,'Alerta Repuestos'),
          mes:C(r,'Mes Ingreso'), anio:C(r,'Año Ingreso'), repuesto:C(r,'Repuesto'), falla:C(r,'¿Falla de Fábrica?') }
      });
    });
    var ok=0; var err='';
    for(var i=0;i<ots.length;i+=200){ var res=await supabase.from('work_orders').upsert(ots.slice(i,i+200),{onConflict:'ext_id'}); if(res.error){ err=res.error.message; break; } ok+=Math.min(200,ots.length-i); setLog('OTs '+Math.min(i+200,ots.length)+'/'+ots.length+'…'); }
    setLog('✅ Cargadas: '+ok+' OTs · clientes: '+Object.keys(cmap).length+(salt?(' · sin cliente: '+salt):'')+(err?(' · ERR: '+err):''));
    avisar(err?'⛗ '+err:'✅ Historial importado', err?T.danger:T.ok);
    emit(); if(props.onOk) props.onOk(); setBusy(false);
  }
  return (
    <div style={S.card}>
      <h2 style={S.h2}>Importar historial KPIs (CSV/TXT)</h2>
      <p style={S.sub}>Mapeo por encabezado. Ignora "Estado Data Original". El esquema del proyecto es la fuente de verdad; el Excel solo aporta datos.</p>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <label style={{...S.btnO(T.ok),width:'auto',marginBottom:0,cursor:'pointer'}}>📥 Seleccionar archivo
          <input type="file" accept=".csv,.txt" style={{display:'none'}} disabled={busy} onChange={function(e){ procesar(e.target.files[0]); }}/>
        </label>
      </div>
      {log? <p style={{color:T.info,marginTop:10,fontWeight:700}}>{log}</p> : null}
    </div>);
}
