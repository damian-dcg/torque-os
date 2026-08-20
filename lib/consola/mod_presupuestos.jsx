'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S, fmtCLP } from '../ui';

function fdate(v){
  if(!v) return '—';
  var d=new Date(v);
  if(isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CL');
}

export default function ModPresupuestos(props){
  var avisar=props.avisar||function(){};
  var tenant=props.tenant||null;
  var [rows,setRows]=useState([]);
  var [cust,setCust]=useState([]);
  var [f,setF]=useState({customer_id:'',items:[{concepto:'',cantidad:1,precio:0}]});
  var [iva,setIva]=useState(0.19);

  async function cargar(){
    var r=await Promise.all([
      supabase.from('presupuestos').select('*').order('id',{ascending:false}).limit(200),
      supabase.from('customers').select('id,nombre,email,telefono').limit(400),
      supabase.from('settings').select('valor').eq('clave','iva').limit(1)
    ]);
    setRows(r[0].data||[]);
    setCust(r[1].data||[]);
    if(r[2].data&&r[2].data[0]) setIva(Number(r[2].data[0].valor)||0.19);
  }
  useEffect(function(){ cargar(); },[]);

  var items=f.items||[];
  var total=items.reduce(function(s,x){ return s+(Number(x.cantidad)||0)*(Number(x.precio)||0); },0);
  var ivaMonto=Math.round(total*iva);
  var totalConIva=total+ivaMonto;

  function setItem(i,patch){
    var n=items.slice();
    n[i]=Object.assign({},n[i],patch);
    setF(Object.assign({},f,{items:n}));
  }
  function custDe(p){
    var c=null;
    cust.forEach(function(x){ if(x.id===p.customer_id) c=x; });
    return c||{};
  }
  async function crear(){
    if(!f.customer_id){ avisar('⛔ Cliente obligatorio',T.danger); return; }
    var lin=items.filter(function(x){ return x.concepto; });
    if(!lin.length){ avisar('⛔ Agrega al menos un ítem',T.danger); return; }
    var e=await supabase.from('presupuestos').insert([{customer_id:Number(f.customer_id),items:lin,subtotal:total,iva:ivaMonto,total:totalConIva,estado:'borrador'}]);
    if(e.error) avisar('⛔ '+e.error.message,T.danger);
    else { avisar('✅ Presupuesto creado',T.ok); setF({customer_id:'',items:[{concepto:'',cantidad:1,precio:0}]}); cargar(); }
  }
  async function setEstado(p,e){
    await supabase.from('presupuestos').update({estado:e}).eq('id',p.id);
    cargar();
  }
  function pdfPres(p){
    var c=custDe(p);
    var its=p.items||[];
    var w=window.open('','_blank');
    if(!w) return;
    w.document.write('<html><head><title>Presupuesto #'+p.id+'</title><style>body{font-family:Arial;padding:24px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ccc;padding:6px;font-size:12px;text-align:left}</style></head><body>'
      +'<h2>Presupuesto #'+p.id+'</h2>'
      +'<p>Cliente: '+(c.nombre||'—')+' · Email: '+(c.email||'—')+' · Tel: '+(c.telefono||'—')+'</p>'
      +'<p>Fecha: '+fdate(p.created_at)+' · Estado: '+(p.estado||'borrador')+'</p>'
      +'<table><thead><tr><th>Concepto</th><th>Cant.</th><th>P.Unit</th><th>Total</th></tr></thead><tbody>'
      +its.map(function(i){return '<tr><td>'+(i.concepto||'')+'</td><td>'+(i.cantidad||0)+'</td><td>'+fmtCLP(i.precio||0)+'</td><td>'+fmtCLP((Number(i.cantidad)||0)*(Number(i.precio)||0))+'</td></tr>';}).join('')
      +'<tr><td colspan="3"><b>Subtotal</b></td><td><b>'+fmtCLP(p.subtotal!=null?p.subtotal:total)+'</b></td></tr>'
      +'<tr><td colspan="3"><b>IVA ('+Math.round(iva*100)+'%)</b></td><td><b>'+fmtCLP(p.iva!=null?p.iva:0)+'</b></td></tr>'
      +'<tr><td colspan="3"><b>TOTAL</b></td><td><b>'+fmtCLP(p.total||0)+'</b></td></tr>'
      +'</tbody></table><script>window.print()</script></body></html>');
    w.document.close();
  }
  function gmailPres(p){
    var c=custDe(p);
    window.open('https://mail.google.com/mail/?view=cm&fs=1&to='+encodeURIComponent(c.email||'')+'&su='+encodeURIComponent('Presupuesto #'+p.id)+'&body='+encodeURIComponent('Hola '+(c.nombre||'')+',\nTe envío el presupuesto #'+p.id+' por '+fmtCLP(p.total||0)+'.\n\nSaludos.'),'_blank');
  }
  function waPres(p){
    var c=custDe(p);
    window.open('https://wa.me/?text='+encodeURIComponent('Hola '+(c.nombre||'')+', te envío presupuesto #'+p.id+' por '+fmtCLP(p.total||0)),'_blank');
  }

  return (
    <div>
      <div style={S.card}>
        <h2 style={S.h2}>+ Nuevo presupuesto</h2>
        <label style={S.label}>Cliente</label>
        <select style={S.input} value={f.customer_id} onChange={function(e){ setF(Object.assign({},f,{customer_id:e.target.value})); }}>
          <option value="">— Cliente —</option>
          {cust.map(function(c){ return <option key={c.id} value={c.id}>{c.nombre}</option>; })}
        </select>
        <label style={S.label}>Ítems</label>
        {items.map(function(it,i){
          return (
            <div key={i} style={{display:'flex',gap:6,marginTop:6}}>
              <input style={{...S.input,flex:2,marginBottom:0}} placeholder="Concepto" value={it.concepto||''} onChange={function(e){ setItem(i,{concepto:e.target.value}); }}/>
              <input style={{...S.input,width:80,marginBottom:0}} type="number" placeholder="Cant" value={it.cantidad!=null?it.cantidad:''} onChange={function(e){ setItem(i,{cantidad:e.target.value}); }}/>
              <input style={{...S.input,width:120,marginBottom:0}} type="number" placeholder="Precio" value={it.precio!=null?it.precio:''} onChange={function(e){ setItem(i,{precio:e.target.value}); }}/>
              <button style={{...S.btnO(T.danger),width:'auto',marginBottom:0}} onClick={function(){ setF(Object.assign({},f,{items:items.filter(function(_,k){ return k!==i; })})); }}>✕</button>
            </div>
          );
        })}
        <button style={{...S.btnO(T.info),width:'auto',marginBottom:0,marginTop:8}} onClick={function(){ setF(Object.assign({},f,{items:items.concat([{concepto:'',cantidad:1,precio:0}])})); }}>+ Ítem</button>
        <div style={{marginTop:12,padding:10,background:T.surface2,borderRadius:8}}>
          <p style={{margin:'4px 0'}}>Subtotal: <b>{fmtCLP(total)}</b></p>
          <p style={{margin:'4px 0'}}>IVA ({Math.round(iva*100)}%): <b>{fmtCLP(ivaMonto)}</b></p>
          <p style={{margin:'4px 0',fontSize:16}}>Total: <b style={{color:T.ok}}>{fmtCLP(totalConIva)}</b></p>
        </div>
        <button style={{...S.btn(T.ok),width:'auto',marginBottom:0,marginTop:10}} onClick={crear}>Crear</button>
      </div>
      <div style={S.card}>
        <h2 style={S.h2}>Presupuestos ({rows.length})</h2>
        {rows.map(function(p){
          var
