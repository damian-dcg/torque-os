'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S } from '../ui';
import TablaPro from './TablaPro';
var EQUIPOS=['BICICLETA','BICICLETA ELECTRICA','MAQUINA','SCOOTER ELECTRICO','ACCESORIO'];
export default function ModTecnicos(props){
  var avisar=props.avisar||function(){};
  var s1=useState([]),users=s1[0],setUsers=s1[1];
  var s2=useState([]),sats=s2[0],setSats=s2[1];
  var s3=useState([]),servs=s3[0],setServs=s3[1];
  var s4=useState([]),rates=s4[0],setRates=s4[1];
  var s5=useState(null),selSat=s5[0],setSelSat=s5[1];
  async function cargar(){
    var r=await Promise.all([supabase.from('users').select('*').order('id'),supabase.from('companies').select('*').eq('tipo','sat'),supabase.from('service_types').select('*'),supabase.from('sat_rates').select('*')]);
    setUsers(r[0].data||[]); setSats(r[1].data||[]); setServs(r[2].data||[]); setRates(r[3].data||[]);
  }
  useEffect(function(){ cargar(); },[]);
  async function toggle(s){ await supabase.from('companies').update({activo:!s.activo}).eq('id',s.id); cargar(); }
  async function saveRate(sv,eq,val){
    var ex=rates.find(function(r){ return r.sat_id===selSat.id&&r.service_type_id===sv.id&&(r.tipo_equipo||'')===eq; });
    if(ex) await supabase.from('sat_rates').update({tarifa:Number(val)||0}).eq('id',ex.id);
    else await supabase.from('sat_rates').insert([{sat_id:selSat.id,service_type_id:sv.id,tipo_equipo:eq,tarifa:Number(val)||0}]);
    cargar();
  }
  var ordenados=sats.slice().sort(function(a,b){ return (b.activo?1:0)-(a.activo?1:0); });
  return (
    <div>
      <TablaPro titulo="Técnicos internos (terreno)" rows={users}
        campos={[['nombre','Nombre'],['email','Correo'],['rol','Rol'],['especialidad','Especialidad'],['telefono','Teléfono']]}
        onEdit={function(r,k,v){ supabase.from('users').update({[k]:v}).eq('id',r.id).then(cargar); }}
        onAdd={function(f){ supabase.from('users').insert([{nombre:f.nombre,email:f.email,rol:f.rol||'tecnico_sat',especialidad:f.especialidad,telefono:f.telefono}]).then(function(e){ if(e.error)avisar('⛗ '+e.error.message,T.danger); else { avisar('✅ Técnico registrado. Crea su acceso en Supabase→Authentication y vincula el UID.',T.ok); cargar(); } }); }}
        addLabel="+ Técnico"/>
      <div style={S.card}>
        <h2 style={S.h2}>Servicios Técnicos Autorizados (SSTT) · un solo lugar</h2>
        <p style={S.sub}>Clic en un SSTT para abrir su tarifario por servicio y tipo de equipo. Los inactivos bajan al final y no se sugieren al crear OT.</p>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
          {ordenados.map(function(s){ return <button key={s.id} onClick={function(){ setSelSat(s); }} style={{padding:'8px 14px',borderRadius:999,border:selSat&&selSat.id===s.id?('2px solid '+T.brand):('1px solid '+T.border),background:selSat&&selSat.id===s.id?(T.brand+'14'):T.surface,color:T.text,fontWeight:600,fontSize:13,cursor:'pointer'}}>{s.nombre} {s.activo?'':'· inactivo'}</button>; })}
        </div>
        {selSat? (
          <div>
            <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:10,flexWrap:'wrap'}}>
              <b style={{color:T.brand}}>{selSat.nombre}</b>
              <button onClick={function(){ toggle(selSat); }} style={{padding:'6px 12px',borderRadius:8,border:'1.5px solid '+(selSat.activo?T.ok:T.danger),background:'transparent',color:selSat.activo?T.ok:T.danger,fontWeight:800,cursor:'pointer'}}>{selSat.activo?'ACTIVO':'INACTIVO'}</button>
            </div>
            <div style={{overflow:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr><th style={S.th}>Servicio</th><th style={S.th}>Tipo equipo</th><th style={S.th}>Tarifa ($)</th></tr></thead>
              <tbody>{servs.map(function(sv){ return EQUIPOS.map(function(eq){
                var r=rates.find(function(x){ return x.sat_id===selSat.id&&x.service_type_id===sv.id&&(x.tipo_equipo||'')===eq; });
                return <tr key={sv.id+'-'+eq}><td style={S.td}>{sv.nombre}</td><td style={S.td}>{eq}</td>
                  <td style={S.td}><input style={{...S.input,width:120,marginBottom:0}} type="number" defaultValue={r?r.tarifa:0} onBlur={function(e){ saveRate(sv,eq,e.target.value); }}/></td></tr>;
              }); })}</tbody>
            </table></div>
          </div>) : <p style={S.sub}>Selecciona un SSTT para editar su tarifario.</p>}
      </div>
    </div>);
}
