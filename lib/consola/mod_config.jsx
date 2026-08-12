'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S } from '../ui';
export default function ModConfig(props){
  var tenant=props.tenant; var avisar=props.avisar||function(){}; var onTenant=props.onTenant||function(){};
  var s1=useState({}),f=s1[0],setF=s1[1];
  var s2=useState([]),tenants=s2[0],setTenants=s2[1];
  var s3=useState({nombre:'',slug:'',max_ot:10,max_tec:2}),nt=s3[0],setNt=s3[1];
  async function cargarT(){ var r=await supabase.from('tenants').select('*').order('id'); setTenants(r.data||[]); }
  useEffect(function(){ if(tenant) setF({nombre:tenant.nombre||'',color_primario:tenant.color_primario||'#3EC6B2',color_secundario:tenant.color_secundario||'#1c1c1c',logo_url:tenant.logo_url||''}); cargarT(); },[tenant]);
  async function guardar(){ var e=await supabase.from('tenants').update({nombre:f.nombre,color_primario:f.color_primario,color_secundario:f.color_secundario,logo_url:f.logo_url}).eq('id',tenant.id); if(e.error) avisar('⛗ '+e.error.message,T.danger); else { avisar('✅ Marca guardada',T.ok); onTenant(Object.assign({},tenant,f)); } }
  async function crearTenant(){ if(!nt.nombre){ avisar('⛗ Nombre obligatorio',T.danger); return; } var e=await supabase.from('tenants').insert([{nombre:nt.nombre,slug:nt.slug||nt.nombre.toLowerCase().replace(/\s+/g,'-'),color_primario:'#3EC6B2',color_secundario:'#1c1c1c',activo:true,status:'trial',max_ot:Number(nt.max_ot)||10,max_tec:Number(nt.max_tec)||2,sap_enabled:false}]); if(e.error) avisar('⛗ '+e.error.message,T.danger); else { avisar('✅ Tenant trial creado. Crea su usuario admin en Supabase→Authentication y vincula el tenant_id.',T.ok); cargarT(); } }
  async function cambiar(t){ await supabase.from('tenants').update({status:t.status==='trial'?'active':'trial'}).eq('id',t.id); cargarT(); }
  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(340px,1fr))',gap:14}}>
      <div style={S.card}>
        <h2 style={S.h2}>Marca del Tenant (white-label)</h2>
        <label style={S.label}>Nombre</label><input style={S.input} value={f.nombre} onChange={function(e){ setF(Object.assign({},f,{nombre:e.target.value})); }}/>
        <label style={S.label}>Color primario</label><input style={S.input} value={f.color_primario} onChange={function(e){ setF(Object.assign({},f,{color_primario:e.target.value})); }}/>
        <label style={S.label}>Color secundario</label><input style={S.input} value={f.color_secundario} onChange={function(e){ setF(Object.assign({},f,{color_secundario:e.target.value})); }}/>
        <label style={S.label}>URL logo</label><input style={S.input} value={f.logo_url} onChange={function(e){ setF(Object.assign({},f,{logo_url:e.target.value})); }}/>
        <button style={S.btn(T.brand)} onClick={guardar}>Guardar marca</button>
      </div>
      <div style={S.card}>
        <h2 style={S.h2}>Tenants (SaaS multi-empresa)</h2>
        {tenants.map(function(t){ return <div key={t.id} style={{border:'1px solid '+T.border,borderRadius:10,padding:10,marginBottom:8,background:T.surface2}}>
          <div style={{display:'flex',justifyContent:'space-between',gap:8}}>
            <b style={{color:T.brand}}>{t.nombre}</b>
            <span style={S.pill(t.status==='active'?T.ok:T.warn)}>{t.status}</span>
          </div>
          <p style={{...S.sub,margin:'4px 0'}}>/{t.slug} · máx {t.max_ot} OTs · {t.max_tec} técnicos {t.sap_enabled?'· SAP':''}</p>
          <button style={{...S.btnO(t.status==='trial'?T.ok:T.warn),width:'auto',marginBottom:0}} onClick={function(){ cambiar(t); }}>{t.status==='trial'?'🔓 Activar (pagó)':'⏸ Pasar a trial'}</button>
        </div>; })}
        <h3 style={{...S.h2,marginTop:10}}>Nuevo Tenant (trial)</h3>
        <input style={S.input} placeholder="Nombre empresa" value={nt.nombre} onChange={function(e){ setNt(Object.assign({},nt,{nombre:e.target.value})); }}/>
        <input style={S.input} placeholder="slug (url)" value={nt.slug} onChange={function(e){ setNt(Object.assign({},nt,{slug:e.target.value})); }}/>
        <div style={{display:'flex',gap:8}}>
          <input style={S.input} type="number" placeholder="máx OTs" value={nt.max_ot} onChange={function(e){ setNt(Object.assign({},nt,{max_ot:e.target.value})); }}/>
          <input style={S.input} type="number" placeholder="máx técnicos" value={nt.max_tec} onChange={function(e){ setNt(Object.assign({},nt,{max_tec:e.target.value})); }}/>
        </div>
        <button style={S.btn(T.ok)} onClick={crearTenant}>Crear trial</button>
        <p style={S.sub}>El trial limita OTs/técnicos y bloquea SAP. Al pagar, "Activar" desbloquea. El portal /solicitud rechaza OTs sobre el límite trial.</p>
      </div>
    </div>);
}
