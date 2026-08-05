'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

const C={fondo:'#0d1216',panel:'#141b21',borde:'#26323d',borde2:'#31404d',tinta:'#e9eef2',gris:'#8b9aa6',naranja:'#ff6b2c',rojo:'#ff5d5d',verde:'#57d977',amarillo:'#ffc53d'};
const caja={padding:'9px 12px',borderRadius:8,border:`1px solid ${C.borde2}`,background:'#1a232b',color:C.tinta,fontSize:12.5,cursor:'pointer'};
const boton={padding:'10px 18px',borderRadius:8,border:0,background:C.naranja,color:'#14100c',fontWeight:700,cursor:'pointer',fontSize:13};
const th={textAlign:'left',fontSize:10,letterSpacing:1,textTransform:'uppercase',color:C.gris,padding:'8px 10px',borderBottom:`1px solid ${C.borde}`,fontFamily:'monospace'};
const td={padding:'8px 10px',borderBottom:'1px solid rgba(38,50,61,.5)',fontSize:12,color:C.tinta};
const link={color:C.gris,fontSize:12,textDecoration:'none',padding:'6px 10px',border:`1px solid ${C.borde2}`,borderRadius:8};
const norm=s=>(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');

function splitLine(l,sep){const out=[];let cur='',q=false;for(let i=0;i<l.length;i++){const ch=l[i];if(q){if(ch==='"'){if(l[i+1]==='"'){cur+='"';i++}else q=false}else cur+=ch}else{if(ch==='"')q=true;else if(ch===sep){out.push(cur);cur=''}else cur+=ch}}out.push(cur);return out}
function parseCSV(text){const l0=text.replace(/^\uFEFF/,'').split(/\r?\n/).find(x=>x.trim());const sep=(l0.match(/;/g)||[]).length>=(l0.match(/,/g)||[]).length?';':',';const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(l=>l.trim()&&!l.trim().startsWith('#'));const head=splitLine(lines[0],sep).map(h=>norm(h));return lines.slice(1).map(l=>{const c=splitLine(l,sep);const o={};head.forEach((h,i)=>o[h]=(c[i]||'').trim());return o})}
function descargar(nombre,cols,ejemplo){const blob=new Blob(['\uFEFF'+[cols.join(';'),'# Plantilla TORQUE·OS · una fila por registro · no borres el encabezado',...ejemplo.map(r=>r.join(';'))].join('\r\n')],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=nombre;a.click()}
function fechaISO(s){ if(!s) return null; if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; const m=s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/); if(m) return m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0'); return null; }

export default function Importar(){
  const [regiones,setRegiones]=useState([]);
  const [cPrev,setCPrev]=useState(null); const [cDone,setCDone]=useState('');
  const [ePrev,setEPrev]=useState(null); const [eDone,setEDone]=useState('');
  const [hPrev,setHPrev]=useState(null); const [hDone,setHDone]=useState('');
  const [ocupado,setOcupado]=useState(false);
  const router=useRouter();
  useEffect(()=>{ supabase.auth.getSession().then(({data})=>{ if(!data.session) router.replace('/'); else supabase.from('regions').select('*').then(({data:r})=>setRegiones(r||[])); }); },[]);
  const regMap={}; regiones.forEach(r=>regMap[norm(r.nombre)]=r.id);

  async function leerClientes(file){
    setOcupado(true);
    const rows=parseCSV(await file.text());
    const {data:ex}=await supabase.from('customers').select('rut');
    const ruts=new Set((ex||[]).map(x=>(x.rut||'').toUpperCase()).filter(Boolean));
    const validas=[];const errs=[];let dup=0;
    rows.forEach((o,i)=>{const n=i+2;
      const tipo=(o.tipo||'final').toLowerCase();
      if(!['final','retail','mayorista','proveedor'].includes(tipo)) return errs.push('Fila '+n+': tipo invalido');
      if(!o.nombre) return errs.push('Fila '+n+': nombre vacio');
      const rid=regMap[norm(o.region)]; if(!rid) return errs.push('Fila '+n+': region no reconocida ('+o.region+')');
      const rut=(o.rut||'').toUpperCase();
      if(rut&&ruts.has(rut)){dup++;return}
      if(rut)ruts.add(rut);
      validas.push({tipo,rut:rut||null,nombre:o.nombre,email:o.email||null,telefono:o.telefono||null,whatsapp:o.whatsapp||null,region_id:rid,direccion:o.direccion||null});
    });
    setCPrev({validas,dup,errs}); setOcupado(false);
  }
  async function confirmarClientes(){
    setOcupado(true); let okN=0,errN=0;
    for(const v of cPrev.validas){ const {error}=await supabase.from('customers').insert([v]); if(error)errN++; else okN++; }
    setCDone('Importados '+okN+' clientes'+(errN?' · '+errN+' errores':'')); setCPrev(null); setOcupado(false);
  }

  async function leerEquipos(file){
    setOcupado(true);
    const rows=parseCSV(await file.text());
    const {data:cli}=await supabase.from('customers').select('id,rut');
    const porRut={}; (cli||[]).forEach(c=>porRut[(c.rut||'').toUpperCase()]=c.id);
    const {data:eq}=await supabase.from('equipment').select('serial');
    const seriales=new Set((eq||[]).map(x=>(x.serial||'').toUpperCase()).filter(Boolean));
    const validas=[];const errs=[];let dup=0;
    rows.forEach((o,i)=>{const n=i+2;
      const ser=(o.serial||'').toUpperCase(); if(!ser) return errs.push('Fila '+n+': serial vacio');
      if(seriales.has(ser)){dup++;return}
      const cid=porRut[(o.rut_cliente||'').toUpperCase()]; if(!cid) return errs.push('Fila '+n+': cliente no existe (importe clientes primero)');
      if(!o.producto) return errs.push('Fila '+n+': producto vacio');
      seriales.add(ser);
      validas.push({customer_id:cid,producto:o.producto,serial:ser,fecha:fechaISO(o.fecha_compra)});
    });
    setEPrev({validas,dup,errs}); setOcupado(false);
  }
  async function confirmarEquipos(){
    setOcupado(true); let okN=0,errN=0;
    const prodCache={};
    for(const v of ePrev.validas){
      const clave=norm(v.producto);
      if(!prodCache[clave]){
        const {data}=await supabase.from('products').select('id').ilike('nombre',v.producto).limit(1);
        if(data&&data.length) prodCache[clave]=data[0].id;
        else { const {data:np}=await supabase.from('products').insert([{nombre:v.producto}]).select(); prodCache[clave]=np[0].id; }
      }
      const {error}=await supabase.from('equipment').insert([{product_id:prodCache[clave],serial:v.serial,customer_id:v.customer_id,fecha_compra:v.fecha}]);
      if(error)errN++; else okN++;
    }
    setEDone('Importados '+okN+' equipos'+(errN?' · '+errN+' errores':'')); setEPrev(null); setOcupado(false);
  }

  async function leerHistorial(file){
    setOcupado(true);
    const rows=parseCSV(await file.text());
    const {data:cli}=await supabase.from('customers').select('id,rut');
    const porRut={}; (cli||[]).forEach(c=>porRut[(c.rut||'').toUpperCase()]=c.id);
    const {data:ots}=await supabase.from('work_orders').select('ot_number');
    const nums=new Set((ots||[]).map(x=>x.ot_number));
    const validas=[];const errs=[];let dup=0;
    rows.forEach((o,i)=>{const n=i+2;
      const num=Number(o.ot_original); if(!num) return errs.push('Fila '+n+': numero invalido');
      if(nums.has(num)){dup++;return}
      const cid=porRut[(o.rut_cliente||'').toUpperCase()]; if(!cid) return errs.push('Fila '+n+': cliente no existe');
      nums.add(num);
      validas.push({ot_number:num,customer_id:cid,tipo:'servicio',estado:'cerrada',origen:'migracion',ot_original:String(o.ot_original),descripcion:o.descripcion||null,monto_final:Number(o.monto)||null});
    });
    setHPrev({validas,dup,errs}); setOcupado(false);
  }
  async function confirmarHistorial(){
    setOcupado(true); let okN=0,errN=0;
    for(const v of hPrev.validas){ const {error}=await supabase.from('work_orders').insert([v]); if(error)errN++; else okN++; }
    setHDone('Importadas '+okN+' OTs historicas'+(errN?' · '+errN+' errores':'')); setHPrev(null); setOcupado(false);
  }

  function Resumen({p}){ return (
    <div style={{marginTop:10,fontSize:12.5}}>
      <span style={{color:C.verde}}>{p.validas.length} listas</span> · <span style={{color:C.amarillo}}>{p.dup} duplicadas (se omiten)</span> · <span style={{color:C.rojo}}>{p.errs.length} errores</span>
      {p.errs.slice(0,5).map((e,i)=><div key={i} style={{color:C.rojo,fontSize:11.5}}>{e}</div>)}
    </div> ); }

  return (
    <main style={{minHeight:'100vh',background:C.fondo,color:C.tinta,fontFamily:'system-ui,sans-serif'}}>
      <header style={{display:'flex',alignItems:'center',gap:14,padding:'14px 22px',borderBottom:`1px solid ${C.borde}`}}>
        <h1 style={{margin:0,fontSize:22,letterSpacing:1}}>TORQUE<span style={{color:C.naranja}}>·OS</span></h1>
        <span style={{fontSize:11,color:C.gris}}>Centro de migración</span>
        <nav style={{marginLeft:'auto',display:'flex',gap:8}}><a style={link} href="/panel">Consola</a></nav>
      </header>
      <section style={{padding:'16px 22px',display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14}}>
        <div style={{background:C.panel,border:`1px solid ${C.borde}`,borderRadius:10,padding:16}}>
          <h3 style={{margin:'0 0 10px',fontSize:15,letterSpacing:1}}>1 · CLIENTES</h3>
          <button style={caja} onClick={()=>descargar('plantilla_clientes.csv',['tipo','rut','nombre','email','telefono','whatsapp','region','comuna','direccion','notas'],[['final','14.223.998-1','Carolina Mendez','caro@mail.cl','+56 9 1111 2222','+56 9 1111 2222','Metropolitana','Macul','Av. Siempre 123','']])}>⤓ Bajar plantilla</button>
          <input type="file" accept=".csv" style={{marginTop:10}} onChange={e=>e.target.files[0]&&leerClientes(e.target.files[0])} />
          {ocupado&&<p style={{color:C.gris,fontSize:12}}>leyendo…</p>}
          {cPrev&&<><Resumen p={cPrev}/><button style={{...boton,marginTop:10}} onClick={confirmarClientes}>Confirmar importación</button></>}
          {cDone&&<p style={{color:C.verde,fontSize:12.5,marginTop:8}}>{cDone}</p>}
        </div>
        <div style={{background:C.panel,border:`1px solid ${C.borde}`,borderRadius:10,padding:16}}>
          <h3 style={{margin:'0 0 10px',fontSize:15,letterSpacing:1}}>2 · EQUIPOS</h3>
          <button style={caja} onClick={()=>descargar('plantilla_equipos.csv',['rut_cliente','producto','serial','fecha_compra'],[['14.223.998-1','Trek Marlin 7','WTU-88412','2026-02-14']])}>⤓ Bajar plantilla</button>
          <input type="file" accept=".csv" style={{marginTop:10}} onChange={e=>e.target.files[0]&&leerEquipos(e.target.files[0])} />
          {ePrev&&<><Resumen p={ePrev}/><button style={{...boton,marginTop:10}} onClick={confirmarEquipos}>Confirmar importación</button></>}
          {eDone&&<p style={{color:C.verde,fontSize:12.5,marginTop:8}}>{eDone}</p>}
        </div>
        <div style={{background:C.panel,border:`1px solid ${C.borde}`,borderRadius:10,padding:16}}>
          <h3 style={{margin:'0 0 10px',fontSize:15,letterSpacing:1}}>3 · HISTORIAL OTs</h3>
          <button style={caja} onClick={()=>descargar('plantilla_historial.csv',['ot_original','fecha','rut_cliente','tipo','descripcion','monto'],[['2417','2026-07-01','14.223.998-1','servicio','Mantencion 1000 km',52000]])}>⤓ Bajar plantilla</button>
          <input type="file" accept=".csv" style={{marginTop:10}} onChange={e=>e.target.files[0]&&leerHistorial(e.target.files[0])} />
          {hPrev&&<><Resumen p={hPrev}/><button style={{...boton,marginTop:10}} onClick={confirmarHistorial}>Confirmar importación</button></>}
          {hDone&&<p style={{color:C.verde,fontSize:12.5,marginTop:8}}>{hDone}</p>}
        </div>
      </section>
      <p style={{padding:'0 22px',color:C.gris,fontSize:12,lineHeight:1.6}}>Orden sugerido: Clientes → Equipos → Historial. Desde Excel: Archivo → Guardar como → <b>CSV UTF-8</b>. El sistema detecta ; o , automáticamente. Los duplicados por RUT / serial / número de OT se omiten solos: puedes re-importar sin miedo.</p>
    </main>
  );
}
