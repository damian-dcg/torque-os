'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S, fmtCLP } from '../ui';

export default function ModBodega(props){
  var avisar=props.avisar||function(){};
  var s1=useState([]),parts=s1[0],setParts=s1[1];
  var s2=useState([]),movs=s2[0],setMovs=s2[1];
  var s3=useState([]),ots=s3[0],setOts=s3[1];
  var s4=useState(''),q=s4[0],setQ=s4[1];
  var s5=useState({part_codigo:'',tipo:'salida',cantidad:1,ot_id:'',motivo:''}),m=s5[0],setM=s5[1];
  async function cargar(){
    var r=await Promise.all([
      supabase.from('parts').select('codigo,nombre,en_stock,precio,stock_min').order('codigo').limit(800),
      supabase.from('stock_movements').select('*').order('id',{ascending:false}).limit(200),
      supabase.from('work_orders').select('id,ot_number').order('ot_number',{ascending:false}).limit(200)
    ]);
    setParts(r[0].data||[]); setMovs(r[1].data||[]); setOts(r[2].data||[]);
  }
  useEffect(function(){ cargar(); },[]);
  async function registrar(e){
    e.preventDefault();
    var qty=Number(m.cantidad)||0;
    if(!m.part_codigo||qty<=0){ avisar('⛔ Parte y cantidad obligatorios',T.danger); return; }
    var part=parts.find(function(p){ return p.codigo===m.part_codigo; });
    if(m.tipo==='salida'){
      if((part.en_stock||0)<qty){ avisar('⛔ Stock insuficiente: hay '+(part.en_stock||0),T.danger); return; }
      await supabase.from('parts').update({en_stock:(part.en_stock||0)-qty}).eq('codigo',m.part_codigo);
      var nuevoStock=(part.en_stock||0)-qty;
      if(nuevoStock<=(part.stock_min||0)){
        await supabase.from('ot_events').insert([{ot_id:m.ot_id?Number(m.ot_id):null,evento:'alerta_stock',detalle:{parte:m.part_codigo,stock:nuevoStock}}]);
        await supabase.from('notifications').insert([{rol_destino:'agente',tipo:'alerta_stock',titulo:'🚨 Quiebre de stock: '+m.part_codigo+' (queda '+nuevoStock+')'}]);
        avisar('🚨 Quiebre de stock notificado al Buzón',T.warn);
      }
    } else {
      await supabase.from('parts').update({en_stock:(part.en_stock||0)+qty}).eq('codigo',m.part_codigo);
    }
    var e2=await supabase.from('stock_movements').insert([{part_codigo:m.part_codigo,tipo:m.tipo,cantidad:qty,ot_id:m.ot_id?Number(m.ot_id):null,motivo:m.motivo||null}]);
    if(e2.error) avisar('⛔ '+e2.error.message,T.danger);
    else { avisar('✅ Movimiento registrado',T.ok); setM({part_codigo:'',tipo:'salida',cantidad:1,ot_id:'',motivo:''}); cargar(); }
  }
  function pdfSolicitud(){
    var salidas=movs.filter(function(x){ return x.tipo==='salida'; }).slice(0,30);
    var w=window.open('','_blank');
    var html='<html><head><title>Solicitud de Repuestos</title><style>body{font-family:Arial;padding:24px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ccc;padding:6px;font-size:12px;text-align:left}</style></head><body>'
      +'<h2>Solicitud / Salida de Repuestos</h2>'
      +'<table><tr><th>Fecha</th><th>Código</th><th>Cant.</th><th>OT</th><th>Motivo</th></tr>'
      +salidas.map(function(x){ return '<tr><td>'+new Date(x.creado_en).toLocaleDateString('es-CL')+'</td><td>'+x.part_codigo+'</td><td>'+x.cantidad+'</td><td>'+(x.ot_id?('OT-'+((ots.find(function(o){return o.id===x.ot_id;})||{}).ot_number||'')):'—')+'</td><td>'+(x.motivo||'')+'</td></tr>'; }).join('')
      +'</table><script>window.print()</script></body></html>';
    w.document.write(html); w.document.close();
  }
  var vis=parts.filter(function(p){ var t=q.toLowerCase(); return !t||p.codigo.toLowerCase().indexOf(t)>=0||(p.nombre||'').toLowerCase().indexOf(t)>=0; });
  return (
    <div>
      <div style={S.card}>
        <h2 style={S.h2}>Movimiento de bodega</h2>
        <form onSubmit={registrar} style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <select style={{...S.input,flex:2,marginBottom:0}} required value={m.part_codigo} onChange={function(e){ setM({part_codigo:e.target.value,tipo:m.tipo,cantidad:m.cantidad,ot_id:m.ot_id,motivo:m.motivo}); }}>
            <option value="">Repuesto…</option>
            {parts.map(function(p){ return <option key={p.codigo} value={p.codigo}>{p.codigo} · {p.nombre} (stock {p.en_stock||0})</option>; })}
          </select>
          <select style={{...S.input,width:120,marginBottom:0}} value={m.tipo} onChange={function(e){ setM({part_codigo:m.part_codigo,tipo:e.target.value,cantidad:m.cantidad,ot_id:m.ot_id,motivo:m.motivo}); }}>
            <option value="salida">Salida</option><option value="entrada">Entrada</option><option value="ajuste">Ajuste</option>
          </select>
          <input style={{...S.input,width:90,marginBottom:0}} type="number" min="1" value={m.cantidad} onChange={function(e){ setM({part_codigo:m.part_codigo,tipo:m.tipo,cantidad:e.target.value,ot_id:m.ot_id,motivo:m.motivo}); }}/>
          <select style={{...S.input,flex:1,marginBottom:0}} value={m.ot_id} onChange={function(e){ setM({part_codigo:m.part_codigo,tipo:m.tipo,cantidad:m.cantidad,ot_id:e.target.value,motivo:m.motivo}); }}>
            <option value="">OT (opcional)</option>
            {ots.map(function(o){ return <option key={o.id} value={o.id}>OT-{o.ot_number}</option>; })}
          </select>
          <input style={{...S.input,flex:1,marginBottom:0}} placeholder="Motivo" value={m.motivo} onChange={function(e){ setM({part_codigo:m.part_codigo,tipo:m.tipo,cantidad:m.cantidad,ot_id:m.ot_id,motivo:e.target.value}); }}/>
          <button style={{...S.btn(T.info),width:'auto',marginBottom:0}}>Registrar</button>
        </form>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(340px,1fr))',gap:14}}>
        <div style={S.card}>
          <div style={{display:'flex',gap:8,marginBottom:8}}>
            <input style={{...S.input,flex:1,marginBottom:0}} placeholder="Buscar repuesto…" value={q} onChange={function(e){ setQ(e.target.value); }}/>
            <button style={{...S.btnO(T.info),width:'auto',marginBottom:0}} onClick={pdfSolicitud}>📄 Solicitud PDF</button>
          </div>
          <div style={{overflow:'auto',maxHeight:420}}><table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr><th style={S.th}>Código</th><th style={S.th}>Nombre</th><th style={S.th}>Stock</th><th style={S.th}>Precio</th></tr></thead>
            <tbody>{vis.map(function(p){ return <tr key={p.codigo}>
              <td style={{...S.td,color:T.brand}}>{p.codigo}</td><td style={S.td}>{p.nombre}</td>
              <td style={{...S.td,fontWeight:800,color:(p.en_stock||0)<=(p.stock_min||0)?T.danger:T.ok}}>{p.en_stock||0}</td>
              <td style={S.td}>{fmtCLP(p.precio)}</td></tr>; })}</tbody>
          </table></div>
        </div>
        <div style={S.card}>
          <h2 style={S.h2}>Últimos movimientos</h2>
          {movs.map(function(mv){ return <p key={mv.id} style={{fontSize:13,margin:'4px 0'}}>{new Date(mv.creado_en).toLocaleDateString('es-CL')} · <b style={{color:mv.tipo==='salida'?T.danger:T.ok}}>{mv.tipo}</b> {mv.cantidad} × {mv.part_codigo} {mv.ot_id?('· OT-'+((ots.find(function(o){return o.id===mv.ot_id;})||{}).ot_number||'')):''} {mv.motivo?('· '+mv.motivo):''}</p>; })}
          {movs.length===0? <p style={S.sub}>Sin movimientos.</p> : null}
        </div>
      </div>
    </div>);
}
