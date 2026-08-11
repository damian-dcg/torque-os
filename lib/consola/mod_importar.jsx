'use client';
import { useState } from 'react';
import { supabase } from '../supabase';
import { T, S } from '../ui';
import { emit } from '../data';

const mapTipo={'ARMADO':'armado_unidad','GARANTIA':'repuesto_garantia','EVALUACION':'evaluacion','POST VENTA':'servicio','DEVOLUCION':'devolucion_dinero','RETIRO':'retiro','RECLAMO':'reclamo','MANTENCION':'mantencion'};
function money(s){ if(s==null) return 0; var t=String(s).replace(/[^0-9.,-]/g,''); if(t===''||t==='-') return 0; if(t.indexOf(',')>=0) t=t.replace(/,/g,''); return parseFloat(t)||0; }
function fdate(s){ if(!s) return null; var p=String(s).split('/'); if(p.length===3){ var m=parseInt(p[0],10),d=parseInt(p[1],10),y=parseInt(p[2],10); if(y<100)y+=2000; return y+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0'); } var dt=new Date(s); return isNaN(dt)?null:dt.toISOString().slice(0,10); }

export default function ModImportar(props){
  const avisar=props.avisar||function(){};
  const [busy,setBusy]=useState(false);
  const [log,setLog]=useState('');
  async function procesar(file){
    setBusy(true); setLog('Leyendo archivo…');
    const text=await file.text();
    const lines=text.split(/\r?\n/).filter(l=>l.trim());
    const sep=lines[0].indexOf('|')>=0?'|':(lines[0].indexOf(';')>=0?';':',');
    const rows=lines.map(l=>l.split(sep).map(x=>x.trim())).filter(r=>r[0]&&(r[0].indexOf('S_')===0||/^[0-9]+$/.test(r[0])));
    const cmap={};
    rows.forEach(r=>{ const rut=String(r[4]||r[3]||'').replace(/[^0-9kK]/g,''); if(rut&&!cmap[rut]) cmap[rut]={rut:rut,nombre:r[2]||'Cliente'}; });
    const ruts=Object.keys(cmap);
    const {data:exist}=await supabase.from('customers').select('id,rut').in('rut',ruts);
    (exist||[]).forEach(c=>{ cmap[c.rut].id=c.id; });
    const nuevos=Object.keys(cmap).filter(k=>!cmap[k].id).map(k=>({rut:cmap[k].rut,nombre:cmap[k].nombre,tipo:'final'}));
    if(nuevos.length){ const {data:ins}=await supabase.from('customers').insert(nuevos).select('id,rut'); (ins||[]).forEach(c=>{ cmap[c.rut].id=c.id; }); }
    setLog('Clientes listos. Cargando OTs…');
    const ots=rows.map(r=>{
      const rut=String(r[4]||r[3]||'').replace(/[^0-9kK]/g,'');
      return {
        ext_id:r[0], customer_id:cmap[rut]?cmap[rut].id:null,
        tipo:mapTipo[String(r[8]||'').toUpperCase()]||'servicio',
        estado:String(r[14]||'').toLowerCase().indexOf('cerrada')>=0?'Cerrada':'Ingresada',
        creado_en:fdate(r[1])?fdate(r[1])+'T12:00:00':null,
        descripcion:r[39]||null, canal:'vba',
        tecnico_nombre:r[9]||null, quien_registra:r[6]||null, modelo_limpio:r[42]||r[7]||null,
        fecha_promesa:fdate(r[10]), fecha_inicio:fdate(r[11]), fecha_fin_tecnico:fdate(r[12]), fecha_entrega_cliente:fdate(r[13]),
        cantidad_unidades:parseInt(r[40],10)||1,
        kpi:{tipo_equipo:r[5],tipo_servicio:r[8],horas:parseFloat(r[15])||0,venta_mo:money(r[16]),costo_rep:money(r[17]),venta_rep:money(r[18]),costo_tras:money(r[19]),venta_tras:money(r[20]),costo_otros:money(r[21]),venta_otros:money(r[22]),costo_total:money(r[23]),venta_total:money(r[24]),margen:money(r[25]),pct_margen:r[26],ftf:r[27],dias:parseFloat(r[28])||0,reincidencia:r[29],reclamo:r[30],nota:parseInt(r[31],10)||0,nivel:r[32],usa_rep:r[33],alerta:r[34],mes:r[37],anio:r[38],repuesto:r[41],falla:r[44]}
      };
    });
    let ok=0;
    for(let i=0;i<ots.length;i+=200){
      const {error}=await supabase.from('work_orders').upsert(ots.slice(i,i+200),{onConflict:'ext_id'});
      if(!error) ok+=Math.min(200,ots.length-i);
      setLog('OTs '+Math.min(i+200,ots.length)+'/'+ots.length+'…');
    }
    setLog('✅ Historial cargado: '+ok+' OTs · '+Object.keys(cmap).length+' clientes.');
    avisar('✅ Historial KPIs importado',T.ok);
    emit();
    if(props.onOk) props.onOk();
    setBusy(false);
  }
  return (
    <div style={S.card}>
      <h2 style={S.h2}>Importar historial KPIs (CSV/TXT)</h2>
      <p style={S.sub}>Exporta la hoja de OTs de KPIs.xlsx como CSV. Crea clientes por RUT y carga todas las OTs con sus KPIs. Re-ejecutable: no duplica (clave = ID OT).</p>
      <label style={{...S.btnO(T.ok),cursor:'pointer',display:'inline-block',width:'auto'}}>📥 Seleccionar archivo
        <input type="file" accept=".csv,.txt" style={{display:'none'}} disabled={busy} onChange={e=>procesar(e.target.files[0])}/>
      </label>
      {log? <p style={{color:T.info,marginTop:10,fontWeight:700}}>{log}</p> : null}
    </div>);
}
