'use client';
import { useState } from 'react';
import { supabase } from '../supabase';
import { T, S } from '../ui';
import { emit } from '../data';

const mapTipo={'ARMADO':'armado_unidad','GARANTIA':'repuesto_garantia','EVALUACION':'evaluacion','POST VENTA':'servicio','DEVOLUCION':'devolucion_dinero','RETIRO':'retiro','RECLAMO':'reclamo','MANTENCION':'mantencion'};
function money(s){ if(s==null) return 0; let t=String(s).replace(/[^0-9.,-]/g,''); if(t===''||t==='-') return 0; if(t.includes(',')) t=t.replace(/,/g,''); return parseFloat(t)||0; }
function fdate(s){ if(!s) return null; const p=String(s).split('/'); if(p.length===3){ let[m,d,y]=p.map(x=>parseInt(x,10)); if(y<100)y+=2000; return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`; } const dt=new Date(s); return isNaN(dt)?null:dt.toISOString().slice(0,10); }

export default function ModImportar({avisar}){
  const [busy,setBusy]=useState(false); const [log,setLog]=useState('');
  async function procesar(file){
    setBusy(true); setLog('Leyendo…');
    const text=await file.text();
    const lines=text.split(/\r?\n/).filter(l=>l.trim());
    const sep=lines[0].includes('|')?'|':lines[0].includes(';')?';':',';
    const rows=lines.map(l=>l.split(sep).map(x=>x.trim())).filter(r=>r[0]&&r[0].startsWith('S_')||/^\d+$/.test(r[0]||''));
    // clientes únicos
    const cmap={}; rows.forEach(r=>{ const rut=(r[4]||r[3]||'').replace(/[^0-9kK]/g,''); if(rut&&!cmap[rut]) cmap[rut]={rut,nombre:r[2]||'Cliente'}; });
    const ruts=Object.keys(cmap);
    const {data:exist}=await supabase.from('customers').select('id,rut').in('rut',ruts);
    (exist||[]).forEach(c=>cmap[c.rut].id=c.id);
    const nuevos=Object.values(cmap).filter(c=>!c.id).map(c=>({rut:c.rut,nombre:c.nombre,tipo:'final'}));
    if(nuevos.length){ const {data:ins}=await supabase.from('customers').insert(nuevos).select('id,rut'); (ins||[]).forEach(c=>cmap[c.rut].id=c.id); }
    setLog(`Clientes: ${Object.keys(cmap).length} (${nuevos.length} nuevos). Cargando OTs…`);
    const ots=rows.map(r=>({
      ext_id:r[0], customer_id:cmap[(r[4]||r[3]||'').replace(/[^0-9kK]/g,'')]?.id||null,
      tipo:mapTipo[(r[8]||'').toUpperCase()]||'servicio', estado:(r[14]||'').toLowerCase().includes('cerrada')?'Cerrada':'Ingresada',
      creado_en:fdate(r[1])?fdate(r[1])+'T12:00:00':null, descripcion:r[39]||null, direccion:null, canal:'vba',
      tecnico_nombre:r[9]||null, quien_registra:r[6]||null, modelo_limpio:r[42]||r[7]||null,
      fecha_promesa:fdate(r[10]), fecha_inicio:fdate(r[11]), fecha_fin_tecnico:fdate(r[12]), fecha_entrega_cliente:fdate(r[13]),
      cantidad_unidades:parseInt(r[40])||1, checklist_code:null,
      kpi:{tipo_equipo:r[5],tipo_servicio:r[8],horas:parseFloat(r[15])||0,venta_mo:money(r[16]),costo_rep:money(r[17]),venta_rep:money(r[18]),costo_tras:money(r[19]),venta_tras:money(r[20]),costo_otros:money(r[21]),venta_otros:money(r[22]),costo_total:money(r[23]),venta_total:money(r[24]),margen:money(r[25]),pct_margen:r[26],ftf:r[27],dias:parseFloat(r[28])||0,reincidencia:r[29],reclamo:r[30],nota:parseInt(r[31])||0,nivel:r[32],usa_rep:r[33],alerta:r[34],mes:r[37],anio:r[38],repuesto:r[41],falla:r[44]}
    }));
    let ok=0; for(let i=0;i<ots.length;i+=200){ const {error}=await supabase.from('work_orders').upsert(ots.slice(i,i+200),{onConflict:'ext_id'}); if(!error) ok+=Math.min(200,ots.length-i); setLog(`OTs ${Math.min(i+200,ots.length)}/${ots.length}…`); }
    setLog(`✅ Historial cargado: ${ok} OTs. Clientes: ${Object.keys(cmap).length}.`);
    avisar('✅ Historial KPIs importado',T.ok); setBusy(false);
  }
  return (
    <div style={S.card}>
      <h2 style={S.h2}>Importar historial KPIs (Excel → CSV)</h2>
      <p style={S.sub}>Exporta la hoja de OTs de <b>KPIs.xlsx</b> como CSV (o pega el .txt con columnas separadas por | ; ,). Crea clientes por RUT y carga todas las OTs con sus KPIs (margen, SLA, first-time-fix, reincidencia). Re-ejecutable: no duplica (clave = ID OT).</p>
      <label style={{...S.btnO(T.ok),cursor:'pointer',display:'inline-block'}}>📥 Seleccionar archivo CSV/TXT
        <input type="file" accept=".csv,.txt" style={{display:'none'}} disabled={busy} onChange={e=>procesar(e.target.files[0])}/></label>
      {log&&<p style={{color:T.info,marginTop:10,fontWeight:700}}>{log}</p>}
    </div>);
}
