'use client';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';

const TEAL='#3ec6b2'; const NEGRO='#1c1c1c'; const FONDO='#f7f9fa';
const inp={width:'100%',padding:'14px 22px',borderRadius:999,border:'1px solid #c9d2d8',background:'#fff',fontSize:15,marginBottom:12,boxSizing:'border-box',color:'#222'};
const estColor=e=>({'Ingresada':'#3d9df0','Asignada':'#3d9df0','Aceptada':'#2cd4bf','Rechazada':'#f0564a','En Ruta':'#ff6b2c','Llegada':'#2cd4bf','Trabajando':'#ffb020','Esperando Repuesto':'#f0564a','Finalizada':'#2fd47e','Revisión QA':'#9d7bff','Cerrada':'#2fd47e','Anulada':'#8fa3bf'}[e]||'#8fa3bf');

export default function Seguimiento(){
  const [num,setNum]=useState(''); const [tel,setTel]=useState('');
  const [r,setR]=useState(null); const [err,setErr]=useState('');
  const [msg,setMsg]=useState(''); const [enviado,setEnviado]=useState(false);

  async function buscar(e){ e.preventDefault(); setErr(''); setR(null);
    const {data,error}=await supabase.rpc('portal_consulta',{p_num:Number(num),p_tel:tel});
    if(error) setErr(error.message); else if(!data.ok) setErr(data.error); else setR(data);
  }
  async function insistir(e){ e.preventDefault(); if(!msg.trim()) return;
    const {data}=await supabase.rpc('portal_insistencia',{p_num:Number(num),p_msg:msg});
    if(data&&data.ok){ setEnviado(true); setMsg(''); }
  }

  return (
    <main style={{minHeight:'100vh',background:FONDO,fontFamily:"system-ui,'Segoe UI',Arial,sans-serif"}}>
      <header style={{background:NEGRO,padding:'22px 40px',display:'flex',alignItems:'center',gap:14}}>
        <div style={{color:TEAL,fontWeight:900,fontSize:26,letterSpacing:2}}>BIANCHI</div>
        <div style={{color:'#fff',fontSize:13,opacity:.8}}>Seguimiento de OT</div>
        <a href="/solicitud" style={{marginLeft:'auto',color:'#fff',fontSize:13,textDecoration:'none',border:'1px solid '+TEAL,borderRadius:999,padding:'8px 18px'}}>Nueva solicitud</a>
      </header>
      <div style={{maxWidth:640,margin:'0 auto',padding:'40px 18px'}}>
        <h1 style={{textAlign:'center',fontSize:28,color:NEGRO,margin:'0 0 20px'}}>¿Cómo va mi orden?</h1>
        <form onSubmit={buscar} style={{background:'#fff',borderRadius:24,padding:26,boxShadow:'0 6px 24px rgba(0,0,0,.06)'}}>
          <input style={inp} type="number" required placeholder="Número de OT (ej: 5017)" value={num} onChange={e=>setNum(e.target.value)}/>
          <input style={inp} required placeholder="Teléfono con el que solicitaste" value={tel} onChange={e=>setTel(e.target.value)}/>
          <button style={{background:TEAL,color:'#fff',borderRadius:999,padding:'13px 26px',border:0,fontWeight:800,fontSize:15,cursor:'pointer'}}>Consultar</button>
        </form>
        {err&&<p style={{color:'#d33',marginTop:14}}>{err}</p>}
        {r&&(
          <div style={{background:'#fff',borderRadius:24,padding:26,marginTop:18,boxShadow:'0 6px 24px rgba(0,0,0,.06)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <b style={{fontSize:18,color:NEGRO}}>OT-{r.ot.numero}</b>
              <span style={{background:estColor(r.ot.estado)+'22',color:estColor(r.ot.estado),borderRadius:999,padding:'6px 14px',fontWeight:800,fontSize:12}}>{r.ot.estado}</span>
            </div>
            <p style={{color:'#5a6a72',fontSize:13,margin:'6px 0 14px'}}>{r.ot.tipo} · ingresada {new Date(r.ot.creada).toLocaleDateString('es-CL')}</p>
            <h3 style={{fontSize:14,color:NEGRO}}>Historial</h3>
            {r.eventos.map((ev,i)=><p key={i} style={{color:'#444',fontSize:13,margin:'4px 0'}}>• {new Date(ev.fecha).toLocaleString('es-CL')} — {ev.evento}</p>)}
            {r.eventos.length===0&&<p style={{color:'#5a6a72',fontSize:13}}>Sin movimientos aún.</p>}
            <h3 style={{fontSize:14,color:NEGRO,marginTop:16}}>¿Necesitas algo más? Escríbenos (insistencia)</h3>
            <form onSubmit={insistir}>
              <textarea style={{...inp,borderRadius:18,minHeight:80}} placeholder="Ej: necesito reagendar la visita…" value={msg} onChange={e=>setMsg(e.target.value)}/>
              <button style={{background:NEGRO,color:'#fff',borderRadius:999,padding:'11px 22px',border:0,fontWeight:700,fontSize:14,cursor:'pointer'}}>{enviado?'✅ Enviado al agente':'Enviar'}</button>
            </form>
          </div>)}
      </div>
    </main>);
}
