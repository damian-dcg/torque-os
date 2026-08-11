'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S, fmtCLP } from '../ui';
export default function ModRed(props){
  var avisar=props.avisar||function(){};
  var s1=useState([]),liqs=s1[0],setLiqs=s1[1];
  var s2=useState([]),sats=s2[0],setSats=s2[1];
  async function cargar(){ var r=await Promise.all([supabase.from('liquidaciones').select('*').order('id',{ascending:false}),supabase.from('companies').select('id,nombre').eq('tipo','sat')]); setLiqs(r[0].data||[]); setSats(r[1].data||[]); }
  useEffect(function(){ cargar(); },[]);
  async function setEstado(l,e){ await supabase.from('liquidaciones').update({estado:e}).eq('id',l.id); cargar(); }
  return (
    <div style={S.card}>
      <h2 style={S.h2}>Liquidaciones SSTT</h2>
      <p style={S.sub}>La gestión y tarifario de SSTT vive en <b>ADMINISTRACION → Técnicos y SSTT</b>. Aquí solo se aprueba/paga liquidaciones.</p>
      <table style={{width:'100%',borderCollapse:'collapse'}}>
        <thead><tr><th style={S.th}>SAT</th><th style={S.th}>Período</th><th style={S.th}>Total</th><th style={S.th}>Estado</th></tr></thead>
        <tbody>{liqs.map(function(l){ return <tr key={l.id}>
          <td style={S.td}>{(sats.find(function(s){return s.id===l.company_id;})||{}).nombre||l.company_id}</td>
          <td style={S.td}>{l.periodo}</td><td style={S.td}>{fmtCLP(l.total)}</td>
          <td style={S.td}><select style={{...S.input,width:130,marginBottom:0}} value={l.estado} onChange={function(e){ setEstado(l,e.target.value); }}><option>borrador</option><option>aprobada</option><option>facturada</option><option>pagada</option></select></td>
        </tr>; })}</tbody>
      </table>
      {liqs.length===0? <p style={{...S.sub,padding:10}}>Sin liquidaciones.</p> : null}
    </div>);
}
