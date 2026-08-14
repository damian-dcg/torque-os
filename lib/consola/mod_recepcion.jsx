'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S } from '../ui';
export default function ModRecepcion(props){
  var avisar=props.avisar||function(){};
  var [ots,setOts]=useState([]); var [cust,setCust]=useState({}); var [users,setUsers]=useState([]);
  var [ot,setOt]=useState(props.otPreset||null);
  var [f,setF]=useState({voltage:'',location:'',resp:'',notes:'',photos:0});
  var [bel,setBel]=useState([{description:'',quantity:1}]);
  var [sig,setSig]=useState(null); var [sigUrl,setSigUrl]=useState('');
  var [fotosMin,setFotosMin]=useState(2); var [busy,setBusy]=useState(false);
  useEffect(function(){ (async function(){
    var r=await Promise.all([
      supabase.from('work_orders').select('*').in('estado',['Ingresada','Asignada']).order('id',{ascending:false}).limit(200),
      supabase.from('customers').select('id,nombre,rut'),
      supabase.from('users').select('id,nombre'),
      supabase.from('settings').select('valor').eq('clave','fotos_min').single()
    ]);
    setOts(r[0].data||[]); var cm={}; (r[1].data||[]).forEach(function(c){cm[c.id]=c;}); setCust(cm); setUsers(r[2].data||[]);
    if(r[3].data) setFotosMin(Number(r[3].data.valor)||2);
  })(); },[]);
  async function guardar(){
    if(!ot){ avisar('⛗ Elige la OT',T.danger); return; }
    if(Number(f.photos)<fotosMin){ avisar('⛗ Faltan fotos: mínimo '+fotosMin+' (RN-02)',T.danger); return; }
    var sinDesc=bel.some(function(b){ return !b.description; });
    if(sinDesc){ avisar('⛗ Pertenencias sin descripción (RN-03)',T.danger); return; }
    setBusy(true);
    var surl='';
    if(sig){ var path='firma-rec-'+Date.now()+'-'+sig.name; var up=await supabase.storage.from('firmas').upload(path,sig); if(!up.error) surl=supabase.storage.from('firmas').getPublicUrl(path).data.publicUrl; }
    var label='REC-'+Date.now().toString().slice(-6);
    var rec=await supabase.from('receptions').insert([{ot_id:ot.id,asset_id:ot.asset_id||null,customer_id:ot.customer_id,
      received_by:f.resp?Number(f.resp):null,condition_notes:f.notes||null,battery_voltage:f.voltage?Number(f.voltage):null,
      photos_count:Number(f.photos)||0,signature_url:surl||null,location:f.location||null,
      custody_responsible:f.resp?Number(f.resp):null,label_code:label}]).select();
    if(rec.error){ avisar('⛗ '+rec.error.message,T.danger); setBusy(false); return; }
    var rid=rec.data[0].id;
    await supabase.from('belongings').insert(bel.filter(function(b){return b.description;}).map(function(b){ return {reception_id:rid,description:b.description,quantity:Number(b.quantity)||1}; }));
    await supabase.from('work_orders').update({reception_id:rid}).eq('id',ot.id);
    setBusy(false);
    comprobante(rid,label);
    avisar('✅ Recepción '+label+' registrada',T.ok);
  }
  function comprobante(rid,label){
    var c=cust[ot.customer_id]||{};
    var qr='https://api.qrserver.com/v1/create-qr-code/?size=120x120&data='+encodeURIComponent('TORQUE-OS|'+label+'|OT-'+ot.ot_number);
    var w=window.open('','_blank');
    w.document.write('<html><head><title>Recepción '+label+'</title><style>body{font-family:Arial;padding:24px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ccc;padding:6px;font-size:12px;text-align:left}</style></head><body>'
      +'<h2>Comprobante de Recepción y Custodia '+label+'</h2>'
      +'<img src="'+qr+'"/>'
      +'<table><tr><th>OT</th><td>OT-'+ot.ot_number+'</td><th>Cliente</th><td>'+(c.nombre||'')+'</td></tr>'
      +'<tr><th>Ubicación física</th><td>'+(f.location||'')+'</td><th>Responsable custodia</th><td>'+((users.find(function(u){return u.id===Number(f.resp);})||{}).nombre||'')+'</td></tr>'
      +'<tr><th>Voltaje batería</th><td>'+(f.voltage||'—')+'</td><th>Fotos</th><td>'+f.photos+'</td></tr></table>'
      +'<h3>Pertenencias</h3><table><tr><th>Descripción</th><th>Cant.</th></tr>'+bel.filter(function(b){return b.description;}).map(function(b){return '<tr><td>'+b.description+'</td><td>'+b.quantity+'</td></tr>';}).join('')+'</table>'
      +'<p>Firma del cliente registrada. Este comprobante acredita la custodia.</p>'
      +'<script>window.print()</script></body></html>');
    w.document.close();
  }
  return (
    <div style={S.card}>
      <h2 style={S.h2}>Recepción y Custodia (asistente)</h2>
      <label style={S.label}>OT a recibir *</label>
      <select style={S.input} value={ot?ot.id:''} onChange={function(e){ var o=ots.find(function(x){return x.id===Number(e.target.value);}); setOt(o||null); }}>
        <option value="">Elegir…</option>
        {ots.map(function(o){ return <option key={o.id} value={o.id}>OT-{o.ot_number} · {(cust[o.customer_id]||{}).nombre||''}</option>; })}
      </select>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10}}>
        <div><label style={S.label}>N° fotos (mín. {fotosMin})</label><input style={S.input} type="number" value={f.photos} onChange={function(e){ setF(Object.assign({},f,{photos:e.target.value})); }}/></div>
        <div><label style={S.label}>Voltaje / batería</label><input style={S.input} value={f.voltage} onChange={function(e){ setF(Object.assign({},f,{voltage:e.target.value})); }}/></div>
        <div><label style={S.label}>Ubicación física</label><input style={S.input} value={f.location} onChange={function(e){ setF(Object.assign({},f,{location:e.target.value})); }}/></div>
        <div><label style={S.label}>Responsable custodia</label><select style={S.input} value={f.resp} onChange={function(e){ setF(Object.assign({},f,{resp:e.target.value})); }}><option value="">—</option>{users.map(function(u){ return <option key={u.id} value={u.id}>{u.nombre}</option>; })}</select></div>
      </div>
      <label style={S.label}>Pertenencias del cliente (obligatorio, RN-03)</label>
      {bel.map(function(b,i){ return <div key={i} style={{display:'flex',gap:6,marginBottom:6}}>
        <input style={{...S.input,flex:2,marginBottom:0}} placeholder="Descripción" value={b.description} onChange={function(e){ var c=bel.slice(); c[i]={description:e.target.value,quantity:b.quantity}; setBel(c); }}/>
        <input style={{...S.input,width:70,marginBottom:0}} type="number" value={b.quantity} onChange={function(e){ var c=bel.slice(); c[i]={description:b.description,quantity:e.target.value}; setBel(c); }}/>
      </div>; })}
      <button style={{...S.btnO(T.info),width:'auto',marginBottom:10}} onClick={function(){ setBel(bel.concat([{description:'',quantity:1}])); }}>+ Pertenencia</button>
      <label style={S.label}>Estado / notas</label>
      <textarea style={{...S.input,minHeight:60}} value={f.notes} onChange={function(e){ setF(Object.assign({},f,{notes:e.target.value})); }}/>
      <label style={S.label}>Firma del cliente (imagen)</label>
      <input type="file" accept="image/*" onChange={function(e){ setSig(e.target.files[0]); }}/>
      <div style={{marginTop:10}}><button style={{...S.btn(T.ok),width:'auto'}} disabled={busy} onClick={guardar}>💾 Registrar recepción + etiqueta QR</button></div>
    </div>);
}
