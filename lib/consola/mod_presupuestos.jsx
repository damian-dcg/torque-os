'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S, fmtCLP, fmtFecha } from '../ui';

export default function ModPresupuestos(props){
  var avisar=props.avisar||function(){};
  var tenant=props.tenant||null;
  var [rows,setRows]=useState([]); var [cust,setCust]=useState([]);
  var [f,setF]=useState({customer_id:'',items:[{concepto:'',cantidad:1,precio:0}]});
  var [iva,setIva]=useState(0.19);

  async function cargar(){
    var r=await Promise.all([
      supabase.from('presupuestos').select('*').order('id',{ascending:false}).limit(200),
      supabase.from('customers').select('id,nombre,email,telefono').limit(400),
      supabase.from('settings').select('valor').eq('clave','iva').limit(1)
    ]);
    setRows(r[0].data||[]); setCust(r[1].data||[]);
    if(r[2].data&&r[2].data[0]) setIva(Number(r[2].data[0].valor)||0.19);
  }
  useEffect(function(){ cargar(); },[]);

  var total=f.items.reduce(function(s,x){ return s+(Number(x.cantidad)||0)*(Number(x.precio)||0); },0);
  var ivaMonto=Math.round(total*iva);
  var totalConIva=total+ivaMonto;

  async function crear(){
    if(!f.customer_id){ avisar('⛔ Cliente obligatorio',T.danger); return; }
    var items=f.items.filter(function(x){ return x.concepto; });
    if(!items.length){ avisar('⛔ Agrega al menos un ítem',T.danger); return; }
    var e=await supabase.from('presupuestos').insert([{customer_id:Number(f.customer_id),items:items,subtotal:total,iva:ivaMonto,total:totalConIva,estado:'borrador'}]);
    if(e.error) avisar('⛔ '+e.error.message,T.danger);
    else { avisar('✅ Presupuesto creado',T.ok); setF({customer_id:'',items:[{concepto:'',cantidad:1,precio:0}]}); cargar(); }
  }

  async function setEstado(p,e){ await supabase.from('presupuestos').update({estado:e}).eq('id',p.id); cargar(); }

  function pdfPres(p){
    var c=cust.find(function(x){return x.id===p.customer_id;})||{};
    var w=window.open('','_blank');
    w.document.write('<html><head><title>Presupuesto #'+p.id+'</title><style>body{font-family:Arial;padding:24px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ccc;padding:6px;font-size:12px;text-align:left}</style></head><body>'
      +'<h2>Presupuesto #'+p.id+'</h2>'
      +'<p>Cliente: '+c.nombre+' · Email: '+(c.email||'—')+' · Tel: '+(c.telefono||'—')+'</p>'
      +'<p>Fecha: '+fmtFecha(p.created_at)+' · Estado: '+p.estado+'</p>'
      +'<table><thead><tr><th>Concepto</th><th>Cant.</th><th>P.Unit</th><th>Total</th></tr></thead><tbody>'
      +p.items.map(function(i){return '<tr><td>'+i.concepto+'</td><td>'+i.cantidad+'</td><td>'+fmtCLP(i.precio)+'</td><td>'+fmtCLP(i.cantidad*i.precio)+'</td></tr>';}).join('')
      +'<tr><td colspan="3"><b>Subtotal</b></td><td><b>'+fmtCLP(p.subtotal||p.total)+'</b></td></tr>'
      +'<tr><td colspan="3"><b>IVA ('+Math.round(iva*100)+'%)</b></td><td><b>'+fmtCLP(p.iva||0)+'</b></td></tr>'
      +'<tr><td colspan="3"><b>TOTAL</b></td><td><b>'+fmtCLP(p.total)+'</b></td></tr>'
      +'</tbody></table><script>window.print()</script></body></html>');
    w.document.close();
  }

  function gmailPres(p){
    var c=cust.find(function(x){return x.id===p.customer_id;})||{};
    window.open('https://mail.google.com/mail/?view=cm&fs=1&to='+(c.email||'')+'&su='+encodeURIComponent('Presupuesto #'+p.id)+'&body='+encodeURIComponent('Hola '+(c.nombre||'')+',\nAdjunto presupuesto #'+p.id+' por '+fmtCLP(p.total)+'.\n\nSaludos.'),'_blank');
  }

  function waPres(p){
    var c=cust.find(function(x){return x.id===p.customer_id;})||{};
    var msg='Hola '+(c.nombre||'')+', te envío presupuesto #'+p.id+' por '+fmtCLP(p.total);
    window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank');
  }

  return (
    <div>
      <div style={S.card}>
        <h2 style={S.h2}>+ Nuevo presupuesto</h2>
        <select style={S.input} value={f.customer_id} onChange={function(e){ setF(Object.assign({},f,{customer_id:e.target.value})); }}>
          <option value="">— Cliente —</option>
          {cust.map(function(c){ return <option key={c.id} value={c.id}>{c.nombre}</option>; })}
        </select>
        {f.items.map(function(it,i){
          return <div key={i} style={{display:'flex',gap:6,marginTop:6}}>
            <input style={{...S.input,flex:2,marginBottom:0}} placeholder="Concepto" value={it.concepto} onChange={function(e){ var items=f.items.slice(); items[i]=Object.assign({},it,{concepto:e.target.value}); setF(Object.assign({},f,{items:items})); }}/>
            <input style={{...S.input,width:80,marginBottom:0}} type="number" placeholder="Cant" value={it.cantidad} onChange={function(e){ var items=f.items.slice(); items[i]=Object.assign({},it,{cantidad:e.target.value}); setF(Object.assign({},f,{items:items})); }}/>
            <input style={{...S.input,width:120,marginBottom:0}} type="number" placeholder="Precio" value={it.precio} onChange={function(e){ var items=f.items.slice(); items[i]=Object.assign({},it,{precio:e.target.value}); setF(Object.assign({},f,{items:items})); }}/>
            <button style={{...S.btnO(T.danger),width:'auto',marginBottom:0}} onClick={function(){ setF(Object.assign({},f,{items:f.items.filter(function(_,k){return k!==i;})})); }}>✕</button>
          </div>;
        })}
        <button style={{...S.btnO(T.info),width:'auto',marginBottom:0,marginTop:8}} onClick={function(){ setF(Object.assign({},f,{items:f.items.concat([{concepto:'',cantidad:1,precio:0}])})); }}>+ Ítem</button>
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
          return <div key={p.id} style={{border:'1px solid '+T.border,borderRadius:10,padding:10,marginBottom:8,background:T.surface2}}>
            <div style={{display:'flex',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}>
              <b>#{p.id} · {cust.find(function(c){return c.id===p.customer_id;})?cust.find(function(c){return c.id===p.customer_id;}).nombre:'—'}</b>
              <select style={{...S.input,width:120,marginBottom:0}} value={p.estado} onChange={function(e){ setEstado(p,e.target.value); }}>
                <option>borrador</option><option>enviado</option><option>aceptado</option><option>rechazado</option>
              </select>
            </div>
            <p style={{...S.sub,margin:'4px 0'}}>{p.items.length} ítems · Total {fmtCLP(p.total)} · {fmtFecha(p.created_at)}</p>
            <div style={{display:'flex',gap:6,marginTop:8,flexWrap:'wrap'}}>
              <button style={{...S.btnO(T.info),width:'auto',marginBottom:0}} onClick={function(){ pdfPres(p); }}>📄 PDF</button>
              <button style={{...S.btnO(T.warn),width:'auto',marginBottom:0}} onClick={function(){ gmailPres(p); }}>✉ Gmail</button>
              <button style={{...S.btnO(T.ok),width:'auto',marginBottom:0}} onClick={function(){ waPres(p); }}>💬 WA</button>
            </div>
          </div>;
        })}
        {rows.length===0? <p style={S.sub}>Sin presupuestos aún.</p> : null}
      </div>
    </div>);
}
