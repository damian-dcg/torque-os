'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S, fmtCLP } from '../ui';

export default function ModBodega({avisar}){
  const [parts,setParts]=useState([]); const [movs,setMovs]=useState([]); const [ots,setOts]=useState([]);
  const [q,setQ]=useState(''); const [m,setM]=useState({part_codigo:'',tipo:'salida',cantidad:1,ot_id:'',motivo:''});
  async function cargar(){ const [p,mv,o]=await Promise.all([
    supabase.from('parts').select('codigo,nombre,en_stock,precio').order('codigo').limit(800),
    supabase.from('stock_movements').select('*').order('id',{ascending:false}).limit(200),
    supabase.from('work_orders').select('id,ot_number').order('ot_number',{ascending:false}).limit(200)]);
    setParts(p.data||[]); setMovs(mv.data||[]); setOts(o.data||[]); }
  useEffect(()=>{ cargar(); },[]);
  async function registrar(e){ e.preventDefault();
    const qty=Number(m.cantidad)||0;
    if(!m.part_codigo||qty<=0){ avisar('⛔ Parte y cantidad obligatorios',T.danger); return; }
    const part=parts.find(p=>p.codigo===m.part_codigo);
    if(m.tipo==='salida'){
      if((part.en_stock||0)<qty){ avisar('⛔ Stock insuficiente: hay '+(part.en_stock||0),T.danger); return; }
      await supabase.from('parts').update({en_stock:(part.en_stock||0)-qty}).eq('codigo',m.part_codigo);
            var nuevoStock=(part.en_stock||0)-qty;
      if(nuevoStock<=(part.stock_min||0)){
        await supabase.from('ot_events').insert([{ot_id:m.ot_id?Number(m.ot_id):null,evento:'alerta_stock',detalle:{parte:m.part_codigo,stock:nuevoStock}}]);
        await supabase.from('notifications').insert([{rol_destino:'agente',tipo:'alerta_stock',titulo:'🚨 Quiebre de stock: '+m.part_codigo+' (queda '+nuevoStock+')'}]);
      }
    } else {
      await supabase.from('parts').update({en_stock:(part.en_stock||0)+qty}).eq('codigo',m.part_codigo);
    }
    const {error}=await supabase.from('stock_movements').insert([{part_codigo:m.part_codigo,tipo:m.tipo,cantidad:qty,ot_id:m.ot_id?Number(m.ot_id):null,motivo:m.motivo||null}]);
    if(error) avisar('⛔ '+error.message,T.danger); else { avisar('✅ Movimiento registrado; stock actualizado',T.ok); setM({part_codigo:'',tipo:'salida',cantidad:1,ot_id:'',motivo:''}); cargar(); } }
  const vis=parts.filter(p=>{ const t=q.toLowerCase(); return !t||p.codigo.toLowerCase().includes(t)||(p.nombre||'').toLowerCase().includes(t); });
  return (
    <div>
      <div style={S.card}>
        <h2 style={S.h2}>Movimiento de bodega</h2>
        <form onSubmit={registrar} style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <select style={{...S.input,flex:2,marginBottom:0}} required value={m.part_codigo} onChange={e=>setM({...m,part_codigo:e.target.value})}>
            <option value="">Repuesto…</option>{parts.map(p=><option key={p.codigo} value={p.codigo}>{p.codigo} · {p.nombre} (stock {p.en_stock||0})</option>)}
          </select>
          <select style={{...S.input,width:120,marginBottom:0}} value={m.tipo} onChange={e=>setM({...m,tipo:e.target.value})}><option value="salida">Salida</option><option value="entrada">Entrada</option><option value="ajuste">Ajuste</option></select>
          <input style={{...S.input,width:90,marginBottom:0}} type="number" min="1" value={m.cantidad} onChange={e=>setM({...m,cantidad:e.target.value})}/>
          <select style={{...S.input,flex:1,marginBottom:0}} value={m.ot_id} onChange={e=>setM({...m,ot_id:e.target.value})}><option value="">OT (opcional)</option>{ots.map(o=><option key={o.id} value={o.id}>OT-{o.ot_number}</option>)}</select>
          <input style={{...S.input,flex:1,marginBottom:0}} placeholder="Motivo" value={m.motivo} onChange={e=>setM({...m,motivo:e.target.value})}/>
          <button style={{...S.btn(T.info),width:'auto',marginBottom:0}}>Registrar</button>
        </form>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(340px,1fr))',gap:14}}>
        <div style={S.card}>
          <input style={S.input} placeholder="Buscar repuesto…" value={q} onChange={e=>setQ(e.target.value)}/>
          <div style={{overflow:'auto',maxHeight:420}}><table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr><th style={S.th}>Código</th><th style={S.th}>Nombre</th><th style={S.th}>Stock</th><th style={S.th}>Precio</th></tr></thead>
            <tbody>{vis.map(p=><tr key={p.codigo}><td style={{...S.td,color:T.brand}}>{p.codigo}</td><td style={S.td}>{p.nombre}</td><td style={{...S.td,fontWeight:800,color:(p.en_stock||0)<=0?T.danger:T.ok}}>{p.en_stock||0}</td><td style={S.td}>{fmtCLP(p.precio)}</td></tr>)}</tbody>
          </table></div>
        </div>
        <div style={S.card}>
          <h2 style={S.h2}>Últimos movimientos</h2>
          {movs.map(mv=><p key={mv.id} style={{color:T.text,fontSize:13,margin:'4px 0'}}>{new Date(mv.creado_en).toLocaleDateString('es-CL')} · <b style={{color:mv.tipo==='salida'?T.danger:T.ok}}>{mv.tipo}</b> {mv.cantidad} × {mv.part_codigo} {mv.ot_id?('· OT-'+(ots.find(o=>o.id===mv.ot_id)||{}).ot_number):''} {mv.motivo?('· '+mv.motivo):''}</p>)}
          {movs.length===0&&<p style={S.sub}>Sin movimientos.</p>}
        </div>
      </div>
    </div>);
}
