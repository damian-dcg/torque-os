'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S, fmtCLP } from '../ui';
export default function ModBi(props){
  var [rep,setRep]=useState('operativo');
  var [ots,setOts]=useState([]); var [cust,setCust]=useState({}); var [stock,setStock]=useState([]);
  var [cases,setCases]=useState([]); var [claims,setClaims]=useState([]); var [nps,setNps]=useState([]);
  useEffect(function(){ (async function(){
    var r=await Promise.all([
      supabase.from('work_orders').select('*').limit(3000),
      supabase.from('customers').select('id,nombre'),
      supabase.from('stock_items').select('*'),
      supabase.from('warranty_cases').select('*'),
      supabase.from('brand_claims').select('*'),
      supabase.from('surveys_nps').select('*')
    ]);
    setOts(r[0].data||[]); var cm={}; (r[1].data||[]).forEach(function(c){cm[c.id]=c;}); setCust(cm);
    setStock(r[2].data||[]); setCases(r[3].data||[]); setClaims(r[4].data||[]); setNps(r[5].data||[]);
  })(); },[]);
  function K(o){ return o.kpi||{}; }
  function group(fn,val){ var m={}; ots.forEach(function(o){ var k=fn(o); if(!m[k])m[k]=0; m[k]+=val(o); }); return Object.keys(m).map(function(k){ return {k:k,v:m[k]}; }); }
  var data=[];
  if(rep==='operativo') data=group(function(o){return o.estado;},function(){return 1;});
  if(rep==='financiero') data=group(function(o){return (o.created_at||'').slice(0,7);},function(o){return K(o).margen||0;});
  if(rep==='inventario') data=(function(){ var m={}; stock.forEach(function(s){ var k=s.stock_type||'new'; m[k]=(m[k]||0)+Number(s.quantity||0); }); return Object.keys(m).map(function(k){return {k:k,v:m[k]};}); })();
  if(rep==='garantias') data=(function(){ var m={}; cases.forEach(function(c){ m[c.status]=(m[c.status]||0)+1; }); return Object.keys(m).map(function(k){return {k:k,v:m[k]};}); })();
  if(rep==='marca') data=(function(){ var m={}; claims.forEach(function(c){ m['aprobado']=(m['aprobado']||0)+(c.status==='approved'?Number(c.approved_amount):0); }); return Object.keys(m).map(function(k){return {k:k,v:m[k]};}); })();
  if(rep==='terreno') data=group(function(o){return o.modalidad||'taller';},function(){return 1;});
  if(rep==='postventa') data=(function(){ var s=nps.reduce(function(a,n){return a+Number(n.score||0);},0); return [{k:'NPS promedio',v:nps.length?Math.round(s/nps.length*10)/10:0}]; })();
  function exportCSV(){
    var rows=data.map(function(d){ return d.k+';'+d.v; });
    var a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob(['\uFEFFindicador;valor\n'+rows.join('\n')],{type:'text/csv'}));
    a.download='reporte_'+rep+'.csv'; a.click();
  }
  function exportPDF(){
    var w=window.open('','_blank');
    w.document.write('<html><head><title>Reporte '+rep+'</title><style>body{font-family:Arial;padding:24px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ccc;padding:6px;font-size:12px;text-align:left}</style></head><body><h2>Reporte: '+rep+'</h2><table><tr><th>Indicador</th><th>Valor</th></tr>'+data.map(function(d){return '<tr><td>'+d.k+'</td><td>'+d.v+'</td></tr>';}).join('')+'</table><script>window.print()</script></body></html>');
    w.document.close();
  }
  return (
    <div style={S.card}>
      <h2 style={S.h2}>BI / Reportes</h2>
      <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
        {['operativo','financiero','inventario','garantias','marca','terreno','postventa'].map(function(t){
          return <button key={t} onClick={function(){ setRep(t); }} style={{padding:'8px 14px',borderRadius:999,border:rep===t?'0':'1px solid '+T.border,background:rep===t?T.brand:'transparent',color:rep===t?'#fff':T.text,fontWeight:600,fontSize:13,cursor:'pointer'}}>{t}</button>;
        })}
        <button style={{...S.btnO(T.ok),width:'auto',marginBottom:0}} onClick={exportCSV}> CSV</button>
        <button style={{...S.btnO(T.info),width:'auto',marginBottom:0}} onClick={exportPDF}>📄 PDF</button>
      </div>
      <table style={{width:'100%',borderCollapse:'collapse'}}>
        <thead><tr><th style={S.th}>Indicador</th><th style={S.th}>Valor</th></tr></thead>
        <tbody>{data.map(function(d){ return <tr key={d.k}><td style={S.td}>{d.k}</td><td style={S.td}>{(rep==='financiero'||rep==='marca')?fmtCLP(Math.round(d.v)):d.v}</td></tr>; })}</tbody>
      </table>
      {data.length===0? <p style={S.sub}>Sin datos para este reporte.</p> : null}
    </div>);
}
