'use client';
import { useState } from 'react';
import { supabase } from '../supabase';
import { T, S } from '../ui';
import { emit } from '../data';

var MAP={idot:'id',fechaingreso:'fing',cliente:'cli',rutcliente:'rut',rutlimpio:'rutl',tipoequipo:'eq',quienregistra:'reg',modelo:'mod',tiposervicio:'sv',tecnicoasignado:'tec',fechapromesa:'fp',fechainicio:'fi',fechafintecnico:'ff',fechaentregacliente:'fe',estadoot:'est',cantidadunidades:'cant',ventamanoobra:'vmo',costorepuestos:'crep',ventarepuestos:'vrep',costotraslado:'ctra',ventatraslado:'vtra',costootros:'cotr',ventaotros:'votr',costototal:'ctot',ventatotal:'vtot',margenbruto:'mar',margen:'pmar',entregaatiempo:'ent',diasreparacion:'dias',reincidencia:'rei',reclamocliente:'rec',notacliente:'nota',nivelsatisfaccion:'niv',firsttimefix:'ftf',usarepuestos:'urep',alertarepuestos:'ale',mesingreso:'mes',anoingreso:'anio',anioingreso:'anio',detalle:'det',repuesto:'rep',modelolimpio:'mlim',falladefabrica:'falla'};
function norm(h){ return String(h||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,''); }
function clean(c){ return String(c==null?'':c).replace(/^"+|"+$/g,'').trim(); }
function txt(v,def){ var s=clean(v); return s===''?(def||'DESCONOCIDO'):s; }
function money(v){ var t=String(v).replace(/[^0-9-]/g,''); return (t===''||t==='-')?0:parseInt(t,10); }
function num(v){ var n=parseFloat(String(v).replace(',','.')); return isNaN(n)?0:n; }
function fdate(v){ var s=clean(v); if(!s) return null; var p=s.split('/'); if(p.length===3){ var a=+p[0],d=+p[1],y=+p[2]; if(y<100)y+=2000; if(a>12){var t=a;a=d;d=t;} return y+'-'+String(a).padStart(2,'0')+'-'+String(d).padStart(2,'0'); } var d2=new Date(s); return isNaN(d2)?null:d2.toISOString().slice(0,10); }
function normRut(v){ var s=clean(v).toUpperCase(); if(s.indexOf('-')<0&&s.length>1) s=s.slice(0,-1)+'-'+s.slice(-1); return s; }

export default function ModImportar(props){
  var avisar=props.avisar||function(){};
  var [busy,setBusy]=useState(false);
  var [log,setLog]=useState('');
  var [txt,setTxt]=useState('');

  async function upsertRobusto(rows){
    var payload=rows;
    for(var i=0;i<30;i++){
      var res=await supabase.from('work_orders').upsert(payload,{onConflict:'ext_id'});
      if(!res.error) return {ok:true};
      var m=String(res.error.message).match(/column "([^"]+)"/);
      if(res.error.code==='42703'&&m){
        var col=m[1];
        payload=payload.map(function(r){ var c=Object.assign({},r); delete c[col]; return c; });
        continue;
      }
      return {ok:false,msg:res.error.message};
    }
    return {ok:false,msg:'demasiados intentos'};
  }

  async function procesarTexto(text){
    setBusy(true); setLog('Procesando…');
    var lines=text.split(/\r?\n/).filter(function(l){ return l.trim(); });
    var sep=lines[0].indexOf('\t')>=0?'\t':(lines[0].indexOf(';')>=0?';':(lines[0].indexOf('|')>=0?'|':','));
    var head=lines[0].split(sep).map(norm);
    var idx={}; head.forEach(function(h,i){ if(MAP[h]&&idx[MAP[h]]==null) idx[MAP[h]]=i; });
    function C(r,k,pos){ var i=idx[k]!=null?idx[k]:pos; return clean(r[i]); }
    var rows=lines.slice(1).filter(function(r){ var id=C(r,'id',0); return id&&(/^[0-9]+$/.test(id)||id.indexOf('S_')===0); });
    setLog('Filas: '+rows.length+'. Creando clientes…');
    var cmap={};
    rows.forEach(function(r){
      var rut=normRut(C(r,'rut',3)||C(r,'rutl',4));
      var nom=txt(C(r,'cli',2),'CLIENTE DESCONOCIDO');
      var key=rut||('N'+nom);
      if(key&&!cmap[key]) cmap[key]={rut:rut||null,nombre:nom};
    });
    var ex=await supabase.from('customers').select('id,rut,nombre').limit(5000);
    var byRut={},byName={};
    (ex.data||[]).forEach(function(c){ if(c.rut)byRut[normRut(c.rut)]=c.id; byName[String(c.nombre||'').toUpperCase()]=c.id; });
    var nuevos=[];
    Object.keys(cmap).forEach(function(k){ var c=cmap[k]; var id=(c.rut&&byRut[c.rut])||byName[String(c.nombre).toUpperCase()]; if(id)c.id=id; else nuevos.push({rut:c.rut,nombre:c.nombre,tipo:'final'}); });
    for(var a=0;a<nuevos.length;a+=200){ await supabase.from('customers').insert(nuevos.slice(a,a+200)); }
    var ex2=await supabase.from('customers').select('id,rut,nombre').limit(5000);
    byRut={}; byName={};
    (ex2.data||[]).forEach(function(c){ if(c.rut)byRut[normRut(c.rut)]=c.id; byName[String(c.nombre||'').toUpperCase()]=c.id; });
    setLog('Clientes listos. Cargando OTs…');
    var ots=[]; var salt=0;
    rows.forEach(function(r){
      var rut=normRut(C(r,'rut',3)||C(r,'rutl',4));
      var cid=(rut&&byRut[rut])||byName[String(txt(C(r,'cli',2),'CLIENTE DESCONOCIDO')).toUpperCase()]||null;
      if(!cid){ salt++; return; }
      ots.push({
        ext_id:C(r,'id',0), customer_id:cid,
        tipo:txt(C(r,'sv',8),'servicio'), tipo_equipo:txt(C(r,'eq',5),'OTRO'),
        estado:txt(C(r,'est',14),'Ingresada'), canal:'vba',
        descripcion:txt(C(r,'det',39),'DESCONOCIDO'),
        tecnico_nombre:txt(C(r,'tec',9),'SIN_ASIGNAR'), quien_registra:txt(C(r,'reg',6),'DESCONOCIDO'),
        modelo:txt(C(r,'mod',7),'DESCONOCIDO'), modelo_limpio:txt(C(r,'mlim',41),'DESCONOCIDO'),
        fecha_promesa:fdate(C(r,'fp',10)), fecha_inicio:fdate(C(r,'fi',11)), fecha_fin_tecnico:fdate(C(r,'ff',12)), fecha_entrega_cliente:fdate(C(r,'fe',13)),
        cantidad_unidades:parseInt(C(r,'cant',15),10)||1,
        costo_mo:money(C(r,'vmo',16)), costo_rep:money(C(r,'crep',17)), venta_rep:money(C(r,'vrep',18)),
        costo_tras:money(C(r,'ctra',19)), venta_tras:money(C(r,'vtra',20)), costo_otros:money(C(r,'cotr',21)), venta_otros:money(C(r,'votr',22)),
        venta_total:money(C(r,'vtot',24)), costo_total:money(C(r,'ctot',23)), margen:money(C(r,'mar',25)), pct_margen:txt(C(r,'pmar',26),'0'),
        iva:money(C(r,'iva',21)), total_pagar:money(C(r,'tpag',22)),
        entrega_tiempo:txt(C(r,'ent',27),'PENDIENTE'), dias_reparacion:num(C(r,'dias',28)),
        reincidencia:txt(C(r,'rei',29),'NO'), reclamo:txt(C(r,'rec',30),'NO'), nota:parseInt(C(r,'nota',31),10)||0,
        nivel:txt(C(r,'niv',32),'PENDIENTE'), ftf:txt(C(r,'ftf',27),'SI'), usa_repuestos:txt(C(r,'urep',33),'NO'), alerta:txt(C(r,'ale',34),'OK'),
        mes:txt(C(r,'mes',37),'DESCONOCIDO'), anio:txt(C(r,'anio',38),'DESCONOCIDO'), repuesto:txt(C(r,'rep',40),''), falla:txt(C(r,'falla',43),'NO'),
        kpi:{ tipo_equipo:txt(C(r,'eq',5),'OTRO'), tipo_servicio:txt(C(r,'sv',8),'servicio'), horas:num(C(r,'cant',15)),
          venta_mo:money(C(r,'vmo',16)), costo_rep:money(C(r,'crep',17)), venta_rep:money(C(r,'vrep',18)),
          venta_total:money(C(r,'vtot',24)), costo_total:money(C(r,'ctot',23)), margen:money(C(r,'mar',25)), pct_margen:txt(C(r,'pmar',26),'0'),
          ftf:txt(C(r,'ftf',27),'SI'), dias:num(C(r,'dias',28)), reincidencia:txt(C(r,'rei',29),'NO'), reclamo:txt(C(r,'rec',30),'NO'),
          nota:parseInt(C(r,'nota',31),10)||0, nivel:txt(C(r,'niv',32),'PENDIENTE'), usa_rep:txt(C(r,'urep',33),'NO'), alerta:txt(C(r,'ale',34),'OK'),
          mes:txt(C(r,'mes',37),'DESCONOCIDO'), anio:txt(C(r,'anio',38),'DESCONOCIDO'), repuesto:txt(C(r,'rep',40),''), falla:txt(C(r,'falla',43),'NO') }
      });
    });
    var res=await upsertRobusto(ots);
    setLog((res.ok?'✅':'⛗')+' Cargadas: '+(res.ok?ots.length:0)+' OTs · clientes: '+Object.keys(cmap).length+' · sin cliente: '+salt+(res.msg?(' · ERR: '+res.msg):''));
    avisar(res.ok?'✅ Historial importado':'⛗ '+res.msg, res.ok?T.ok:T.danger);
    emit(); if(props.onOk) props.onOk();
    setBusy(false);
  }

  return (
    <div style={S.card}>
      <h2 style={S.h2}>Importar historial KPIs</h2>
      <p style={S.sub}><b>Método recomendado:</b> en Excel selecciona desde la fila de encabezados hasta la última fila con datos → Ctrl+C → pega en el recuadro → “Cargar desde portapapeles”. También puedes subir CSV/TXT. Los vacíos se rellenan solos y el importador se adapta a las columnas existentes.</p>
      <textarea style={{...S.input,minHeight:140,fontFamily:'monospace',fontSize:12}} placeholder="Pega aquí los datos copiados desde Excel…" value={txt} onChange={function(e){ setTxt(e.target.value); }}/>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:8}}>
        <button style={{...S.btn(T.brand),width:'auto',marginBottom:0}} disabled={busy||!txt} onClick={function(){ procesarTexto(txt); }}>📋 Cargar desde portapapeles</button>
        <label style={{...S.btnO(T.ok),width:'auto',marginBottom:0,cursor:'pointer'}}>📥 Subir CSV/TXT
          <input type="file" accept=".csv,.txt" style={{display:'none'}} disabled={busy} onChange={function(e){ setBusy(true); e.target.files[0].text().then(function(t){ procesarTexto(t); setBusy(false); }); }}/>
        </label>
        <button style={{...S.btnO(T.info),width:'auto',marginBottom:0}} onClick={function(){ var a=document.createElement('a'); a.href=URL.createObjectURL(new Blob(['\uFEFFOT_ID;Fecha Ingreso;Cliente;RUT Cliente;Tipo Equipo;Tipo Servicio;Tecnico Asignado;Fecha Entrega Cliente;Estado OT;Venta Total;Costo Total;Margen;First Time Fix;Reincidencia;Nota;Nivel\n'],{type:'text/csv'})); a.download='PLANTILLA_OT.csv'; a.click(); }}>⬇ Plantilla CSV</button>
      </div>
      {log? <p style={{color:T.info,marginTop:10,fontWeight:700}}>{log}</p> : null}
    </div>);
}
