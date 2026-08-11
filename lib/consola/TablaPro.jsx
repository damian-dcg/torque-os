'use client';
import { useState } from 'react';
import { T, S } from '../ui';

export default function TablaPro(props){
  var titulo=props.titulo||'Tabla';
  var rows=props.rows||[];
  var campos=props.campos||[];
  var onEdit=props.onEdit;
  var onDel=props.onDel;
  var onAdd=props.onAdd;
  var addLabel=props.addLabel||'+ Nuevo';
  var s=useState(''); var q=s[0]; var setQ=s[1];
  var s2=useState(false); var showAdd=s2[0]; var setShowAdd=s2[1];
  var s3=useState({}); var f=s3[0]; var setF=s3[1];

  var vis=rows.filter(function(r){
    var t=q.toLowerCase();
    if(!t) return true;
    return campos.some(function(c){ return String(r[c[0]]||'').toLowerCase().indexOf(t)>=0; });
  });

  function csv(){
    var head=campos.map(function(c){ return c[1]; }).join(';');
    var body=vis.map(function(r){ return campos.map(function(c){ return String(r[c[0]]!=null?r[c[0]]:'').replace(/[;\n]/g,','); }).join(';'); }).join('\n');
    var a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob(['\uFEFF'+head+'\n'+body],{type:'text/csv'}));
    a.download=titulo+'.csv';
    a.click();
  }

  return (
    <div style={S.card}>
      <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:10}}>
        <h2 style={{...S.h2,margin:0,flex:1}}>{titulo} <span style={S.sub}>({vis.length})</span></h2>
        <input style={{...S.input,width:220,marginBottom:0}} placeholder="Buscar…" value={q} onChange={function(e){ setQ(e.target.value); }}/>
        <button style={{...S.btnO(T.info),width:'auto',marginBottom:0}} onClick={csv}>⬇ CSV</button>
        {onAdd? <button style={{...S.btn(T.brand),width:'auto',marginBottom:0}} onClick={function(){ setShowAdd(!showAdd); }}>{addLabel}</button> : null}
      </div>
      {showAdd&&onAdd? (
        <div style={{background:T.surface2,border:'1px solid '+T.border,borderRadius:10,padding:12,marginBottom:12,display:'flex',gap:8,flexWrap:'wrap'}}>
          {campos.map(function(c){
            return <input key={c[0]} style={{...S.input,flex:1,minWidth:120,marginBottom:0}} type={c[2]==='num'?'number':'text'} placeholder={c[1]} value={f[c[0]]||''} onChange={function(e){ var n={}; for(var k in f) n[k]=f[k]; n[c[0]]=c[2]==='num'?Number(e.target.value):e.target.value; setF(n); }}/>;
          })}
          <button style={{...S.btn(T.ok),width:'auto',marginBottom:0}} onClick={function(){ onAdd(f); setF({}); setShowAdd(false); }}>Guardar</button>
        </div>) : null}
      <div style={{overflow:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}>
        <thead><tr>{campos.map(function(c){ return <th key={c[0]} style={S.th}>{c[1]}</th>; })}{(onEdit||onDel)? <th style={S.th}>Acciones</th> : null}</tr></thead>
        <tbody>{vis.map(function(r,i){
          return <tr key={r.id||i} style={{background:i%2?T.surface2:'transparent'}}>
            {campos.map(function(c){
              return <td key={c[0]} style={S.td}>{onEdit? <input style={{...S.input,minWidth:100,marginBottom:0,padding:'6px 8px',fontSize:13}} type={c[2]==='num'?'number':'text'} defaultValue={r[c[0]]!=null?r[c[0]]:''} onBlur={function(e){ onEdit(r,c[0],c[2]==='num'?Number(e.target.value):e.target.value); }}/> : (r[c[0]]!=null?r[c[0]]:'—')}</td>;
            })}
            {(onEdit||onDel)? <td style={S.td}>{onDel? <button onClick={function(){ onDel(r); }} style={{border:0,background:'transparent',color:T.danger,cursor:'pointer',fontSize:14}} title="Eliminar">🗑</button> : null}</td> : null}
          </tr>;
        })}</tbody>
      </table></div>
      {vis.length===0? <p style={{...S.sub,padding:10}}>Sin registros.</p> : null}
    </div>);
}
