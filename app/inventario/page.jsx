'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

const C={fondo:'#0d1216',panel:'#141b21',borde:'#26323d',borde2:'#31404d',tinta:'#e9eef2',gris:'#8b9aa6',naranja:'#ff6b2c',verde:'#57d977',rojo:'#ff5d5d'};
const caja={padding:'9px 12px',borderRadius:8,border:`1px solid ${C.borde2}`,background:'#1a232b',color:C.tinta,fontSize:12.5,cursor:'pointer'};
const th={textAlign:'left',fontSize:10,letterSpacing:1,textTransform:'uppercase',color:C.gris,padding:'8px 10px',borderBottom:`1px solid ${C.borde}`,fontFamily:'monospace'};
const td={padding:'7px 10px',borderBottom:'1px solid rgba(38,50,61,.5)',fontSize:12,color:C.tinta};
const inp={width:80,padding:'6px 8px',borderRadius:6,border:`1px solid ${C.borde2}`,background:'#0d1216',color:C.tinta,fontSize:12,fontFamily:'monospace'};
const link={color:C.gris,fontSize:12,textDecoration:'none',padding:'6px 10px',border:`1px solid ${C.borde2}`,borderRadius:8};
const norm=s=>(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');

function splitLine(l,sep){const out=[];let cur='',q=false;for(let i=0;i<l.length;i++){const ch=l[i];if(q){if(ch==='"'){if(l[i+1]==='"'){cur+='"';i++}else q=false}else cur+=ch}else{if(ch==='"')q=true;else if(ch===sep){out.push(cur);cur=''}else cur+=ch}}out.push(cur);return out}

export default function Inventario(){
  const [parts,setParts]=useState([]);
  const [msg,setMsg]=useState('');
  const router=useRouter();
  useEffect(()=>{ supabase.auth.getSession().then(({data})=>{ if(!data.session) router.replace('/'); else cargar(); }); },[]);
  async function cargar(){ const {data}=await supabase.from('parts').select('*').order('codigo'); setParts(data||[]); }

  async function editar(p,campo,valor){
    const v=Number(valor)||0;
    await supabase.from('parts').update({[campo]:v}).eq('id',p.id);
    cargar();
  }

  async function subir(e){
    const file=e.target.files[0]; if(!file) return;
    const text=await file.text();
    const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(l=>l.trim());
    const l0=lines[0];
    const sep=['\t',';',','].reduce((a,b)=>(l0.split(a).length>=l0.split(b).length?a:b));
    const head=splitLine(l0,sep).map(norm);
    const idx=n=>head.findIndex(h=>h.includes(n));
    const iUn=idx('unidad'), iUb=idx('primera ubic'), iSt=idx('en stock'), iCo=idx('comprometi'), iSo=idx('solicitado'), iDi=idx('disponible'), iPr=idx('precio de art'), iTo=idx('total');
    const {data:ex}=await supabase.from('parts').select('id,codigo');
    const porCod={}; (ex||[]).forEach(p=>porCod[p.codigo]=p.id);
    let ups=0,ins=0;
    for(let i=1;i<lines.length;i++){
      const c=splitLine(lines[i],sep);
      const codigo=(c[0]||'').trim(); if(!codigo) continue;
      const fila={
        nombre:(c[1]||'').trim()||codigo,
        unidad:iUn>=0?(c[iUn]||'').trim():null,
        ubicacion:iUb>=0?(c[iUb]||'').trim():null,
        en_stock:iSt>=0?Number(c[iSt])||0:0,
        comprometido:iCo>=0?Number(c[iCo])||0:0,
        solicitado:iSo>=0?Number(c[iSo])||0:0,
        disponible:iDi>=0?Number(c[iDi])||0:0,
        precio:iPr>=0?Number(String(c[iPr]).replace(/[^\d-]/g,''))||0:0,
        total:iTo>=0?Number(String(c[iTo]).replace(/[^\d-]/g,''))||0:0
      };
      if(porCod[codigo]){ await supabase.from('parts').update(fila).eq('id',porCod[codigo]); ups++; }
      else { await supabase.from('parts').insert([{codigo,...fila}]); ins++; }
    }
    setMsg('Stock sincronizado: '+ups+' actualizados · '+ins+' creados');
    cargar();
  }

  function plantilla(){
    const cols=[
      'Número de artículo',
      'Descripción del artículo',
      'Unidad de medida de inventario',
      'Primera ubicación',
      'En stock',
      'Comprometido',
      'Solicitado',
      'Disponible',
      'Ubicación por defecto',
      'Ubicación por defecto ejecutada',
      'Precio de artículo',
      'Total'
    ];
    const ej=['2017G0137','BUJE POSTE ASIENTO PZA064 M-950 (ST)','UN','STEC-Z01-R1','2','','','2','','','6','12'];
    const blob=new Blob(['\uFEFF'+[cols.join(';'),ej.join(';')].join('\r\n')],{type:'text/csv'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='plantilla_stock.csv';
    a.click();
  }

  return (
    <main style={{minHeight:'100vh',background:C.fondo,color:C.tinta,fontFamily:'system-ui,sans-serif'}}>
      <header style={{display:'flex',alignItems:'center',gap:14,padding:'14px 22px',borderBottom:`1px solid ${C.borde}`}}>
        <h1 style={{margin:0,fontSize:22,letterSpacing:1}}>TORQUE<span style={{color:C.naranja}}>·OS</span></h1>
        <span style={{fontSize:11,color:C.gris}}>Inventario · todo editable</span>
        <nav style={{marginLeft:'auto',display:'flex',gap:8}}><a style={link} href="/panel">Consola</a></nav>
      </header>
      <section style={{padding:'16px 22px'}}>
        <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:12,flexWrap:'wrap'}}>
          <button style={caja} onClick={plantilla}>⤓ Bajar plantilla</button>
          <label style={{...caja,cursor:'pointer'}}>⤒ Subir stock desde Excel (CSV)
            <input type="file" accept=".csv,.txt" style={{display:'none'}} onChange={subir} />
          </label>
          {msg && <span style={{color:C.verde,fontSize:12.5}}>{msg}</span>}
          <span style={{color:C.gris,fontSize:11.5}}>En tu Excel: Archivo → Guardar como → CSV UTF-8. Detecta ; , o tabulaciones solo.</span>
        </div>
        <div style={{background:C.panel,border:`1px solid ${C.borde}`,borderRadius:10,overflow:'auto',maxHeight:'70vh'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr><th style={th}>Código</th><th style={th}>Nombre</th><th style={th}>Unidad</th><th style={th}>Ubicación</th><th style={th}>En stock</th><th style={th}>Comprometido</th><th style={th}>Solicitado</th><th style={th}>Disponible</th><th style={th}>Precio</th><th style={th}>Total</th></tr></thead>
            <tbody>{parts.map(p=>(
              <tr key={p.id}>
                <td style={{...td,fontFamily:'monospace'}}>{p.codigo}</td>
                <td style={td}>{p.nombre}</td>
                <td style={td}>{p.unidad||''}</td>
                <td style={td}>{p.ubicacion||''}</td>
                <td style={td}><input style={inp} defaultValue={p.en_stock} onBlur={e=>editar(p,'en_stock',e.target.value)} /></td>
                <td style={td}><input style={inp} defaultValue={p.comprometido} onBlur={e=>editar(p,'comprometido',e.target.value)} /></td>
                <td style={td}><input style={inp} defaultValue={p.solicitado} onBlur={e=>editar(p,'solicitado',e.target.value)} /></td>
                <td style={td}><input style={inp} defaultValue={p.disponible} onBlur={e=>editar(p,'disponible',e.target.value)} /></td>
                <td style={td}><input style={inp} defaultValue={p.precio} onBlur={e=>editar(p,'precio',e.target.value)} /></td>
                <td style={{...td,fontFamily:'monospace'}}>{p.total}</td>
              </tr>))}</tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
