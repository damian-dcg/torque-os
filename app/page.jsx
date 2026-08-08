'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { T, S } from '../lib/ui';

export default function Login(){
  const [tenant,setTenant]=useState(null);
  const [email,setEmail]=useState(''); const [pass,setPass]=useState('');
  const [err,setErr]=useState(''); const [busy,setBusy]=useState(false);
  const router=useRouter();

  useEffect(()=>{ supabase.from('tenants').select('*').eq('activo',true).limit(1).then(({data})=>setTenant((data||[])[0]||null)); },[]);

  async function entrar(e){
    e.preventDefault(); setBusy(true); setErr('');
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    setBusy(false);
    if(error) setErr('Correo o contraseña incorrectos');
    else router.push('/consola');
  }

  const brand = (tenant&&tenant.color_primario)||T.brand;
  return (
    <main style={{...S.main,display:'grid',placeItems:'center',padding:16}}>
      <form onSubmit={entrar} style={{...S.card,width:'100%',maxWidth:380,padding:26}}>
        <h1 style={{...S.h1,fontSize:26,marginBottom:2}}>TORQUE<span style={{color:brand}}>·OS</span></h1>
        <p style={{...S.sub,margin:'0 0 20px'}}>{tenant?tenant.nombre:'Servicio Técnico'}</p>
        <label style={S.label}>Correo</label>
        <input style={S.input} type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="username"/>
        <label style={S.label}>Contraseña</label>
        <input style={S.input} type="password" value={pass} onChange={e=>setPass(e.target.value)} required autoComplete="current-password"/>
        {err&&<p style={{color:T.danger,fontSize:13,marginBottom:10}}>{err}</p>}
        <button style={S.btn(brand)} disabled={busy}>{busy?'Entrando…':'Ingresar'}</button>
        <p style={{...S.sub,textAlign:'center',margin:0}}>¿Cliente? Haz seguimiento de tu OT en <a href="/seguimiento" style={{color:brand}}>seguimiento</a></p>
      </form>
    </main>
  );
}
