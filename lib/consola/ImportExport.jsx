'use client';
import { useState } from 'react';
import { T, S } from '../ui';
export default function ImportExport(props){
  var headers=props.headers||[];
  var onRows=props.onRows;
  var nombre=props.nombre||'plantilla';
  var s=useState(''),log=s[0],setLog=s[1];
  function plantilla(){
    var a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob(['\uFEFF'+headers.join(';')+'\n'],{type:'text/csv'}));
    a.download='PLANTILLA_'+nombre+'.csv'; a.click();
  }
  async function leer(file){
    var text=await file.text();
    var lines=text.split(/\r?\n/).filter(function(l){ return l.trim(); });
    if(lines.length<2){ setLog(' Archivo vacío'); return; }
    var sep=lines[0].indexOf(';')>=0?';':(lines[0].indexOf('|')>=0?'|':',');
    var head=lines[0].split(sep).map(function(h){ return h.trim().toLowerCase(); });
    var rows=lines.slice(1).map(function(l){ var c=l.split(sep).map(function(x){ return x.trim(); }); var o={}; head.forEach(function(h,i){ o[h]=c[i]||''; }); return o; });
    var r=await onRows(rows);
    setLog(r||('✅ '+rows.length+' filas procesadas'));
  }
  return (
    <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:10}}>
      <button style={{...S.btnO(T.info),width:'auto',marginBottom:0}} onClick={plantilla}>⬇ Plantilla</button>
      <label style={{...S.btnO(T.ok),width:'auto',marginBottom:0,cursor:'pointer'}}>📥 Cargar CSV
        <input type="file" accept=".csv,.txt" style={{display:'none'}} onChange={function(e){ leer(e.target.files[0]); }}/>
      </label>
      {log? <span style={{...S.sub,alignSelf:'center'}}>{log}</span> : null}
    </div>);
}
