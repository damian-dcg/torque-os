'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S } from '../ui';
import TablaPro from './TablaPro';

var GEN=[['iva','IVA (ej. 0.19)'],['horas_jornada','Horas de jornada'],['capacidad_diaria','OTs máx/técnico/día'],['sla_rm','SLA RM (días hábiles)'],['sla_regiones','SLA Regiones (días hábiles)'],['fotos_min','Fotos mínimas por OT'],['firma_cliente_obligatoria','Firma cliente obligatoria (true/false)']];

export default function ModParametros(props){
  var avisar=props.avisar||function(){};
  var s0=useState('gen'),tab=s0[0],setTab=s0[1];
  var sG=useState({}),gen=sG[0],setGen=sG[1];
  var s1=useState([]),trates=s1[0],setTrates=s1[1];
  var s2=useState([]),sla=s2[0],setSla=s2[1];
  var s3=useState([]),wrules=s3[0],setWrules=s3[1];
  var s4=useState([]),bonos=s4[0],setBonos=s4[1];
  async function cargar(){
    var r=await Promise.all([
      supabase.from('settings').select('clave,valor').eq('tenant_id','dcg'),
      supabase.from('tech_rates').select('*'),
      supabase.from('sla_matrix').select('*'),
      supabase.from('warranty_rules').select('*'),
      supabase.from('bonus_rules').select('*')
    ]);
    var o={}; (r[0].data||[]).forEach(function(x){ o[x.clave]=x.valor; });
    setGen(o); setTrates(r[1].data||[]); setSla(r[2].data||[]); setWrules(r[3].data||[]); setBonos(r[4].data||[]);
  }
  useEffect(function(){ cargar(); },[]);
  async function saveGen(k,v){
    var e=await supabase.from('settings').upsert({tenant_id:'dcg',clave:k,valor:v},{onConflict:'tenant_id,clave'});
    if(e.error) avisar('⛗ '+e.error.message,T.danger); else { avisar('✅ Parámetro guardado',T.ok); cargar(); }
  }
  return (
    <div>
      <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
        {[['gen','Generales'],['tec','Técnicos (costos)'],['sla','SLA (días)'],['gar','Garantías'],['bon','Bonos']].map(function(k){
          return <button key={k[0]} onClick={function(){ setTab(k[0]); }} style={{padding:'8px 14px',borderRadius:999,border:tab===k[0]?'0':'1px solid '+T.border,background:tab===k[0]?T.brand:'transparent',color:tab===k[0]?'#fff':T.text,fontWeight:600,fontSize:13,cursor:'pointer'}}>{k[1]}</button>;
        })}
      </div>
      {tab==='gen'? (
        <div style={S.card}>
          <h2 style={S.h2}>Parámetros generales del negocio</h2>
          <p style={S.sub}>Estos valores alimentan cálculos de IVA, SLA, capacidad de agenda y reglas de terreno. Cámbialos y quedan vigentes al instante.</p>
          {GEN.map(function(g){
            return <div key={g[0]} style={{display:'flex',gap:8,alignItems:'center',marginBottom:8}}>
              <span style={{...S.sub,flex:1}}>{g[1]}</span>
              <input style={{...S.input,width:160,marginBottom:0}} defaultValue={String(gen[g[0]]!=null?gen[g[0]]:'')} onBlur={function(e){ saveGen(g[0],e.target.value); }}/>
            </div>;
          })}
        </div>) : null}
      {tab==='tec'? <TablaPro titulo="Técnicos (costos)" rows={trates} campos={[['technician','Técnico'],['costo_sueldo_mensual','Sueldo','num'],['horas_mes','Horas/mes','num'],['costo_x_hora','Costo×h','num'],['venta_x_hora','Venta×h','num']]} onEdit={function(r,k,v){ supabase.from('tech_rates').update({[k]:v}).eq('id',r.id).then(cargar); }} onAdd={function(f){ supabase.from('tech_rates').insert([f]).then(cargar); }} onDel={function(r){ supabase.from('tech_rates').delete().eq('id',r.id).then(cargar); }}/> : null}
      {tab==='sla'? <TablaPro titulo="SLA (días por servicio×equipo)" rows={sla} campos={[['tipo_servicio','Servicio'],['tipo_equipo','Equipo'],['dias','Días','num']]} onEdit={function(r,k,v){ supabase.from('sla_matrix').update({[k]:v}).eq('id',r.id).then(cargar); }} onAdd={function(f){ supabase.from('sla_matrix').insert([f]).then(cargar); }} onDel={function(r){ supabase.from('sla_matrix').delete().eq('id',r.id).then(cargar); }}/> : null}
      {tab==='gar'? <TablaPro titulo="Garantías por familia (meses)" rows={wrules} campos={[['family_id','ID Familia','num'],['meses','Meses','num'],['condiciones','Condiciones']]} onEdit={function(r,k,v){ supabase.from('warranty_rules').update({[k]:v}).eq('id',r.id).then(cargar); }} onAdd={function(f){ supabase.from('warranty_rules').insert([f]).then(cargar); }} onDel={function(r){ supabase.from('warranty_rules').delete().eq('id',r.id).then(cargar); }}/> : null}
      {tab==='bon'? <TablaPro titulo="Reglas de bonos (clave/valor JSON)" rows={bonos} campos={[['clave','Clave'],['valor','Valor JSON']]} onEdit={function(r,k,v){ supabase.from('bonus_rules').update({[k]:v}).eq('id',r.id).then(cargar); }} onAdd={function(f){ supabase.from('bonus_rules').insert([f]).then(cargar); }} onDel={function(r){ supabase.from('bonus_rules').delete().eq('id',r.id).then(cargar); }}/> : null}
    </div>);
}
