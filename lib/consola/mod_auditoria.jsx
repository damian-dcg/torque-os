'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S } from '../ui';

var SERV=['ARMADO','GARANTIA','EVALUACION','MANTENCION','POST VENTA','RECLAMO','DEVOLUCION','CAMBIO','DESPACHO','LEVANTAMIENTO','RETIRO','ANULACION'];
var EQ=['BICICLETA','BICICLETA ELECTRICA','MAQUINA','SCOOTER ELECTRICO','ACCESORIO'];
function dias(t,e){ if(t==='ARMADO'){ if(e==='BICICLETA'||e==='BICICLETA ELECTRICA')return 3; if(e==='MAQUINA'||e==='SCOOTER ELECTRICO')return 5; return 10; } return 15; }

export default function ModAuditoria(){
  const [rep,setRep]=useState('Generando…');
  const url=(typeof process!=='undefined'&&process.env&&process.env.NEXT_PUBLIC_SUPABASE_URL)||'n/d';
  async function cnt(t){ const {count}=await supabase.from(t).select('*',{count:'exact',head:true}); return count||0; }

  async function auditar(){
    const L=['WEB CONECTADA A: '+url,'---'];
    const tabs=['customers','work_orders','assets','product_families','service_types','mant_types','tech_rates','sla_matrix','warranty_rules','paquetes','checklists','checklist_blocks','presupuestos','liquidaciones','notifications','insistencias','ot_events','equipment','stock_movements','parts','regions','settings','companies','users'];
    for(const t of tabs){ const {count,error}=await supabase.from(t).select('*',{count:'exact',head:true}); L.push(t+': '+(error?('ERROR '+error.message):count)); }
    const wo=await supabase.from('work_orders').select('id,customer_id,ext_id'); const d=wo.data||[];
    L.push('work_orders SIN customer_id: '+d.filter(w=>!w.customer_id).length);
    L.push('work_orders SIN ext_id: '+d.filter(w=>!w.ext_id).length);
    setRep(L.join('\n'));
  }

  async function sembrar(){
    const L=['Sembrando EN LA BASE DE LA WEB: '+url];
    if(await cnt('product_families')===0){ await supabase.from('product_families').insert([{code:'FP001',name:'BICICLETA',active:true},{code:'FP002',name:'BICICLETA ELECTRICA',active:true},{code:'FP003',name:'MAQUINA',active:true},{code:'FP004',name:'SCOOTER ELECTRICO',active:true},{code:'FP005',name:'ACCESORIO',active:true}]); L.push('✅ familias +5'); } else L.push('· familias ya existen');
    if(await cnt('mant_types')===0){ await supabase.from('mant_types').insert([{nombre:'REPARACION MENOR',descripcion:'Cambio cámara/neumático/sellante/pedales/puños/sillín/tubo/abrazadera/tapa dirección/roldanas/bloqueos/ajuste piolas/lubricación/accesorios básicos/regulación V-brake'},{nombre:'REPARACION MEDIANA',descripcion:'Cadena/piñón-cassette/coronas/bielas/desviador/pata cambio/shifters/manillas freno/piolas-fundas/manubrio/TEE/cinta manubrio/centrado básico/pastillas/patines/discos/caliper mecánico/rueda completa/sincronización'},{nombre:'REPARACION SUPERIOR',descripcion:'Juego motor/juego dirección/horquilla(corte)/piolas guiado interno/sangrado hidráulico/manguera+purado/caliper hidráulico/manilla-bomba/pistones-retenes/rodamientos maza/eje maza/núcleo maza/rayos+centrado/sensores E-Bike/pantalla-comando'},{nombre:'REPARACION MAYOR',descripcion:'Enradiado+centrado completo/desarme basculante+rodamientos/traspaso a cuadro nuevo/grupo electrónico/diagnóstico+software E-Bike/motor central-maza/batería+arnés/mantención full/enderezado fusible'}]); L.push('✅ mant_types +4'); }
    if(await cnt('tech_rates')===0){ await supabase.from('tech_rates').insert([{technician:'MAYCOLL GODOY',costo_sueldo_mensual:856386,horas_mes:168,costo_x_hora:5098,venta_x_hora:10195},{technician:'CLAUDIO MOLINA',costo_sueldo_mensual:1220601,horas_mes:168,costo_x_hora:7265,venta_x_hora:14531},{technician:'ALVARO ROJAS',costo_sueldo_mensual:1058500,horas_mes:168,costo_x_hora:6301,venta_x_hora:12601},{technician:'LUIS BRAVO',costo_sueldo_mensual:863059,horas_mes:168,costo_x_hora:5137,venta_x_hora:10275},{technician:'MANUEL FUENTES',costo_sueldo_mensual:2042748,horas_mes:168,costo_x_hora:12159,venta_x_hora:24318},{technician:'GASTON PALMA',costo_sueldo_mensual:933749,horas_mes:168,costo_x_hora:5558,venta_x_hora:11116},{technician:'DAMIAN CARRASCO',costo_sueldo_mensual:2050535,horas_mes:168,costo_x_hora:12206,venta_x_hora:24411},{technician:'SSTT AUTORIZADO',costo_sueldo_mensual:0,horas_mes:168,costo_x_hora:0,venta_x_hora:0},{technician:'IGNACIO BENAVIDES',costo_sueldo_mensual:0,horas_mes:168,costo_x_hora:0,venta_x_hora:0},{technician:'TALLER',costo_sueldo_mensual:856386,horas_mes:168,costo_x_hora:5098,venta_x_hora:10195},{technician:'BIANCHI',costo_sueldo_mensual:0,horas_mes:168,costo_x_hora:0,venta_x_hora:0}]); L.push('✅ tech_rates +11'); }
    if(await cnt('sla_matrix')===0){ var rows=[]; SERV.forEach(function(t){ EQ.forEach(function(e){ rows.push({tipo_servicio:t,tipo_equipo:e,dias:dias(t,e)}); }); }); await supabase.from('sla_matrix').insert(rows); L.push('✅ sla_matrix +'+rows.length); }
    if(await cnt('warranty_rules')===0){ var f=await supabase.from('product_families').select('id,code'); await supabase.from('warranty_rules').insert((f.data||[]).map(function(x){ return {family_id:x.id,meses:(x.code==='FP005'?3:(x.code==='FP001'?12:6)),condiciones:'Garantía según familia'}; })); L.push('✅ warranty_rules +'+(f.data||[]).length); }
    if(await cnt('paquetes')===0){ await supabase.from('paquetes').insert([{nombre:'Puesta a punto bicicleta',familia:'BICICLETA',precio:25000,horas:1,tareas:[{t:'Ajuste frenos',min:15},{t:'Ajuste cambios',min:15},{t:'Lubricación',min:10},{t:'Presión neumáticos',min:5}]},{nombre:'Reparación menor',familia:'BICICLETA',precio:15000,horas:0.5,tareas:[{t:'Cambio cámara',min:15},{t:'Regulación V-brake',min:10}]},{nombre:'Mantención trotadora',familia:'MAQUINA',precio:45000,horas:1.5,tareas:[{t:'Tensión banda',min:20},{t:'Lubricación',min:15},{t:'Prueba',min:15}]}]); L.push('✅ paquetes +3'); }
    if(await cnt('checklist_blocks')===0){ await supabase.from('checklist_blocks').insert([{code:'B01',nombre:'Llegada',items:[{t:'foto',l:'Foto fachada/punto encuentro',r:true},{t:'txt',l:'Hora llegada',r:true}]},{code:'B02',nombre:'Identificación',items:[{t:'txt',l:'Número de serie',r:true},{t:'foto',l:'Foto número de serie',r:true},{t:'txt',l:'Modelo',r:true}]},{code:'B03',nombre:'Estado inicial',items:[{t:'sel',l:'Nivel de daño',r:true,o:['Sin daño','Leve','Moderado','Grave','Crítico']},{t:'foto',l:'Fotos iniciales',r:true}]},{code:'B05',nombre:'Condiciones eléctricas',items:[{t:'num',l:'Voltaje',r:false},{t:'sel',l:'Conexión',r:true,o:['Directa','Alargador','Sin conexión']}]},{code:'B06',nombre:'Diagnóstico',items:[{t:'txt',l:'Problema cliente',r:true},{t:'txt',l:'Problema detectado',r:true},{t:'sel',l:'Tipo falla',r:true,o:['Mecánica','Eléctrica','Electrónica','Desgaste','Fabricación']},{t:'sel',l:'Causa raíz',r:true,o:['Fabricación','Armado','Transporte','Mal uso','Desgaste']}]},{code:'B07',nombre:'Repuestos',items:[{t:'txt',l:'Código',r:false},{t:'num',l:'Cantidad',r:false},{t:'sel',l:'Instalado',r:true,o:['Si','No']}]},{code:'B09',nombre:'Pruebas',items:[{t:'sel',l:'Resultado',r:true,o:['Correcto','Con observaciones','No conforme']}]},{code:'B13',nombre:'Firmas',items:[{t:'foto',l:'Firma cliente',r:true},{t:'foto',l:'Firma técnico',r:true}]},{code:'B14',nombre:'Cierre',items:[{t:'sel',l:'Resultado final',r:true,o:['Ejecutado','Parcial','Reprogramado','Derivado']}]}]); L.push('✅ bloques +9'); }
    if(await cnt('checklists')===0){ await supabase.from('checklists').insert([{code:'CK-ARM-BICI',nombre:'Armado bicicleta',especialidad:'BICI',blocks:['B01','B02','B03','B09','B13','B14']},{code:'CK-REP-BICI',nombre:'Reparación bicicleta',especialidad:'BICI',blocks:['B01','B02','B03','B06','B07','B09','B13','B14']},{code:'CK-REP-FIT',nombre:'Reparación fitness',especialidad:'FIT',blocks:['B01','B02','B03','B05','B06','B07','B09','B13','B14']},{code:'CK-EVAL-GARANTIA',nombre:'Evaluación garantía',especialidad:'BICI',blocks:['B01','B02','B03','B06','B09','B14']},{code:'CK-MANT-FIT',nombre:'Mantención fitness',especialidad:'FIT',blocks:['B01','B02','B05','B09','B13','B14']}]); L.push('✅ checklists +5'); }
    L.push('FIN. Pulsa Re-auditar para verificar.');
    setRep(L.join('\n'));
  }

  useEffect(()=>{ auditar(); },[]);
  return (<div style={S.card}>
    <h2 style={S.h2}>Auditoría del sistema</h2>
    <p style={{...S.sub,marginBottom:10}}>Base a la que está conectada esta web: <b style={{color:T.brand}}>{url}</b>. El sembrado se hace SOBRE ESTA BASE, no importa qué Editor tengas abierto.</p>
    <div style={{display:'flex',gap:8,marginBottom:10,flexWrap:'wrap'}}>
      <button style={S.btn(T.ok)} onClick={sembrar}>🌱 Sembrar maestros</button>
      <button style={S.btn(T.brand)} onClick={auditar}>Re-auditar</button>
      <button style={S.btnO(T.info)} onClick={()=>navigator.clipboard.writeText(url+'\n'+rep)}>Copiar informe (pégamelo)</button>
    </div>
    <pre style={{...S.sub,whiteSpace:'pre-wrap',background:T.surface2,padding:12,borderRadius:8}}>{rep}</pre>
  </div>);
}
