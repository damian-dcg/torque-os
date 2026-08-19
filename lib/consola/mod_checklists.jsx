'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S } from '../ui';

export default function ModChecklists(props) {
  var avisar = props.avisar || function () {};
  var [cks, setCks] = useState([]);
  var [blks, setBlks] = useState([]);
  var [nc, setNc] = useState({ code: '', nombre: '', especialidad: 'BICI', blocks: 'B01,B14' });
  var [nb, setNb] = useState({ code: '', nombre: '' });

  function cargar() {
    (async function () {
      var q = await Promise.all([
        supabase.from('checklists').select('*').order('code'),
        supabase.from('checklist_blocks').select('*').order('code')
      ]);
      setCks(q[0].data || []); setBlks(q[1].data || []);
    })();
  }
  useEffect(function () { cargar(); }, []);

  function saveCk(r, k, v) {
    var patch = {}; patch[k] = (k === 'blocks') ? String(v).split(',').map(function (x) { return x.trim(); }).filter(Boolean) : v;
    (async function () { var e = await supabase.from('checklists').update(patch).eq('id', r.id); if (e.error) avisar('⛔ ' + e.error.message, T.danger); else cargar(); })();
  }
  function saveBlk(r, v) {
    (async function () { var e = await supabase.from('checklist_blocks').update({ items: v }).eq('id', r.id); if (e.error) avisar('⛔ ' + e.error.message, T.danger); else avisar('✔ bloque guardado', T.ok); })();
  }
  function crearCk() {
    (async function () {
      var e = await supabase.from('checklists').insert([{ code: nc.code, nombre: nc.nombre, especialidad: nc.especialidad, blocks: nc.blocks.split(',').map(function (x) { return x.trim(); }).filter(Boolean) }]);
      if (e.error) avisar('⛔ ' + e.error.message, T.danger); else { avisar('✔ checklist creada', T.ok); cargar(); }
    })();
  }
  function crearBlk() {
    (async function () {
      var e = await supabase.from('checklist_blocks').insert([{ code: nb.code, nombre: nb.nombre, items: '[]' }]);
      if (e.error) avisar('⛔ ' + e.error.message, T.danger); else { avisar('✔ bloque creado', T.ok); cargar(); }
    })();
  }
  function delCk(r) { (async function () { await supabase.from('checklists').delete().eq('id', r.id); cargar(); })(); }

  return (
    <div>
      <div style={S.card}>
        <h3 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 800 }}>Checklists ({cks.length}) · matriz servicio × modalidad</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={S.th}>Código</th><th style={S.th}>Nombre</th><th style={S.th}>Esp.</th><th style={S.th}>Bloques (separados por coma)</th><th style={S.th}></th></tr></thead>
            <tbody>
              {cks.map(function (r) {
                return (
                  <tr key={r.id}>
                    <td style={S.td}>{r.code}</td>
                    <td style={S.td}><input style={{ ...S.input, width: 200 }} value={r.nombre || ''} onChange={function (e) { saveCk(r, 'nombre', e.target.value); }} /></td>
                    <td style={S.td}>{r.especialidad}</td>
                    <td style={S.td}><input style={{ ...S.input, width: 320 }} defaultValue={(r.blocks || []).join(',')} onBlur={function (e) { saveCk(r, 'blocks', e.target.value); }} /></td>
                    <td style={S.td}><button style={{ ...S.btn(T.danger), padding: '2px 8px' }} onClick={function () { delCk(r); }}>🗑</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <input style={{ ...S.input, width: 110 }} placeholder="Código" value={nc.code} onChange={function (e) { setNc(Object.assign({}, nc, { code: e.target.value })); }} />
          <input style={{ ...S.input, width: 180 }} placeholder="Nombre" value={nc.nombre} onChange={function (e) { setNc(Object.assign({}, nc, { nombre: e.target.value })); }} />
          <input style={{ ...S.input, width: 80 }} placeholder="Esp." value={nc.especialidad} onChange={function (e) { setNc(Object.assign({}, nc, { especialidad: e.target.value })); }} />
          <input style={{ ...S.input, width: 220 }} placeholder="Bloques: B01,B02" value={nc.blocks} onChange={function (e) { setNc(Object.assign({}, nc, { blocks: e.target.value })); }} />
          <button style={S.btn(T.ok)} onClick={crearCk}>Crear checklist</button>
        </div>
      </div>
      <div style={S.card}>
        <h3 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 800 }}>Bloques ({blks.length}) · edita el JSON de items</h3>
        {blks.map(function (b) {
          return (
            <div key={b.id} style={{ marginBottom: 10, border: '1px solid ' + T.border, borderRadius: 8, padding: 8 }}>
              <b style={{ fontSize: 13 }}>{b.code} · {b.nombre}</b>
              <textarea style={{ ...S.input, width: '100%', minHeight: 60, fontSize: 11 }} defaultValue={typeof b.items === 'string' ? b.items : JSON.stringify(b.items)} onBlur={function (e) { saveBlk(b, e.target.value); }} />
            </div>
          );
        })}
        <div style={{ display: 'flex', gap: 8 }}>
          <input style={{ ...S.input, width: 80 }} placeholder="Cód" value={nb.code} onChange={function (e) { setNb(Object.assign({}, nb, { code: e.target.value })); }} />
          <input style={{ ...S.input, width: 200 }} placeholder="Nombre del bloque" value={nb.nombre} onChange={function (e) { setNb(Object.assign({}, nb, { nombre: e.target.value })); }} />
          <button style={S.btn(T.ok)} onClick={crearBlk}>+</button>
        </div>
      </div>
    </div>
  );
}
