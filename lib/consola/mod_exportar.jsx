'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S } from '../ui';
export default function ModExportar(props){
  var avisar=props.avisar||function(){};
  var [ots,setOts]=useState([]); var [cust,setCust]=useState({}); var [users,setUsers]=useState({}); var [sats,setSats]=useState({});
  var [desde,setDesde]=useState(''); var [hasta,setHasta]=useState(''); var [anio,setAnio]=useState('');
  var [fEst,setFEst]=useState(''); var [fTipo,setFTipo]=useState('');
  useEffect(function(){ (async function(){
    var r=await Promise.all([
      supabase.from('work_orders').select('*').order('id',{ascending:false}).limit(5000),
      supabase.from('customers').select('*'),
      supabase.from('users').select('id,nombre'),
      supabase.from('companies').select('id,nombre').eq('tipo','sat')
    ]);
    setOts(r[0].data||[]);
    var cm={}; (r[1].data||[]).forEach(function(c){cm[c.id]=c;}); setCust(cm);
    var um={}; (r[2].data||[]).forEach(function(u){um[u.id]=u.nombre;}); setUsers(um);
    var sm={}; (r[3].data||[]).forEach(function(s){sm[s.id]=s.nombre;}); setSats(sm);
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
  function K(o){ return o.kpi||{}; } var dp=function(o){ return o.datos_portal||{}; };
  function exportar(){
    var head=['ID OT','OT','Fecha Ingreso','Fecha Prog','Fecha Inicio','Fin Técnico','Entrega','Cliente','RUT','Teléfono','Email','Comuna','Dirección','Tipo Equipo','Tipo Servicio','Técnico/SSTT','Estado','Canal','Prioridad','Cantidad','Modelo','Modelo Limpio','Producto','Boleta','Venta MO','Costo Rep','Venta Rep','Venta Total','Costo Total','Margen','%Margen','IVA','Total Pagar','Horas','FTF','Días','Reincidencia','Reclamo','Nota','Nivel','Usa Rep','Alerta','Mes','Año','Detalle','Repuesto','Falla'];
    var rows=visibles.map(function(o){ var c=cust[o.customer_id]||{}; var k=K(o); var d=dp(o);
      return [o.ext_id||('OT-'+o.ot_number),o.ot_number,(o.created_at||'').slice(0,10),o.fecha_programada||'',o.fecha_inicio||'',o.fecha_fin_tecnico||'',o.fecha_entrega_cliente||'',c.nombre||'',c.rut||'',c.telefono||'',c.email||'',c.comuna||'',c.direccion||'',k.tipo_equipo||'',o.tipo||'',tec(o),o.estado||'',o.canal||'',o.prioridad||'',o.cantidad_unidades||1,o.modelo||'',o.modelo_limpio||'',d.producto||'',d.boleta||'',k.venta_mo||0,k.costo_rep||0,k.venta_rep||0,k.venta_total||0,k.costo_total||0,k.margen||0,k.pct_margen||'',k.iva||0,o.total_pagar||0,k.horas||0,k.ftf||'',k.dias||0,k.reincidencia||'',k.reclamo||'',k.nota||0,k.nivel||'',k.usa_rep||'',k.alerta||'',k.mes||'',k.anio||'',String(o.descripcion||'').replace(/[;\n]/g,','),k.repuesto||'',k.falla||''].join(';'); });
    var a=document.createElement('a'); a.href=URL.createObjectURL(new Blob(['\uFEFF'+head.join(';')+'\n'+rows.join('\n')],{type:'text/csv'})); a.download='TORQUE-OS_base_'+(desde||'inicio')+'_'+(hasta||'hoy')+'.csv'; a.click();
    avisar('✅ Exportadas '+visibles.length+' filas',T.ok);
  }
  return (
    <div style={S.card}>
      <h2 style={S.h2}>Exportar base completa ({visibles.length} filas)</h2>
      <div style={{display:'flex',gap:8,marginBottom:10,flexWrap:'wrap'}}>
        <label style={S.sub}>Desde</label><input style={{...S.input,width:150,marginBottom:0}} type="date" value={desde} onChange={function(e){ setDesde(e.target.value); }}/>
        <label style={S.sub}>Hasta</label><input style={{...S.input,width:150,marginBottom:0}} type="date" value={hasta} onChange={function(e){ setHasta(e.target.value); }}/>
        <label style={S.sub}>Año</label><input style={{...S.input,width:90,marginBottom:0}} placeholder="2026" value={anio} onChange={function(e){ setAnio(e.target.value); }}/>
        <select style={{...S.input,width:160,marginBottom:0}} value={fEst} onChange={function(e){ setFEst(e.target.value); }}><option value="">Todos estados</option>{['Ingresada','Asignada','En Ruta','Llegada','Trabajando','Esperando Repuesto','Revisión QA','Cerrada','Rechazada','Anulada'].map(function(s){ return <option key={s}>{s}</option>; })}</select>
        <select style={{...S.input,width:160,marginBottom:0}} value={fTipo} onChange={function(e){ setFTipo(e.target.value); }}><option value="">Todos tipos</option>{['servicio','armado_unidad','armado_volumen','mantencion','retiro','evaluacion','repuesto_garantia','reclamo','devolucion_dinero'].map(function(s){ return <option key={s}>{s}</option>; })}</select>
        <button style={{...S.btn(T.ok),width:'auto',marginBottom:0}} onClick={exportar}>⬇ Exportar CSV</button>
      </div>
      <p style={S.sub}>{visibles.length} de {ots.length} OTs con los filtros aplicados. 46 columnas trabajables.</p>
    </div>);
}
