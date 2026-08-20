'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S, fmtFecha } from '../ui';

function NuevoCliente(props) {
  var avisar = props.avisar || function () {};
  var onOk = props.onOk || function () {};
  var [f, setF] = useState({ nombre: '', rut: '', tipo: 'final', telefono: '', whatsapp: '', email: '', region_id: '', comuna: '', direccion: '' });
  var [regs, setRegs] = useState([]); var [coms, setComs] = useState([]);
  useEffect(function () { (async function () {
    var r = await Promise.all([supabase.from('regions').select('*').order('id'), supabase.from('comunas').select('*').order('nombre')]);
    setRegs(r[0].data || []); setComs(r[1].data || []);
  })(); }, []);
  var comunasDe = coms.filter(function (c) { return c.region_id === Number(f.region_id); });
  async function crear(e) {
    e.preventDefault();
    if (!f.nombre) { avisar('⛔ Nombre obligatorio', T.danger); return; }
    var ci = await supabase.from('customers').insert([{ tenant_id: 'dcg', nombre: f.nombre, rut: f.rut || null, tipo: f.tipo, telefono: f.telefono || null, whatsapp: f.whatsapp || null, email: f.email || null, region_id: f.region_id ? Number(f.region_id) : null, comuna: f.comuna || null, direccion: f.direccion || null }]).select();
    if (ci.error) avisar('⛔ ' + ci.error.message, T.danger); else { avisar('✅ Cliente creado', T.ok); onOk(); setF({ nombre: '', rut: '', tipo: 'final', telefono: '', whatsapp: '', email: '', region_id: '', comuna: '', direccion: '' }); }
  }
  return (
    <form onSubmit={crear} style={S.card}>
      <h2 style={S.h2}>+ Nuevo cliente</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <input style={S.input} placeholder="Nombre / razón social *" value={f.nombre} onChange={function (e) { setF(Object.assign({}, f, { nombre: e.target.value })); }} />
        <input style={S.input} placeholder="RUT" value={f.rut} onChange={function (e) { setF(Object.assign({}, f, { rut: e.target.value })); }} />
        <select style={S.input} value={f.tipo} onChange={function (e) { setF(Object.assign({}, f, { tipo: e.target.value })); }}>
          <option value="final">Cliente final</option><option value="retail">Retail</option><option value="empresa">Empresa</option>
        </select>
        <input style={S.input} placeholder="Teléfono" value={f.telefono} onChange={function (e) { setF(Object.assign({}, f, { telefono: e.target.value })); }} />
        <input style={S.input} placeholder="WhatsApp" value={f.whatsapp} onChange={function (e) { setF(Object.assign({}, f, { whatsapp: e.target.value })); }} />
        <input style={S.input} placeholder="Email" value={f.email} onChange={function (e) { setF(Object.assign({}, f, { email: e.target.value })); }} />
        <select style={S.input} value={f.region_id} onChange={function (e) { setF(Object.assign({}, f, { region_id: e.target.value, comuna: '' })); }}>
          <option value="">— Región —</option>
          {regs.map(function (r) { return <option key={r.id} value={r.id}>{r.nombre}</option>; })}
        </select>
        <select style={S.input} value={f.comuna} onChange={function (e) { setF(Object.assign({}, f, { comuna: e.target.value })); }} disabled={!f.region_id}>
          <option value="">{f.region_id ? '— Comuna —' : 'Primero región'}</option>
          {comunasDe.map(function (c) { return <option key={c.id} value={c.nombre}>{c.nombre}</option>; })}
        </select>
        <input style={{ ...S.input, gridColumn: '1/-1' }} placeholder="Dirección" value={f.direccion} onChange={function (e) { setF(Object.assign({}, f, { direccion: e.target.value })); }} />
      </div>
      <button style={S.btn(T.ok)} type="submit">Crear cliente</button>
    </form>
  );
}

export default function ModClientes(props) {
  var avisar = props.avisar || function () {};
  var onOpenCliente = props.onOpenCliente || function () {};
  var [custs, setCusts] = useState([]); var [regions, setRegions] = useState({}); var [ots, setOts] = useState([]);
  var [q, setQ] = useState(''); var [sel, setSel] = useState({}); var [edit, setEdit] = useState(null);
  async function cargar() {
    var r = await Promise.all([
      supabase.from('customers').select('*').order('id', { ascending: false }).limit(1000),
      supabase.from('regions').select('*'),
      supabase.from('work_orders').select('id,customer_id,estado,created_at')
    ]);
    setCusts(r[0].data || []);
    var rm = {}; (r[1].data || []).forEach(function (x) { rm[x.id] = x.nombre; }); setRegions(rm);
    setOts(r[2].data || []);
  }
  useEffect(function () { cargar(); }, []);
  function otsDe(id) { return ots.filter(function (o) { return o.customer_id === id; }).length; }
  var visibles = custs.filter(function (c) {
    var t = q.toLowerCase();
    return !t || String(c.nombre || '').toLowerCase().indexOf(t) >= 0 || String(c.rut || '').toLowerCase().indexOf(t) >= 0;
  });
  var selIds = Object.keys(sel).filter(function (k) { return sel[k]; }).map(Number);
  function todos() {
    var all = visibles.every(function (c) { return sel[c.id]; });
    var n = {}; visibles.forEach(function (c) { n[c.id] = !all; }); setSel(n);
  }
  async function eliminar(ids) {
    if (!ids.length) return;
    if (!window.confirm('Eliminar ' + ids.length + ' cliente(s) y sus OTs?')) return;
    await supabase.from('work_orders').delete().in('customer_id', ids);
    await supabase.from('customers').delete().in('id', ids);
    avisar('✅ Eliminados', T.ok); setSel({}); cargar();
  }
  function exportar() {
    var csv = ['Nombre,RUT,Tipo,Teléfono,Email,Región,OTs,Creado'];
    visibles.forEach(function (c) { csv.push([c.nombre, c.rut, c.tipo, c.telefono, c.email, regions[c.region_id] || '', otsDe(c.id), fmtFecha(c.created_at)].join(',')); });
    var blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'clientes.csv'; a.click();
  }
  async function guardar() {
    if (!edit.nombre) { avisar('⛔ Nombre obligatorio', T.danger); return; }
    var e = await supabase.from('customers').update(edit).eq('id', edit.id);
    if (e.error) avisar('⛔ ' + e.error.message, T.danger); else { avisar('✅ Cliente actualizado', T.ok); setEdit(null); cargar(); }
  }
  return (
    <div>
      <NuevoCliente avisar={avisar} onOk={cargar} />
      <div style={S.card}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
          <input style={{ ...S.input, flex: 2, minWidth: 200, marginBottom: 0 }} placeholder="Buscar por nombre o RUT…" value={q} onChange={function (e) { setQ(e.target.value); }} />
          <button style={{ ...S.btnO(T.info), width: 'auto', marginBottom: 0 }} onClick={todos}>{visibles.every(function (c) { return sel[c.id]; }) ? 'Desmarcar todos' : 'Seleccionar todos'}</button>
          <button style={{ ...S.btnO(T.danger), width: 'auto', marginBottom: 0 }} onClick={function () { eliminar(selIds); }}>🗑 Eliminar seleccionados ({selIds.length})</button>
          <button style={{ ...S.btnO(T.ok), width: 'auto', marginBottom: 0 }} onClick={exportar}>📥 Exportar clientes</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={S.th}><input type="checkbox" checked={visibles.every(function (c) { return sel[c.id]; })} onChange={todos} /></th>
              <th style={S.th}>Nombre</th><th style={S.th}>RUT</th><th style={S.th}>Tipo</th><th style={S.th}>Teléfono</th><th style={S.th}>Email</th><th style={S.th}>Región</th><th style={S.th}>OTs</th><th style={S.th}>Acciones</th>
            </tr></thead>
            <tbody>
              {visibles.map(function (c) {
                return <tr key={c.id}>
                  <td style={S.td}><input type="checkbox" checked={!!sel[c.id]} onChange={function () { var n = Object.assign({}, sel); n[c.id] = !n[c.id]; setSel(n); }} /></td>
                  <td style={S.td}><b>{c.nombre}</b></td>
                  <td style={S.td}>{c.rut || '—'}</td>
                  <td style={S.td}>{c.tipo}</td>
                  <td style={S.td}>{c.telefono || c.whatsapp || '—'}</td>
                  <td style={S.td}>{c.email || '—'}</td>
                  <td style={S.td}>{regions[c.region_id] || '—'}</td>
                  <td style={S.td}><b style={{ color: T.brand }}>{otsDe(c.id)}</b></td>
                  <td style={S.td}>
                    <button style={{ ...S.btnO(T.info), width: 'auto', marginBottom: 0, fontSize: 11, padding: '3px 8px' }} onClick={function () { onOpenCliente(c); }}>📇 Ficha</button>
                    <button style={{ ...S.btnO(T.warn), width: 'auto', marginBottom: 0, fontSize: 11, padding: '3px 8px' }} onClick={function () { setEdit(Object.assign({}, c)); }}>✏ Editar</button>
                    <button style={{ ...S.btnO(T.danger), width: 'auto', marginBottom: 0, fontSize: 11, padding: '3px 8px' }} onClick={function () { eliminar([c.id]); }}>🗑</button>
                  </td>
                </tr>;
              })}
              {visibles.length === 0 ? <tr><td style={S.td} colSpan={9}><p style={S.sub}>No hay clientes que coincidan con "{q}".</p></td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
      {edit ? <div style={S.modal} onClick={function () { setEdit(null); }}>
        <div style={S.modalCard} onClick={function (e) { e.stopPropagation(); }}>
          <h3 style={S.h2}>Editar cliente</h3>
          <input style={S.input} placeholder="Nombre *" value={edit.nombre} onChange={function (e) { setEdit(Object.assign({}, edit, { nombre: e.target.value })); }} />
          <input style={S.input} placeholder="RUT" value={edit.rut || ''} onChange={function (e) { setEdit(Object.assign({}, edit, { rut: e.target.value })); }} />
          <input style={S.input} placeholder="Teléfono" value={edit.telefono || ''} onChange={function (e) { setEdit(Object.assign({}, edit, { telefono: e.target.value })); }} />
          <input style={S.input} placeholder="WhatsApp" value={edit.whatsapp || ''} onChange={function (e) { setEdit(Object.assign({}, edit, { whatsapp: e.target.value })); }} />
          <input style={S.input} placeholder="Email" value={edit.email || ''} onChange={function (e) { setEdit(Object.assign({}, edit, { email: e.target.value })); }} />
          <input style={S.input} placeholder="Dirección" value={edit.direccion || ''} onChange={function (e) { setEdit(Object.assign({}, edit, { direccion: e.target.value })); }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={S.btn(T.ok)} onClick={guardar}>Guardar</button>
            <button style={S.btn(T.muted)} onClick={function () { setEdit(null); }}>Cancelar</button>
          </div>
        </div>
      </div> : null}
    </div>
  );
}
