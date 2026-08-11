'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { T, S, estColor, fmtCLP, fmtFecha } from '../../lib/ui';
import TablaPro from '../../lib/consola/TablaPro';
import { list, save, remove, onChange } from '../../lib/data';
import FichaOT from '../../lib/consola/FichaOT';
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
import ModTecnicos from '../../lib/consola/mod_tecnicos';

const CATS = {
  OPERACIONES: [['ots','Órdenes de Trabajo'],['nueva','Nueva OT'],['buzon','Buzón del Agente'],['agenda','Agenda'],['bodega','Bodega / Repuestos']],
  ADMINISTRACION: [['maestros','Maestros y Parámetros'],['productos','Productos y Garantías'],['checklists','Checklists'],['clientes','Clientes'],['activos','Activos / Equipos'],['tecnicos','Técnicos y SSTT']],
  FINANZAS: [['presupuestos','Presupuestos'],['red','Red SAT y Liquidaciones'],['bonos','Bonos']],
  ANALISIS: [['kpis','Dashboard KPIs'],['importar','Importar Datos'],['conectores','Conectores'],['config','Configuración']]
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
  const [sel,setSel]=useState(null);
  const [q,setQ]=useState(''); const [fEst,setFEst]=useState('');
  const [buzCount,setBuzCount]=useState(0);
  const router=useRouter();
  const brand=(tenant&&tenant.color_primario)||T.brand;
  function avisar(t,c){ setToast({t:t,c:c}); setTimeout(function(){ setToast(null); },2600); }
  function esPendiente(o){ return o.estado==='Ingresada'&&!o.asignado_user_id&&!o.asignado_company_id; }

  async function cargar(){
    const r=await Promise.all([
      list('work_orders'),list('customers'),list('product_families'),list('service_types'),
      list('mant_types'),list('warranty_rules'),list('tech_rates'),list('sla_matrix')
    ]);
    setOts(r[0]); const cm={}; r[1].forEach(function(x){cm[x.id]=x;}); setCust(cm);
    setFams(r[2]); setServs(r[3]); setMants(r[4]); setWrules(r[5]); setTrates(r[6]); setSla(r[7]);
    const extra=await Promise.all([
      supabase.from('notifications').select('*').eq('rol_destino','agente'),
      supabase.from('insistencias').select('*')
    ]);
    const pend=r[0].filter(esPendiente).length;
    setBuzCount(pend+(extra[0].data||[]).length+(extra[1].data||[]).length);
  }
  function exportExcel(){
    var head=['ID OT','OT','Fecha Ingreso','Cliente','RUT','Tipo Equipo','Tipo Servicio','Técnico','Estado','Fecha Promesa','Cantidad','Horas','Venta Total','Costo Total','Margen','%Margen','FTF','Nota','Nivel','Detalle','Modelo'];
    var rows=ots.map(function(o){
      var c=cust[o.customer_id]||{}; var k=o.kpi||{};
      return [o.ext_id||('OT-'+o.ot_number),o.ot_number,o.created_at||'',c.nombre||'',c.r
