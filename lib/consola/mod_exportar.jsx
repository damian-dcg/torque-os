'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S } from '../ui';
function esc(v){ return String(v==null?'':v).replace(/[;\n]/g,','); }
function flat(obj,prefix){ var out={}; for(var k in obj){ var v=obj[k]; if(v!=null&&typeof v!=='object') out[prefix+k]=v; } return out; }
export default function ModExportar(props){
  var avisar=props.avisar||function(){};
  var [ots,setOts]=useState([]); var [cust,setCust]=useState({}); var [users,setUsers]=useState({}); var [sats,setSats]=useState({}); var [regions,setRegions]=useState({});
  var [desde,setDesde]=useState(''); var [hasta,setHasta]=useState(''); var [anio,setAnio]=useState('');
  var [fEst,setFEst]=useState(''); var [fTipo,setFTipo]=useState('');
  useEffect(function(){ (async function(){
    var r=await Promise.all([
      supabase.from('work_orders').select('*').order('id',{ascending:false}).limit(5000),
      supabase.from('customers').select('*'),
      supabase.from('users').select('id,nombre'),
      supabase.from('companies').select('id,nombre').eq('tipo','sat'),
      supabase.from('regions').select('*')
    ]);
    setOts(r[0].data||[]);
    var cm={}; (r[1].data||[]).forEach(function(c){cm[c.id]=c;}); setCust(cm);
    var um={}; (r[2].data||[]).forEach(function(u){um[u.id]=u.nombre;}); setUsers(um);
    var sm={}; (r[3].data||[]).forEach(function(s){sm[s.id]=s.nombre;}); setSats(sm);
    var rm={}; (r[4].data||[]).forEach(function(x){rm[x.id]=x.nombre;}); setRegions(rm);
  })(); },[]);
  function tec(o){ if(o.asignado_user_id)return users[o.asignado_user_id]||''; if(o.asignado_company_id)return sats[o.asignado_company_id]||''; return o.tecnico_nombre||''; }
  var visibles=ots.filter(function(o){
    var f=(o.created_at||'').slice(0,10);
    if(desde&&f<desde)return false; if(hasta&&f>hasta)return false;
    if(anio&&!(o.created_at||'').startsWith(anio))return false;
    if(fEst&&o.estado!==fEst)return false;
    if(fTipo&&o.tipo!==fTipo)return false;
    return true;
  });
  function buildRow(o){
    var c=cust[o.customer_id]||{};
    var row={};
    // OT (todos los campos escalares)
    Object.assign(row, flat(o,''));
    // Técnico asignado legible
    row['TECNICO_ASIGNADO']=tec(o);
    // Cliente (todos sus campos)
    row['CLI_nombre']=c.nombre||''; row['CLI_rut']=c.rut||''; row['CLI_tipo']=c.tipo||'';
    row['CLI_telefono']=c.telefono||''; row['CLI_email']=c.email||''; row['CLI_direccion']=c.direccion||'';
    row['CLI_comuna']=c.comuna||''; row['CLI_region']=regions[c.region_id]||'';
    // KPI (cálculos y dinero)
    Object.assign(row, flat(o.kpi||{},'KPI_'));
    // Portal (datos que ingresó el cliente)
    Object.assign(row, flat(o.datos_portal||{},'PORTAL_'));
    // Diagnóstico
    Object.assign(row, flat(o.diagnostico||{},'DIAG_'));
    // Financiero
    Object.assign(row, flat(o.financial_data||{},'FIN_'));
    return row;
  }
  function exportar(){
    var rows=visibles.map(buildRow);
    var head=[]; rows.forEach(function(r){ Object.keys(r).forEach(function(k){ if(head.indexOf(k)<0) head.push(k); }); });
    var lines=rows.map(function(r){ return head.map(function(h){ return esc(r[h]); }).join(';'); });
    var a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob(['\uFEFF'+head.join(';')+'\n'+lines.join('\n')],{type:'text/csv'}));
    a.download='TORQUE-OS_BASE_COMPLETA_'+(desde||'inicio')+'_'+(hasta||'hoy')+'.csv'; a.click();
    avisar('✅ Exportadas '+rows.length+' OTs · '+head.length+' columnas',T.ok);
  }
  return (
    <div style={S.card}>
      <h2 style={S.h2}>Exportar BASE COMPLETA (todo: datos, textos, cálculos, dinero)</h2>
      <div style={{display:'flex',gap:8,marginBottom:10,flexWrap:'wrap,alignItems:center'}}>
        <label style={S.sub}>Desde</label><input style={{...S.input,width:150,marginBottom:0}} type="date" value={desde} onChange={function(e){ setDesde(e.target.value); }}/>
        <label style={S.sub}>Hasta</label><input style={{...S.input,width:150,marginBottom:0}} type="date" value={hasta} onChange={function(e){ setHasta(e.target.value); }}/>
        <label style={S.sub}>Año</label><input style={{...S.input,width:90,marginBottom:0}} placeholder="2026" value={anio} onChange={function(e){ setAnio(e.target.value); }}/>
        <select style={{...S.input,width:160,marginBottom:0}} value={fEst} onChange={function(e){ setFEst(e.target.value); }}><option value="">Todos estados</option>{['Ingresada','Asignada','Aceptada','En Ruta','Llegada','Trabajando','Esperando Repuesto','Revisión QA','Cerrada','Rechazada','Anulada'].map(function(s){ return <option key={s}>{s}</option>; })}</select>
        <select style={{...S.input,width:160,marginBottom:0}} value={fTipo} onChange={function(e){ setFTipo(e.target.value); }}><option value="">Todos tipos</option>{['servicio','armado_unidad','armado_volumen','mantencion','retiro','evaluacion','repuesto_garantia','reclamo','devolucion_dinero'].map(function(s){ return <option key={s}>{s}</option>; })}</select>
        <button style={{...S.btn(T.ok),width:'auto',marginBottom:0}} onClick={exportar}>⬇ Exportar TODO</button>
      </div>
      <p style={S.sub}>{visibles.length} de {ots.length} OTs. Incluye: todos los campos de la OT + cliente + KPI (venta/costo/margen/FTF/nota/nivel) + portal (producto/boleta) + diagnóstico + financiero.</p>
    </div>);
}
