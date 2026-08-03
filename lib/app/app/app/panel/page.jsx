'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function Panel() {
  const [email, setEmail] = useState(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace('/');
      else setEmail(data.session.user.email);
    });
  }, []);

  async function salir() {
    await supabase.auth.signOut();
    router.replace('/');
  }

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: 30 }}>Bienvenido, <span style={{ color: '#35d0ba' }}>{email}</span></h1>
        <p style={{ color: '#8b9aa6' }}>Sesión iniciada contra TU base de datos. La consola completa llega en las próximas fases.</p>
        <button onClick={salir} style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid #31404d', background: '#1a232b', color: '#e9eef2', cursor: 'pointer' }}>Cerrar sesión</button>
      </div>
    </main>
  );
}