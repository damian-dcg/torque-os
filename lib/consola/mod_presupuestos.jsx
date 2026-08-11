'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S, fmtCLP } from '../ui';

export default function ModPresupuestos(props){
  var avisar=props.avisar||function(){};
  var tenant=props.tenant||null;
  var s1=useState([]),rows=s1[0],setRows=s1[1];
  var s2=useState([]),cust=s2[0],setCust=s2[1];
  var s3=useState({customer_id:'',items:[{concepto:'',cantidad:1,precio:0}]}),f=s3[0],setF=s3[1];
  async function cargar(){
    var r=await Promise.all([
      supabase.from('presupuestos').select('*').order('id',{ascending:false}).limit(200),
      supabase.from('customers').select('id,nombre,email,telefono').limit(400)
    ]);
    setRows(r[0].data||[]); setCust(r[1].data||[]);
  }
  useEffect(function(){ cargar(); },[]);
  var total=f.items.reduce(function(s,x){ return s+(Number(x.cantidad)||0)*(Number(x.precio)||0); },0);
  async function crear(){
    if(!f.customer_id){ avisar('⛔ Cliente obligatorio',T.danger); return; }
    var items=f.items.filter(function(x){ return x.concepto; });
    if(!items.length){ avisar('⛔ Agrega al menos un ítem',T.danger); return; }
    var e=await supabase.from('presupuestos').insert([{customer_id:Number(f.customer_id),items:items,total:total}]);
    if(e.error) avisar('⛔ '+e.error.message,T.danger);
    else { avisar('✅ Presupuesto creado',T.ok); setF({customer_id:'',items:[{concepto:'',cantidad:1,precio:0}]}); cargar(); }
  }
  async function setEstado(p,e){ await supabase.from('presupuestos').update({estado:e}).eq('id',p.id); cargar(); }
  function pdfPres(p){
    var c=cust.find(function(x){ return x.id===p.customer_id; })||{};
    var w=window.open('','_blank');
    var html='<html><head><title>Presupuesto '+p.id+'</title><style>body{font-family:Arial;padding:24px;color:#111}h1{margin:0}table{width:100%;border-collapse:collapse;margin:10px 0}td,th{border:1px solid #ccc;padding:6px;font-size:12px;text-align:left}</style></head><body>'
      +'<div style="border-bottom:4px solid '+((tenant&&tenant.color_primario)||'#3EC6B2')+';padding-bottom:10px;margin-bottom:12px"><b style="font-size:18px">'+(tenant?tenant.nombre:'TORQUE·OS')+'</b><div style="font-size:12px;color:#555">Presupuesto de Servicio Técnico</div></div>'
      +'<p>Presupuesto N° '+p.id+' · '+new Date(p.creado_en).toLocaleDateString('es-CL')+' · Cliente: '+(c.nombre||'')+'</p>'
      +'<table><tr><th>Concepto</th><th>Cant.</th><th>Precio</th><th>Total</th></tr>'
      +(p.items||[]).map(function(i){ return '<tr><td>'+i.concepto+'</td><td>'+i.cantidad+'</td><td>'+fmtCLP(i.precio)+'</td><td>'+fmtCLP(i.cantidad*i.precio)+'</td></tr>'; }).join('')
      +'<tr><td colspan="3"><b>TOTAL</b></td><td><b>'+fmtCLP(p.total)+'</b></td></tr></table>'
      +'<p>Validez 15 días. Este documento no constituye boleta ni factura.</p>'
      +'<script>window.print()</script></body></html>';
    w.document.write(html); w.document.close();
  }
  function gmailPres(p){
    var c=cust.find(function(x){ return x.id===p.customer_id; })||{};
    window.open('https://mail.google.com/mail/?view=cm&fs=1&to='+(c.email||'')
      +'&su='+encodeURIComponent('Presupuesto N° '+p.id+' - '+(tenant?tenant.nombre:'TORQUE·OS'))
      +'&body='+encodeURIComponent('Estimado '+(c.nombre||'')+',\n\nJunto con saludar, le enviamos el presupuesto N° '+p.id+' por '+fmtCLP(p.total)+'.\n\nInstrucciones: descargue el PDF desde la plataforma y adjúntelo a este correo antes de enviarlo al cliente.\n\nSaludos cordiales.'),'_blank');
  }
  function waPres(p){
    var c=cust.find(function(x){ return x.id===p.customer_id; })||{};
    var tel=String(c.telefono||'').replace(/[^\d+]/g,'');
    window.open('https://wa.me/'+tel+'?text='+encodeURIComponent('Hola '+(c.nombre||'')+', le enviamos el presupuesto N° '+p.id+' por '+fmtCLP(p.total)+'. Quedamos atentos a su aprobación.'),'_blank');
  }
  return (
    <div>
      <div style={S.card}>
        <h2 style={S.h2}>Nuevo presupuesto</h2>
        <select style={S.input} value={f.customer_id} onChange={function(e){ setF({customer_id:e.target.value,items:f.items}); }}>
          <option value="">Cliente…</option>
          {cust.map(function(c){ return <option key={c.id} value={c.id}>{c.nombre}</option>; })}
        </select>
        {f.items.map(function(it,i){
          return <div key={i} style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:8}}>
            <input style={{...S.input,flex:2,marginBottom:0}} placeholder="Concepto" value={it.concepto} onChange={function(e){ var c=f.items.slice(); c[i]={concepto:e.target.value,cantidad:it.cantidad,precio:it.precio}; setF({customer_id:f.customer_id,items:c}); }}/>
            <input style={{...S.input,width:80,marginBottom:0}} type="number" value={it.cantidad} onChange={function(e){ var c=f.items.slice(); c[i]={concepto:it.concepto,cantidad:e.target.value,precio:it.precio}; setF({customer_id:f.customer_id,items:c}); }}/>
            <input style={{...S.input,width:120,marginBottom:0}} type="number" placeholder="$" value={it.precio} onChange={function(e){ var c=f.items.slice(); c[i]={concepto:it.concepto,cantidad:it.cantidad,precio:e.target.value}; setF({customer_id:f.customer_id,items:c}); }}/>
            <button style={{...S.btnO(T.danger),width:'auto',marginBottom:0}} onClick={function(){ setF({customer_id:f.customer_id,items:f.items.filter(function(_,k){ return k!==i; })}); }}>✕</button>
          </div>;
        })}
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <button style={{...S.btnO(T.info),width:'auto',marginBottom:0}} onClick={function(){ setF({customer_id:f.customer_id,items:f.items.concat([{concepto:'',cantidad:1,precio:0}])}); }}>+ Ítem</button>
          <b style={{color:T.ok,fontSize:16}}>Total: {fmtCLP(total)}</b>
          <button style={{...S.btn(T.ok),width:'auto',marginBottom:0,marginLeft:'auto'}} onClick={crear}>Crear</button>
        </div>
      </div>
      <div style={S.card}>
        <h2 style={S.h2}>Presupuestos emitidos</h2>
        {rows.map(function(p){
          var c=cust.find(function(x){ return x.id===p.customer_id; })||{};
          return <div key={p.id} style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:8,border:'1px solid '+T.border,borderRadius:10,padding:10}}>
            <b style={{color:T.brand}}>#{p.id}</b>
            <span style={{flex:1}}>{c.nombre||''} · {(p.items||[]).length} ítem(s)</span>
            <b style={{color:T.ok}}>{fmtCLP(p.total)}</b>
            <select style={{...S.input,width:120,marginBottom:0}} value={p.estado} onChange={function(e){ setEstado(p,e.target.value); }}>
              <option>borrador</option><option>enviado</option><option>aceptado</option><option>rechazado</option>
            </select>
            <button style={{...S.btnO(T.info),width:'auto',marginBottom:0}} onClick={function(){ pdfPres(p); }}>📄 PDF</button>
            <button style={{...S.btnO(T.warn),width:'auto',marginBottom:0}} onClick={function(){ gmailPres(p); }}>✉ Gmail</button>
            <button style={{...S.btnO(T.ok),width:'auto',marginBottom:0}} onClick={function(){ waPres(p); }}>💬 WA</button>
          </div>;
        })}
        {rows.length===0? <p style={S.sub}>Sin presupuestos aún.</p> : null}
      </div>
    </div>);
}
