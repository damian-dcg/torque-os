'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S, fmtCLP } from '../ui';
export default function ModRed(props){
  var avisar=props.avisar||function(){};
  var s1=useState([]),liqs=s1[0],setLiqs=s1[1];
  var s2=useState([]),sats=s2[0],setSats=s2[1];
  var s3=useState([]),ots=s3[0],setOts=s3[1];
  var s4=useState(new Date().toISOString().slice(0,7)),periodo=s4[0],setPeriodo=s4[1];
  async function cargar(){ var r=await Promise.all([supabase.from('liquidaciones').select('*').order('id',{ascending:false}),supabase.from('companies').select('*').eq('tipo','sat'),supabase.from('work_orders').select('*')]); setLiqs(r[0].data||[]); setSats(r[1].data||[]); setOts(r[2].data||[]); }
  useEffect(function(){ cargar(); },[]);
  async function generar(){
    var n=0;
    for(var i=0;i<sats.length;i++){ var s=sats[i];
      var propias=ots.filter(function(o){ return o.asignado_company_id===s.id&&(o.estado==='Cerrada'||o.estado==='Pendiente de Liquidar')&&(o.cerrada_at||o.created_at||'').slice(0,7)===periodo; });
      if(!propias.length) continue;
      var prod=propias.reduce(function(sum,o){ return sum+Number((o.financial_data&&o.financial_data.totalCost)||0); },0);
      var total=Number(s.cargo_fijo_mensual||0)+prod;
      var ex=liqs.find(function(l){ return l.company_id===s.id&&l.periodo===periodo; });
      if(ex) await supabase.from('liquidaciones').update({cargo_fijo:s.cargo_fijo_mensual||0,total_ot:prod,total:total}).eq('id',ex.id);
      else await supabase.from('liquidaciones').insert([{company_id:s.id,periodo:periodo,cargo_fijo:s.cargo_fijo_mensual||0,total_ot:prod,otros:[],total:total,estado:'borrador'}]);
      n++;
    }
    avisar('✅ Liquidaciones generadas: '+n,T.ok); cargar();
  }
  async function setEstado(l,e){ await supabase.from('liquidaciones').update({estado:e}).eq('id',l.id); cargar(); }
  return (
    <div style={S.card}>
      <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:12}}>
        <h2 style={{...S.h2,margin:0,flex:1}}>Liquidaciones SSTT</h2>
        <input style={{...S.input,width:160,marginBottom:0}} type="month" value={periodo} onChange={function(e){ setPeriodo(e.target.value); }}/>
        <button style={{...S.btn(T.brand),width:'auto',marginBottom:0}} onClick={generar}>⚙ Generar liquidación mensual</button>
      </div>
      <p style={S.sub}>Suma automáticamente cargo fijo + producción de OTs cerradas/pendientes de liquidar del período, por SSTT.</p>
      <table style={{width:'100%',borderCollapse:'collapse'}}>
        <thead><tr><th style={S.th}>SAT</th><th style={S.th}>Período</th><th style={S.th}>Fijo</th><th style={S.th}>Producción</th><th style={S.th}>Total</th><th style={S.th}>Estado</th></tr></thead>
        <tbody>{liqs.map(function(l){ return <tr key={l.id}>
          <td style={S.td}>{(sats.find(function(s){return s.id===l.company_id;})||{}).nombre||l.company_id}</td>
          <td style={S.td}>{l.periodo}</td><td style={S.td}>{fmtCLP(l.cargo_fijo)}</td><td style={S.td}>{fmtCLP(l.total_ot)}</td><td style={{...S.td,fontWeight:800,color:T.ok}}>{fmtCLP(l.total)}</td>
          <td style={S.td}><select style={{...S.input,width:130,marginBottom:0}} value={l.estado} onChange={function(e){ setEstado(l,e.target.value); }}><option>borrador</option><option>aprobada</option><option>facturada</option><option>pagada</option></select></td>
        </tr>; })}</tbody>
      </table>
      {liqs.length===0? <p style={{...S.sub,padding:10}}>Sin liquidaciones.</p> : null}
    </div>);
}
