'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { T, S, fmtCLP } from '../../lib/ui';

export default function Sstt(){
  const [me,setMe]=useState(null); const [liqs,setLiqs]=useState([]); const [tenant,setTenant]=useState(null);
  const router=useRouter();
  useEffect(()=>{ supabase.auth.getSession().then(async({data})=>{
    if(!data.session){ router.replace('/'); return; }
    const {data:m}=await supabase.from('users').select('*').eq('auth_uid',data.session.user.id).single(); setMe(m);
    const [l,t]=await Promise.all([
      supabase.from('liquidaciones').select('*').eq('company_id',m.company_id).order('id',{ascending:false}),
      supabase.from('tenants').select('*').eq('activo',true).limit(1)]);
    setLiqs(l.data||[]); setTenant((t.data||[])[0]||null);
  }); },[]);
  async function recargar(){ const {data}=await supabase.from('liquidaciones').select('*').eq('company_id',me.company_id).order('id',{ascending:false}); setLiqs(data||[]); }
  async function subirFactura(l,file){
    const path=`factura-${l.id}-${Date.now()}-${file.name}`;
    const {error}=await supabase.storage.from('facturas').upload(path,file);
    if(error){ alert(error.message); return; }
    const url=supabase.storage.from('facturas').getPublicUrl(path).data.publicUrl;
    await supabase.from('liquidaciones').update({factura_url:url,estado:'facturada'}).eq('id',l.id);
    recargar();
  }
  if(!me) return null;
  return (
    <main style={S.main}>
      <header style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:'14px 18px',display:'flex',gap:10,alignItems:'center'}}>
        <h1 style={S.h1}>Portal <span style={{color:(tenant&&tenant.color_primario)||T.brand}}>SSTT</span></h1>
        <span style={S.sub}>{me.nombre}</span>
        <button onClick={async()=>{await supabase.auth.signOut(); router.replace('/');}} style={{...S.btnO(T.danger),width:'auto',marginLeft:'auto',marginBottom:0,padding:'8px 14px'}}>Salir</button>
      </header>
      <div style={S.wrap}>
        <h2 style={S.h2}>Mis liquidaciones</h2>
        {liqs.map(l=>(
          <div key={l.id} style={S.card}>
            <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
              <b style={{color:T.brand,fontSize:16}}>Período {l.periodo}</b>
              <span style={S.pill(l.estado==='pagada'?T.ok:l.estado==='facturada'?T.info:T.warn)}>{l.estado}</span>
            </div>
            <p style={{...S.sub,margin:'8px 0'}}>Cargo fijo: {fmtCLP(l.cargo_fijo)} · Producción OTs: {fmtCLP(l.total_ot)} · Otros conceptos: {fmtCLP((l.otros||[]).reduce((s,x)=>s+Number(x.monto)||0,0))}</p>
            <p style={{color:T.ok,fontWeight:800,fontSize:18}}>Total a facturar: {fmtCLP(l.total)}</p>
            {(l.otros||[]).map((x,i)=><p key={i} style={{...S.sub,margin:'2px 0'}}>+ {x.concepto}: {fmtCLP(x.monto)}</p>)}
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:10}}>
              {l.factura_url? <a style={{...S.btnO(T.ok),width:'auto',marginBottom:0,textDecoration:'none'}} href={l.factura_url} target="_blank"> Ver factura cargada</a>
              : <label style={{...S.btnO(T.info),width:'auto',marginBottom:0,cursor:'pointer'}}>📤 Cargar factura (PDF/JPG)
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{display:'none'}} onChange={e=>subirFactura(l,e.target.files[0])}/></label>}
            </div>
          </div>))}
        {liqs.length===0&&<p style={S.sub}>Aún no tienes liquidaciones emitidas.</p>}
      </div>
    </main>);
}
