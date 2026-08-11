'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S } from '../ui';
import TablaPro from './TablaPro';
export default function ModTecnicos(props){
  var avisar=props.avisar||function(){};
  var s1=useState([]),users=s1[0],setUsers=s1[1]; var s2=useState([]),sats=s2[0],setSats=s2[1];
  async function cargar(){ var r=await Promise.all([supabase.from('users').select('*').order('id'),supabase.from('companies').select('*').eq('tipo','sat').order('id')]); setUsers(r[0].data||[]); setSats(r[1].data||[]); }
  useEffect(function(){ cargar(); },[]);
  return (
    <div>
      <TablaPro titulo="Técnicos internos (terreno)" rows={users}
        campos={[['nombre','Nombre'],['email','Correo'],['rol','Rol'],['especialidad','Especialidad'],['telefono','Teléfono']]}
        onEdit={function(r,k,v){ supabase.from('users').update({[k]:v}).eq('id',r.id).then(function(){ cargar(); }); }}
        onAdd={function(f){ supabase.from('users').insert([{nombre:f.nombre,email:f.email,rol:f.rol||'tecnico_sat',especialidad:f.especialidad,telefono:f.telefono}]).then(function(e){ if(e.error) avisar('⛔ '+e.error.message,T.danger); else { avisar('✅ Técnico registrado. Crea su acceso en Supabase→Authentication y vincula el UID.',T.ok); cargar(); } }); }}
        addLabel="+ Técnico"/>
      <TablaPro titulo="Servicios Técnicos Autorizados (externos)" rows={sats}
        campos={[['nombre','Empresa'],['rut','RUT'],['especialidad','Especialidad'],['trayecto','Trayecto'],['cargo_fijo_mensual','Cargo fijo','num'],['contacto','Contacto'],['telefono','Teléfono']]}
        onEdit={function(r,k,v){ supabase.from('companies').update({[k]:v}).eq('id',r.id).then(function(){ cargar(); }); }}
        onAdd={function(f){ supabase.from('companies').insert([{nombre:f.nombre,rut:f.rut,tipo:'sat',especialidad:f.especialidad,trayecto:f.trayecto||'CONSULTAR',cargo_fijo_mensual:Number(f.cargo_fijo_mensual)||0,contacto:f.contacto,telefono:f.telefono,estado:'autorizado',activo:true}]).then(function(e){ if(e.error) avisar('⛔ '+e.error.message,T.danger); else cargar(); }); }}
        onDel={function(r){ if(window.confirm('¿Eliminar '+r.nombre+'?')) supabase.from('companies').delete().eq('id',r.id).then(function(){ cargar(); }); }}
        addLabel="+ SAT"/>
      <div style={S.card}><p style={S.sub}>Para habilitar el ingreso de un técnico interno a /tecnico: crea su usuario en Supabase→Authentication (correo+contraseña) y vincula su UID en la tabla users (auth_uid). Sus datos operativos se gestionan aquí.</p></div>
    </div>);
}
