'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S } from '../ui';
import ImportExport from './ImportExport';

export default function ModProductos(props) {
  var avisar = props.avisar || function () {};
  var [rows, setRows] = useState([]);
  var [fams, setFams] = useState([]);
  var [q, setQ] = useState('');
  var [nf, setNf] = useState({ brand: 'BIANCHI', model: '', sku: '', familia: '', warranty_months: 6 });

  function cargar() {
    (async function () {
      var r = await Promise.all([
        supabase.from('product_catalog').select('*').order('id', { ascending: false }).limit(800),
        supabase.from('product_families').select('*').order('id')
      ]);
      setRows(r[0].data || []); setFams(r[1].data || []);
    })();
  }
  useEffect(function () { cargar(); }, []);

  function findFam(v) {
    var t = String(v || '').trim().toUpperCase();
    var hit = null;
    fams.forEach(function (x) { if (x.code === t || String(x.name).toUpperCase() === t) hit = x; });
    return hit;
  }
  function save(r, k, v) {
    (async function () { var e = await supabase.from('product_catalog').update({ [k]: v }).eq('id', r.id); if (e.error) avisar('⛔ ' + e.error.message, T.danger); else cargar(); })();
  }
  function insertar(f) {
    var fam = findFam(f.familia);
    (async function () {
      var e = await supabase.from('product_catalog').insert([{ brand: f.brand || 'BIANCHI', model: f.model || null, sku: f.sku || null, family_id: fam ? fam.id : null, warranty_months: Number(f.warranty_months) || 6, warranty_conditions: f.warranty_conditions || null }]);
      if (e.error) avisar('⛔ ' + e.error.message, T.danger); else { avisar('✔ producto creado', T.ok); cargar(); }
    })();
  }
  function del(r) {
    if (!window.confirm('¿Eliminar ' + (r.model || r.sku) + '?')) return;
    (async function () { await supabase.from('product_catalog').delete().eq('id', r.id); cargar(); })();
  }

  var vis = rows.filter(function (r) {
    var t = q.toLowerCase();
    return !t || String(r.model || '').toLowerCase().indexOf(t) >= 0 || String(r.sku || '').toLowerCase().indexOf(t) >= 0 || String(r.brand || '').toLowerCase().indexOf(t) >= 0;
  });

  return (
    <div>
      <ImportExport nombre="PRODUCTOS" headers={['brand', 'model', 'sku', 'familia', 'warranty_months', 'warranty_conditions']} onRows={async function (rs) {
        var n = 0;
        for (var i = 0; i < rs.length; i++) {
          var r = rs[i];
          if (!r.model && !r.sku) continue;
          var fam = findFam(r.familia);
          var e = await supabase.from('product_catalog').insert([{ brand: r.brand || 'BIANCHI', model: r.model || null, sku: r.sku || null, family_id: fam ? fam.id : null, warranty_months: Number(r.warranty_months) || 6, warranty_conditions: r.warranty_conditions || null }]);
          if (!e.error) n++;
        }
        cargar();
        return '✅ ' + n + ' productos cargados (familia enlazada)';
      }} />
      <div style={S.card}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>Fichas de producto ({vis.length})</h3>
          <input style={{ ...S.input, width: 220 }} placeholder="Buscar…" value={q} onChange={function (e) { setQ(e.target.value); }} />
        </div>
        <div style={{ ...S.card, background: T.surface2, marginBottom: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input style={{ ...S.input, width: 90 }} placeholder="Marca" value={nf.brand} onChange={function (e) { setNf(Object.assign({}, nf, { brand: e.target.value })); }} />
          <input style={{ ...S.input, width: 200 }} placeholder="Modelo *" value={nf.model} onChange={function (e) { setNf(Object.assign({}, nf, { model: e.target.value })); }} />
          <input style={{ ...S.input, width: 110 }} placeholder="SKU" value={nf.sku} onChange={function (e) { setNf(Object.assign({}, nf, { sku: e.target.value })); }} />
          <select style={{ ...S.input, width: 170 }} value={nf.familia} onChange={function (e) { setNf(Object.assign({}, nf, { familia: e.target.value })); }}>
            <option value="">— Familia —</option>
            {fams.map(function (f) { return <option key={f.id} value={f.name}>{f.name} ({f.tipo})</option>; })}
          </select>
          <input style={{ ...S.input, width: 70 }} type="number" value={nf.warranty_months} onChange={function (e) { setNf(Object.assign({}, nf, { warranty_months: e.target.value })); }} />
          <button style={S.btn(T.ok)} onClick={function () { if (!nf.model) { avisar('⛔ Modelo obligatorio', T.danger); return; } insertar(nf); setNf(Object.assign({}, nf, { model: '', sku: '' })); }}>+ Nueva ficha</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={S.th}>Marca</th><th style={S.th}>Modelo</th><th style={S.th}>SKU</th><th style={S.th}>Familia</th><th style={S.th}>Garantía (m)</th><th style={S.th}>Condiciones</th><th style={S.th}></th>
            </tr></thead>
            <tbody>
              {vis.map(function (r) {
                return (
                  <tr key={r.id}>
                    <td style={S.td}><input style={{ ...S.input, width: 90 }} defaultValue={r.brand || ''} onBlur={function (e) { save(r, 'brand', e.target.value); }} /></td>
                    <td style={S.td}><input style={{ ...S.input, width: 200 }} defaultValue={r.model || ''} onBlur={function (e) { save(r, 'model', e.target.value); }} /></td>
                    <td style={S.td}><input style={{ ...S.input, width: 110 }} defaultValue={r.sku || ''} onBlur={function (e) { save(r, 'sku', e.target.value); }} /></td>
                    <td style={S.td}>
                      <select style={{ ...S.input, width: 170 }} value={r.family_id || ''} onChange={function (e) { save(r, 'family_id', e.target.value ? Number(e.target.value) : null); }}>
                        <option value="">— Familia —</option>
                        {fams.map(function (f) { return <option key={f.id} value={f.id}>{f.name} ({f.tipo})</option>; })}
                      </select>
                    </td>
                    <td style={S.td}><input style={{ ...S.input, width: 70 }} type="number" defaultValue={r.warranty_months == null ? '' : r.warranty_months} onBlur={function (e) { save(r, 'warranty_months', Number(e.target.value) || 6); }} /></td>
                    <td style={S.td}><input style={{ ...S.input, width: 240 }} defaultValue={r.warranty_conditions || ''} onBlur={function (e) { save(r, 'warranty_conditions', e.target.value); }} /></td>
                    <td style={S.td}><button style={{ ...S.btn(T.danger), padding: '2px 8px' }} onClick={function () { del(r); }}>🗑</button></td>
                  </tr>
                );
              })}
              {vis.length === 0 ? <tr><td style={S.td} colSpan={7}>Sin productos.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
