'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S, fmtCLP } from '../ui';

export default function ModRed(props){
  var avisar=props.avisar||function(){};
  var [liqs,setLiqs]=useState([]); var [sats,setSats]=useState([]); var [ots,setOts]=useState([]);
  var [periodo,setPeriodo]=useState(new Date().toISOString().slice(0,7));

  async function cargar(){
    var r=await Promise.all([
      supabase.from('liquidaciones').select('*').order('id',{ascending:false}).limit(200),
      supabase.from('companies').select('*').eq('tipo','sat'),
      supabase.from('work_orders').select('*')
    ]);
    setLiqs(r[0].data||[]); setSats(r[1].data||[]); setOts(r[2].data||[]);
  }
  useEffect(function(){ cargar(); },[]);

  async function generar(){
    var n=0;
    for(var i=0;i<sats.length;i++){ var s=sats[i];
      var propias=ots.filter(function(o){ return o.asignado_company_id===s.id&&(o.estado==='Cerrada'||o.estado==='Pendiente de Liquidar')&&(o.cerrada_at||o.created_at||'').slice(0,7)===periodo; });
      if(!propias.length) continue;
      var prod=propias.reduce(function(sum,o){ return sum+(Number((o.kpi||{}).costo_total)||0); },0);
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
    <div>
      <div style={S.card}>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <h2 style={{...S.h2,margin:0,flex:1}}>Liquidaciones SSTT</h2>
          <input style={{...S.input,width:130,marginBottom:0}} type="month" value={periodo} onChange={function(e){ setPeriodo(e.target.value); }}/>
          <button style={{...S.btn(T.brand),width:'auto',marginBottom:0}} onClick={generar}>⚙ Generar liquidación mensual</button>
        </div>
      </div>

      <div style={S.card}>
        <h2 style={S.h2}>Liquidaciones ({liqs.length})</h2>
        {liqs.map(function(l){
          var s=sats.find(function(x){return x.id===l.company_id;})||{};
          return <div key={l.id} style={{border:'1px solid '+T.border,borderRadius:10,padding:10,marginBottom:8,background:T.surface2}}>
            <div style={{display:'flex',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}>
              <b>{s.nombre||'SSTT #'+l.company_id} · {l.periodo}</b>
              <select style={{...S.input,width:130,marginBottom:0}} value={l.estado} onChange={function(e){ setEstado(l,e.target.value); }}>
                <option>borrador</option><option>aprobada</option><option>facturada</option><option>pagada</option>
              </select>
            </div>
            <p style={{...S.sub,margin:'4px 0'}}>Cargo fijo: {fmtCLP(l.cargo_fijo)} · Producción OTs: {fmtCLP(l.total_ot)} · <b style={{color:T.ok}}>Total: {fmtCLP(l.total)}</b></p>
          </div>;
        })}
        {liqs.length===0? <p style={S.sub}>Sin liquidaciones. Genera una para el período.</p> : null}
      </div>
    </div>);
}
