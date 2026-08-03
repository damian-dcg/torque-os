'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function entrar(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) setError('Correo o contraseña incorrectos');
    else router.push('/panel');
    setLoading(false);
  }

  const caja = { width: '100%', padding: 12, marginBottom: 12, borderRadius: 8, border: '1px solid #31404d', background: '#1a232b', color: '#e9eef2', fontSize: 14 };

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <form onSubmit={entrar} style={{ width: 340, background: '#141b21', border: '1px solid #26323d', borderRadius: 12, padding: 28 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 30, letterSpacing: 1 }}>TORQUE<span style={{ color: '#ff6b2c' }}>·OS</span></h1>
        <p style={{ margin: '0 0 22px', color: '#8b9aa6', fontSize: 12 }}>DCG · Servicio técnico bicis & fitness</p>
        <input style={caja} type="email" placeholder="Correo" value={email} onChange={e => setEmail(e.target.value)} required />
        <input style={caja} type="password" placeholder="Contraseña" value={pass} onChange={e => setPass(e.target.value)} required />
        {error && <p style={{ color: '#ff5d5d', fontSize: 12 }}>{error}</p>}
        <button disabled={loading} style={{ width: '100%', padding: 12, borderRadius: 8, border: 0, background: '#ff6b2c', color: '#14100c', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          {loading ? 'Entrando…' : 'Ingresar'}
        </button>
      </form>
    </main>
  );
}