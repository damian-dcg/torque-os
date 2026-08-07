'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

const C={fondo:'#0d1216',panel:'#141b21',borde:'#26323d',borde2:'#31404d',tinta:'#e9eef2',gris:'#8b9aa6',naranja:'#ff6b2c',verde:'#57d977',rojo:'#ff5d5d',amarillo:'#ffc53d'};
const caja={padding:'9px 12px',borderRadius:8,border:`1px solid ${C.borde2}`,background:'#1a232b',color:C.tinta,fontSize:12.5,cursor:'pointer'};
const th={textAlign:'left',fontSize:9.5,letterSpacing:.5,textTransform:'uppercase',color:C.gris,padding:'8px 8px',borderBottom:`1px solid ${C.borde}`,fontFamily:'monospace',whiteSpace:'nowrap'};
const td={padding:'6px 8px',borderBottom:'1px solid rgba(38,50,61,.5)',fontSize:12,color:C.tinta};
const inp={width:70,padding:'6px 8px',borderRadius:6,border:`1px solid ${C.borde2}`,background:'#0d1216',color:C.tinta,fontSize:12,fontFamily:'monospace'};
const inpT={width:110,padding:'6px 8px',borderRadius:6,border:`1px solid ${C.borde2}`,background:'#0d1216',color:C.tinta,fontSize:11};
const link={color:C.gris,fontSize:12,textDecoration:'none',padding:'6px 10px',border:`1px solid ${C.borde2}`,borderRadius:8};
const HEADS=['Número de artículo','Descripción del artículo','Unidad de medida de inventario','Primera ubicación','En stock','Comprometido','Solicitado','Disponible','Ubicación por defecto','Ubicación por defecto ejecutada','Precio de artículo','Total','Confirmado'];
const norm=s=>(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');

function splitLine(l,sep){const out=[];let cur='',q=false;for(let i=0;i<l.length;i++){const ch=l[i];if(q){if(ch==='"'){if(l[i+1]==='"'){cur+='"';i++}else q=false}else cur+=ch}else{if(ch==='"')q=true;else if(ch===sep){out.push(cur);cur=''}else cur+=ch}}out.push(cur);return out}

async function leerArchivo(file){
  const buf=await file.arrayBuffer();
  try{ return new TextDecoder('utf-8',{fatal:true}).decode(buf); }
  catch(e){ return new TextDecoder('windows-1252').decode(buf); }
}

export default function Inventario(){
  const [parts,setParts]=useState([]);
  const [msg,setMsg]=useState('');
  const [proc,setProc]=useState(false);
  const router=useRouter();
  useEffect(()=>{ supabase.auth.getSession().then(({data})=>{ if(!data.session) router.replace('/'); else cargar(); }); },[]);
  async function cargar(){ const {data}=await supabase.from('parts').select('*').order('codigo'); setParts(data||[]); }

  async function editar(p,campo,valor){ await supabase.from('parts').update({[campo]:valor}).eq('id',p.id); cargar(); }

  async function subir(e){
    const file=e.target.files[0]; if(!file) return;
    if(/\.(xlsx|xls)$/i.test(file.name)){ setMsg(' Error: "'+file.name+'" es Excel. Guárdalo como CSV UTF-8 (Archivo → Guardar como) y sube el .csv'); return; }
    setProc(true); setMsg('⏳ Procesando '+file.name+'…');
    try{
      const text=await leerArchivo(file);
      const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(l=>l.trim());
      if(lines.length<2){ setMsg('⛔ El archivo no tiene filas de datos.'); setProc(false); return; }
      const l0=lines[0];
      const sep=['\t',';',','].reduce((a,b)=>(l0.split(a).length>=l0.split(b).length?a:b));
      const head=splitLine(l0,sep).map(norm);
      const col=n=>{ let i=head.findIndex(h=>h===n); if(i<0)i=head.findIndex(h=>h.includes(n)); return i; };
      const iCod=col('numero de articulo'); const iNom=col('descripcion del articulo');
      const iUn=col('unidad de medida'); const iUb=col('primera ubicacion');
      const iSt=col('en stock'); const iCo=col('comprometido'); const iSo=col('solicitado'); const iDi=col('disponible');
      const iUe=head.findIndex(h=>h.includes('ubicacion por defecto')&&h.includes('ejecutada'));
      const iUd=head.findIndex(h=>h.includes('ubicacion por defecto')&&!h.includes('ejecutada'));
      const iPr=col('precio de articulo'); const iTo=col('total'); const iCf=col('confirmado');
            const num=(v)=>Number(String(v==null?'':v).replace(/[^\d-]/g,''))||0;
      const conf=(v)=>['si','sí','x','true','1','confirmado'].includes(norm(v));
      const filas=[];
      for(let i=1;i<lines.length;i++){
        const c=splitLine(lines[i],sep);
        const codigo=(c[iCod>=0?iCod:0]||'').trim(); if(!codigo) continue;
        filas.push({codigo,
          nombre:(c[iNom>=0?iNom:1]||'').trim()||codigo,
          unidad:iUn>=0?(c[iUn]||'').trim():null,
          ubicacion:iUb>=0?(c[iUb]||'').trim():null,
          en_stock:iSt>=0?num(c[iSt]):0,
          comprometido:iCo>=0?num(c[iCo]):0,
          solicitado:iSo>=0?num(c[iSo]):0,
          disponible:iDi>=0?num(c[iDi]):0,
          ubicacion_defecto:iUd>=0?(c[iUd]||'').trim():null,
          ubicacion_ejecutada:iUe>=0?(c[iUe]||'').trim():null,
          precio:iPr>=0?num(c[iPr]):0,
          total:iTo>=0?num(c[iTo]):0,
          confirmado:iCf>=0?conf(c[iCf]):false});
      }
      let ups=0,errN=0,firstErr='';
      for(let k=0;k<filas.length;k+=400){
        const {error}=await supabase.from('parts').upsert(filas.slice(k,k+400),{onConflict:'codigo'});
        if(error){errN+=1; if(!firstErr)firstErr=error.message;} else ups+=Math.min(400,filas.length-k);
      }
      setMsg('✅ Stock sincronizado: '+ups+' filas en '+(Math.ceil(filas.length/400))+' llamada(s)'+(errN?' · ⛔ error: '+firstErr:''));
      cargar();
    }catch(ex){ setMsg('⛔ Error al leer el archivo: '+ex.message); }
    setProc(false);
  }

  function plantilla(){
    const ej=['2017G0137','BUJE POSTE ASIENTO PZA064 M-950 (ST)','UN','STEC-Z01-R1','2','','','2','RPAC-Z01-R1','','6','12',''];
    const blob=new Blob(['\uFEFF'+[HEADS.join(';'),ej.join(';')].join('\r\n')],{type:'text/csv;charset=utf-8'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='plantilla_stock.csv';
    a.click();
  }

  return (
    <main style={{minHeight:'100vh',background:C.fondo,color:C.tinta,fontFamily:'system-ui,sans-serif'}}>
      <header style={{display:'flex',alignItems:'center',gap:14,padding:'14px 22px',borderBottom:`1px solid ${C.borde}`}}>
        <h1 style={{margin:0,fontSize:22,letterSpacing:1}}>TORQUE<span style={{color:C.naranja}}>·OS</span></h1>
        <span style={{fontSize:11,color:C.gris}}>Inventario · columnas A–M · todo editable</span>
        <nav style={{marginLeft:'auto',display:'flex',gap:8}}><a style={link} href="/panel">Consola</a></nav>
      </header>
      <section style={{padding:'16px 22px'}}>
        <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:12,flexWrap:'wrap'}}>
          <button style={caja} onClick={plantilla}>⤓ Bajar plantilla (A–M)</button>
          <label style={{...caja,cursor:proc?'wait':'pointer',opacity:proc?0.6:1}}>⤒ Subir stock desde Excel (CSV)
            <input type="file" accept=".csv,.txt" style={{display:'none'}} disabled={proc} onChange={subir} />
          </label>
          {proc && <span style={{color:C.amarillo,fontSize:12.5}}>⏳ Procesando archivo…</span>}
          {msg && <span style={{color:msg.indexOf('⛔')>=0?C.rojo:C.verde,fontSize:12.5}}>{msg}</span>}
        </div>
        <div style={{color:C.gris,fontSize:11.5,marginBottom:10}}>Lee UTF-8 y ANSI/Excel. Detecta tab, ; o ,. Puedes re-subir las veces que quieras: actualiza por código. Si tu archivo es .xlsx, guárdalo antes como CSV UTF-8.</div>
        <div style={{background:C.panel,border:`1px solid ${C.borde}`,borderRadius:10,overflow:'auto',maxHeight:'72vh'}}>
          <table style={{width:'100%',borderCollapse:'collapse',minWidth:1500}}>
            <thead><tr>{HEADS.map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>{parts.map(p=>(
              <tr key={p.id}>
                <td style={{...td,fontFamily:'monospace',whiteSpace:'nowrap'}}>{p.codigo}</td>
                <td style={{...td,minWidth:220}}>{p.nombre}</td>
                <td style={td}><input style={{...inpT,width:50}} defaultValue={p.unidad||''} onBlur={e=>editar(p,'unidad',e.target.value)} /></td>
                <td style={td}><input style={inpT} defaultValue={p.ubicacion||''} onBlur={e=>editar(p,'ubicacion',e.target.value)} /></td>
                <td style={td}><input style={inp} defaultValue={p.en_stock} onBlur={e=>editar(p,'en_stock',Number(e.target.value)||0)} /></td>
                <td style={td}><input style={inp} defaultValue={p.comprometido} onBlur={e=>editar(p,'comprometido',Number(e.target.value)||0)} /></td>
                <td style={td}><input style={inp} defaultValue={p.solicitado} onBlur={e=>editar(p,'solicitado',Number(e.target.value)||0)} /></td>
                <td style={td}><input style={inp} defaultValue={p.disponible} onBlur={e=>editar(p,'disponible',Number(e.target.value)||0)} /></td>
                <td style={td}><input style={inpT} defaultValue={p.ubicacion_defecto||''} onBlur={e=>editar(p,'ubicacion_defecto',e.target.value)} /></td>
                <td style={td}><input style={inpT} defaultValue={p.ubicacion_ejecutada||''} onBlur={e=>editar(p,'ubicacion_ejecutada',e.target.value)} /></td>
                <td style={td}><input style={inp} defaultValue={p.precio} onBlur={e=>editar(p,'precio',Number(e.target.value)||0)} /></td>
                <td style={td}><input style={inp} defaultValue={p.total} onBlur={e=>editar(p,'total',Number(e.target.value)||0)} /></td>
                <td style={td}><input type="checkbox" checked={!!p.confirmado} onChange={e=>editar(p,'confirmado',e.target.checked)} /></td>
              </tr>))}</tbody>
          </table>
          {parts.length===0 && <p style={{padding:14,color:C.gris,fontSize:12.5}}>Sin repuestos cargados.</p>}
        </div>
      </section>
    </main>
  );
}
