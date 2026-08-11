'use client';
import { supabase } from './supabase';
const listeners=new Set();
export function onChange(fn){ listeners.add(fn); return ()=>listeners.delete(fn); }
export function emit(){ listeners.forEach(fn=>fn()); }
export async function list(tabla,order='id'){ const {data}=await supabase.from(tabla).select('*').order(order,{ascending:false}).limit(1000); return data||[]; }
export async function save(tabla,row,id){ const {error}= id? await supabase.from(tabla).update(row).eq('id',id) : await supabase.from(tabla).insert([row]); if(!error) emit(); return error; }
export async function remove(tabla,id){ const {error}=await supabase.from(tabla).delete().eq('id',id); if(!error) emit(); return error; }
