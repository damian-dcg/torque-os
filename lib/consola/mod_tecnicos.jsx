'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S } from '../ui';

function Celda(props) {
  var col = props.col, row = props.row, v = row[col.k];
  if (col.type === 'check') return <input type="checkbox" checked={!!v} onChange={function (e) { props.onEdit(row, col.k, e.target.checked); }} />;
  return <input style={{ ...S.input, width: col.w || 110, padding: '4px 6px', fontSize: 12 }} type={col.type === 'num' ? 'number' : 'text'} value={v == null ? '' : v} onChange={function (e) { props.onEdit(row, col.k, col.type === 'num' ? Number(e.target.value) : e.target.value); }} />;
}
function Tabla(props) {
  return (
    <div style={{ ...S.card, marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>{props.titulo} ({(props.rows || []).length})</h3>
        {props.onAdd ? <button style={S.btn(T.ok)} onClick={props.onAdd}>+ Nuevo</button> : null}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{props.cols.map(function (c) { return <th key={c.k} style={S.th}>{c.label}</th>; })}<th style={S.th}></th></tr></thead>
          <tbody>
            {(props.rows || []).map(function (r) {
              return (
                <tr key={r.id}>
                  {props.cols.map(function (c) { return <td key={c.k} style={S.td}><Celda col={c} row={r} onEdit={props.onEdit} /></td>; })}
                  <td style={S.td}>{props.onDel ? <button style={{ ...S.btn(T.danger), padding: '2px 8px' }} onClick={function () { props.onDel(r); }}>🗑</button> : null}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ModTecnicos(props) {
  var avisar = props.avisar || function () {};
  var [d, setD] = useState({ rates: [], users: [], sats: [] });
  function cargar() {
    (async function () {
      var q = await Promise.all([
        supabase.from('tech_rates').select('*').order('id'),
        supabase.from('users').select('*').order('id'),
        supabase.from('companies').select('*').eq('tipo', 'sat').order('nombre')
      ]);
      setD({ rates: q[0].data || [], users: q[1].data || [], sats: q[2].data || [] });
    })();
  }
  useEffect(function () { cargar(); }, []);
  function save(tabla, patch, id) { (async function () { var r = await supabase.from(tabla).update(patch).eq('id', id); if (r.error) avisar('⛔ ' + r.error.message, T.danger); else cargar(); })(); }
  function add(tabla, fila) { (async function () { var r = await supabase.from(tabla).insert(fila); if (r.error) avisar('⛔ ' + r.error.message, T.danger); else cargar(); })(); }
  function del(tabla, id) { (async function () { var r = await supabase.from(tabla).delete().eq('id', id); if (r.error) avisar('⛔ ' + r.error.message, T.danger); else cargar(); })(); }

  return (
    <div>
      <Tabla titulo="1 · Técnicos internos (costos y markup)" rows={d.rates}
        cols={[{ k: 'technician', label: 'Técnico', w: 170 }, { k: 'costo_sueldo_mensual', label: 'Sueldo', type: 'num' }, { k: 'horas_mes', label: 'Horas/mes', type: 'num', w: 80 }, { k: 'costo_x_hora', label: 'Costo×h', type: 'num' }, { k: 'venta_x_hora', label: 'Venta×h', type: 'num' }, { k: 'markup_pct', label: 'Markup %', type: 'num', w: 80 }]}
        onEdit={function (r, k, v) { save('tech_rates', { [k]: v }, r.id); }}
        onAdd={function () { add('tech_rates', { technician: 'NUEVO', costo_sueldo_mensual: 0, horas_mes: 168, costo_x_hora: 0, venta_x_hora: 0, markup_pct: 100 }); }}
        onDel={function (r) { del('tech_rates', r.id); }} />
      <Tabla titulo="2 · Usuarios de plataforma (roles)" rows={d.users}
        cols={[{ k: 'nombre', label: 'Nombre', w: 170 }, { k: 'email', label: 'Email', w: 200 }, { k: 'rol', label: 'Rol', w: 120 }]}
        onEdit={function (r, k, v) { save('users', { [k]: v }, r.id); }} />
      <Tabla titulo="3 · SSTT autorizados (red)" rows={d.sats}
        cols={[{ k: 'nombre', label: 'SSTT', w: 200 }, { k: 'comuna', label: 'Comuna', w: 110 }, { k: 'address', label: 'Dirección', w: 220 }, { k: 'telefono', label: 'Teléfono', w: 110 }, { k: 'especialidad', label: 'Esp.', w: 70 }, { k: 'trayecto', label: 'Trayecto', w: 80 }, { k: 'cargo_fijo_mensual', label: 'Cargo fijo', type: 'num' }, { k: 'cuenta_bancaria', label: 'Cuenta bancaria', w: 160 }, { k: 'activo', label: 'Activo', type: 'check' }]}
        onEdit={function (r, k, v) { save('companies', { [k]: v }, r.id); }}
        onAdd={function () { add('companies', { tenant_id: 'dcg', tipo: 'sat', nombre: 'NUEVO SSTT', especialidad: 'ambos', trayecto: 'SI', cargo_fijo_mensual: 0, activo: true, estado: 'activo' }); }}
        onDel={function (r) { del('companies', r.id); }} />
    </div>
  );
}
