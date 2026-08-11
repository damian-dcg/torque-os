'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { T, S, estColor, fmtCLP, fmtFecha } from '../../lib/ui';
import TablaPro from '../../lib/consola/TablaPro';
import { list, save, remove, onChange } from '../../lib/data';
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

const CATS = {
  OPERACIONES: [['ots','Órdenes de Trabajo'],['nueva','Nueva OT'],['buzon','Buzón del Agente'],['agenda','Agenda'],['bodega','Bodega / Repuestos']],
  ADMINISTRACION: [['maestros','Maestros y Parámetros'],['productos','Productos y Garantías'],['checklists','Checklists'],['clientes','Clientes'],['activos','Activos / Equipos']],
  FINANZAS: [['presupuestos','Presupuestos'],['red','Red SAT y Liquidaciones'],['bonos','Bonos']],
  ANALISIS: [['kpis','Dashboard KPIs'],['importar','Importar Datos'],['conectores','Conectores'],['config','Configuración']]
};

export default function Consola(){
  const [me,setMe]=useState(null);
  const [tenant,setTenant]=useState(null);
  const [cat,setCat]=useState('OPERACIONES');
  const [tab,setTab]=useState('ots');
  const [toast,setToast]=useState(null);
  const [ots,setOts]=useState([]); const [cust,setCust]=useState({});
  const [fams,setFams]=useState([]); const [servs,setServs]=useState([]); const [mants,setMants]=useState([]);
  const [wrules,setWrules]=useState([]); const [trates,setTrates]=useState([]); const [sla,setSla]=useState([]);
  const [sel,setSel]=useState(null); const [q,setQ]=useState(''); const [fEst,setFEst]=useState('');
  const router=useRouter();
  const brand=(tenant&&tenant.color_primario)||T.brand;
  function avisar(t,c){ setToast({t:t,c:c}); setTimeout(function(){ setToast(null); },2600); }

  async function cargar(){
    const r=await Promise.all([list('work_orders'),list('customers'),list('product_families'),list('service_types'),list('mant_types'),list('warranty_rules'),list('tech_rates'),list('sla_matrix')]);
    setOts(r[0]); const cm={}; r[1].forEach(x=>{cm[x.id]=x;}); setCust(cm);
    setFams(r[2]); setServs(r[3]); setMants(r[4]); setWrules(r[5]); setTrates(r[6]); setSla(r[7]);
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

  const visibles=ots.filter(function(o){
    const t=q.toLowerCase();
    const okQ=!t||String(o.ot_number).indexOf(t)>=0||String(o.ext_id||'').toLowerCase().indexOf(t)>=0||String((cust[o.customer_id]||{}).nombre||'').toLowerCase().indexOf(t)>=0;
    return okQ&&(!fEst||o.estado===fEst);
  });

  return (
    <main style={S.main}>
      {toast? <div style={S.toast(toast.c)}>{toast.t}</div> : null}
      <header style={{position:'sticky',top:0,zIndex:30,background:T.surface,borderBottom:'1px solid '+T.border,padding:'10px 16px',display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
        <h1 style={S.h1}>TORQUE<span style={{color:brand}}>·OS</span></h1>
        <span style={S.sub}>{tenant?tenant.nombre:''}</span>
        <nav style={{display:'flex',gap:6,marginLeft:'auto',flexWrap:'wrap'}}>
          {Object.keys(CATS).map(function(c){
            return <button key={c} onClick={function(){ setCat(c); setTab(CATS[c][0][0]); }} style={{padding:'9px 16px',borderRadius:999,border:cat===c?'0':'1px solid '+T.border,background:cat===c?brand:'transparent',color:cat===c?'#fff':T.text,fontWeight:700,fontSize:13,cursor:'pointer'}}>{c}</button>;
          })}
        </nav>
        <a href="/tecnico" style={{...S.btnO(T.info),width:'auto',marginBottom:0,padding:'8px 14px',textDecoration:'none'}}>Vista Técnico</a>
        <button onClick={async function(){ await supabase.auth.signOut(); router.replace('/'); }} style={{...S.btnO(T.danger),width:'auto',marginBottom:0,padding:'8px 14px'}}>Salir</button>
      </header>
      <div style={{display:'flex',alignItems:'flex-start'}}>
        <aside style={{width:240,flexShrink:0,padding:'16px 12px',borderRight:'1px solid '+T.border,minHeight:'calc(100vh - 60px)',background:T.surface2}}>
          <div style={{...S.sub,fontWeight:800,marginBottom:10}}>{cat}</div>
          {CATS[cat].map(function(it){
            return <button key={it[0]} onClick={function(){ setTab(it[0]); }} style={{display:'block',width:'100%',textAlign:'left',padding:'10px 12px',borderRadius:8,border:0,marginBottom:4,background:tab===it[0]?brand:'transparent',color:tab===it[0]?'#fff':T.text,fontWeight:tab===it[0]?700:500,fontSize:13,cursor:'pointer'}}>{it[1]}</button>;
          })}
        </aside>
        <div style={{flex:1,minWidth:0}}><div style={S.wrap}>
          {tab==='kpis'? <ModKpis/> : null}
          {tab==='maestros'? <div>
            <TablaPro titulo="Familias de producto" rows={fams} campos={[['code','Código'],['name','Nombre']]} onEdit={function(r,k,v){ save('product_families',{[k]:v},r.id); }} onAdd={function(f){ save('product_families',f); }} onDel={function(r){ remove('product_families',r.id); }}/>
            <TablaPro titulo="Tipos de servicio" rows={servs} campos={[['code','Código'],['nombre','Nombre']]} onEdit={function(r,k,v){ save('service_types',{[k]:v},r.id); }} onAdd={function(f){ save('service_types',f); }} onDel={function(r){ remove('service_types',r.id); }}/>
            <TablaPro titulo="Tipos de mantención" rows={mants} campos={[['nombre','Nombre'],['descripcion','Descripción']]} onEdit={function(r,k,v){ save('mant_types',{[k]:v},r.id); }} onAdd={function(f){ save('mant_types',f); }} onDel={function(r){ remove('mant_types',r.id); }}/>
            <TablaPro titulo="Garantías por familia (meses)" rows={wrules} campos={[['family_id','ID Familia','num'],['meses','Meses','num'],['condiciones','Condiciones']]} onEdit={function(r,k,v){ save('warranty_rules',{[k]:v},r.id); }} onDel={function(r){ remove('warranty_rules',r.id); }}/>
            <TablaPro titulo="Técnicos (costos)" rows={trates} campos={[['technician','Técnico'],['costo_x_hora','Costo×h','num'],['venta_x_hora','Venta×h','num']]} onEdit={function(r,k,v){ save('tech_rates',{[k]:v},r.id); }} onDel={function(r){ remove('tech_rates',r.id); }}/>
            <TablaPro titulo="SLA (días)" rows={sla} campos={[['tipo_servicio','Servicio'],['tipo_equipo','Equipo'],['dias','Días','num']]} onEdit={function(r,k,v){ save('sla_matrix',{[k]:v},r.id); }} onAdd={function(f){ save('sla_matrix',f); }} onDel={function(r){ remove('sla_matrix',r.id); }}/>
          </div> : null}
          {tab==='ots'? <div>
            <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
              <input style={{...S.input,flex:2,minWidth:200,marginBottom:0}} placeholder="Buscar OT o cliente…" value={q} onChange={function(e){ setQ(e.target.value); }}/>
              <select style={{...S.input,flex:1,minWidth:160,marginBottom:0}} value={fEst} onChange={function(e){ setFEst(e.target.value); }}>
                <option value="">Todos los estados</option>
                {['Ingresada','Asignada','En Ruta','Llegada','Trabajando','Esperando Repuesto','Revisión QA','Cerrada','Rechazada'].map(function(s){ return <option key={s}>{s}</option>; })}
              </select>
            </div>
            <div style={S.card}><table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr><th style={S.th}>OT</th><th style={S.th}>Cliente</th><th style={S.th}>Tipo</th><th style={S.th}>Estado</th><th style={S.th}>Ingreso</th></tr></thead>
              <tbody>{visibles.slice(0,150).map(function(o){
                return <tr key={o.id} onClick={function(){ setSel(o); }} style={{cursor:'pointer'}}>
                  <td style={{...S.td,color:brand,fontWeight:700}}>{o.ext_id||('OT-'+o.ot_number)}</td>
                  <td style={S.td}>{(cust[o.customer_id]||{}).nombre||'—'}</td>
                  <td style={S.td}>{o.tipo}</td>
                  <td style={S.td}><span style={S.pill(estColor(o.estado))}>{o.estado}</span></td>
                  <td style={S.td}>{fmtFecha(o.created_at)}</td>
                </tr>;
              })}</tbody>
            </table>
            {visibles.length===0? <p style={{...S.sub,padding:12}}>Sin OTs. Carga tu base real en ANÁLISIS → Importar Datos.</p> : null}</div>
          </div> : null}
          {tab==='buzon'? <div style={S.card}><h2 style={S.h2}>Buzón del Agente</h2><p style={S.sub}>Rechazos con motivo, repuestos y pausas aparecen aquí en tiempo real.</p></div> : null}
          {tab==='agenda'? <ModAgenda avisar={avisar}/> : null}
          {tab==='nueva'? <ModNuevaOT avisar={avisar} onOk={cargar}/> : null}
          {tab==='bodega'? <ModBodega avisar={avisar}/> : null}
          {tab==='productos'? <ModProductos avisar={avisar}/> : null}
          {tab==='checklists'? <ModChecklists avisar={avisar}/> : null}
          {tab==='clientes'? <ModClientes avisar={avisar}/> : null}
          {tab==='activos'? <ModActivos avisar={avisar}/> : null}
          {tab==='presupuestos'? <ModPresupuestos avisar={avisar} tenant={tenant}/> : null}
          {tab==='red'? <ModRed avisar={avisar}/> : null}
          {tab==='bonos'? <ModBonos avisar={avisar}/> : null}
          {tab==='importar'? <ModImportar avisar={avisar} onOk={cargar}/> : null}
          {tab==='conectores'? <ModConectores avisar={avisar}/> : null}
          {tab==='config'? <ModConfig tenant={tenant} avisar={avisar} onTenant={setTenant}/> : null}
        </div></div>
      </div>
      {sel? <div style={S.modal} onClick={function(){ setSel(null); }}>
        <div style={S.modalCard} onClick={function(e){ e.stopPropagation(); }}>
          <div style={{display:'flex',justifyContent:'space-between'}}><h2 style={{...S.h2,color:brand}}>{sel.ext_id||('OT-'+sel.ot_number)}</h2><span style={S.pill(estColor(sel.estado))}>{sel.estado}</span></div>
          <p style={S.sub}>{(cust[sel.customer_id]||{}).nombre||'—'} · {sel.tipo} · {fmtFecha(sel.created_at)}</p>
          <p style={{...S.sub,margin:'6px 0'}}>{sel.descripcion}</p>
          {sel.kpi&&sel.kpi.margen!=null? <p style={{color:sel.kpi.margen<0?T.danger:T.ok,fontWeight:700}}>Margen: {fmtCLP(sel.kpi.margen)} · FTF: {sel.kpi.ftf} · SLA: {sel.kpi.nivel}</p> : null}
          <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:10}}>
            <button style={{...S.btnO(T.info),width:'auto'}} onClick={function(){ setCat('ADMINISTRACION'); setTab('clientes'); setSel(null); }}>Ver cliente</button>
            <button style={{...S.btnO(T.teal),width:'auto'}} onClick={function(){ setCat('ADMINISTRACION'); setTab('activos'); setSel(null); }}>Ver activos</button>
            <button style={{...S.btnO(T.warn),width:'auto'}} onClick={function(){ setCat('OPERACIONES'); setTab('bodega'); setSel(null); }}>Bodega</button>
          </div>
          <button style={S.btn(T.muted)} onClick={function(){ setSel(null); }}>Cerrar</button>
        </div>
      </div> : null}
    </main>);
}
