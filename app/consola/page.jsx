'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { T,S,estColor,fmtCLP,fmtFecha } from '../../lib/ui';
import TablaPro from '../../lib/consola/TablaPro';
import { list,save,remove,onChange } from '../../lib/data';
import ModNuevaOT from '../../lib/consola/mod_nuevaot';
import ModClientes from '../../lib/consola/mod_clientes';
import ModAgenda from '../../lib/consola/mod_agenda';
import ModActivos from '../../lib/consola/mod_activos';
import ModChecklists from '../../lib/consola/mod_checklists';
import ModParametros from '../../lib/consola/mod_parametros';
import ModProductos from '../../lib/consola/mod_productos';
import ModImportar from '../../lib/consola/mod_importar';
import ModBonos from '../../lib/consola/mod_bonos';
import ModKpis from '../../lib/consola/mod_kpis';
import ModConectores from '../../lib/consola/mod_conectores';
import ModConfig from '../../lib/consola/mod_config';
import ModRed from '../../lib/consola/mod_red';
import ModPresupuestos from '../../lib/consola/mod_presupuestos';
import ModBodega from '../../lib/consola/mod_bodega';

const CATS={
 'OPERACIONES':[['ots','Órdenes de Trabajo'],['nueva','Nueva OT'],['buzon','Buzón del Agente'],['agenda','Agenda'],['bodega','Bodega / Repuestos']],
 'ADMINISTRACIÓN':[['maestros','Maestros y Parámetros'],['productos','Productos y Garantías'],['checklists','Checklists'],['clientes','Clientes'],['activos','Activos / Equipos']],
 'FINANZAS':[['presupuestos','Presupuestos'],['red','Red SAT y Liquidaciones'],['bonos','Bonos']],
 'ANÁLISIS':[['kpis','Dashboard KPIs'],['importar','Importar Datos'],['conectores','Conectores'],['config','Configuración']]
};

export default function Consola(){
  const [me,setMe]=useState(null); const [tenant,setTenant]=useState(null);
  const [cat,setCat]=useState('OPERACIONES'); const [tab,setTab]=useState('ots');
  const [toast,setToast]=useState(null);
  const [ots,setOts]=useState([]); const [cust,setCust]=useState({}); const [ins,setIns]=useState([]); const [nps,setNps]=useState([]);
  const [sel,setSel]=useState(null); const [q,setQ]=useState(''); const [fEst,setFEst]=useState('');
  const [fams,setFams]=useState([]); const [servs,setServs]=useState([]); const [mants,setMants]=useState([]);
  const [wrules,setWrules]=useState([]); const [trates,setTrates]=useState([]); const [sla,setSla]=useState([]);
  const router=useRouter();
  const brand=(tenant&&tenant.color_primario)||T.brand;
  const avisar=(t,c)=>{ setToast({t,c}); setTimeout(()=>setToast(null),2600); };

  async function cargar(){
    const [o,c,i,n,f,s,m,w,tr,sl]=await Promise.all([
      list('work_orders'),list('customers'),list('insistencias'),list('surveys_nps'),
      list('product_families'),list('service_types'),list('mant_types'),list('warranty_rules'),list('tech_rates'),list('sla_matrix')]);
    setOts(o); const cm={}; c.forEach(x=>cm[x.id]=x); setCust(cm); setIns(i); setNps(n);
    setFams(f); setServs(s); setMants(m); setWrules(w); setTrates(tr); setSla(sl);
  }
  useEffect(()=>{ supabase.auth.getSession().then(async({data})=>{ if(!data.session){router.replace('/');return;}
    const {data:m}=await supabase.from('users').select('*').eq('auth_uid',data.session.user.id).single(); setMe(m);
    const {data:t}=await supabase.from('tenants').select('*').eq('activo',true).limit(1); setTenant((t||[])[0]||null);
    cargar(); }); return onChange(cargar); },[]);

  const visibles=ots.filter(o=>{const t=q.toLowerCase(); return (!t||String(o.ot_number).includes(t)||String(o.ext_id||'').toLowerCase().includes(t)||((cust[o.customer_id]||{}).nombre||'').toLowerCase().includes(t))&&(!fEst||o.estado===fEst);});

  return (
    <main style={S.main}>
      {toast&&<div style={S.toast(toast.c)}>{toast.t}</div>}
      <header style={{position:'sticky',top:0,zIndex:30,background:T.surface,borderBottom:`1px solid ${T.border}`,padding:'10px 16px',display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
        <h1 style={S.h1}>TORQUE<span style={{color:brand}}>·OS</span></h1>
        <span style={S.sub}>{tenant?tenant.nombre:''}</span>
        <nav style={{display:'flex',gap:6,marginLeft:'auto',flexWrap:'wrap'}}>
          {Object.keys(CATS).map(c=><button key={c} onClick={()=>{setCat(c); setTab(CATS[c][0][0]);}} style={{padding:'9px 16px',borderRadius:999,border:cat===c?'0':`1px solid ${T.border}`,background:cat===c?brand:'transparent',color:cat===c?'#fff':T.text,fontWeight:700,fontSize:13,cursor:'pointer'}}>{c}</button>)}
        </nav>
        <a href="/tecnico" style={{...S.btnO(T.info),width:'auto',marginBottom:0,padding:'8px 14px',textDecoration:'none'}}>Vista Técnico</a>
        <button onClick={async()=>{await supabase.auth.signOut(); router.replace('/');}} style={{...S.btnO(T.danger),width:'auto',marginBottom:0,padding:'8px 14px'}}>Salir</button>
      </header>
      <div style={{display:'flex',alignItems:'flex-start'}}>
        <aside style={{width:240,flexShrink:0,padding:'16px 12px',borderRight:`1px solid ${T.border}`,minHeight:'calc(100vh - 60px)',background:T.surface2}}>
          <div style={{...S.sub,fontWeight:800,letterSpacing:.6,marginBottom:10}}>{cat}</div>
          {CATS[cat].map(([k,l])=><button key={k} onClick={()=>setTab(k)} style={{display:'block',width:'100%',textAlign:'left',padding:'10px 12px',borderRadius:8,border:0,marginBottom:4,background:tab===k?brand:'transparent',color:tab===k?'#fff':T.text,fontWeight:tab===k?700:500,fontSize:13,cursor:'pointer'}}>{l}</button>)}
        </aside>
        <div style={{flex:1,minWidth:0}}><div style={S.wrap}>
          {tab==='kpis'&&<ModKpis/>}
          {tab==='maestros'&&(
            <div>
              <TablaPro titulo="Familias de producto" rows={fams} campos={[['code','Código'],['name','Nombre']]} onEdit={(r,k,v)=>save('product_families',{[k]:v},r.id)} onAdd={f=>save('product_families',f)} onDel={r=>remove('product_families',r.id)}/>
              <TablaPro titulo="Tipos de servicio" rows={servs} campos={[['code','Código'],['nombre','Nombre']]} onEdit={(r,k,v)=>save('service_types',{[k]:v},r.id)} onAdd={f=>save('service_types',f)} onDel={r=>remove('service_types',r.id)}/>
              <TablaPro titulo="Tipos de mantención" rows={mants} campos={[['nombre','Nombre'],['descripcion','Descripción']]} onEdit={(r,k,v)=>save('mant_types',{[k]:v},r.id)} onAdd={f=>save('mant_types',f)} onDel={r=>remove('mant_types',r.id)}/>
              <TablaPro titulo="Garantías por familia (meses)" rows={wrules} campos={[['family_id','ID Familia','num'],['meses','Meses','num'],['condiciones','Condiciones']]} onEdit={(r,k,v)=>save('warranty_rules',{[k]:v},r.id)} onDel={r=>remove('warranty_rules',r.id)}/>
              <TablaPro titulo="Técnicos (costos)" rows={trates} campos={[['technician','Técnico'],['costo_x_hora','Costo×h','num'],['venta_x_hora','Venta×h','num']]} onEdit={(r,k,v)=>save('tech_rates',{[k]:v},r.id)} onDel={r=>remove('tech_rates',r.id)}/>
              <TablaPro titulo="SLA (días)" rows={sla} campos={[['tipo_servicio','Servicio'],['tipo_equipo','Equipo'],['dias','Días','num']]} onEdit={(r,k,v)=>save('sla_matrix',{[k]:v},r.id)} onAdd={f=>save('sla_matrix',f)} onDel={r=>remove('sla_matrix',r.id)}/>
            </div>)}
          {tab==='ots'&&(
            <div>
              <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
                <input style={{...S.input,flex:2,minWidth:200,marginBottom:0}} placeholder="Buscar OT o cliente…" value={q} onChange={e=>setQ(e.target.value)}/>
                <select style={{...S.input,flex:1,minWidth:160,marginBottom:0}} value={fEst} onChange={e=>setFEst(e.target.value)}><option value="">Todos los estados</option>{['Ingresada','Asignada','En Ruta','Llegada','Trabajando','Esperando Repuesto','Revisión QA','Cerrada','Rechazada'].map(s=><option key={s}>{s}</option>)}</select>
              </div>
              <div style={S.card}><table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr><th style={S.th}>OT</th><th style={S.th}>Cliente</th><th style={S.th}>Tipo</th><th style={S.th}>Estado</th><th style={S.th}>Ingreso</th></tr></thead>
                <tbody>{visibles.slice(0,150).map(o=>(<tr key={o.id} onClick={()=>setSel(o)} style={{cursor:'pointer'}}>
                  <td style={{...S.td,color:brand,fontWeight:700}}>{o.ext_id||('OT-'+o.ot_number)}</td>
                  <td style={S.td}>{(cust[o.customer_id]||{}).nombre||'—'}</td><td style={S.td}>{o.tipo}</td>
                  <td style={S.td}><span style={S.pill(estColor(o.estado))}>{o.estado}</span></td><td style={S.td}>{fmtFecha(o.created_at)}</td></tr>))}</tbody>
              </table>
              {visibles.length===0&&<p style={{...S.sub,padding:12}}>Sin OTs. Carga tu base real en Análisis → Importar Datos.</p>}</div>
            </div>)}
          {tab==='buzon'&&<div style={S.card}><h2 style={S.h2}>Buzón del Agente</h2><p style={S.sub}>Rechazos con motivo, repuestos solicitados y pausas aparecen aquí en tiempo real.</p></div>}
          {tab==='agenda'&&<ModAgenda avisar={avisar}/>}
          {tab==='nueva'&&<ModNuevaOT avisar={avisar} onOk={cargar}/>}
          {tab==='bodega'&&<ModBodega avisar={avisar}/>}
          {tab==='productos'&&<ModProductos avisar={avisar}/>}
          {tab==='checklists'&&<ModChecklists avisar={avisar}/>}
          {tab==='clientes'&&<ModClientes avisar={avisar}/>}
          {tab==='activos'&&<ModActivos avisar={avisar}/>}
          {tab==='presupuestos'&&<ModPresupuestos avisar={avisar} tenant={tenant}/>}
          {tab==='red'&&<ModRed avisar={avisar}/>}
          {tab==='bonos'&&<ModBonos avisar={avisar}/>}
          {tab==='importar'&&<ModImportar avisar={avisar}/>}
          {tab==='conectores'&&<ModConectores avisar={avisar}/>}
          {tab==='config'&&<ModConfig tenant={tenant} avisar={avisar} onTenant={setTenant}/>}
        </div></div>
      </div>
      {sel&&(
        <div style={S.modal} onClick={()=>setSel(null)}>
          <div style={S.modalCard} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between'}}><h2 style={{...S.h2,color:brand}}>{sel.ext_id||('OT-'+sel.ot_number)}</h2><span style={S.pill(estColor(sel.estado))}>{sel.estado}</span></div>
            <p style={S.sub}>{(cust[sel.customer_id]||{}).nombre||'—'} · {sel.tipo} · {fmtFecha(sel.created_at)}</p>
            <p style={{...S.sub,margin:'6px 0'}}>{sel.descripcion}</p>
            {sel.kpi&&sel.kpi.margen!=null&&<p style={{color:sel.kpi.margen<0?T.danger:T.ok,fontWeight:700}}>Margen: {fmtCLP(sel.kpi.margen)} ({sel.kpi.pct_margen}) · FTF: {sel.kpi.ftf} · SLA: {sel.kpi.nivel}</p>}
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:10}}>
              <button style={{...S.btnO(T.info),width:'auto'}} onClick={()=>{setCat('ADMINISTRACIÓN');setTab('clientes');setSel(null);}}>Ver cliente</button>
              <button style={{...S.btnO(T.teal),width:'auto'}} onClick={()=>{setCat('ADMINISTRACIÓN');setTab('activos');setSel(null);}}>Ver activos</button>
              <button style={{...S.btnO(T.warn),width:'auto'}} onClick={()=>{setCat('OPERACIONES');setTab('bodega');setSel(null);}}>Bodega</button>
            </div>
            <button style={{...S.btn(T.muted),marginTop:12}} onClick={()=>setSel(null)}>Cerrar</button>
          </div>
        </div>)}
    </main>);
}
