'use client';
import { useState } from 'react';
import { supabase } from '../supabase';
import { T, S } from '../ui';
import { emit } from '../data';

function norm(h){ return String(h||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,''); }
function clean(c){ return String(c==null?'':c).replace(/^"+|"+$/g,'').trim(); }
function money(s){ var t=String(s).replace(/[^0-9-]/g,''); return (t===''||t==='-')?0:parseInt(t,10); }
function fdate(s){ if(!s)return null; var p=String(s).split('/'); if(p.length===3){ var a=+p[0],d=+p[1],y=+p[2]; if(y<100)y+=2000; if(a>12){var t=a;a=d;d=t;} return y+'-'+String(a).padStart(2,'0')+'-'+String(d).padStart(2,'0'); } var d2=new Date(s); return isNaN(d2)?null:d2.toISOString().slice(0,10); }
function normRut(x){ var s=String(x||'').replace(/[.\s]/g,'').toUpperCase(); if(s&&s.indexOf('-')<0&&s.length>1)s=s.slice(0,-1)+'-'+s.slice(-1); return s; }

export default function ModImportar(props){
  var avisar=props.avisar||function(){};
  var [busy,setBusy]=useState(false);
  var [log,setLog]=useState('');
  var [prog,setProg]=useState(0);
  var [txt,setTxt]=useState('');

  async function upsertRobusto(rows){
    var payload=rows;
    for(var i=0;i<40;i++){
      var res=await supabase.from('work_orders').upsert(payload,{onConflict:'ext_id'});
      if(!res.error) return {ok:true};
      var m=String(res.error.message).match(/column "([^"]+)"/);
      if(m){ payload=payload.map(function(r){ var c=Object.assign({},r); delete c[m[1]]; return c; }); continue; }
      return {ok:false,msg:res.error.message};
    }
    return {ok:false,msg:'límite de reintentos'};
  }

  async function procesarTexto(text){
    setBusy(true); setProg(0); setLog('Leyendo…');
    var lines=text.split(/\r?\n/).filter(function(l){ return l.trim(); });
    var sep=lines[0].indexOf('\t')>=0?'\t':(lines[0].indexOf(';')>=0?';':(lines[0].indexOf('|')>=0?'|':','));
    var head=lines[0].split(sep).map(norm);
    var idx={}; head.forEach(function(h,i){ if(idx[norm(h)]==null) idx[norm(h)]=i; });
    function C(r,key,pos){ var i=idx[key]!=null?idx[key]:pos; return clean(r[i]); }
    var rows=lines.slice(1).filter(function(r){ var id=C(r,'idot',0)||C(r,'id',0); return id&&(/^[0-9]+$/.test(id)||id.indexOf('S_')===0); });
    setLog('Filas: '+rows.length+'. Cargando clientes…'); setProg(5);
    var cmap={};
    rows.forEach(function(r){ var rut=normRut(C(r,'rutcliente',3)||C(r,'rutlimpio',4)); var nom=C(r,'cliente',2)||'Cliente'; var k=rut||('N'+nom); if(k&&!cmap[k])cmap[k]={rut:rut||null,nombre:nom}; });
    var ex=await supabase.from('customers').select('id,rut,nombre');
    var byRut={},byName={};
    (ex.data||[]).forEach(function(c){ if(c.rut)byRut[normRut(c.rut)]=c.id; byName[String(c.nombre||'').toUpperCase()]=c.id; });
    var nuevos=[];
    Object.keys(cmap).forEach(function(k){ var c=cmap[k]; var id=(c.rut&&byRut[c.rut])||byName[String(c.nombre).toUpperCase()]; if(id)c.id=id; else nuevos.push({rut:c.rut,nombre:c.nombre,tipo:'final'}); });
    for(var a=0;a<nuevos.length;a+=300){ await supabase.from('customers').insert(nuevos.slice(a,a+300)); }
    var ex2=await supabase.from('customers').select('id,rut,nombre');
    byRut={}; byName={};
    (ex2.data||[]).forEach(function(c){ if(c.rut)byRut[normRut(c.rut)]=c.id; byName[String(c.nombre||'').toUpperCase()]=c.id; });
    setLog('Clientes listos. Cargando OTs…');
    var ots=[]; var salt=0;
    rows.forEach(function(r){
      var rut=normRut(C(r,'rutcliente',3)||C(r,'rutlimpio',4));
      var cid=(rut&&byRut[rut])||byName[String(C(r,'cliente',2)).toUpperCase()]||null;
      if(!cid){ salt++; return; }
      ots.push({
        ext_id:C(r,'idot',0)||C(r,'id',0), customer_id:cid,
        tipo:C(r,'tiposervicio',8)||'servicio', tipo_equipo:C(r,'tipoequipo',5),
        estado:C(r,'estadoot',14)||'Ingresada', canal:'vba',
        creado_en:fdate(C(r,'fechaingreso',1)),
        descripcion:C(r,'detalle',39)||null,
        tecnico_nombre:C(r,'tecnicoasignado',9)||null, quien_registra:C(r,'quienregistra',6)||null,
        modelo:C(r,'modelo',7)||null, modelo_limpio:C(r,'modelolimpio',42)||null,
        fecha_promesa:fdate(C(r,'fechapromesa',10)), fecha_inicio:fdate(C(r,'fechainicio',11)),
        fecha_fin_tecnico:fdate(C(r,'fechafintecnico',12)), fecha_entrega_cliente:fdate(C(r,'fechaentregacliente',13)),
        cantidad_unidades:parseInt(C(r,'cantidadunidades',40),10)||1,
        costo_mo:money(C(r,'costomanoobra',17)), venta_mo:money(C(r,'ventamanoobra',18)),
        costo_rep:money(C(r,'costorepuestos',19)), venta_rep:money(C(r,'ventarepuestos',20)),
        venta_total:money(C(r,'ventatotal',24)), costo_total:money(C(r,'costototal',23)),
        margen:money(C(r,'margenbruto',25)), pct_margen:C(r,'margen',26),
        kpi:{ tipo_equipo:C(r,'tipoequipo',5), tipo_servicio:C(r,'tiposervicio',8),
          horas:parseFloat(C(r,'horastrabajadas',16))||0,
          venta_mo:money(C(r,'ventamanoobra',18)), costo_rep:money(C(r,'costorepuestos',19)), venta_rep:money(C(r,'ventarepuestos',20)),
          venta_total:money(C(r,'ventatotal',24)), costo_total:money(C(r,'costototal',23)), margen:money(C(r,'margenbruto',25)), pct_margen:C(r,'margen',26),
          ftf:C(r,'firsttimefix',32), dias:parseFloat(C(r,'diasreparacion',28))||0, reincidencia:C(r,'reincidencia',29),
          reclamo:C(r,'reclamocliente',30), nota:parseInt(C(r,'notacliente',31),10)||0, nivel:C(r,'nivelsatisfaccion',32),
          usa_rep:C(r,'usarepuestos',33), alerta:C(r,'alertarepuestos',34), mes:C(r,'mesingreso',37), anio:C(r,'anoingreso',38),
          repuesto:C(r,'repuesto',41), falla:C(r,'falladefabrica',44) }
      });
    });
    var ok=0; var err='';
    for(var b=0;b<ots.length;b+=300){
      var res=await upsertRobusto(ots.slice(b,b+300));
      if(!res.ok){ err=res.msg; break; }
      ok+=Math.min(300,ots.length-b);
      setProg(Math.round(5+(ok/ots.length)*90)); setLog('Cargando OTs '+ok+'/'+ots.length+'…');
    }
    setProg(100);
    setLog((err?'⛗ ':'✅ ')+'Cargadas: '+ok+' OTs · clientes: '+Object.keys(cmap).length+(salt?(' · sin cliente: '+salt):'')+(err?(' · ERR: '+err):' · FIN'));
    avisar(err?'⛗ Revisa el log':'✅ Carga completa: '+ok+' OTs', err?T.danger:T.ok);
    emit(); if(props.onOk) props.onOk();
    setBusy(false);
  }

  return (
    <div style={S.card}>
      <h2 style={S.h2}>Importar historial KPIs</h2>
      <p style={S.sub}>Pega desde Excel (Ctrl+C en la hoja, con encabezados) o sube CSV/TXT. Sin límites: procesa todas las filas. Muestra progreso y aviso de FIN.</p>
      <textarea style={{...S.input,minHeight:120,fontFamily:'monospace',fontSize:12}} placeholder="Pega aquí los datos copiados desde Excel…" value={txt} onChange={function(e){ setTxt(e.target.value); }}/>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:8}}>
        <button style={{...S.btn(T.brand),width:'auto',marginBottom:0}} disabled={busy||!txt} onClick={function(){ procesarTexto(txt); }}>📋 Cargar desde portapapeles</button>
        <label style={{...S.btnO(T.ok),width:'auto',marginBottom:0,cursor:'pointer'}}>📥 Subir CSV/TXT
          <input type="file" accept=".csv,.txt" style={{display:'none'}} disabled={busy} onChange={function(e){ setBusy(true); e.target.files[0].text().then(function(t){ procesarTexto(t); }); }}/>
        </label>
      </div>
      {busy? <div style={{height:8,background:T.surface2,borderRadius:6,marginTop:10}}><div style={{height:8,width:prog+'%',background:T.brand,borderRadius:6,transition:'width .3s'}}/></div> : null}
      {log? <p style={{color:log.indexOf('⛗')>=0?T.danger:T.ok,marginTop:10,fontWeight:700}}>{log}</p> : null}
    </div>);
}
