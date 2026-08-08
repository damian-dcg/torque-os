'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S } from '../ui';

export default function ModConfig({tenant,avisar,onTenant}){
  const [ten,setTen]=useState({nombre:'',color_primario:'#FF6B2C',color_secundario:'#2CD4BF',logo_url:''});
  const [settings,setSettings]=useState([]);
  const [edit,setEdit]=useState({});
  const [users,setUsers]=useState([]);
  useEffect(()=>{ if(tenant) setTen({nombre:tenant.nombre||'',color_primario:tenant.color_primario||'#FF6B2C',color_secundario:tenant.color_secundario||'#2CD4BF',logo_url:tenant.logo_url||''}); },[tenant]);
  useEffect(()=>{(async()=>{
    const [s,u]=await Promise.all([supabase.from('settings').select('*').eq('tenant_id','dcg'),supabase.from('users').select('*')]);
    setSettings(s.data||[]); setUsers(u.data||[]);
    const e={}; (s.data||[]).forEach(x=>e[x.clave]=JSON.stringify(x.valor,null,1)); setEdit(e);
  })();},[]);
  async function guardarMarca(e){
    e.preventDefault();
    const {error}=await supabase.from('tenants').update({nombre:ten.nombre,color_primario:ten.color_primario,color_secundario:ten.color_secundario,logo_url:ten.logo_url||null}).eq('id','dcg');
    if(error) avisar('⛔ '+error.message,T.danger); else { avisar('✅ Marca actualizada',T.ok); onTenant&&onTenant({...tenant,...ten}); }
  }
  async function guardarSetting(clave){
    try{ const valor=JSON.parse(edit[clave]);
      const {error}=await supabase.from('settings').update({valor}).eq('tenant_id','dcg').eq('clave',clave);
      if(error) avisar('⛔ '+error.message,T.danger); else avisar('✅ '+clave+' guardado',T.ok);
    }catch(e){ avisar('⛔ JSON inválido en '+clave,T.danger); }
  }
  async function cambiarRol(u,rol){
    const {error}=await supabase.from('users').update({rol}).eq('id',u.id);
    if(error) avisar('⛔ '+error.message,T.danger); else avisar('✅ Rol de '+u.nombre+' → '+rol,T.ok);
  }
  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))',gap:14}}>
      <div style={S.card}>
        <h2 style={S.h2}>Marca (white-label)</h2>
        <form onSubmit={guardarMarca}>
          <label style={S.label}>Nombre de la empresa</label><input style={S.input} value={ten.nombre} onChange={e=>setTen({...ten,nombre:e.target.value})}/>
          <label style={S.label}>Color primario</label><input style={S.input} type="color" value={ten.color_primario} onChange={e=>setTen({...ten,color_primario:e.target.value})}/>
          <label style={S.label}>Color secundario</label><input style={S.input} type="color" value={ten.color_secundario} onChange={e=>setTen({...ten,color_secundario:e.target.value})}/>
          <label style={S.label}>URL de logo (opcional)</label><input style={S.input} value={ten.logo_url} onChange={e=>setTen({...ten,logo_url:e.target.value})}/>
          <button style={S.btn(ten.color_primario)}>Guardar marca</button>
        </form>
      </div>
      <div style={S.card}>
        <h2 style={S.h2}>Parámetros del negocio (JSON)</h2>
        {settings.map(s=>(
          <div key={s.clave} style={{marginBottom:12}}>
            <label style={S.label}>{s.clave}</label>
            <textarea style={{...S.input,minHeight:64,fontFamily:'monospace',fontSize:12}} value={edit[s.clave]||''} onChange={e=>setEdit({...edit,[s.clave]:e.target.value})}/>
            <button style={S.btnO(T.info)} onClick={()=>guardarSetting(s.clave)}>Guardar {s.clave}</button>
          </div>))}
      </div>
      <div style={S.card}>
        <h2 style={S.h2}>Usuarios y roles</h2>
        {users.map(u=>(
          <div key={u.id} style={{display:'flex',gap:8,alignItems:'center',marginBottom:8}}>
            <span style={{flex:1,color:T.text,fontSize:14}}>{u.nombre}</span>
            <select style={{...S.input,width:150,marginBottom:0}} value={u.rol} onChange={e=>cambiarRol(u,e.target.value)}>
              <option value="admin">admin</option><option value="agente">agente</option><option value="sat_admin">sat_admin</option><option value="tecnico_sat">tecnico_sat</option>
            </select>
          </div>))}
      </div>
    </div>);
}
