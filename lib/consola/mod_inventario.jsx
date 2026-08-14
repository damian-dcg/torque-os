'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S, fmtCLP } from '../ui';

const TYPES=['new','used','recovered','refurbished','core','quarantine','scrap'];
const TYPE_LABEL={'new':'Nuevo','used':'Usado','recovered':'Recuperado','refurbished':'Refurb','core':'Core','quarantine':'Cuarentena','scrap':'Scrap'};
const TYPE_COLOR={'new':T.info,'used':T.warn,'recovered':T.ok,'refurbished':T.teal,'core':T.violet,'quarantine':T.danger,'scrap':T.muted};
const MOV_TYPES=['purchase_in','recovery_in','adjustment_in','transfer_in','service_out','sale_out','scrap_out','transfer_out','adjustment_out'];
const MOV_LABEL={'purchase_in':'Compra','recovery_in':'Recuperación','adjustment_in':'Ajuste +','transfer_in':'Transferencia +','service_out':'Uso OT','sale_out':'Venta','scrap_out':'Scrap','transfer_out':'Transferencia −','adjustment_out':'Ajuste −'};

export default function ModInventario(props){
  var avisar=props.avisar||function(){};
  var [items,setItems]=useState([]); var [kardex,setKardex]=useState([]);
  var [warehouses,setWarehouses]=useState([]); var [reservations,setReservations]=useState([]);
  var [counts,setCounts]=useState([]); var [countLines,setCountLines]=useState([]);
  var [tab,setTab]=useState('stock'); var [filter,setFilter]=useState('all');
  var [q,setQ]=useState(''); var [selected,setSelected]=useState(null);

  async function cargar(){
    var r=await Promise.all([
      supabase.from('stock_items').select('*').order('sku',{ascending:true}).limit(1000),
      supabase.from('stock_kardex').select('*').order('id',{ascending:false}).limit(500),
      supabase.from('warehouses').select('*').order('name'),
      supabase.from('stock_reservations').select('*').order('id',{ascending:false}).limit(200),
      supabase.from('stock_counts').select('*').order('id',{ascending:false}).limit(20),
      supabase.from('stock_count_lines').select('*').order('id',{ascending:false}).limit(200)
    ]);
    setItems(r[0].data||[]); setKardex(r[1].data||[]); setWarehouses(r[2].data||[]);
    setReservations(r[3].data||[]); setCounts(r[4].data||[]); setCountLines(r[5].data||[]);
  }
  useEffect(function(){ cargar(); },[]);

  function whName(id){ return (warehouses.find(function(w){return w.id===id;})||{}).name||'—'; }
  function kardexOf(id){ return kardex.filter(function(k){return k.stock_item_id===id;}); }
  function alertas(){ return items.filter(function(i){ return i.status==='available'&&Number(i.quantity)<=Number(i.min_stock)&&Number(i.min_stock)>0; }); }

  var visible=items.filter(function(i){
    if(filter!=='all'&&i.stock_type!==filter) return false;
    if(!q) return true;
    var t=q.toLowerCase();
    return (i.sku||'').toLowerCase().indexOf(t)>=0||(i.name||'').toLowerCase().indexOf(t)>=0;
  });

  async function crearItem(){
    var sku=window.prompt('SKU:')||'NEW-'+Date.now().toString().slice(-6);
    var name=window.prompt('Nombre:'); if(!name) return;
    var type=window.prompt('Tipo ('+TYPES.join('/')+'):','new')||'new';
    var qty=Number(window.prompt('Cantidad inicial:')||0);
    var wh=warehouses[0]; if(!wh){ avisar('⛗ Sin almacén',T.danger); return; }
    var ins=await supabase.from('stock_items').insert([{sku:sku,name:name,stock_type:type,quantity:qty,warehouse_id:wh.id,status:'available',qr_code:sku}]).select();
    if(ins.data&&ins.data[0]){
      await supabase.from('stock_kardex').insert([{stock_item_id:ins.data[0].id,warehouse_id:wh.id,movement_type:'adjustment_in',quantity:qty,balance:qty,reference_type:'initial',reference_id:null}]);
      avisar('✅ Item creado: '+sku,T.ok); cargar();
    }
  }

  async function movimiento(item){
    var mtype=window.prompt('Tipo movimiento ('+MOV_TYPES.join('/')+'):','service_out');
    if(!MOV_TYPES.includes(mtype)){ avisar('⛗ Tipo inválido',T.danger); return; }
    var qty=Number(window.prompt('Cantidad (positiva):')||0); if(qty<=0) return;
    if(mtype.endsWith('_out')&&qty>Number(item.quantity)){ avisar('⛗ Stock insuficiente: '+item.quantity,T.danger); return; }
    var newBal=Number(item.quantity)+(mtype.endsWith('_in')?qty:-qty);
    await supabase.from('stock_items').update({quantity:newBal}).eq('id',item.id);
    await supabase.from('stock_kardex').insert([{stock_item_id:item.id,warehouse_id:item.warehouse_id,movement_type:mtype,quantity:mtype.endsWith('_in')?qty:-qty,balance:newBal,reference_type:'manual'}]);
    avisar('✅ Movimiento registrado. Balance: '+newBal,T.ok); cargar();
  }

  async function reservar(item){
    var ot_id=Number(window.prompt('ID de OT para reservar:')); if(!ot_id) return;
    var qty=Number(window.prompt('Cantidad a reservar:')||1);
    if(qty>Number(item.quantity)){ avisar('⛗ Stock insuficiente',T.danger); return; }
    await supabase.from('stock_reservations').insert([{stock_item_id:item.id,work_order_id:ot_id,quantity:qty,status:'reserved'}]);
    avisar('✅ Reserva creada',T.ok); cargar();
  }

  async function transferir(item){
    var dest=Number(window.prompt('ID almacén destino (disponibles: '+warehouses.map(function(w){return w.id+'='+w.name;}).join(', ')+'):'));
    var wh=warehouses.find(function(w){return w.id===dest;});
    if(!wh){ avisar('⛗ Almacén destino inválido',T.danger); return; }
    var qty=Number(window.prompt('Cantidad a transferir:')||1);
    if(qty>Number(item.quantity)){ avisar('⛗ Stock insuficiente',T.danger); return; }
    await supabase.from('stock_items').update({quantity:Number(item.quantity)-qty}).eq('id',item.id);
    var newIt=await supabase.from('stock_items').insert([{sku:item.sku,name:item.name,stock_type:item.stock_type,condition_grade:item.condition_grade,quantity:qty,unit_cost:item.unit_cost,unit_price:item.unit_price,warehouse_id:dest,location:null,status:item.status,qr_code:item.qr_code}]).select();
    if(newIt.data&&newIt.data[0]){
      await supabase.from('stock_kardex').insert([
        {stock_item_id:item.id,warehouse_id:item.warehouse_id,movement_type:'transfer_out',quantity:-qty,balance:Number(item.quantity)-qty,reference_type:'transfer'},
        {stock_item_id:newIt.data[0].id,warehouse_id:dest,movement_type:'transfer_in',quantity:qty,balance:qty,reference_type:'transfer'}
      ]);
    }
    avisar('✅ Transferencia realizada',T.ok); cargar();
  }

  async function nuevoConteo(){
    var wh=warehouses[0]; if(!wh){ avisar('⛗ Sin almacén',T.danger); return; }
    var c=await supabase.from('stock_counts').insert([{warehouse_id:wh.id,status:'open'}]).select();
    if(c.data&&c.data[0]){
      var stock=items.filter(function(i){return i.warehouse_id===wh.id;});
      var lines=stock.map(function(i){ return {count_id:c.data[0].id,stock_item_id:i.id,system_qty:i.quantity,counted_qty:null,difference:null}; });
      if(lines.length) await supabase.from('stock_count_lines').insert(lines);
      avisar('✅ Conteo iniciado con '+stock.length+' líneas',T.ok); cargar();
    }
  }

  async function cerrarConteo(count){
    await supabase.from('stock_counts').update({status:'closed',closed_at:new Date().toISOString()}).eq('id',count.id);
    avisar('✅ Conteo cerrado',T.ok); cargar();
  }

  function pdfKardex(item){
    var k=kardexOf(item.id);
    var w=window.open('','_blank');
    w.document.write('<html><head><title>Kardex '+item.sku+'</title><style>body{font-family:Arial;padding:24px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ccc;padding:6px;font-size:11px;text-align:left}</style></head><body>'
      +'<h2>Kardex · '+item.sku+' · '+item.name+'</h2>'
      +'<p>Tipo: '+TYPE_LABEL[item.stock_type]||item.stock_type+' · Almacén: '+whName(item.warehouse_id)+' · Balance actual: '+item.quantity+'</p>'
      +'<table><thead><tr><th>Fecha</th><th>Movimiento</th><th>Cantidad</th><th>Saldo</th><th>Ref.</th></tr></thead><tbody>'
      +k.map(function(x){return '<tr><td>'+new Date(x.created_at).toLocaleString('es-CL')+'</td><td>'+(MOV_LABEL[x.movement_type]||x.movement_type)+'</td><td>'+x.quantity+'</td><td>'+x.balance+'</td><td>'+(x.reference_type||'')+'</td></tr>';}).join('')
      +'</tbody></table><script>window.print()</script></body></html>');
    w.document.close();
  }

  var alertasList=alertas();
  return (
    <div>
      <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
        {['stock','kardex','alertas','conteos','transferencias','reservas'].map(function(t){
          return <button key={t} onClick={function(){ setTab(t); }} style={{padding:'8px 14px',borderRadius:999,border:tab===t?'0':'1px solid '+T.border,background:tab===t?T.brand:'transparent',color:tab===t?'#fff':T.text,fontWeight:600,fontSize:13,cursor:'pointer'}}>{t}</button>;
        })}
      </div>

      {tab==='stock'? <div style={S.card}>
        <h2 style={S.h2}>Stock multi-estado ({items.length} items)</h2>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:10}}>
          <input style={{...S.input,flex:2,marginBottom:0}} placeholder="Buscar SKU o nombre…" value={q} onChange={function(e){ setQ(e.target.value); }}/>
          <select style={{...S.input,flex:1,marginBottom:0}} value={filter} onChange={function(e){ setFilter(e.target.value); }}>
            <option value="all">Todos los tipos</option>
            {TYPES.map(function(t){ return <option key={t} value={t}>{TYPE_LABEL[t]}</option>; })}
          </select>
          <button style={{...S.btn(T.brand),width:'auto',marginBottom:0}} onClick={crearItem}>+ Nuevo item</button>
        </div>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr><th style={S.th}>SKU</th><th style={S.th}>Nombre</th><th style={S.th}>Tipo</th><th style={S.th}>Grado</th><th style={S.th}>Cant.</th><th style={S.th}>Mín.</th><th style={S.th}>Almacén</th><th style={S.th}>Acciones</th></tr></thead>
          <tbody>{visible.map(function(i){ return <tr key={i.id}>
            <td style={{...S.td,fontFamily:'monospace'}}>{i.sku}</td>
            <td style={S.td}>{i.name}</td>
            <td style={S.td}><span style={S.pill(TYPE_COLOR[i.stock_type]||T.muted)}>{TYPE_LABEL[i.stock_type]||i.stock_type}</span></td>
            <td style={S.td}>{i.condition_grade||'—'}</td>
            <td style={S.td}>{i.quantity}</td>
            <td style={S.td}>{i.min_stock||0}</td>
            <td style={S.td}>{whName(i.warehouse_id)}</td>
            <td style={S.td}><div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
              <button style={{...S.btnO(T.info),width:'auto',marginBottom:0,fontSize:11,padding:'4px 8px'}} onClick={function(){ setSelected(i); }}>Ver</button>
              <button style={{...S.btnO(T.warn),width:'auto',marginBottom:0,fontSize:11,padding:'4px 8px'}} onClick={function(){ movimiento(i); }}>Mov</button>
              <button style={{...S.btnO(T.ok),width:'auto',marginBottom:0,fontSize:11,padding:'4px 8px'}} onClick={function(){ reservar(i); }}>Res</button>
              <button style={{...S.btnO(T.teal),width:'auto',marginBottom:0,fontSize:11,padding:'4px 8px'}} onClick={function(){ transferir(i); }}>Trans</button>
            </div></td>
          </tr>; })}</tbody>
        </table>
        {selected? <div style={{...S.card,marginTop:12,border:'2px solid '+T.brand}}>
          <h3 style={S.h2}>{selected.sku} · {selected.name}</h3>
          <p style={S.sub}>Tipo: {TYPE_LABEL[selected.stock_type]} · Almacén: {whName(selected.warehouse_id)} · Cantidad: {selected.quantity}</p>
          <h4 style={{...S.h2,marginTop:10}}>Kardex ({kardexOf(selected.id).length} mov)</h4>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr><th style={S.th}>Fecha</th><th style={S.th}>Movimiento</th><th style={S.th}>Cant.</th><th style={S.th}>Saldo</th></tr></thead>
            <tbody>{kardexOf(selected.id).slice(0,20).map(function(k){ return <tr key={k.id}>
              <td style={S.td}>{new Date(k.created_at).toLocaleString('es-CL')}</td>
              <td style={S.td}>{MOV_LABEL[k.movement_type]||k.movement_type}</td>
              <td style={S.td}>{k.quantity}</td>
              <td style={S.td}>{k.balance}</td>
            </tr>; })}</tbody>
          </table>
          <button style={{...S.btn(T.info),width:'auto',marginTop:10}} onClick={function(){ pdfKardex(selected); }}>📄 PDF Kardex</button>
        </div> : null}
      </div> : null}

      {tab==='kardex'? <div style={S.card}>
        <h2 style={S.h2}>Kardex completo ({kardex.length} movimientos)</h2>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr><th style={S.th}>Fecha</th><th style={S.th}>SKU</th><th style={S.th}>Almacén</th><th style={S.th}>Mov.</th><th style={S.th}>Cant.</th><th style={S.th}>Saldo</th></tr></thead>
          <tbody>{kardex.slice(0,100).map(function(k){
            var it=items.find(function(i){return i.id===k.stock_item_id;});
            return <tr key={k.id}>
              <td style={S.td}>{new Date(k.created_at).toLocaleString('es-CL')}</td>
              <td style={{...S.td,fontFamily:'monospace'}}>{it?it.sku:'—'}</td>
              <td style={S.td}>{whName(k.warehouse_id)}</td>
              <td style={S.td}>{MOV_LABEL[k.movement_type]||k.movement_type}</td>
              <td style={S.td}>{k.quantity}</td>
              <td style={S.td}>{k.balance}</td>
            </tr>;
          })}</tbody>
        </table>
        {kardex.length===0? <p style={S.sub}>Sin movimientos. Crea items y haz movimientos.</p> : null}
      </div> : null}

      {tab==='alertas'? <div style={S.card}>
        <h2 style={S.h2}>Alertas de stock crítico ({alertasList.length})</h2>
        {alertasList.map(function(i){ return <div key={i.id} style={{border:'1px solid '+T.border,borderLeft:'4px solid '+T.danger,borderRadius:10,padding:10,marginBottom:8,background:T.surface2}}>
          <b style={{color:T.danger}}>{i.sku}</b> · {i.name}<br/>
          <span style={S.sub}>Stock actual: {i.quantity} · Mínimo: {i.min_stock} · Almacén: {whName(i.warehouse_id)}</span>
        </div>; })}
        {alertasList.length===0? <p style={S.sub}>Sin alertas. Todos los ítems con mínimo definido tienen stock suficiente.</p> : null}
      </div> : null}

      {tab==='conteos'? <div style={S.card}>
        <h2 style={S.h2}>Conteos cíclicos ({counts.length})</h2>
        <button style={{...S.btn(T.brand),width:'auto',marginBottom:10}} onClick={nuevoConteo}>+ Nuevo conteo</button>
        {counts.map(function(c){
          var lines=countLines.filter(function(l){return l.count_id===c.id;});
          return <div key={c.id} style={{border:'1px solid '+T.border,borderRadius:10,padding:12,marginBottom:10,background:T.surface2}}>
            <div style={{display:'flex',justifyContent:'space-between',gap:8}}>
              <b>Conteo #{c.id} · {whName(c.warehouse_id)}</b>
              <span style={S.pill(c.status==='closed'?T.ok:T.warn)}>{c.status}</span>
            </div>
            <p style={S.sub}>{lines.length} líneas · iniciado {new Date(c.started_at).toLocaleString('es-CL')}</p>
            {c.status==='open'? <button style={{...S.btn(T.ok),width:'auto',marginBottom:0,marginTop:8}} onClick={function(){ cerrarConteo(c); }}>✔ Cerrar conteo</button> : null}
          </div>;
        })}
        {counts.length===0? <p style={S.sub}>Sin conteos.</p> : null}
      </div> : null}

      {tab==='transferencias'? <div style={S.card}>
        <h2 style={S.h2}>Transferencias entre almacenes</h2>
        <p style={S.sub}>Desde la pestaña Stock, selecciona un ítem y pulsa "Trans" para transferir a otro almacén.</p>
        <h3 style={{...S.h2,marginTop:12}}>Últimas transferencias</h3>
        {kardex.filter(function(k){return k.movement_type==='transfer_in'||k.movement_type==='transfer_out';}).slice(0,20).map(function(k){
          var it=items.find(function(i){return i.id===k.stock_item_id;});
          return <p key={k.id} style={{fontSize:13,margin:'4px 0'}}>{new Date(k.created_at).toLocaleString('es-CL')} · {it?it.sku:'—'} · {MOV_LABEL[k.movement_type]} · {k.quantity} · {whName(k.warehouse_id)}</p>;
        })}
      </div> : null}

      {tab==='reservas'? <div style={S.card}>
        <h2 style={S.h2}>Reservas por OT ({reservations.length})</h2>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr><th style={S.th}>SKU</th><th style={S.th}>OT</th><th style={S.th}>Cant.</th><th style={S.th}>Estado</th><th style={S.th}>Fecha</th></tr></thead>
          <tbody>{reservations.map(function(r){
            var it=items.find(function(i){return i.id===r.stock_item_id;});
            return <tr key={r.id}>
              <td style={{...S.td,fontFamily:'monospace'}}>{it?it.sku:'—'}</td>
              <td style={S.td}>OT-{r.work_order_id}</td>
              <td style={S.td}>{r.quantity}</td>
              <td style={S.td}><span style={S.pill(r.status==='reserved'?T.warn:T.ok)}>{r.status}</span></td>
              <td style={S.td}>{new Date(r.created_at).toLocaleString('es-CL')}</td>
            </tr>;
          })}</tbody>
        </table>
        {reservations.length===0? <p style={S.sub}>Sin reservas.</p> : null}
      </div> : null}
    </div>);
}
