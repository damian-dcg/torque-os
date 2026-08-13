'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S } from '../ui';
import { emit } from '../data';

const MANUAL=['ID OT','Fecha Ingreso','Cliente','RUT Cliente','Tipo Equipo','¿Quien Registra?','Modelo','Tipo Servicio','Técnico Asignado','Fecha Inicio','Fecha Fin Técnico','Fecha Entrega Cliente','¿Usa Repuestos?','Estado Data Original','Detalle','Cantidad Unidades','Repuesto'];
const MAP={'id ot':'id','fecha ingreso':'fing','cliente':'cli','rut cliente':'rut','tipo equipo':'eq','¿quien registra?':'reg','quien registra':'reg','modelo':'mod','tipo servicio':'sv','técnico asignado':'tec','tecnico asignado':'tec','fecha inicio':'fi','fecha fin técnico':'ff','fecha fin tecnico':'ff','fecha entrega cliente':'fe','¿usa repuestos?':'urep','usa repuestos':'urep','estado data original':'edo','detalle':'det','cantidad unidades':'cant','repuesto':'rep','id ot rep':'idrep','costo total':'ct','venta total':'vt'};
const BIANCHI=['968088807'];
const CERO=['GARANTIA','RECLAMO','CAMBIO','DEVOLUCION','ANULACION'];
function normRut(x){ var s=String(x||'').replace(/[.\s]/g,'').toUpperCase(); if(s&&s.indexOf('-')<0&&s.length>1) s=s.slice(0,-1)+'-'+s.slice(-1); return s; }
function rutL(x){ return String(x||'').replace(/[.\s-]/g,'').toUpperCase(); }
function fdate(s){ if(!s)return null; var p=String(s).split('/'); if(p.length===3){ var m=+p[0],d=+p[1],y=+p[2]; if(y<100)y+=2000; return new Date(y,m-1,d); } var d2=new Date(s); return isNaN(d2)?null:d2; }
function slaDias(ts,te){ var t=String(ts||'').toUpperCase(),q=String(te||'').toUpperCase(); if(t==='ARMADO'){ if(q==='BICICLETA'||q==='BICICLETA ELECTRICA')return 3; if(q==='MAQUINA'||q==='SCOOTER ELECTRICO')return 5; return 10; } return 15; }
function modeloLimpio(mod){ var m=String(mod||'').toUpperCase().replace(/[\s.-]/g,''); if(!m)return 'Otros Modelos';
  var cat=[['CASCO','Cascos'],['ZAPA','Zapatillas'],['GUAN','Guantes'],['NEUM','Neumáticos'],['LLANTA','Llantas'],['PEDAL','Pedales'],['MUCC','Mucc-Off'],['SCOOT','Scooters'],['BAD','Scooters'],['BAF','Scooters'],['STONE','Bicicleta Stone'],['EVOL','Bicicleta Evolution'],['AGGRE','Bicicleta Aggressor'],['AGRE','Bicicleta Aggressor'],['KAPRA','Bicicleta Kapra'],['ADVAN','Bicicleta Advantage'],['PEREG','Bicicleta Peregrine'],['REKORD','Bicicleta Rekord'],['CORSA','Bicicleta Corsa'],['FREES','Bicicleta Freestyle'],['TOUR','Bicicleta Touring'],['STREET','Bicicleta Street'],['PRO26','Bicicleta Pro'],['CLASSIC','Bicicleta Classic'],['GOLIAT','Bicicleta Goliat'],['KITTY','Bicicleta Kitty'],['BARBIE','Bicicleta Hotwheels'],['HOTWHEEL','Bicicleta Hotwheels'],['ALLOY','Bicicleta Alloy']];
  for(var i=0;i<cat.length;i++){ if(m.indexOf(cat[i][0])>=0) return cat[i][1]; }
  var pre=['BFT','MP','E1','E8','E9','SP','M1','M4','M6','M7','M8','M9','BBA','BFB','R3'];
  var len={BFT:7,MP:5,E1:5,E8:4,E9:4,SP:6,M1:5,M4:4,M6:4,M7:4,M8:4,M9:4,BBA:7,BFB:7,R3:5};
  for(var j=0;j<pre.length;j++){ var ix=m.indexOf(pre[j]); if(ix>=0) return m.substr(ix,len[pre[j]]); }
  return 'Otros Modelos'; }
function money(s){ if(s==null)return 0; var t=String(s).replace(/[^0-9.,-]/g,''); if(t===''||t==='-')return 0; if(t.indexOf(',')>=0)t=t.replace(/,/g,''); return parseFloat(t)||0; }

export default function ModImportar(props){
  var avisar=props.avisar||function(){};
  var [log,setLog]=useState('');
  var [hs,setHs]=useState({}); var [rates,setRates]=useState({});
  useEffect(function(){ (async function(){
    var a=await supabase.from('settings').select('valor').eq('clave','horas_estandar').single();
    var b=await supabase.from('tech_rates').select('*');
    if(a.data) setHs(a.data.valor||{});
    var m={}; (b.data||[]).forEach(function(r){ m[String(r.technician).toUpperCase()]={c:+r.costo_x_hora||0,v:+r.venta_x_hora||0}; });
    setRates(m);
  })(); },[]);

  function parse(file){ return file.text(); }

  async function procesar(otFile,repFile){
    setLog('Leyendo…');
    var text=await parse(otFile);
    var lines=text.split(/\r?\n/).filter(function(l){ return l.trim(); });
    var sep=lines[0].indexOf(';')>=0?';':(lines[0].indexOf('|')>=0?'|':',');
    var head=lines[0].split(sep).map(function(h){ return h.trim().toLowerCase(); });
    var idx={}; head.forEach(function(h,i){ var k=MAP[h]; if(k&&idx[k]==null) idx[k]=i; });
    function C(r,k){ var i=idx[k]; return i!=null?String(r[i]||'').trim():''; }
    var rows=lines.slice(1).map(function(l){ return l.split(sep); }).filter(function(r){ return C(r,'id'); });

    var parts={};
    if(repFile){ var rt=await parse(repFile); var rl=rt.split(/\r?\n/).filter(function(l){ return l.trim(); }); var rsep=rl[0].indexOf(';')>=0?';':','; var rh=rl[0].split(rsep).map(function(h){ return h.trim().toLowerCase(); }); var ri={}; rh.forEach(function(h,i){ var k=MAP[h]; if(k&&ri[k]==null) ri[k]=i; });
      rl.slice(1).forEach(function(l){ var r=l.split(rsep); var id=String(r[ri.idrep]||'').trim(); if(!id)return; if(!parts[id])parts[id]={c:0,v:0}; parts[id].c+=money(r[ri.ct]); parts[id].v+=money(r[ri.vt]); }); }

    // clientes
    var ex=await supabase.from('customers').select('id,rut,nombre').limit(2000);
    var byRut={},byName={}; (ex.data||[]).forEach(function(c){ if(c.rut)byRut[rutL(c.rut)]=c.id; byName[String(c.nombre||'').toUpperCase()]=c.id; });
    var nuevos=[]; 
    rows.forEach(function(r){ var rl2=rutL(C(r,'rut')); var nom=C(r,'cli')||'Cliente'; var id=(rl2&&byRut[rl2])||byName[nom.toUpperCase()]; if(!id&&!nuevos.some(function(n){ return (n.rut&&n.rut===rl2)||n.nombre===nom; })) nuevos.push({rut:rl2||null,nombre:nom,tipo:'final'}); });
    if(nuevos.length){ var ins=await supabase.from('customers').insert(nuevos).select('id,rut,nombre'); (ins.data||[]).forEach(function(c){ if(c.rut)byRut[rutL(c.rut)]=c.id; byName[String(c.nombre||'').toUpperCase()]=c.id; }); }

    // OTs con cálculo interno de todas las columnas de fórmula
    var rutCount={}; var ots=[]; var salt=0;
    rows.forEach(function(r){
      var id=C(r,'id'); var rl2=rutL(C(r,'rut')); var nom=C(r,'cli')||'Cliente';
      var cid=(rl2&&byRut[rl2])||byName[nom.toUpperCase()]||null; if(!cid){ salt++; return; }
      var tS=C(r,'sv'), tE=C(r,'eq'), tec=C(r,'tec');
      var cant=parseInt(C(r,'cant'),10)||1;
      var fi=fdate(C(r,'fi')), ff=fdate(C(r,'ff')), fe=fdate(C(r,'fe'));
      var fing=fdate(C(r,'fing'));
      var sla=slaDias(tS,tE);
      var prom=fing?new Date(fing.getTime()+sla*86400000):null;
      var estado=fe?'Cerrada':'Ingresada';
      var horas=(hs[String(tS).toUpperCase()]&&hs[String(tS).toUpperCase()][String(tE).toUpperCase()]!=null)? hs[String(tS).toUpperCase()][String(tE).toUpperCase()]*cant : 0;
      var rate=rates[String(tec||'').toUpperCase()]||rates['TALLER']||{c:0,v:0};
      var esB=BIANCHI.indexOf(rl2)>=0;
      var ceroV=CERO.indexOf(String(tS).toUpperCase())>=0||esB;
      var costoMO=Math.round(horas*rate.c); var ventaMO=ceroV?0:Math.round(horas*rate.v);
      var rep=parts[id]||{c:0,v:0}; var costoRep=Math.round(rep.c); var ventaRep=ceroV?0:Math.round(rep.v);
      var ventaTotal=ventaMO+ventaRep; var costoTotal=costoMO+costoRep; var margen=ventaTotal-costoTotal;
      var pct=esB?0:(ventaTotal===0?(costoTotal>0?-1:0):Math.round(margen/ventaTotal*100));
      var dias=(fe&&fing)?Math.round((fe-fing)/86400000):null;
      rutCount[rl2]=(rutCount[rl2]||0)+1; var cnt=rutCount[rl2];
      var ftf=esB?'SI':(((String(tS).toUpperCase()==='GARANTIA'||String(tS).toUpperCase()==='RETRABAJO')&&cnt>1)?'NO':'SI');
      var reinci=(!rl2||esB)?'NO':(cnt>1?(ftf==='NO'?'FALLA':'NUEVO'):'NO');
      var nota=fe?(dias<=sla?10:(dias<=2*sla?7:5)):null;
      var nivel=nota!=null?(nota<=5?'BAJA':nota<=7?'MEDIA':'ALTA'):(ftf==='NO'?'MEDIA':'Pendiente');
      var reclamo=nivel==='Pendiente'?'':(((nota!=null&&nota<=2)||nivel==='BAJA')?'SI':'NO');
      var entrega=(estado!=='Cerrada'||!prom)?'Pendiente':((dias!=null&&dias<=sla)?'SI':'NO');
      var alerta=(String(C(r,'urep')).toUpperCase()==='SI'&&costoRep===0)?'🚨 FALTAN REPUESTOS':'OK';
      var ml=modeloLimpio(C(r,'mod'));
      ots.push({ ext_id:id, customer_id:cid, tipo:String(tS).toLowerCase(), estado:estado, canal:'vba',
        creado_en:fing?fing.toISOString():null, descripcion:C(r,'det')||null,
        tecnico_nombre:tec||null, quien_registra:C(r,'reg')||null, modelo_limpio:ml,
        fecha_promesa:prom?prom.toISOString().slice(0,10):null,
        fecha_inicio:fi?fi.toISOString().slice(0,10):null, fecha_fin_tecnico:ff?ff.toISOString().slice(0,10):null, fecha_entrega_cliente:fe?fe.toISOString().slice(0,10):null,
        cantidad_unidades:cant,
        kpi:{ tipo_equipo:tE, tipo_servicio:tS, horas:horas, costo_mo:costoMO, venta_mo:ventaMO, costo_rep:costoRep, venta_rep:ventaRep,
          venta_total:ventaTotal, costo_total:costoTotal, margen:margen, pct_margen:pct,
          ftf:ftf, dias:dias, reinci:reinci, reclamo:reclamo, nota:nota, nivel:nivel, entrega:entrega, alerta:alerta,
          usa_rep:C(r,'urep'), edo:C(r,'edo'), mes:fing?fing.toLocaleDateString('es-CL',{month:'long'}):'', anio:fing?fing.getFullYear():'', falla:String(tS).toUpperCase()==='ARMADO'?'NO':'SI', repuesto:C(r,'rep'), modelo_limpio:ml } });
    });
    var ok=0, err='';
    for(var i=0;i<ots.length;i+=200){ var res=await supabase.from('work_orders').upsert(ots.slice(i,i+200),{onConflict:'ext_id'}); if(res.error){ err=res.error.message; break; } ok+=Math.min(200,ots.length-i); setLog('OTs '+Math.min(i+200,ots.length)+'/'+ots.length+'…'); }
    setLog('✅ Cargadas: '+ok+' OTs · clientes nuevos: '+nuevos.length+(salt?(' · sin cliente: '+salt):'')+(err?(' · ERR: '+err):''));
    avisar(err?'⛗ '+err:'✅ Historial importado', err?T.danger:T.ok);
    emit(); if(props.onOk) props.onOk();
  }

  function plantilla(){ var a=document.createElement('a'); a.href=URL.createObjectURL(new Blob(['\uFEFF'+MANUAL.join(';')+'\n'],{type:'text/csv'})); a.download='PLANTILLA_OT_manual.csv'; a.click(); }

  var [otF,setOtF]=useState(null); var [repF,setRepF]=useState(null);
  return (
    <div style={S.card}>
      <h2 style={S.h2}>Importar historial (solo columnas manuales)</h2>
      <p style={S.sub}>El CSV lleva SOLO tus columnas manuales. Las columnas de fórmula (Horas, Costos, Venta, IVA, Margen, FTF, Reincidencia, Nota, Nivel, SLA, Modelo Limpio) las calcula la plataforma con tus fórmulas. Si pegas el Excel completo, las columnas de fórmula se ignoran y se recalculan.</p>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
        <label style={{...S.btnO(T.ok),width:'auto',marginBottom:0,cursor:'pointer'}}>📥 CSV OT (manual)
          <input type="file" accept=".csv,.txt" style={{display:'none'}} onChange={function(e){ setOtF(e.target.files[0]); }}/></label>
        <label style={{...S.btnO(T.info),width:'auto',marginBottom:0,cursor:'pointer'}}>📎 Repuestos (opcional)
          <input type="file" accept=".csv,.txt" style={{display:'none'}} onChange={function(e){ setRepF(e.target.files[0]); }}/></label>
        <button style={{...S.btnO(T.info),width:'auto',marginBottom:0}} onClick={plantilla}>⬇ Plantilla manual</button>
        <button style={{...S.btn(T.brand),width:'auto',marginBottom:0}} disabled={!otF} onClick={function(){ procesar(otF,repF); }}>Cargar</button>
      </div>
      {log? <p style={{color:T.info,marginTop:10,fontWeight:700}}>{log}</p> : null}
    </div>);
}
