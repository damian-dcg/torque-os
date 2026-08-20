'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S, fmtCLP, fmtFecha } from '../ui';

export default function ModCaja(props){
  var avisar=props.avisar||function(){};
  var me=props.me||null;
  var [tab,setTab]=useState('caja');
  var [sessions,setSessions]=useState([]); var [invoices,setInvoices]=useState([]);
  var [payments,setPayments]=useState([]); var [creditNotes,setCreditNotes]=useState([]);
  var [cxc,setCxc]=useState([]); var [ots,setOts]=useState([]); var [cust,setCust]=useState({});
  var [fondo,setFondo]=useState(0); var [counted,setCounted]=useState(0);
  var [iva,setIva]=useState(0.19);

  async function cargar(){
    var r=await Promise.all([
      supabase.from('cash_sessions').select('*').order('id',{ascending:false}).limit(50),
      supabase.from('invoices').select('*').order('id',{ascending:false}).limit(200),
      supabase.from('payments').select('*').order('id',{ascending:false}).limit(300),
      supabase.from('credit_notes').select('*').order('id',{ascending:false}).limit(100),
      supabase.from('accounts_receivable').select('*').order('id',{ascending:false}).limit(200),
      supabase.from('work_orders').select('*').order('id',{ascending:false}).limit(300),
      supabase.from('customers').select('id,nombre'),
      supabase.from('settings').select('valor').eq('clave','iva').limit(1)
    ]);
    setSessions(r[0].data||[]); setInvoices(r[1].data||[]); setPayments(r[2].data||[]);
    setCreditNotes(r[3].data||[]); setCxc(r[4].data||[]); setOts(r[5].data||[]);
    var cm={}; (r[6].data||[]).forEach(function(x){cm[x.id]=x.nombre;}); setCust(cm);
    if(r[7].data&&r[7].data[0]) setIva(Number(r[7].data[0].valor)||0.19);
  }
  useEffect(function(){ cargar(); },[]);

  var open=sessions.find(function(s){return s.status==='open';});
  var cerradas=ots.filter(function(o){return o.estado==='Cerrada'&&!payments.some(function(p){return p.work_order_id===o.id;});});
  var porCobrar=cxc.filter(function(c){return c.status!=='paid';});

  async function abrirCaja(){
    await supabase.from('cash_sessions').insert([{user_id:me?me.id:null,opening_amount:fondo,status:'open'}]);
    avisar('✅ Caja abierta',T.ok); cargar();
  }
  async function cerrarCaja(s){
    var expected=Number(s.opening_amount||0)+payments.filter(function(p){return p.cash_session_id===s.id&&p.method==='efectivo';}).reduce(function(a,p){return a+Number(p.amount);},0);
    await supabase.from('cash_sessions').update({status:'closed',closed_at:new Date().toISOString(),expected_amount:expected,counted_amount:counted,difference:counted-expected}).eq('id',s.id);
    avisar('✅ Caja cerrada. Diferencia: '+fmtCLP(counted-expected),counted>=expected?T.ok:T.danger); cargar();
  }

  async function cobrar(o){
    var total=Number(o.total_pagar)||Math.round((Number((o.kpi||{}).venta_total)||0)*(1+iva));
    var method=window.prompt('Método (efectivo/transferencia/tarjeta/credito):','efectivo')||'efectivo';
    var amount=Number(window.prompt('Monto a cobrar:',total)||total);
    if(amount<=0) return;
    var inv=await supabase.from('invoices').insert([{work_order_id:o.id,customer_id:o.customer_id,subtotal:Math.round(total/(1+iva)),tax:Math.round(total-total/(1+iva)),total:total,status:method==='credito'?'pending':'paid'}]).select();
    var invId=inv.data&&inv.data[0]?inv.data[0].id:null;
    await supabase.from('payments').insert([{invoice_id:invId,work_order_id:o.id,cash_session_id:(method==='efectivo'&&open)?open.id:null,method:method,amount:amount,registered_by:me?me.id:null}]);
    var ex=cxc.find(function(c){return c.work_order_id===o.id;});
    if(ex){
      var np=Number(ex.paid||0)+amount;
      await supabase.from('accounts_receivable').update({paid:np,status:np>=ex.amount?'paid':'partial'}).eq('id',ex.id);
    } else if(method==='credito'||amount<total){
      await supabase.from('accounts_receivable').insert([{work_order_id:o.id,customer_id:o.customer_id,amount:total,paid:amount,status:amount>=total?'paid':'partial'}]);
    }
    if(invId) await supabase.from('invoices').update({status:method==='credito'?'pending':'paid'}).eq('id',invId);
    avisar('✅ Cobrado '+fmtCLP(amount),T.ok); cargar();
  }

  async function anticipo(o){
    var amount=Number(window.prompt('Monto anticipo:'));
    if(!amount||amount<=0) return;
    await supabase.from('payments').insert([{work_order_id:o.id,method:'anticipo',amount:amount,registered_by:me?me.id:null}]);
    avisar('✅ Anticipo registrado',T.ok); cargar();
  }

  async function notaCredito(inv){
    var amount=Number(window.prompt('Monto nota crédito:'));
    var reason=window.prompt('Motivo:')||'';
    if(!amount||amount<=0) return;
    await supabase.from('credit_notes').insert([{invoice_id:inv.id,amount:amount,reason:reason}]);
    avisar('✅ Nota crédito creada',T.ok); cargar();
  }

  function linkPago(o){
    var link='https://torque-os-self.vercel.app/pagar/'+o.id;
    var wa='https://wa.me/?text='+encodeURIComponent('Link de pago OT-'+o.ot_number+': '+link);
    window.open(wa,'_blank');
  }

  return (
    <div>
      <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
        {['caja','cobrar','facturas','cxc'].map(function(t){
          return <button key={t} onClick={function(){ setTab(t); }} style={{padding:'8px 14px',borderRadius:999,border:tab===t?'0':'1px solid '+T.border,background:tab===t?T.brand:'transparent',color:tab===t?'#fff':T.text,fontWeight:600,fontSize:13,cursor:'pointer'}}>{t}</button>;
        })}
      </div>
      {tab==='caja'? <div style={S.card}>
        <h2 style={S.h2}>Caja · Sesión actual</h2>
        {open? <div>
          <p style={{...S.sub,margin:'6px 0'}}>Abierta: {fmtFecha(open.created_at)} · Fondo inicial: {fmtCLP(open.opening_amount)}</p>
          <p style={{...S.sub,margin:'4px 0'}}>Pagos en efectivo: {fmtCLP(payments.filter(function(p){return p.cash_session_id===open.id&&p.method==='efectivo';}).reduce(function(a,p){return a+Number(p.amount);},0))}</p>
          <div style={{display:'flex',gap:8,marginTop:10,flexWrap:'wrap'}}>
            <input style={{...S.input,width:150,marginBottom:0}} type="number" placeholder="Contado $" value={counted} onChange={function(e){setCounted(Number(e.target.value));}}/>
            <button style={{...S.btn(T.danger),width:'auto',marginBottom:0}} onClick={function(){cerrarCaja(open);}}>Cerrar caja (arqueo)</button>
          </div>
        </div> : <div>
          <p style={S.sub}>No hay caja abierta. Ingresa el fondo inicial y abre.</p>
          <div style={{display:'flex',gap:8,marginTop:10,flexWrap:'wrap'}}>
            <input style={{...S.input,width:150,marginBottom:0}} type="number" placeholder="Fondo $" value={fondo} onChange={function(e){setFondo(Number(e.target.value));}}/>
            <button style={{...S.btn(T.brand),width:'auto',marginBottom:0}} onClick={abrirCaja}>🔓 Abrir caja</button>
          </div>
        </div>}
        <h3 style={{...S.h2,marginTop:16}}>Historial ({sessions.length})</h3>
        {sessions.slice(0,10).map(function(s){ return <p key={s.id} style={{fontSize:13,margin:'4px 0'}}>{fmtFecha(s.created_at)} · {s.status} · Fondo {fmtCLP(s.opening_amount)} · Dif {fmtCLP(s.difference||0)}</p>; })}
        {sessions.length===0? <p style={S.sub}>Sin sesiones.</p> : null}
      </div> : null}

      {tab==='cobrar'? <div style={S.card}>
        <h2 style={S.h2}>OTs cerradas por cobrar ({cerradas.length})</h2>
        {cerradas.map(function(o){ var c=cust[o.customer_id]||'—';
          return <div key={o.id} style={{border:'1px solid '+T.border,borderRadius:10,padding:10,marginBottom:8,background:T.surface2}}>
            <div style={{display:'flex',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}>
              <b style={{color:T.brand}}>OT-{o.ot_number} · {c}</b>
              <b style={{color:T.ok}}>{fmtCLP(Number(o.total_pagar)||Math.round((Number((o.kpi||{}).venta_total)||0)*(1+iva)))}</b>
            </div>
            <div style={{display:'flex',gap:6,marginTop:8,flexWrap:'wrap'}}>
              <button style={{...S.btnO(T.ok),width:'auto',marginBottom:0}} onClick={function(){cobrar(o);}}>💵 Cobrar</button>
              <button style={{...S.btnO(T.info),width:'auto',marginBottom:0}} onClick={function(){anticipo(o);}}>Anticipo</button>
              <button style={{...S.btnO(T.warn),width:'auto',marginBottom:0}} onClick={function(){linkPago(o);}}>🔗 Link pago</button>
            </div>
          </div>;
        })}
        {cerradas.length===0? <p style={S.sub}>Sin OTs cerradas por cobrar.</p> : null}
      </div> : null}

      {tab==='facturas'? <div style={S.card}>
        <h2 style={S.h2}>Facturas emitidas ({invoices.length})</h2>
        {invoices.map(function(i){ var o=ots.find(function(x){return x.id===i.work_order_id;});
          return <div key={i.id} style={{border:'1px solid '+T.border,borderRadius:10,padding:10,marginBottom:8,background:T.surface2}}>
            <div style={{display:'flex',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}>
              <b>F#{i.id} · OT-{o?o.ot_number:'?'}</b>
              <span style={S.pill(i.status==='paid'?T.ok:T.warn)}>{i.status}</span>
            </div>
            <p style={{...S.sub,margin:'4px 0'}}>Subtotal {fmtCLP(i.subtotal)} · IVA {fmtCLP(i.tax)} · Total {fmtCLP(i.total)}</p>
            <button style={{...S.btnO(T.danger),width:'auto',marginBottom:0}} onClick={function(){notaCredito(i);}}>N.Crédito</button>
          </div>;
        })}
        {invoices.length===0? <p style={S.sub}>Sin facturas. Cobra una OT para emitir.</p> : null}
      </div> : null}

      {tab==='cxc'? <div style={S.card}>
        <h2 style={S.h2}>Cuentas por cobrar ({porCobrar.length})</h2>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr><th style={S.th}>OT</th><th style={S.th}>Cliente</th><th style={S.th}>Total</th><th style={S.th}>Pagado</th><th style={S.th}>Saldo</th><th style={S.th}>Estado</th></tr></thead>
          <tbody>{porCobrar.map(function(c){ var o=ots.find(function(x){return x.id===c.work_order_id;});
            return <tr key={c.id}>
              <td style={S.td}>OT-{o?o.ot_number:'?'}</td>
              <td style={S.td}>{cust[c.customer_id]||'—'}</td>
              <td style={S.td}>{fmtCLP(c.amount)}</td>
              <td style={S.td}>{fmtCLP(c.paid)}</td>
              <td style={{...S.td,color:T.danger,fontWeight:800}}>{fmtCLP(c.amount-c.paid)}</td>
              <td style={S.td}><span style={S.pill(c.status==='paid'?T.ok:T.warn)}>{c.status}</span></td>
            </tr>;
          })}</tbody>
        </table>
        {porCobrar.length===0? <p style={S.sub}>Sin cuentas por cobrar.</p> : null}
      </div> : null}
    </div>);
}
