'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S, fmtCLP } from '../ui';
const METHODS=['efectivo','transferencia','tarjeta','credito'];
export default function ModCaja(props){
  var avisar=props.avisar||function(){};
  var me=props.me||null;
  var [sessions,setSessions]=useState([]); var [invoices,setInvoices]=useState([]);
  var [payments,setPayments]=useState([]); var [credits,setCredits]=useState([]);
  var [ar,setAr]=useState([]); var [ots,setOts]=useState([]); var [cust,setCust]=useState({});
  var [tab,setTab]=useState('caja');
  async function cargar(){
    var r=await Promise.all([
      supabase.from('cash_sessions').select('*').order('id',{ascending:false}).limit(50),
      supabase.from('invoices').select('*').order('id',{ascending:false}).limit(200),
      supabase.from('payments').select('*').order('id',{ascending:false}).limit(300),
      supabase.from('credit_notes').select('*').order('id',{ascending:false}).limit(100),
      supabase.from('accounts_receivable').select('*').order('id',{ascending:false}).limit(200),
      supabase.from('work_orders').select('*').order('id',{ascending:false}).limit(300),
      supabase.from('customers').select('id,nombre')
    ]);
    setSessions(r[0].data||[]); setInvoices(r[1].data||[]); setPayments(r[2].data||[]);
    setCredits(r[3].data||[]); setAr(r[4].data||[]); setOts(r[5].data||[]);
    var cm={}; (r[6].data||[]).forEach(function(c){cm[c.id]=c;}); setCust(cm);
  }
  useEffect(function(){ cargar(); },[]);
  function openSession(){ return sessions.find(function(s){return s.status==='open';}); }
  function custName(id){ return (cust[id]||{}).nombre||'—'; }
  function otTotal(o){ return Number(o.total_pagar)||Math.round((Number((o.kpi||{}).venta_total)||0)*1.19); }
  function paidForOt(otId){ return payments.filter(function(p){return p.work_order_id===otId;}).reduce(function(s,p){return s+Number(p.amount);},0); }
  function invOfOt(otId){ return invoices.find(function(i){return i.work_order_id===otId;}); }

  async function abrirCaja(){
    var fondo=Number(window.prompt('Fondo de caja (monto inicial):')||0);
    await supabase.from('cash_sessions').insert([{user_id:me?me.id:null,opening_amount:fondo,status:'open'}]);
    avisar('✅ Caja abierta',T.ok); cargar();
  }
  async function cerrarCaja(s){
    var cashIn=payments.filter(function(p){return p.cash_session_id===s.id&&p.method==='efectivo';}).reduce(function(a,p){return a+Number(p.amount);},0);
    var expected=Number(s.opening_amount)+cashIn;
    var counted=Number(window.prompt('Monto contado en caja (esperado '+fmtCLP(expected)+'):')||0);
    await supabase.from('cash_sessions').update({status:'closed',closed_at:new Date().toISOString(),expected_amount:expected,counted_amount:counted,difference:counted-expected}).eq('id',s.id);
    avisar('✅ Caja cerrada. Diferencia: '+fmtCLP(counted-expected),T.ok); cargar();
  }

  async function cobrar(ot){
    var total=otTotal(ot);
    var inv=invOfOt(ot.id);
    if(!inv){
      var sub=Math.round(total/1.19); var tax=total-sub;
      var num='FAC-'+Date.now().toString().slice(-6);
      var ins=await supabase.from('invoices').insert([{number:num,customer_id:ot.customer_id,work_order_id:ot.id,subtotal:sub,tax:tax,total:total,folio:invoices.length+1}]).select();
      inv=ins.data&&ins.data[0];
    }
    var method=window.prompt('Método ('+METHODS.join('/')+'):','efectivo')||'efectivo';
    var saldo=total-paidForOt(ot.id);
    var amount=Number(window.prompt('Monto a pagar (saldo '+fmtCLP(saldo)+'):')||saldo);
    if(amount<=0)return;
    var sess=openSession();
    await supabase.from('payments').insert([{invoice_id:inv?inv.id:null,work_order_id:ot.id,cash_session_id:(method==='efectivo'&&sess)?sess.id:null,method:method,amount:amount,registered_by:me?me.id:null}]);
    var np=paidForOt(ot.id)+amount;
    var ex=await supabase.from('accounts_receivable').select('*').eq('work_order_id',ot.id).limit(1);
    if(ex.data&&ex.data.length){
      await supabase.from('accounts_receivable').update({paid:np,status:np>=total?'paid':'partial'}).eq('id',ex.data[0].id);
    } else if(method==='credito'||np<total){
      await supabase.from('accounts_receivable').insert([{invoice_id:inv?inv.id:null,customer_id:ot.customer_id,work_order_id:ot.id,amount:total,paid:np,status:np>=total?'paid':'partial'}]);
    }
    if(inv) await supabase.from('invoices').update({status:np>=total?'paid':'partial'}).eq('id',inv.id);
    avisar('✅ Pago registrado: '+fmtCLP(amount)+(np>=total?' · PAGADO (entrega autorizada RN-11)':' · saldo '+fmtCLP(total-np)),T.ok);
    cargar();
  }
  async function anticipo(ot){
    var amount=Number(window.prompt('Monto del anticipo:')||0); if(amount<=0)return;
    var sess=openSession();
    await supabase.from('payments').insert([{work_order_id:ot.id,cash_session_id:sess?sess.id:null,method:'efectivo',amount:amount,reference:'anticipo',registered_by:me?me.id:null}]);
    avisar('✅ Anticipo registrado',T.ok); cargar();
  }
  async function notaCredito(inv){
    var reason=window.prompt('Motivo nota de crédito:'); if(!reason)return;
    var amount=Number(window.prompt('Monto:')||0);
    await supabase.from('credit_notes').insert([{invoice_id:inv.id,amount:amount,reason:reason}]);
    avisar('✅ Nota de crédito emitida',T.ok); cargar();
  }
  function linkPago(ot){
    var total=otTotal(ot);
    var url='https://wa.me/?text='+encodeURIComponent('Pago OT-'+ot.ot_number+' por '+fmtCLP(total)+'. Link de pago: https://torque-os.vercel.app/pago/'+ot.id);
    window.open(url,'_blank');
    avisar('📤 Link de pago enviado',T.info);
  }

  var cerradas=ots.filter(function(o){return o.estado==='Cerrada'||o.estado==='Revisión QA'||o.estado==='Pendiente de Liquidar';});
  var os=openSession();
  var cashIn=os?payments.filter(function(p){return p.cash_session_id===os.id&&p.method==='efectivo';}).reduce(function(a,p){return a+Number(p.amount);},0):0;
  var porCobrar=ar.filter(function(a){return a.status!=='paid';});

  return (
    <div>
      <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
        {['caja','cobrar','facturas','cxc'].map(function(t){
          return <button key={t} onClick={function(){ setTab(t); }} style={{padding:'8px 14px',borderRadius:999,border:tab===t?'0':'1px solid '+T.border,background:tab===t?T.brand:'transparent',color:tab===t?'#fff':T.text,fontWeight:600,fontSize:13,cursor:'pointer'}}>{t}</button>;
        })}
      </div>

      {tab==='caja'? <div style={S.card}>
        <h2 style={S.h2}>Caja</h2>
        {os? <div style={{border:'1px solid '+T.ok,borderRadius:10,padding:12,background:T.surface2,marginBottom:10}}>
          <b style={{color:T.ok}}>Caja ABIERTA #{os.id}</b> · Fondo {fmtCLP(os.opening_amount)} · Efectivo ingresado {fmtCLP(cashIn)} · Esperado {fmtCLP(Number(os.opening_amount)+cashIn)}
          <div style={{marginTop:8}}><button style={{...S.btn(T.danger),width:'auto',marginBottom:0}} onClick={function(){ cerrarCaja(os); }}> Cerrar caja (arqueo)</button></div>
        </div> : <button style={{...S.btn(T.ok),width:'auto',marginBottom:0}} onClick={abrirCaja}>🔓 Abrir caja</button>}
        <h3 style={{...S.h2,marginTop:12}}>Historial de sesiones</h3>
        {sessions.map(function(s){ return <p key={s.id} style={{fontSize:13,margin:'4px 0'}}>{s.status==='open'?'🟢':'⚪'} #{s.id} · fondo {fmtCLP(s.opening_amount)} · esperado {fmtCLP(s.expected_amount)} · contado {fmtCLP(s.counted_amount)} · dif {fmtCLP(s.difference)}</p>; })}
        {sessions.length===0? <p style={S.sub}>Sin sesiones.</p> : null}
      </div> : null}

      {tab==='cobrar'? <div style={S.card}>
        <h2 style={S.h2}>Cobrar / anticipos / link de pago</h2>
        <p style={S.sub}>RN-11: la entrega requiere pago o crédito autorizado.</p>
        {cerradas.map(function(o){
          var total=otTotal(o); var pag=paidForOt(o.id);
          return <div key={o.id} style={{border:'1px solid '+T.border,borderRadius:10,padding:10,marginBottom:8,background:T.surface2}}>
            <div style={{display:'flex',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}>
              <b>OT-{o.ot_number} · {custName(o.customer_id)}</b>
              <span style={S.pill(pag>=total?T.ok:T.warn)}>{pag>=total?'PAGADO':'Saldo '+fmtCLP(total-pag)}</span>
            </div>
            <p style={{...S.sub,margin:'4px 0'}}>Total {fmtCLP(total)} · Pagado {fmtCLP(pag)}</p>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              <button style={{...S.btnO(T.ok),width:'auto',marginBottom:0}} onClick={function(){ cobrar(o); }}>💵 Cobrar</button>
              <button style={{...S.btnO(T.info),width:'auto',marginBottom:0}} onClick={function(){ anticipo(o); }}>Anticipo</button>
              <button style={{...S.btnO(T.warn),width:'auto',marginBottom:0}} onClick={function(){ linkPago(o); }}>🔗 Link pago</button>
            </div>
          </div>;
        })}
        {cerradas.length===0? <p style={S.sub}>Sin OTs cerradas por cobrar.</p> : null}
      </div> : null}

      {tab==='facturas'? <div style={S.card}>
        <h2 style={S.h2}>Facturas ({invoices.length})</h2>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr><th style={S.th}>N°</th><th style={S.th}>Cliente</th><th style={S.th}>OT</th><th style={S.th}>Total</th><th style={S.th}>Estado</th><th style={S.th}>Acción</th></tr></thead>
          <tbody>{invoices.map(function(i){ var o=ots.find(function(x){return x.id===i.work_order_id;});
            return <tr key={i.id}>
              <td style={{...S.td,fontFamily:'monospace'}}>{i.number}</td><td style={S.td}>{custName(i.customer_id)}</td>
              <td style={S.td}>{o?('OT-'+o.ot_number):'—'}</td><td style={S.td}>{fmtCLP(i.total)}</td>
              <td style={S.td}><span style={S.pill(i.status==='paid'?T.ok:i.status==='partial'?T.warn:T.info)}>{i.status}</span></td>
              <td style={S.td}><button style={{...S.btnO(T.warn),width:'auto',marginBottom:0}} onClick={function(){ notaCredito(i); }}>N.Crédito</button></td>
            </tr>; })}</tbody>
        </table>
        {invoices.length===0? <p style={S.sub}>Sin facturas. Cobra una OT para emitir.</p> : null}
      </div> : null}

      {tab==='cxc'? <div style={S.card}>
        <h2 style={S.h2}>Cuentas por cobrar ({porCobrar.length})</h2>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr><th style={S.th}>Cliente</th><th style={S.th}>OT</th><th style={S.th}>Monto</th><th style={S.th}>Pagado</th><th style={S.th}>Saldo</th><th style={S.th}>Estado</th></tr></thead>
          <tbody>{porCobrar.map(function(a){ var o=ots.find(function(x){return x.id===a.work_order_id;});
            return <tr key={a.id}>
              <td style={S.td}>{custName(a.customer_id)}</td><td style={S.td}>{o?('OT-'+o.ot_number):'—'}</td>
              <td style={S.td}>{fmtCLP(a.amount)}</td><td style={S.td}>{fmtCLP(a.paid)}</td><td style={S.td}>{fmtCLP(a.amount-a.paid)}</td>
              <td style={S.td}><span style={S.pill(a.status==='paid'?T.ok:T.warn)}>{a.status}</span></td>
            </tr>; })}</tbody>
        </table>
        {porCobrar.length===0? <p style={S.sub}>Sin cuentas por cobrar.</p> : null}
      </div> : null}
    </div>);
}
