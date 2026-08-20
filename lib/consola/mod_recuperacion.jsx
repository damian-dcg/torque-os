'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S, fmtCLP } from '../ui';
export default function ModRecuperacion(props){
  var avisar=props.avisar||function(){};
  var [components,setComponents]=useState([]); var [evals,setEvals]=useState([]);
  var [vals,setVals]=useState([]); var [stock,setStock]=useState([]);
  var [sessions,setSessions]=useState([]); var [reqs,setReqs]=useState([]); var [ots,setOts]=useState([]);
  var [tab,setTab]=useState('pendientes');
  async function cargar(){
    var r=await Promise.all([
      supabase.from('extracted_components').select('*').order('id',{ascending:false}).limit(200),
      supabase.from('component_evaluations').select('*').order('id',{ascending:false}).limit(200),
      supabase.from('component_valuations').select('*').order('id',{ascending:false}).limit(200),
      supabase.from('stock_items').select('*').order('id',{ascending:false}).limit(200),
      supabase.from('disassembly_sessions').select('*').limit(200),
      supabase.from('disassembly_requests').select('*').limit(200),
      supabase.from('work_orders').select('*').limit(200)
    ]);
    setComponents(r[0].data||[]); setEvals(r[1].data||[]); setVals(r[2].data||[]);
    setStock((r[3].data||[]).filter(function(x){ return x.stock_type==='recovered'; }));
    setSessions(r[4].data||[]); setReqs(r[5].data||[]); setOts(r[6].data||[]);
  }
  useEffect(function(){ cargar(); },[]);
  function evalDe(c){ return evals.find(function(e){return e.component_id===c;}); }
  function valDe(e){ return vals.find(function(v){return v.evaluation_id===e;}); }
  function origen(c){
    var s=sessions.find(function(x){return x.id===c.session_id;});
    var q=s?reqs.find(function(x){return x.request_id===s.request_id;}):null;
    var o=q?ots.find(function(x){return x.id===q.ot_id;}):null;
    return {session:s,req:q,ot:o};
  }
  var pendientes=components.filter(function(c){ return !c.stock_item_id; });
  async function aprobarValor(c){
    var ev=evalDe(c.id); if(!ev){ avisar('⛔ Primero evalúa el componente',T.danger); return; }
    var v=valDe(ev.id); if(!v){ avisar('⛔ Sin valoración',T.danger); return; }
    var alto=(v.approved_value>=100000)||ev.safety_approved;
    if(alto){
      if(!window.confirm('Valor alto o pieza de seguridad: requiere DOBLE aprobación (RN-08/RN-18). ¿Confirmar segunda aprobación?')) return;
      await supabase.from('component_valuations').update({double_approval:true}).eq('id',v.id);
    }
    await supabase.from('component_valuations').update({approved_at:new Date().toISOString()}).eq('id',v.id);
    avisar('✅ Valor aprobado',T.ok); cargar();
  }
  async function ingresarStock(c){
    var ev=evalDe(c.id); var v=ev?valDe(ev.id):null;
    if(ev&&ev.test_result==='fail'){ avisar('⛔ Pieza no segura: bloqueada (RN-08)',T.danger); return; }
    var sku='REC-'+String(c.id).padStart(5,'0');
    var o=origen(c).ot;
    var item=await supabase.from('stock_items').insert([{
      sku:sku, name:c.name, stock_type:'recovered', condition_grade:ev?ev.grade:'B',
      quantity:c.quantity, unit_cost:0, unit_price:v?v.approved_value:0, warranty_days:90,
      source_asset_id:o?o.asset_id:null, source_service_order_id:o?o.id:null,
      source_component_id:c.id, status:'available', qr_code:sku
    }]).select();
    if(item.data&&item.data[0]){
      await supabase.from('extracted_components').update({stock_item_id:item.data[0].id,destination:'stock'}).eq('id',c.id);
      avisar('✅ Ingresado a stock recuperado: '+sku,T.ok); cargar();
    }
  }
  function etiquetaQR(s){
    var qr='https://api.qrserver.com/v1/create-qr-code/?size=120x120&data='+encodeURIComponent('TORQUE-OS|'+s.sku);
    var w=window.open('','_blank');
    w.document.write('<html><head><title>'+s.sku+'</title><style>body{font-family:Arial;padding:24px;text-align:center}</style></head><body><h2>'+s.sku+'</h2><img src="'+qr+'"/><p>'+s.name+' · Grado '+(s.condition_grade||'')+' · '+fmtCLP(s.unit_price)+'</p><script>window.print()</script></body></html>');
    w.document.close();
  }
  return (
    <div>
      <div style={{display:'flex',gap:6,marginBottom:12}}>
        {['pendientes','stock','trazabilidad'].map(function(t){
          return <button key={t} onClick={function(){ setTab(t); }} style={{padding:'8px 14px',borderRadius:999,border:tab===t?'0':'1px solid '+T.border,background:tab===t?T.brand:'transparent',color:tab===t?'#fff':T.text,fontWeight:600,fontSize:13,cursor:'pointer'}}>{t}</button>;
        })}
      </div>
      {tab==='pendientes'? <div style={S.card}>
        <h2 style={S.h2}>Componentes recuperados pendientes de stock ({pendientes.length})</h2>
        {pendientes.map(function(c){
          var ev=evalDe(c.id); var v=ev?valDe(ev.id):null;
          return <div key={c.id} style={{border:'1px solid '+T.border,borderRadius:10,padding:12,marginBottom:10,background:T.surface2}}>
            <div style={{display:'flex',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}>
              <b>{c.name}</b><span style={S.pill(T.info)}>{c.condition}</span>
            </div>
            <p style={{...S.sub,margin:'6px 0'}}>Cantidad {c.quantity} · Grado {ev?ev.grade:'—'} · Prueba {ev?ev.test_result:'—'} · Seguridad {ev&&ev.safety_approved?'✔':'—'}</p>
            <p style={{...S.sub,margin:'4px 0'}}>Valor sugerido {v?fmtCLP(v.suggested_value):'—'} · aprobado {v?fmtCLP(v.approved_value):'—'} {v&&v.double_approval?'· doble aprobación ✔':''}</p>
            <div style={{display:'flex',gap:8,marginTop:8,flexWrap:'wrap'}}>
              <button style={{...S.btnO(T.ok),width:'auto',marginBottom:0}} onClick={function(){ aprobarValor(c); }}>💲 Aprobar valor</button>
              <button style={{...S.btn(T.brand),width:'auto',marginBottom:0}} onClick={function(){ ingresarStock(c); }}>📦 Ingresar a stock</button>
            </div>
          </div>;
        })}
        {pendientes.length===0? <p style={S.sub}>Sin componentes pendientes. Extrae piezas en una sesión de desarme.</p> : null}
      </div> : null}
      {tab==='stock'? <div style={S.card}>
        <h2 style={S.h2}>Stock recuperado ({stock.length})</h2>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr><th style={S.th}>SKU</th><th style={S.th}>Pieza</th><th style={S.th}>Grado</th><th style={S.th}>Cant.</th><th style={S.th}>Valor</th><th style={S.th}>Acción</th></tr></thead>
          <tbody>{stock.map(function(s){ return <tr key={s.id}>
            <td style={{...S.td,fontFamily:'monospace'}}>{s.sku}</td>
            <td style={S.td}>{s.name}</td>
            <td style={S.td}>{s.condition_grade}</td>
            <td style={S.td}>{s.quantity}</td>
            <td style={S.td}>{fmtCLP(s.unit_price)}</td>
            <td style={S.td}><button style={{...S.btnO(T.info),width:'auto',marginBottom:0}} onClick={function(){ etiquetaQR(s); }}>🏷 Etiqueta QR</button></td>
          </tr>; })}</tbody>
        </table>
        {stock.length===0? <p style={S.sub}>Sin stock recuperado aún.</p> : null}
      </div> : null}
      {tab==='trazabilidad'? <div style={S.card}>
        <h2 style={S.h2}>Trazabilidad de origen (activo donante → stock)</h2>
        {stock.map(function(s){
          var c=components.find(function(x){return x.id===s.source_component_id;});
          var o=origen(c||{session_id:null}).ot;
          return <p key={s.id} style={{fontSize:13,margin:'6px 0'}}><b style={{fontFamily:'monospace'}}>{s.sku}</b> ← {c?c.name:'?'} ← OT-{o?o.ot_number:'?'} ← activo #{s.source_asset_id||'—'}</p>;
        })}
        {stock.length===0? <p style={S.sub}>Sin trazabilidad aún.</p> : null}
      </div> : null}
    </div>);
}
