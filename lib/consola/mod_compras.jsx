'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S, fmtCLP } from '../ui';
const EST={'draft':'Borrador','submitted':'Enviada','approved':'Aprobada','rejected':'Rechazada','sent_to_supplier':'En proveedor','partially_received':'Recib. parcial','received':'Recibida','invoiced':'Facturada','closed':'Cerrada'};
const ESTC={'draft':T.muted,'submitted':T.warn,'approved':T.ok,'rejected':T.danger,'sent_to_supplier':T.info,'partially_received':T.warn,'received':T.ok,'invoiced':T.violet,'closed':T.muted};
export default function ModCompras(props){
  var avisar=props.avisar||function(){};
  var [sup,setSup]=useState([]); var [pos,setPos]=useState([]); var [items,setItems]=useState([]);
  var [receipts,setReceipts]=useState([]); var [returns,setReturns]=useState([]);
  var [credits,setCredits]=useState([]); var [payable,setPayable]=useState([]);
  var [whs,setWhs]=useState([]); var [tab,setTab]=useState('ordenes');
  async function cargar(){
    var r=await Promise.all([
      supabase.from('suppliers').select('*').order('name'),
      supabase.from('purchase_orders').select('*').order('id',{ascending:false}).limit(200),
      supabase.from('purchase_order_items').select('*').order('id',{ascending:false}).limit(500),
      supabase.from('purchase_receipts').select('*').order('id',{ascending:false}).limit(200),
      supabase.from('purchase_returns').select('*').order('id',{ascending:false}).limit(200),
      supabase.from('supplier_credit_notes').select('*').order('id',{ascending:false}).limit(200),
      supabase.from('accounts_payable').select('*').order('id',{ascending:false}).limit(200),
      supabase.from('warehouses').select('*')
    ]);
    setSup(r[0].data||[]); setPos(r[1].data||[]); setItems(r[2].data||[]); setReceipts(r[3].data||[]);
    setReturns(r[4].data||[]); setCredits(r[5].data||[]); setPayable(r[6].data||[]); setWhs(r[7].data||[]);
  }
  useEffect(function(){ cargar(); },[]);
  function supName(id){ return (sup.find(function(s){return s.id===id;})||{}).name||'—'; }
  function itemsOf(id){ return items.filter(function(i){return i.purchase_order_id===id;}); }
  function tot(po){ var its=itemsOf(po.id); var sub=its.reduce(function(s,i){return s+Number(i.total||0);},0); var tax=Math.round(sub*0.19); return {sub:sub,tax:tax,tot:sub+tax}; }

  async function nuevoProveedor(){
    var name=window.prompt('Nombre del proveedor:'); if(!name)return;
    var tax=window.prompt('RUT:')||''; var email=window.prompt('Email:')||''; var phone=window.prompt('Teléfono:')||'';
    await supabase.from('suppliers').insert([{name:name,tax_id:tax,email:email,phone:phone}]);
    avisar('✅ Proveedor creado',T.ok); cargar();
  }
  async function calificar(s){
    var r=Number(window.prompt('Calificación 1-5 de '+s.name+':')||s.rating||0);
    await supabase.from('suppliers').update({rating:r}).eq('id',s.id);
    avisar('✅ Calificación guardada',T.ok); cargar();
  }
  async function nuevaOC(){
    if(!sup.length){ avisar('⛗ Crea un proveedor primero',T.danger); return; }
    var sid=Number(window.prompt('ID proveedor ('+sup.map(function(s){return s.id+'='+s.name;}).join(', ')+'):'));
    if(!sup.find(function(s){return s.id===sid;})){ avisar('⛗ Proveedor inválido',T.danger); return; }
    var urgent=window.confirm('¿Compra urgente?');
    var ot=Number(window.prompt('ID de OT asociada (opcional, compra por OT):')||0)||null;
    var num='OC-'+Date.now().toString().slice(-6);
    await supabase.from('purchase_orders').insert([{number:num,supplier_id:sid,status:'draft',urgent:urgent,work_order_id:ot}]);
    avisar('✅ '+num+' creada',T.ok); cargar();
  }
  async function agregarItem(po){
    var sku=window.prompt('SKU / código:'); if(!sku)return;
    var name=window.prompt('Nombre:')||sku;
    var qty=Number(window.prompt('Cantidad:')||1);
    var price=Number(window.prompt('Precio unitario:')||0);
    await supabase.from('purchase_order_items').insert([{purchase_order_id:po.id,sku:sku,name:name,quantity:qty,unit_price:price,total:qty*price}]);
    await supabase.from('price_history').insert([{supplier_id:po.supplier_id,sku:sku,price:price}]);
    var t=tot(po); await supabase.from('purchase_orders').update({subtotal:t.sub+qty*price,tax:Math.round((t.sub+qty*price)*0.19),total:(t.sub+qty*price)*1.19}).eq('id',po.id);
    avisar('✅ Ítem agregado',T.ok); cargar();
  }
  async function setStatus(po,st){
    var patch={status:st};
    if(st==='approved')patch.approved_at=new Date().toISOString();
    if(st==='received')patch.received_at=new Date().toISOString();
    if(st==='invoiced')patch.invoiced_at=new Date().toISOString();
    if(st==='closed')patch.closed_at=new Date().toISOString();
    await supabase.from('purchase_orders').update(patch).eq('id',po.id);
    avisar('✅ Estado: '+EST[st],T.ok); cargar();
  }
  async function recibir(po){
    var its=itemsOf(po.id); if(!its.length){ avisar('⛗ Sin ítems',T.danger); return; }
    var wh=whs[0]; if(!wh){ avisar('⛗ Sin almacén',T.danger); return; }
    var all=true;
    for(var i=0;i<its.length;i++){
      var it=its[i];
      var pend=Number(it.quantity)-Number(it.received_qty);
      if(pend<=0) continue;
      var q=Number(window.prompt('Recibir de '+it.sku+' (pendiente '+pend+'):')||0);
      if(q<=0){ all=false; continue; }
      q=Math.min(q,pend);
      await supabase.from('purchase_order_items').update({received_qty:Number(it.received_qty)+q}).eq('id',it.id);
      var ex=await supabase.from('stock_items').select('*').eq('sku',it.sku).limit(1);
      if(ex.data&&ex.data.length){
        var nb=Number(ex.data[0].quantity)+q;
        await supabase.from('stock_items').update({quantity:nb}).eq('id',ex.data[0].id);
        await supabase.from('stock_kardex').insert([{stock_item_id:ex.data[0].id,warehouse_id:wh.id,movement_type:'purchase_in',quantity:q,balance:nb,reference_type:'purchase',reference_id:po.id}]);
      } else {
        var ni=await supabase.from('stock_items').insert([{sku:it.sku,name:it.name,stock_type:'new',quantity:q,unit_cost:it.unit_price,warehouse_id:wh.id,status:'available',qr_code:it.sku}]).select();
        if(ni.data&&ni.data[0]) await supabase.from('stock_kardex').insert([{stock_item_id:ni.data[0].id,warehouse_id:wh.id,movement_type:'purchase_in',quantity:q,balance:q,reference_type:'purchase',reference_id:po.id}]);
      }
    }
    var done=itemsOf(po.id).every(function(x){return Number(x.received_qty)>=Number(x.quantity);});
    await supabase.from('purchase_receipts').insert([{purchase_order_id:po.id,warehouse_id:wh.id}]);
    await setStatus(po,done?'received':'partially_received');
  }
  async function facturar(po){
    var inv=window.prompt('N° de factura del proveedor:'); if(!inv)return;
    var due=window.prompt('Vencimiento (YYYY-MM-DD):')||null;
    await supabase.from('accounts_payable').insert([{purchase_order_id:po.id,supplier_id:po.supplier_id,invoice_number:inv,amount:po.total,due_date:due}]);
    await setStatus(po,'invoiced');
  }
  async function pagar(ap){
    var m=Number(window.prompt('Monto a pagar (saldo '+fmtCLP(ap.amount-ap.paid)+'):')||0);
    if(m<=0)return;
    var np=Number(ap.paid)+m;
    await supabase.from('accounts_payable').update({paid:np,status:np>=ap.amount?'paid':'partial'}).eq('id',ap.id);
    avisar('✅ Pago registrado',T.ok); cargar();
  }
  async function devolver(po){
    var reason=window.prompt('Motivo de devolución:'); if(!reason)return;
    var amount=Number(window.prompt('Monto:')||0);
    await supabase.from('purchase_returns').insert([{purchase_order_id:po.id,supplier_id:po.supplier_id,reason:reason,amount:amount}]);
    avisar('✅ Devolución registrada',T.ok); cargar();
  }
  async function notaCredito(po){
    var reason=window.prompt('Motivo nota de crédito:'); if(!reason)return;
    var amount=Number(window.prompt('Monto:')||0);
    await supabase.from('supplier_credit_notes').insert([{purchase_order_id:po.id,supplier_id:po.supplier_id,amount:amount,reason:reason}]);
    avisar('✅ Nota de crédito registrada',T.ok); cargar();
  }

  return (
    <div>
      <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
        {['ordenes','proveedores','recepciones','devoluciones','pagar'].map(function(t){
          return <button key={t} onClick={function(){ setTab(t); }} style={{padding:'8px 14px',borderRadius:999,border:tab===t?'0':'1px solid '+T.border,background:tab===t?T.brand:'transparent',color:tab===t?'#fff':T.text,fontWeight:600,fontSize:13,cursor:'pointer'}}>{t}</button>;
        })}
      </div>

      {tab==='ordenes'? <div style={S.card}>
        <div style={{display:'flex',justifyContent:'space-between',gap:8,marginBottom:10}}>
          <h2 style={S.h2}>Órdenes de compra ({pos.length})</h2>
          <button style={{...S.btn(T.brand),width:'auto',marginBottom:0}} onClick={nuevaOC}>+ Nueva OC</button>
        </div>
        {pos.map(function(po){
          var its=itemsOf(po.id);
          return <div key={po.id} style={{border:'1px solid '+T.border,borderRadius:10,padding:12,marginBottom:10,background:T.surface2}}>
            <div style={{display:'flex',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}>
              <b style={{color:T.brand}}>{po.number} · {supName(po.supplier_id)}</b>
              <span style={S.pill(ESTC[po.status]||T.muted)}>{EST[po.status]||po.status}</span>
            </div>
            <p style={{...S.sub,margin:'6px 0'}}>{po.urgent?'⚡ URGENTE · ':''}{po.work_order_id?('OT-'+po.work_order_id+' · '):''}{its.length} ítems · Total {fmtCLP(po.total)}</p>
            <table style={{width:'100%',borderCollapse:'collapse',marginBottom:8}}>
              <thead><tr><th style={S.th}>SKU</th><th style={S.th}>Cant.</th><th style={S.th}>Recib.</th><th style={S.th}>P.Unit</th><th style={S.th}>Total</th></tr></thead>
              <tbody>{its.map(function(i){ return <tr key={i.id}>
                <td style={{...S.td,fontFamily:'monospace'}}>{i.sku}</td><td style={S.td}>{i.quantity}</td><td style={S.td}>{i.received_qty}</td><td style={S.td}>{fmtCLP(i.unit_price)}</td><td style={S.td}>{fmtCLP(i.total)}</td>
              </tr>; })}</tbody>
            </table>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              {po.status==='draft'? <button style={{...S.btnO(T.info),width:'auto',marginBottom:0}} onClick={function(){ agregarItem(po); }}>+ Ítem</button> : null}
              {po.status==='draft'? <button style={{...S.btnO(T.warn),width:'auto',marginBottom:0}} onClick={function(){ setStatus(po,'submitted'); }}>Enviar</button> : null}
              {po.status==='submitted'? <button style={{...S.btnO(T.ok),width:'auto',marginBottom:0}} onClick={function(){ setStatus(po,'approved'); }}>Aprobar</button> : null}
              {po.status==='submitted'? <button style={{...S.btnO(T.danger),width:'auto',marginBottom:0}} onClick={function(){ setStatus(po,'rejected'); }}>Rechazar</button> : null}
              {po.status==='approved'? <button style={{...S.btnO(T.info),width:'auto',marginBottom:0}} onClick={function(){ setStatus(po,'sent_to_supplier'); }}>Enviada a proveedor</button> : null}
              {(po.status==='sent_to_supplier'||po.status==='partially_received')? <button style={{...S.btnO(T.ok),width:'auto',marginBottom:0}} onClick={function(){ recibir(po); }}>Recibir</button> : null}
              {po.status==='received'? <button style={{...S.btnO(T.violet),width:'auto',marginBottom:0}} onClick={function(){ facturar(po); }}>Facturar</button> : null}
              {po.status==='invoiced'? <button style={{...S.btnO(T.muted),width:'auto',marginBottom:0}} onClick={function(){ setStatus(po,'closed'); }}>Cerrar</button> : null}
              <button style={{...S.btnO(T.danger),width:'auto',marginBottom:0}} onClick={function(){ devolver(po); }}>Devolución</button>
              <button style={{...S.btnO(T.warn),width:'auto',marginBottom:0}} onClick={function(){ notaCredito(po); }}>N.Crédito</button>
            </div>
          </div>;
        })}
        {pos.length===0? <p style={S.sub}>Sin órdenes de compra. Crea una con "+ Nueva OC".</p> : null}
      </div> : null}

      {tab==='proveedores'? <div style={S.card}>
        <div style={{display:'flex',justifyContent:'space-between',gap:8,marginBottom:10}}>
          <h2 style={S.h2}>Proveedores ({sup.length})</h2>
          <button style={{...S.btn(T.brand),width:'auto',marginBottom:0}} onClick={nuevoProveedor}>+ Proveedor</button>
        </div>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr><th style={S.th}>Nombre</th><th style={S.th}>RUT</th><th style={S.th}>Contacto</th><th style={S.th}>Rating</th><th style={S.th}>Acción</th></tr></thead>
          <tbody>{sup.map(function(s){ return <tr key={s.id}>
            <td style={S.td}>{s.name}</td><td style={S.td}>{s.tax_id||'—'}</td><td style={S.td}>{s.email||''} {s.phone||''}</td>
            <td style={S.td}>{'★'.repeat(Math.round(Number(s.rating)||0))||'—'}</td>
            <td style={S.td}><button style={{...S.btnO(T.info),width:'auto',marginBottom:0}} onClick={function(){ calificar(s); }}>Calificar</button></td>
          </tr>; })}</tbody>
        </table>
        {sup.length===0? <p style={S.sub}>Sin proveedores.</p> : null}
      </div> : null}

      {tab==='recepciones'? <div style={S.card}>
        <h2 style={S.h2}>Recepciones de compra ({receipts.length})</h2>
        {receipts.map(function(r){ var po=pos.find(function(p){return p.id===r.purchase_order_id;});
          return <p key={r.id} style={{fontSize:13,margin:'4px 0'}}>{new Date(r.received_at).toLocaleString('es-CL')} · {po?po.number:'—'} · {supName(po?po.supplier_id:null)}</p>; })}
        {receipts.length===0? <p style={S.sub}>Sin recepciones.</p> : null}
      </div> : null}

      {tab==='devoluciones'? <div style={S.card}>
        <h2 style={S.h2}>Devoluciones y notas de crédito</h2>
        {returns.map(function(r){ return <p key={r.id} style={{fontSize:13,margin:'4px 0',color:T.danger}}>↩ {supName(r.supplier_id)} · {fmtCLP(r.amount)} · {r.reason}</p>; })}
        {credits.map(function(c){ return <p key={c.id} style={{fontSize:13,margin:'4px 0',color:T.warn}}>✉ N.Crédito {supName(c.supplier_id)} · {fmtCLP(c.amount)} · {c.reason}</p>; })}
        {returns.length===0&&credits.length===0? <p style={S.sub}>Sin devoluciones ni notas.</p> : null}
      </div> : null}

      {tab==='pagar'? <div style={S.card}>
        <h2 style={S.h2}>Cuentas por pagar ({payable.length})</h2>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr><th style={S.th}>Factura</th><th style={S.th}>Proveedor</th><th style={S.th}>Monto</th><th style={S.th}>Pagado</th><th style={S.th}>Saldo</th><th style={S.th}>Estado</th><th style={S.th}>Acción</th></tr></thead>
          <tbody>{payable.map(function(a){ return <tr key={a.id}>
            <td style={S.td}>{a.invoice_number}</td><td style={S.td}>{supName(a.supplier_id)}</td>
            <td style={S.td}>{fmtCLP(a.amount)}</td><td style={S.td}>{fmtCLP(a.paid)}</td><td style={S.td}>{fmtCLP(a.amount-a.paid)}</td>
            <td style={S.td}><span style={S.pill(a.status==='paid'?T.ok:a.status==='partial'?T.warn:T.danger)}>{a.status}</span></td>
            <td style={S.td}><button style={{...S.btnO(T.ok),width:'auto',marginBottom:0}} onClick={function(){ pagar(a); }}>Pagar</button></td>
          </tr>; })}</tbody>
        </table>
        {payable.length===0? <p style={S.sub}>Sin cuentas por pagar. Factura una OC para generarlas.</p> : null}
      </div> : null}
    </div>);
}
