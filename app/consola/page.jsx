'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { T, S, estColor, fmtCLP, fmtFecha } from '../../lib/ui';
import TablaPro from '../../lib/consola/TablaPro';
import { list, save, remove, onChange } from '../../lib/data';
import FichaOT from '../../lib/consola/FichaOT';
import FichaCliente from '../../lib/consola/FichaCliente';
import Buzon from '../../lib/consola/Buzon';
import ModNuevaOT from '../../lib/consola/mod_nuevaot';
import ModClientes from '../../lib/consola/mod_clientes';
import ModAgenda from '../../lib/consola/mod_agenda';
import ModActivos from '../../lib/consola/mod_activos';
import ModChecklists from '../../lib/consola/mod_checklists';
import ModProductos from '../../lib/consola/mod_productos';
import ModImportar from '../../lib/consola/mod_importar';
import ModBonos from '../../lib/consola/mod_bonos';
import ModKpis from '../../lib/consola/mod_kpis';
import ModConectores from '../../lib/consola/mod_conectores';
import ModConfig from '../../lib/consola/mod_config';
import ModRed from '../../lib/consola/mod_red';
import ModPresupuestos from '../../lib/consola/mod_presupuestos';
import ModBodega from '../../lib/consola/mod_bodega';
import ModRutas from '../../lib/consola/mod_rutas';
import ModPaquetes from '../../lib/consola/mod_paquetes';
import ModTecnicos from '../../lib/consola/mod_tecnicos';
import ModParametros from '../../lib/consola/mod_parametros';
import ModAuditoria from '../../lib/consola/mod_auditoria';
import ModRecepcion from '../../lib/consola/mod_recepcion';
import ModAprobaciones from '../../lib/consola/mod_aprobaciones';
import ModDesarme from '../../lib/consola/mod_desarme';
import ModRecuperacion from '../../lib/consola/mod_recuperacion';
import ModInventario from '../../lib/consola/mod_inventario';
import ModCompras from '../../lib/consola/mod_compras';
import ModCaja from '../../lib/consola/mod_caja';

const CATS = {
  OPERACIONES: [['ots','Órdenes de Trabajo'],['nueva','Nueva OT'],['recepcion','Recepción y Custodia'],['aprobaciones','Aprobaciones'],['desarme','Desarme Autorizado'],['recuperacion','Recuperación y Stock'],['inventario','Inventario Avanzado'],['compras','Compras y Proveedores'],['buzon','Buzón del Agente'],['agenda','Agenda'],['rutas','Optimizador de Rutas'],['bodega','Bodega / Repuestos']],
  ADMINISTRACION: [['maestros','Maestros y Parámetros'],['productos','Productos y Garantías'],['paquetes','Paquetes de Servicio'],['checklists','Checklists'],['clientes','Clientes'],['activos','Activos / Equipos'],['tecnicos','Técnicos y SSTT'],['parametros','Parámetros Generales']],
  FINANZAS: [['caja','Caja y Facturación'],['presupuestos','Presupuestos'],['red','Liquidaciones SSTT'],['bonos','Bonos']],
  ANALISIS: [['kpis','Dashboard KPIs'],['importar','Importar Datos'],['conectores','Conectores'],['config','Tenant y Marca'],['auditoria','Auditoría']]
};

export default function Consola(){
  const [me,setMe]=useState(null);
  const [tenant,setTenant]=useState(null);
  const [cat,setCat]=useState('OPERACIONES');
  const [tab,setTab]=useState('ots');
  const [toast,setToast]=useState(null);
  const [ots,setOts]=useState([]);
  const [cust,setCust]=useState({});
  const [fams,setFams]=useState([]); const [servs,setServs]=useState([]); const [mants,setMants]=useState([]);
  const [wrules,setWrules]=useState([]); const [trates,setTrates]=useState([]); const [sla,setSla]=useState([]);
  const [usersMap,setUsersMap]=useState({}); const [satsMap,setSatsMap]=useState({});
  const [sel,setSel]=useState(null);
  const [cliSel,setCliSel]=useState(null);
  const [recPreset,setRecPreset]=useState(null);
  const [q,setQ]=useState(''); const [fEst,setFEst]=useState('');
  const [buzCount,setBuzCount]=useState(0);
  const router=useRouter();
  const brand=(tenant&&tenant.color_primario)||T.brand;
  function avisar(t,c){ setToast({t:t,c:c}); setTimeout(function(){ setToast(null); },2600); }
  function esPendiente(o){ return o.estado==='Ingresada'&&!o.asignado_user_id&&!o.asignado_company_id; }
  function tecName(o){
    if(o.asignado_user_id) return usersMap[o.asignado_user_id]||('Téc #'+o.asignado_user_id);
    if(o.asignado_company_id) return satsMap[o.asignado_company_id]||('SSTT #'+o.asignado_company_id);
    return '—';
  }
  async function cargar(){
    const r=await Promise.all([
      list('work_orders'),list('customers'),list('product_families'),list('service_types'),
      list('mant_types'),list('warranty_rules'),list('tech_rates'),list('sla_matrix'),
      list('users'),supabase.from('companies').select('id,nombre').eq('tipo','sat')
    ]);
    setOts(r[0]); const cm={}; r[1].forEach(function(x){cm[x.id]=x;}); setCust(cm);
    setFams(r[2]); setServs(r[3]); setMants(r[4]); setWrules(r[5]); setTrates(r[6]); setSla(r[7]);
    const um={}; (r[8]||[]).forEach(function(x){um[x.id]=x.nombre;}); setUsersMap(um);
    const sm={}; ((r[9]&&r[9].data)||[]).forEach(function(x){sm[x.id]=x.nombre;}); setSatsMap(sm);
    const extra=await Promise.all([
      supabase.from('notifications').select('*').eq('rol_destino','agente'),
      supabase.from('insistencias').select('*')
    ]);
    setBuzCount(r[0].filter(esPendiente).length+(extra[0].data||[]).length+(extra[1].data||[]).length);
  }
  function exportExcel(){
    var head=['ID OT','OT','Fecha Ingreso','Cliente','RUT','Tipo Equipo','Tipo Servicio','Técnico/SSTT','Estado','Fecha Prog.','Cantidad','Venta Total','Costo Total','Margen','%Margen','FTF','Nota','Nivel','Detalle','Modelo'];
    var rows=ots.map(function(o){
      var c=cust[o.customer_id]||{}; var k=o.kpi||{};
      return [o.ext_id||('OT-'+o.ot_number),o.ot_number,o.created_at||'',c.nombre||'',c.rut||'',k.tipo_equipo||'',o.tipo||'',tecName(o),o.estado||'',o.fecha_programada||'',o.cantidad_unidades||1,k.venta_total||0,k.costo_total||0,k.margen||0,k.pct_margen||'',k.ftf||'',k.nota||'',k.nivel||'',String(o.descripcion||'').replace(/[;\n]/g,','),String(o.modelo_limpio||'').replace(/[;\n]/g,',')].join(';');
    });
    var a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob(['\uFEFF'+head.join(';')+'\n'+rows.join('\n')],{type:'text/csv'}));
    a.download='TORQUE-OS_base_completa.csv'; a.click();
  }
  useEffect(function(){
    supabase.auth.getSession().then(async function(res){
      if(!res.data.session){ router.replace('/'); return; }
      const m=await supabase.from('users').select('*').eq('auth_uid',res.data.session.user.id).single();
      setMe(m.data);
      const t=await supabase.from('tenants').select('*').eq('activo',true).limit(1);
      setTenant((t.data||[])[0]||null);
      cargar();
    });
    return onChange(cargar);
  },[]);
  const operativas=ots.filter(function(o){ return !esPendiente(o); });
  const visibles=operativas.filter(function(o){
    const t=q.toLowerCase();
    const okQ=!t||String(o.ot_number).indexOf(t)>=0||String(o.ext_id||'').toLowerCase().indexOf(t)>=0||String((cust[o.customer_id]||{}).nombre||'').toLowerCase().indexOf(t)>=0;
    return okQ&&(!fEst||o.estado===fEst);
  });
  return (
    <main style={S.main}>
      <style>{'@keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}.blink{animation:blink 1s infinite}'}</style>
      {toast? <div style={S.toast(toast.c)}>{toast.t}</div> : null}
      <header style={{position:'sticky',top:0,zIndex:30,background:'#0E1113',borderBottom:'1px solid #0E1113',padding:'10px 16px',display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
        <h1 style={{...S.h1,color:'#FFFFFF'}}>TORQUE<span style={{color:brand}}>·OS</span></h1>
        <span style={{...S.sub,color:'#AEB9C4'}}>{tenant?tenant.nombre:''}</span>
        <nav style={{display:'flex',gap:6,marginLeft:'auto',flexWrap:'wrap'}}>
          {Object.keys(CATS).map(function(c){
            return <button key={c} onClick={function(){ setCat(c); setTab(CATS[c][0][0]); }} style={{padding:'9px 16px',borderRadius:999,border:cat===c?'0':'1px solid #3A4149',background:cat===c?brand:'transparent',color:cat===c?'#fff':'#E6EAEE',fontWeight:700,fontSize:13,cursor:'pointer'}}>{c}</button>;
          })}
        </nav>
        <a href="/inventario" style={{...S.btnO(T.teal),width:'auto',marginBottom:0,padding:'8px 14px',textDecoration:'none'}}>Inventario</a>
        <a href="/sstt" style={{...S.btnO(T.violet),width:'auto',marginBottom:0,padding:'8px 14px',textDecoration:'none'}}>Portal SSTT</a>
        <a href="/tecnico" style={{...S.btnO(T.info),width:'auto',marginBottom:0,padding:'8px 14px',textDecoration:'none'}}>Vista Técnico</a>
        <button onClick={async function(){ await supabase.auth.signOut(); router.replace('/'); }} style={{...S.btnO(T.danger),width:'auto',marginBottom:0,padding:'8px 14px'}}>Salir</button>
      </header>
      <div style={{display:'flex',alignItems:'flex-start'}}>
        <aside style={{width:240,flexShrink:0,padding:'16px 12px',borderRight:'1px solid #22272D',minHeight:'calc(100vh - 60px)',background:'#2B3138'}}>
          <div style={{...S.sub,color:'#9AA6B2',fontWeight:800,marginBottom:10}}>{cat}</div>
          {CATS[cat].map(function(it){
            return <button key={it[0]} onClick={function(){ setTab(it[0]); }} style={{display:'flex',alignItems:'center',justifyContent:'space-between',width:'100%',textAlign:'left',padding:'10px 12px',borderRadius:8,border:0,marginBottom:4,background:tab===it[0]?brand:'transparent',color:tab===it[0]?'#fff':'#DDE3E9',fontWeight:tab===it[0]?700:500,fontSize:13,cursor:'pointer'}}>
              <span>{it[1]}</span>
              {it[0]==='buzon'&&buzCount>0? <span className="blink" style={{background:'#DC2626',color:'#fff',borderRadius:999,padding:'2px 8px',fontSize:11,fontWeight:800}}>{buzCount}</span> : null}
            </button>;
          })}
        </aside>
        <div style={{flex:1,minWidth:0}}><div style={S.wrap}>
          {tab==='kpis'? <ModKpis/> : null}
          {tab==='maestros'? <div>
            <TablaPro titulo="Familias de producto" rows={fams} campos={[['code','Código'],['name','Nombre']]} onEdit={function(r,k,v){ save('product_families',{[k]:v},r.id); }} onAdd={function(f){ save('product_families',f); }} onDel={function(r){ remove('product_families',r.id); }}/>
            <TablaPro titulo="Tipos de servicio" rows={servs} campos={[['code','Código'],['nombre','Nombre'],['base_price','Precio base','num']]} onEdit={function(r,k,v){ save('service_types',{[k]:v},r.id); }} onAdd={function(f){ save('service_types',f); }} onDel={function(r){ remove('service_types',r.id); }}/>
            <TablaPro titulo="Tipos de mantención" rows={mants} campos={[['nombre','Nombre'],['descripcion','Descripción']]} onEdit={function(r,k,v){ save('mant_types',{[k]:v},r.id); }} onAdd={function(f){ save('mant_types',f); }} onDel={function(r){ remove('mant_types',r.id); }}/>
            <TablaPro titulo="Garantías por familia (meses)" rows={wrules} campos={[['family_id','ID Familia','num'],['meses','Meses','num'],['condiciones','Condiciones']]} onEdit={function(r,k,v){ save('warranty_rules',{[k]:v},r.id); }} onAdd={function(f){ save('warranty_rules',f); }} onDel={function(r){ remove('warranty_rules',r.id); }}/>
            <TablaPro titulo="Técnicos (costos)" rows={trates} campos={[['technician','Técnico'],['costo_sueldo_mensual','Sueldo','num'],['horas_mes','Horas/mes','num'],['costo_x_hora','Costo×h','num'],['venta_x_hora','Venta×h','num']]} onEdit={function(r,k,v){ save('tech_rates',{[k]:v},r.id); }} onAdd={function(f){ save('tech_rates',f); }} onDel={function(r){ remove('tech_rates',r.id); }}/>
            <TablaPro titulo="SLA (días)" rows={sla} campos={[['tipo_servicio','Servicio'],['tipo_equipo','Equipo'],['dias','Días','num']]} onEdit={function(r,k,v){ save('sla_matrix',{[k]:v},r.id); }} onAdd={function(f){ save('sla_matrix',f); }} onDel={function(r){ remove('sla_matrix',r.id); }}/>
          </div> : null}
          {tab==='ots'? <div>
            <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
              <input style={{...S.input,flex:2,minWidth:200,marginBottom:0}} placeholder="Buscar OT o cliente…" value={q} onChange={function(e){ setQ(e.target.value); }}/>
              <select style={{...S.input,flex:1,minWidth:160,marginBottom:0}} value={fEst} onChange={function(e){ setFEst(e.target.value); }}>
                <option value="">Todos los estados</option>
                {['Asignada','En Ruta','Llegada','Trabajando','Esperando Repuesto','Revisión QA','Cerrada','Rechazada'].map(function(s){ return <option key={s}>{s}</option>; })}
              </select>
              <button style={{...S.btnO(T.ok),width:'auto',marginBottom:0}} onClick={exportExcel}>⬇ Excel completo</button>
            </div>
            <div style={S.card}><table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr><th style={S.th}>OT</th><th style={S.th}>Cliente</th><th style={S.th}>Tipo</th><th style={S.th}>Técnico/SSTT</th><th style={S.th}>Fecha</th><th style={S.th}>Estado</th></tr></thead>
              <tbody>{visibles.slice(0,150).map(function(o){
                return <tr key={o.id} onClick={function(){ setSel(o); }} style={{cursor:'pointer'}}>
                  <td style={{...S.td,color:brand,fontWeight:700}}>{o.ext_id||('OT-'+o.ot_number)}</td>
                  <td style={S.td}>{(cust[o.customer_id]||{}).nombre||'—'}</td>
                  <td style={S.td}>{o.tipo}</td>
                  <td style={S.td}>{tecName(o)}</td>
                  <td style={S.td}>{o.fecha_programada||'—'}</td>
                  <td style={S.td}><span style={S.pill(estColor(o.estado))}>{o.estado}</span></td>
                </tr>;
              })}</tbody>
            </table>
            {visibles.length===0? <p style={{...S.sub,padding:12}}>Sin OTs operativas. Las solicitudes nuevas sin asignar están en el Buzón.</p> : null}</div>
          </div> : null}
          {tab==='recepcion'? <ModRecepcion avisar={avisar} otPreset={recPreset}/> : null}
          {tab==='aprobaciones'? <ModAprobaciones avisar={avisar}/> : null}
          {tab==='desarme'? <ModDesarme avisar={avisar}/> : null}
          {tab==='recuperacion'? <ModRecuperacion avisar={avisar}/> : null}
          {tab==='inventario'? <ModInventario avisar={avisar}/> : null}
          {tab==='compras'? <ModCompras avisar={avisar}/> : null}
          {tab==='buzon'? <Buzon ots={ots} cust={cust} onOpen={function(o){ setSel(o); }} onChanged={cargar}/> : null}
          {tab==='agenda'? <ModAgenda avisar={avisar}/> : null}
          {tab==='rutas'? <ModRutas avisar={avisar}/> : null}
          {tab==='nueva'? <ModNuevaOT avisar={avisar} onOk={cargar}/> : null}
          {tab==='bodega'? <ModBodega avisar={avisar}/> : null}
          {tab==='productos'? <ModProductos avisar={avisar}/> : null}
          {tab==='paquetes'? <ModPaquetes avisar={avisar}/> : null}
          {tab==='checklists'? <ModChecklists avisar={avisar}/> : null}
          {tab==='clientes'? <ModClientes avisar={avisar} onOpenCliente={function(cc){ setCliSel(cc); }}/> : null}
          {tab==='activos'? <ModActivos avisar={avisar}/> : null}
          {tab==='tecnicos'? <ModTecnicos avisar={avisar}/> : null}
          {tab==='parametros'? <ModParametros avisar={avisar}/> : null}
          {tab==='caja'? <ModCaja avisar={avisar} me={me}/> : null}
          {tab==='presupuestos'? <ModPresupuestos avisar={avisar} tenant={tenant}/> : null}
          {tab==='red'? <ModRed avisar={avisar}/> : null}
          {tab==='bonos'? <ModBonos avisar={avisar}/> : null}
          {tab==='importar'? <ModImportar avisar={avisar} onOk={cargar}/> : null}
          {tab==='conectores'? <ModConectores avisar={avisar}/> : null}
          {tab==='config'? <ModConfig tenant={tenant} avisar={avisar} onTenant={setTenant}/> : null}
          {tab==='auditoria'? <ModAuditoria/> : null}
        </div></div>
      </div>
      {sel? <FichaOT ot={sel} cust={cust} avisar={avisar} onClose={function(){ setSel(null); }} onChanged={cargar} onOpenCliente={function(cc){ setCliSel(cc); }} onRecepcion={function(o){ setRecPreset(o); setSel(null); setTab('recepcion'); }}/> : null}
      {cliSel? <FichaCliente cliente={cliSel} onClose={function(){ setCliSel(null); }} onOpenOT={function(o){ setSel(o); }}/> : null}
    </main>);
}
