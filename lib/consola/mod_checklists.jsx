'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S } from '../ui';

function BlockEditor({block,avisar,onSaved}){
  const [items,setItems]=useState(block.items||[]);
  const [nuevo,setNuevo]=useState({l:'',t:'sel',r:false,o:''});
  useEffect(()=>{ setItems(block.items||[]); },[block.code,block.items]);
  async function guardar(){
    const {error}=await supabase.from('checklist_blocks').update({items}).eq('code',block.code);
    if(error) avisar('⛔ '+error.message,T.danger); else { avisar('✅ Bloque "'+block.nombre+'" guardado',T.ok); onSaved&&onSaved(); }
  }
  function addItem(){
    if(!nuevo.l.trim()){ avisar('⛔ Falta el texto del item',T.danger); return; }
    setItems([...items,{l:nuevo.l.trim(),t:nuevo.t,r:nuevo.r,o:nuevo.t==='sel'?nuevo.o.split(',').map(s=>s.trim()).filter(Boolean):null}]);
    setNuevo({l:'',t:'sel',r:false,o:''});
  }
  return (
    <div style={{...S.card,background:T.surface2}}>
      <h3 style={{...S.h2,color:T.teal}}>{block.nombre} <span style={S.sub}>({block.code})</span></h3>
      {items.map((it,i)=>(
        <div key={i} style={{border:`1px solid ${T.border}`,borderRadius:10,padding:10,marginBottom:8,background:T.surface}}>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
            <input style={{...S.input,flex:2,minWidth:160,marginBottom:0}} value={it.l} onChange={e=>{ const c=[...items]; c[i]={...c[i],l:e.target.value}; setItems(c); }}/>
            <select style={{...S.input,width:110,marginBottom:0}} value={it.t} onChange={e=>{ const c=[...items]; c[i]={...c[i],t:e.target.value,o:e.target.value==='sel'?(c[i].o||[]):null}; setItems(c); }}>
              <option value="sel">Selección</option><option value="txt">Texto</option><option value="foto">Foto</option><option value="num">Número</option>
            </select>
            <label style={{...S.label,marginBottom:0,display:'flex',gap:6,alignItems:'center'}}><input type="checkbox" checked={!!it.r} onChange={e=>{ const c=[...items]; c[i]={...c[i],r:e.target.checked}; setItems(c); }}/>Obligatorio</label>
            <button style={{...S.btnO(T.danger),width:'auto',marginBottom:0,padding:'6px 10px'}} onClick={()=>setItems(items.filter((_,k)=>k!==i))}>🗑</button>
          </div>
          {it.t==='sel'&&<input style={{...S.input,marginTop:8,marginBottom:0}} placeholder="Opciones separadas por coma" value={(it.o||[]).join(', ')} onChange={e=>{ const c=[...items]; c[i]={...c[i],o:e.target.value.split(',').map(s=>s.trim()).filter(Boolean)}; setItems(c); }}/>}
        </div>))}
      <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center',marginTop:8}}>
        <input style={{...S.input,flex:2,minWidth:160,marginBottom:0}} placeholder="Nuevo item…" value={nuevo.l} onChange={e=>setNuevo({...nuevo,l:e.target.value})}/>
        <select style={{...S.input,width:110,marginBottom:0}} value={nuevo.t} onChange={e=>setNuevo({...nuevo,t:e.target.value})}><option value="sel">Selección</option><option value="txt">Texto</option><option value="foto">Foto</option><option value="num">Número</option></select>
        <label style={{...S.label,marginBottom:0,display:'flex',gap:6,alignItems:'center'}}><input type="checkbox" checked={nuevo.r} onChange={e=>setNuevo({...nuevo,r:e.target.checked})}/>Obl.</label>
        {nuevo.t==='sel'&&<input style={{...S.input,flex:2,minWidth:140,marginBottom:0}} placeholder="Opciones (coma)" value={nuevo.o} onChange={e=>setNuevo({...nuevo,o:e.target.value})}/>}
        <button style={{...S.btnO(T.info),width:'auto',marginBottom:0}} onClick={addItem}>+ Item</button>
        <button style={{...S.btn(T.ok),width:'auto',marginBottom:0}} onClick={guardar}>Guardar bloque</button>
      </div>
    </div>);
}

export default function ModChecklists({avisar}){
  const [checks,setChecks]=useState([]); const [blocks,setBlocks]=useState({});
  const [sel,setSel]=useState(null);
  const [nck,setNck]=useState({code:'',nombre:'',especialidad:''});
  const [nbk,setNbk]=useState({code:'',nombre:''});
  async function cargar(){
    const [c,b]=await Promise.all([supabase.from('checklists').select('*'),supabase.from('checklist_blocks').select('*')]);
    setChecks(c.data||[]); const bm={}; (b.data||[]).forEach(x=>bm[x.code]=x); setBlocks(bm);
    if(!sel&&c.data&&c.data[0]) setSel(c.data[0].code);
  }
  useEffect(()=>{ cargar(); },[]);
  const ck=checks.find(c=>c.code===sel);
  async function crearCk(e){
    e.preventDefault();
    const {error}=await supabase.from('checklists').insert([{code:nck.code.trim(),nombre:nck.nombre.trim(),especialidad:nck.especialidad||null,blocks:[]}]);
    if(error) avisar('⛔ '+error.message,T.danger); else { avisar('✅ Checklist creada',T.ok); setNck({code:'',nombre:'',especialidad:''}); setSel(nck.code.trim()); cargar(); }
  }
  async function crearBk(e){
    e.preventDefault();
    const {error}=await supabase.from('checklist_blocks').insert([{code:nbk.code.trim(),nombre:nbk.nombre.trim(),items:[]}]);
    if(error) avisar('⛔ '+error.message,T.danger); else { avisar('✅ Bloque creado; agrégalo a la checklist',T.ok); setNbk({code:'',nombre:''}); cargar(); }
  }
  async function mover(bc,dir){
    if(!ck) return;
    const arr=[...ck.blocks]; const i=arr.indexOf(bc); const j=i+dir;
    if(i<0||j<0||j>=arr.length) return;
    [arr[i],arr[j]]=[arr[j],arr[i]];
    const {error}=await supabase.from('checklists').update({blocks:arr}).eq('code',ck.code);
    if(!error) cargar();
  }
  async function agregarBk(bc){
    if(!ck) return;
    const arr=[...ck.blocks,bc];
    const {error}=await supabase.from('checklists').update({blocks:arr}).eq('code',ck.code);
    if(error) avisar('⛔ '+error.message,T.danger); else cargar();
  }
  async function quitarBk(bc){
    if(!ck) return;
    const arr=ck.blocks.filter(x=>x!==bc);
    await supabase.from('checklists').update({blocks:arr}).eq('code',ck.code);
    cargar();
  }
  return (
    <div style={{display:'grid',gridTemplateColumns:'minmax(260px,340px) 1fr',gap:14}}>
      <div>
        <div style={S.card}>
          <h2 style={S.h2}>Checklists</h2>
          {checks.map(c=>(
            <button key={c.code} onClick={()=>setSel(c.code)} style={{...S.btnO(sel===c.code?T.brand:T.border),textAlign:'left',color:sel===c.code?T.brand:T.text}}>{c.code} · {c.nombre}</button>))}
          <h3 style={{...S.h2,marginTop:12}}>Nueva checklist</h3>
          <form onSubmit={crearCk}>
            <input style={S.input} required placeholder="Código (ej: CK-REP-FIT)" value={nck.code} onChange={e=>setNck({...nck,code:e.target.value})}/>
            <input style={S.input} required placeholder="Nombre" value={nck.nombre} onChange={e=>setNck({...nck,nombre:e.target.value})}/>
            <input style={S.input} placeholder="Especialidad (BICI/FIT/LOG…)" value={nck.especialidad} onChange={e=>setNck({...nck,especialidad:e.target.value})}/>
            <button style={S.btn(T.info)}>Crear checklist</button>
          </form>
          <h3 style={{...S.h2,marginTop:12}}>Nuevo bloque</h3>
          <form onSubmit={crearBk} style={{display:'flex',gap:8}}>
            <input style={{...S.input,width:70}} required maxLength={2} placeholder="Cód" value={nbk.code} onChange={e=>setNbk({...nbk,code:e.target.value})}/>
            <input style={S.input} required placeholder="Nombre del bloque" value={nbk.nombre} onChange={e=>setNbk({...nbk,nombre:e.target.value})}/>
            <button style={{...S.btn(T.ok),width:'auto'}}>+</button>
          </form>
        </div>
      </div>
      <div>
        {ck&&(
          <div>
            <div style={S.card}>
              <h2 style={S.h2}>{ck.nombre} <span style={S.sub}>({ck.code})</span></h2>
              {ck.blocks.map(bc=>(
                <div key={bc} style={{display:'flex',gap:6,alignItems:'center',marginBottom:6}}>
                  <span style={{...S.pill(T.teal)}}>{bc}</span>
                  <span style={{color:T.text,fontSize:14,flex:1}}>{blocks[bc]?blocks[bc].nombre:'(bloque inexistente)'}</span>
                  <button style={{...S.btnO(T.border),width:'auto',marginBottom:0,padding:'4px 8px'}} onClick={()=>mover(bc,-1)}>↑</button>
                  <button style={{...S.btnO(T.border),width:'auto',marginBottom:0,padding:'4px 8px'}} onClick={()=>mover(bc,1)}>↓</button>
                  <button style={{...S.btnO(T.danger),width:'auto',marginBottom:0,padding:'4px 8px'}} onClick={()=>quitarBk(bc)}>✕</button>
                </div>))}
              <div style={{display:'flex',gap:8,marginTop:8}}>
                <select id={'addblk'} style={{...S.input,flex:1,marginBottom:0}} defaultValue=''>
                  <option value="">+ Agregar bloque existente…</option>
                  {Object.values(blocks).filter(b=>!ck.blocks.includes(b.code)).map(b=><option key={b.code} value={b.code}>{b.code} · {b.nombre}</option>)}
                </select>
                <button style={{...S.btn(T.info),width:'auto',marginBottom:0}} onClick={()=>{ const s=document.getElementById('addblk'); if(s.value) agregarBk(s.value); }}>Agregar</button>
              </div>
            </div>
            {ck.blocks.map(bc=>blocks[bc]?<BlockEditor key={bc} block={blocks[bc]} avisar={avisar} onSaved={cargar}/>:null)}
          </div>)}
      </div>
    </div>);
}
