'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S, fmtCLP } from '../ui';

export default function ModBonos({avisar}){
  const [ots,setOts]=useState([]); const [rates,setRates]=useState([]); const [rules,setRules]=useState({});
  const [mes,setMes]=useState('mayo'); const [anio,setAnio]=useState('2026');
  useEffect(()=>{(async()=>{
    const [o,r,b]=await Promise.all([supabase.from('work_orders').select('*').limit(2000), supabase.from('tech_rates').select('*'), supabase.from('bonus_rules').select('*').eq('clave','bonos').single()]);
    setOts(o.data||[]); setRates(r.data||[]); try{ setRules(b.data?b.data.valor:{}); }catch(e){}
  })();},[]);
  const K=o=>o.kpi||{};
  const del=ots.filter(o=>(K(o).mes||'').toLowerCase()===mes.toLowerCase()&&String(K(o).anio)===String(anio));
  const tecnicos=['ALVARO ROJAS','CLAUDIO MOLINA','MAYCOLL GODOY'];
  return (
    <div style={S.card}>
      <h2 style={S.h2}>Liquidador de bonos</h2>
      <div style={{display:'flex',gap:8,marginBottom:12}}>
        <input style={{...S.input,width:140,marginBottom:0}} placeholder="mes (mayo)" value={mes} onChange={e=>setMes(e.target.value)}/>
        <input style={{...S.input,width:100,marginBottom:0}} placeholder="año" value={anio} onChange={e=>setAnio(e.target.value)}/>
      </div>
      <table style={{width:'100%',borderCollapse:'collapse'}}>
        <thead><tr><th style={S.th}>Técnico</th><th style={S.th}>Bicis armadas</th><th style={S.th}>Máquinas</th><th style={S.th}>Horas otros</th><th style={S.th}>Fallas</th><th style={S.th}>OTs abiertas</th><th style={S.th}>Bono estimado</th></tr></thead>
        <tbody>{tecnicos.map(t=>{
          const m=del.filter(o=>(o.tecnico_nombre||'').toUpperCase().includes(t.split(' ')[0]));
          const bicis=m.filter(o=>K(o).tipo_servicio==='ARMADO'&&K(o).tipo_equipo==='BICICLETA').reduce((s,o)=>s+(o.cantidad_unidades||1),0);
          const maq=m.filter(o=>K(o).tipo_servicio==='ARMADO'&&K(o).tipo_equipo==='MAQUINA').reduce((s,o)=>s+(o.cantidad_unidades||1),0);
          const horasOtros=m.filter(o=>K(o).tipo_servicio!=='ARMADO').reduce((s,o)=>s+(K(o).horas||0),0);
          const fallas=m.filter(o=>String(K(o).reincidencia).toUpperCase()==='FALLA'||String(K(o).falla).toUpperCase()==='SI').length;
          const abiertas=ots.filter(o=>(o.tecnico_nombre||'').toUpperCase().includes(t.split(' ')[0])&&o.estado!=='Cerrada').length;
          const bono=bicis*(rules.bono_base_bici||0)+maq*(rules.bono_maquina||0)+Math.round(horasOtros)*(rules.bono_otros||0)-(rules.descuento_por_falla?fallas*5000:0)-(rules.descuento_ots_abiertas?abiertas*2000:0);
          return <tr key={t}><td style={S.td}>{t}</td><td style={S.td}>{bicis}</td><td style={S.td}>{maq}</td><td style={S.td}>{Math.round(horasOtros)}</td><td style={{...S.td,color:T.danger}}>{fallas}</td><td style={S.td}>{abiertas}</td><td style={{...S.td,color:T.ok,fontWeight:800}}>{fmtCLP(bono)}</td></tr>;
        })}</tbody>
      </table>
      <p style={{...S.sub,marginTop:10}}>Ajusta los valores por unidad en <b>Parámetros → Bonos</b>. Las fallas y OTs abiertas descuentan automáticamente.</p>
    </div>);
}
