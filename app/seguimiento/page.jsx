'use client';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';

const inp = { width:'100%', padding:10, borderRadius:7, border:'1px solid #d9d4c9', background:'#fff', fontSize:13, boxSizing:'border-box', color:'#191c1f' };
const lab = { fontFamily:'monospace', fontSize:10, letterSpacing:1, color:'#7a766c', display:'block', marginBottom:4, textTransform:'uppercase' };
const COLOR = { recibida:'#2f6fc0', diagnostico:'#2f6fc0', esperando_repuestos:'#c79420', en_reparacion:'#ff6b2c', pruebas:'#ff6b2c', lista:'#2f9e52', entregada:'#2f9e52', cerrada:'#2f9e52', anulada:'#8a8577' };

export default function Seguimiento(){
  const [f,setF]=useState({num:'',email:''});
  const [ot,setOt]=useState(null);
  const [error,setError]=useState('');
  const [com,setCom]=useState('');
  const [insOk,setInsOk]=useState('');
  const [cargando,setCargando]=useState(false);

  async function buscar(e){
    e.preventDefault(); setError(''); setOt(null); setCargando(true);
    const {data}=await supabase.rpc('consultar_ot_publica',{p_ot_number:Number(f.num),p_email:f.email});
    setCargando(false);
    if(data&&data.ok) setOt(data); else setError(data?data.error:'Error');
  }
  async function insistir(e){
    e.preventDefault(); setInsOk('');
    const {error:err}=await supabase.rpc('registrar_insistencia',{p_ot_number:Number(f.num),p_email:f.email,p_comentario:com||'Solicito actualización del estado de mi OT'});
    if(err) setError(err.message);
    else { setInsOk('Insistencia registrada. El equipo de servicio la verá en su consola.'); setCom(''); const {data}=await supabase.rpc('consultar_ot_publica',{p_ot_number:Number(f.num),p_email:f.email}); if(data&&data.ok) setOt(data); }
  }

  return (
    <main style={{minHeight:'100vh',background:'#f6f4ef',color:'#191c1f',fontFamily:'system-ui,sans-serif',padding:'30px 16px'}}>
      <div style={{maxWidth:560,margin:'0 auto'}}>
        <h1 style={{fontSize:26,fontWeight:800,margin:'0 0 4px'}}>Seguimiento de tu <span style={{color:'#ff6b2c'}}>OT</span></h1>
        <p style={{color:'#7a766c',fontSize:12,margin:'0 0 18px'}}>DCG · Ingresa tu número de orden y el email con que registraste la solicitud.</p>
        <form onSubmit={buscar} style={{background:'#fff',border:'1px solid #e2ddd2',borderRadius:10,padding:20,marginBottom:14}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div><label style={lab}>N° de OT *</label><input style={inp} required type="number" placeholder="5007" value={f.num} onChange={e=>setF({...f,num:e.target.value})} /></div>
            <div><label style={lab}>Email *</label><input style={inp} required type="email" value={f.email} onChange={e=>setF({...f,email:e.target.value})} /></div>
          </div>
          <button type="submit" disabled={cargando} style={{marginTop:12,width:'100%',padding:12,borderRadius:8,border:0,background:cargando?'#c9c3b6':'#14161a',color:'#fff',fontWeight:700,cursor:cargando?'wait':'pointer'}}>{cargando?'Buscando…':'Consultar estado'}</button>
        </form>
        {error && <p style={{color:'#c0392b',fontSize:13,background:'#fdecea',border:'1px solid #e5b6b1',borderRadius:8,padding:10}}>{error}</p>}
        {ot && (
          <div style={{background:'#fff',border:'1px solid #e2ddd2',borderRadius:10,padding:20}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontFamily:'monospace',fontSize:20}}>OT-{f.num}</span>
              <span style={{fontWeight:700,color:COLOR[ot.estado]||'#8a8577',textTransform:'uppercase',fontSize:13}}>{ot.estado.replace('_',' ')}</span>
            </div>
            <p style={{fontSize:12,color:'#7a766c',margin:'8px 0 0'}}>Tipo: {ot.tipo.replace('_',' ')} · Ingresada: {String(ot.creada).slice(0,10)} · Insistencias previas: {ot.insistencias}</p>
            <form onSubmit={insistir} style={{marginTop:14,borderTop:'1px solid #eee8dc',paddingTop:14}}>
              <label style={lab}>¿Necesitas una respuesta? Genera una insistencia</label>
              <textarea style={inp} rows="2" placeholder="Ej: llevo 5 días sin novedades, por favor contactar…" value={com} onChange={e=>setCom(e.target.value)} />
              <button type="submit" style={{marginTop:8,width:'100%',padding:11,borderRadius:8,border:0,background:'#ff6b2c',color:'#14100c',fontWeight:700,cursor:'pointer'}}>Generar insistencia</button>
              {insOk && <p style={{color:'#2f9e52',fontSize:12,marginTop:8}}>{insOk}</p>}
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
