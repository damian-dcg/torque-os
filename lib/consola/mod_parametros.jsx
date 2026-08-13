'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S } from '../ui';
var SERV=['ARMADO','GARANTIA','EVALUACION','MANTENCION','POST VENTA','RECLAMO','DEVOLUCION','CAMBIO','DESPACHO','LEVANTAMIENTO','RETIRO','ANULACION'];
var EQ=['BICICLETA','BICICLETA ELECTRICA','MAQUINA','SCOOTER ELECTRICO','ACCESORIO'];
export default function ModParametros(props){
  var avisar=props.avisar||function(){};
  var s1=useState({iva:'0.19',horas_jornada:'8',capacidad_diaria:'4'}),gen=s1[0],setGen=s1[1];
  var s2=useState({}),hs=s2[0],setHs=s2[1];
  useEffect(function(){ (async function(){
    var r=await supabase.from('settings').select('clave,valor').eq('tenant_id','dcg');
    var o={}; (r.data||[]).forEach(function(x){ o[x.clave]=x.valor; });
    setGen({iva:o.iva!=null?String(o.iva):'0.19',horas_jornada:o.horas_jornada!=null?String(o.horas_jornada):'8',capacidad_diaria:o.capacidad_diaria!=null?String(o.capacidad_diaria):'4'});
    if(o.horas_estandar) setHs(typeof o.horas_estandar==='string'?JSON.parse(o.horas_estandar):o.horas_estandar);
  })(); },[]);
  async function saveGen(k,v){ var e=await supabase.from('settings').upsert({tenant_id:'dcg',clave:k,valor:v},{onConflict:'tenant_id,clave'}); if(e.error) avisar('⛗ '+e.error.message,T.danger); else avisar('✅ Guardado',T.ok); }
  function setHora(sv,eq,v){ var n={}; for(var k in hs) n[k]=Object.assign({},hs[k]); if(!n[sv]) n[sv]={}; n[sv][eq]=Number(v)||0; setHs(n); }
  async function saveHs(){ var e=await supabase.from('settings').upsert({tenant_id:'dcg',clave:'horas_estandar',valor:hs},{onConflict:'tenant_id,clave'}); if(e.error) avisar('⛗ '+e.error.message,T.danger); else avisar('✅ Horas estándar guardadas',T.ok); }
  return (
    <div>
      <div style={S.card}>
        <h2 style={S.h2}>Parámetros generales del negocio</h2>
        <p style={S.sub}>Según Anexos N°3 y N°5: los valores son <b>+ IVA</b> para facturación a Bianchi (RUT 96.808.880-7). La tarifa de <b>ARMADO</b> la determina cada SST y se cobra directo al cliente final, sin intervención de Bianchi.</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:10,marginTop:10}}>
          <div><label style={S.label}>IVA (ej. 0.19)</label><input style={S.input} defaultValue={gen.iva} onBlur={function(e){ saveGen('iva',e.target.value); }}/></div>
          <div><label style={S.label}>Horas de jornada</label><input style={S.input} defaultValue={gen.horas_jornada} onBlur={function(e){ saveGen('horas_jornada',e.target.value); }}/></div>
          <div><label style={S.label}>OTs máx/técnico/día</label><input style={S.input} defaultValue={gen.capacidad_diaria} onBlur={function(e){ saveGen('capacidad_diaria',e.target.value); }}/></div>
        </div>
      </div>
      <div style={S.card}>
        <h2 style={S.h2}>Horas estándar por servicio × equipo</h2>
        <p style={S.sub}>Alimenta productividad, precios de mano de obra y SLA. Edita y guarda.</p>
        <div style={{overflow:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr><th style={S.th}>Servicio</th>{EQ.map(function(e){ return <th key={e} style={S.th}>{e.slice(0,10)}</th>; })}</tr></thead>
          <tbody>{SERV.map(function(sv){ return <tr key={sv}><td style={S.td}>{sv}</td>{EQ.map(function(eq){ return <td key={eq} style={S.td}><input style={{...S.input,width:70,marginBottom:0}} type="number" step="0.1" defaultValue={hs[sv]&&hs[sv][eq]!=null?hs[sv][eq]:0} onBlur={function(e){ setHora(sv,eq,e.target.value); }}/></td>; })}</tr>; })}</tbody>
        </table></div>
        <button style={{...S.btn(T.ok),width:'auto',marginTop:10}} onClick={saveHs}>💾 Guardar horas estándar</button>
      </div>
    </div>);
}
