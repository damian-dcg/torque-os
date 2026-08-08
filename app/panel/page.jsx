'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
export default function PanelRedirect(){
  const r=useRouter();
  useEffect(()=>{ r.replace('/consola'); },[]);
  return null;
}
