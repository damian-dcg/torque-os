'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S } from '../ui';
import { emit } from '../data';

function norm(h){ return String(h||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,''); }
function clean(c){ return String(c==null?'':c).replace(/^"+|"+$/g,'').trim(); }
function money(v){ var t=String(v).replace(/[^0-9-]/g,''); return (t===''||t==='-')?0:parseInt(t,10); }
function num(v){ var n=parseFloat(String(v).replace(',','.')); return isNaN(n)?0:n; }
function fdate(v){ var s=clean(v); if(!s) return null;
  var p=s.split(/[/\-]/); if(p.length===3){ var a=+p[0],d=+p[1],y=+p[2]; if(y<100)y+=2000; if(a>12){var t=a;a=d;d=t;} return y+'-'+String(a).padStart(2,'0')+'-'+String(d).padStart(2,'0'); }
  var dt=new Date(s); return isNaN(dt)?null:dt.toISOString().slice(0,10); }
function normRut(v){ var s=clean(v).toUpperCase(); if(s&&s.indexOf('-')<0&&s.length>1)s=s.slice(0,-1)+'-'+s.slice(-1); return s; }
function missingCol(msg){
  var m = msg.match(/column "([^"]+)"/) || msg.match(/the '([^']+)' column/) || msg.match(/Could not find the '([^']+)'/) || msg.match(/column ([a-z_]+) does not exist/i);
  return m? m[1] : null;
}
const MAP={idot:'id',fechaingreso:'fing',cliente:'cli',rutcliente:'rut',rutlimpio:'rutl',tipoequipo:'eq',quienregistra:'reg',modelo:'mod',tiposervicio:'sv',tecnicoasignado:'tec',fechainicio:'fi',fechafintecnico:'ff',fechaentregacliente:'fe',estadoot:'est',cantidadunidades:'cant',ventamanoobra:'vmo',costorepuestos:'crep',ventarepuestos:'vrep',costototal:'ctot',ventatotal:'vtot',margenbruto:'mar',margen:'pmar',firsttimefix:'ftf',diasreparacion:'dias',reincidencia:'rei',reclamocliente:'rec',notacliente:'nota',nivelsatisfaccion:'niv',usarepuestos:'urep',alertarepuestos:'ale',mesingreso:'mes',anioingreso:'anio',detalle:'det',repuesto:'rep',modelolimpio:'mlim',falladefabrica:'falla'};

export default function ModImportar(props){
  var avisar=props.avisar||function(){};
  var [busy,setBusy]=useState(false);
  var [log,setLog]=useState('');
  var [txt,setTxt]=useState('');

  async function upsertRobusto(rows){
    var payload=rows;
    for(var i=0;i<40;i++){
      var res=await supabase.from('work_orders').upsert(payload,{onConflict:'ext_id'});
      if(!res.error) return {ok:true};
      var col=missingCol(res.error.message);
      if(col){ payload=payload.map(function(r){ var c=Object.assign({},r); delete c[col]; return c; }); continue; }
      return {ok:false,msg:res.error.message};
    }
    return {ok:false,msg:'límite de reintentos'};
  }

  async function procesarTexto(text){
    setBusy(true); setLog('Leyendo…');
    var lines=text.split(/\r?\n/).filter(function(l){ return l.trim(); });
    var sep=lines[0].indexOf('\t')>=0?'\t':(lines[0].indexOf(';')>=0?';':(lines[0].indexOf('|')>=0?'|':','));
    var head=lines[0].split(sep).map(norm);
    var idx={}; head.forEach(function(h,i){ if(MAP[h]&&idx[MAP[h]]==null) idx[MAP[h]]=i; });
    function C(r,key,pos){ var i=idx[key]!=null?idx[key]:pos; return clean(r[i]); }
    var rows=lines.slice(1).map(function(l){ return l.split(sep).map(clean); })
      .filter(function(r){ var id=C(r,'id',0); return id&&(/^[0-9]+$/.test(id)||id.indexOf('S_')===0); });
    setLog('Filas: '+rows.length+'. Creando clientes…');
    var cmap={};
    rows.forEach(function(r){ var rut=normRut(C(r,'rut',3)||C(r,'rutl',4)); var nom=C(r,'cli',2)||'Cliente'; var k=rut||('N'+nom); if(k&&!cmap[k])cmap[k]={rut:rut||null,nombre:nom}; });
    var ex=await supabase.from('customers').select('id,rut,nombre').limit(5000);
    var byRut={},byName={};
    (ex.data||[]).forEach(function(c){ if(c.rut)byRut[normRut(c.rut)]=c.id; byName[String(c.nombre||'').toUpperCase()]=c.id; });
    var nuevos=[];
    Object.keys(cmap).forEach(function(k){ var c=cmap[k]; var id=(c.rut&&byRut[c.rut])||byName[String(c.nombre).toUpperCase()]; if(id)c.id=id; else nuevos.push({rut:c.rut,nombre:c.nombre,tipo:'final'}); });
    for(var a=0;a<nuevos.length;a+=300){ await supabase.from('customers').insert(nuevos.slice(a,a+300)); }
    var ex2=await supabase.from('customers').select('id,rut,nombre').limit(5000);
    byRut={}; byName={};
    (ex2.data||[]).forEach(function(c){ if(c.rut)byRut[normRut(c.rut)]=c.id; byName[String(c.nombre||'').toUpperCase()]=c.id; });
    setLog('Clientes listos. Cargando OTs…');
    var TIPOS={'ARMADO':'armado_unidad','GARANTIA':'repuesto_garantia','EVALUACION':'evaluacion','POST VENTA':'servicio','DEVOLUCION':'devolucion_dinero','RETIRO':'retiro','RECLAMO':'reclamo','MANTENCION':'mantencion'};
    var ots=[]; var salt=0;
    rows.forEach(function(r){
      var rut=normRut(C(r,'rut',3)||C(r,'rutl',4));
      var cid=(rut&&byRut[rut])||byName[String(C(r,'cli',2)).toUpperCase()]||null;
      if(!cid){ salt++; return; }
      var kpi={ tipo_equipo:C(r,'eq',5), tipo_servicio:C(r,'sv',8), horas:num(C(r,'cant',15)),
        venta_mo:money(C(r,'vmo',16)), costo_rep:money(C(r,'crep',17)), venta_rep:money(C(r,'vrep',18)),
        venta_total:money(C(r,'vtot',24)), costo_total:money(C(r,'ctot',23)), margen:money(C(r,'mar',25)), pct_margen:C(r,'pmar',26),
        ftf:C(r,'ftf',27), dias:num(C(r,'dias',28)), reincidencia:C(r,'rei',29), reclamo:C(r,'rec',30),
        nota:parseInt(C(r,'nota',31),10)||0, nivel:C(r,'niv',32), usa_rep:C(r,'urep',33), alerta:C(r,'ale',34),
        mes:C(r,'mes',37), anio:C(r,'anio',38), repuesto:C(r,'rep',40), falla:C(r,'falla',43) };
      ots.push({
        ext_id:C(r,'id',0), customer_id:cid,
        tipo:TIPOS[String(C(r,'sv',8)).toUpperCase()]||'servicio',
        estado:String(C(r,'est',14)).toLowerCase().indexOf('cerr')>=0?'Cerrada':'Ingresada',
        created_at:(function(){ var f=fdate(C(r,'fing',1)); return f?f+'T12:00:00':null; })(),
        descripcion:C(r,'det',39)||null,
        tipo_equipo:C(r,'eq',5), modelo_limpio:C(r,'mlim',42)||C(r,'mod',7), tecnico_nombre:C(r,'tec',9), quien_registra:C(r,'reg',6),
        fecha_inicio:fdate(C(r,'fi',11)), fecha_fin_tecnico:fdate(C(r,'ff',12)), fecha_entrega_cliente:fdate(C(r,'fe',13)),
        cantidad_unidades:parseInt(C(r,'cant',15),10)||1,
        venta_total:kpi.venta_total, costo_total:kpi.costo_total, margen:kpi.margen,
        kpi:kpi
      });
    });
    var ok=0; var err='';
    for(var b=0;b<ots.length;b+=200){
      var res=await upsertRobusto(ots.slice(b,b+200));
      if(!res.ok){ err=res.msg; break; }
      ok+=Math.min(200,ots.length-b);
      setLog('OTs '+Math.min(b+200,ots.length)+'/'+ots.length+'…');
    }
    setLog((err?'⛗ ':'✅ ')+'Cargadas: '+ok+' OTs · clientes: '+Object.keys(cmap).length+(salt?(' · sin cliente: '+salt):'')+(err?(' · ERR: '+err):' · FIN'));
    avisar(err?'⛗ Revisa el log':'✅ Carga completa: '+ok+' OTs', err?T.danger:T.ok);
    emit(); if(props.onOk) props.onOk();
    setBusy(false);
  }

  return (
    <div style={S.card}>
      <h2 style={S.h2}>Importar historial KPIs</h2>
      <p style={S.sub}>Pega desde Excel (Ctrl+C con encabezados) o sube CSV/TXT. Se auto-adapta al esquema real: lo que falte se omite y todo el detalle va a <b>kpi</b>.</p>
      <textarea style={{...S.input,minHeight:120,fontFamily:'monospace',fontSize:12}} placeholder="Pega aquí los datos copiados desde Excel…" value={txt} onChange={function(e){ setTxt(e.target.value); }}/>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:8}}>
        <button style={{...S.btn(T.brand),width:'auto',marginBottom:0}} disabled={busy||!txt} onClick={function(){ procesarTexto(txt); }}>📋 Cargar desde portapapeles</button>
        <label style={{...S.btnO(T.ok),width:'auto',marginBottom:0,cursor:'pointer'}}>📥 Subir CSV/TXT
          <input type="file" accept=".csv,.txt" style={{display:'none'}} disabled={busy} onChange={function(e){ setBusy(true); e.target.files[0].text().then(function(t){ procesarTexto(t); setBusy(false); }); }}/>
        </label>
      </div>
      {log? <p style={{color:log.indexOf('⛗')>=0?T.danger:T.ok,marginTop:10,fontWeight:700}}>{log}</p> : null}
    </div>);
}
