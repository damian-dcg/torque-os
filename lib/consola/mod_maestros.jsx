'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S } from '../ui';

function Celda(props) {
  var col = props.col, row = props.row, v = row[col.k];
  if (col.type === 'check') return <input type="checkbox" checked={!!v} onChange={function (e) { props.onEdit(row, col.k, e.target.checked); }} />;
  if (col.type === 'ro') return <span style={{ fontSize: 12, fontWeight: 700 }}>{v == null ? '' : String(v)}</span>;
  if (col.type === 'select') return (
    <select style={{ ...S.input, width: col.w || 140, padding: '4px 6px', fontSize: 12, marginBottom: 0 }} value={v == null ? '' : String(v)} onChange={function (e) { props.onEdit(row, col.k, e.target.value === '' ? null : (col.num ? Number(e.target.value) : e.target.value)); }}>
      <option value="">—</option>
      {(col.opts || []).map(function (o) { return <option key={o[0]} value={o[0]}>{o[1]}</option>; })}
    </select>
  );
  return <input style={{ ...S.input, width: col.w || 110, padding: '4px 6px', fontSize: 12, marginBottom: 0 }} type={col.type === 'num' ? 'number' : 'text'} value={v == null ? '' : v} onChange={function (e) { props.onEdit(row, col.k, col.type === 'num' ? Number(e.target.value) : e.target.value); }} />;
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

export default function ModMaestros(props) {
  var avisar = props.avisar || function () {};
  var [d, setD] = useState({ fams: [], servs: [], prices: [], mant: [], tecs: [], sla: [], gar: [], regs: [], lugs: [] });

  function cargar() {
    (async function () {
      var q = await Promise.all([
        supabase.from('product_families').select('*').order('id'),
        supabase.from('service_types').select('*').order('id'),
        supabase.from('service_prices').select('*'),
        supabase.from('mant_types').select('*').order('id'),
        supabase.from('tech_rates').select('*').order('id'),
        supabase.from('sla_matrix').select('*').order('id'),
        supabase.from('warranty_rules').select('*'),
        supabase.from('regions').select('*').order('id'),
        supabase.from('lugares').select('*').order('nombre')
      ]);
      var servs = q[1].data || [], fams = q[0].data || [];
      var sName = {}, fName = {};
      servs.forEach(function (s) { sName[s.id] = s.code || s.nombre; });
      fams.forEach(function (f) { fName[f.id] = f.name; });
      var prices = (q[2].data || []).map(function (p) { var o = Object.assign({}, p); o.servicio = sName[p.service_type_id] || ('#' + p.service_type_id); return o; });
      var gar = (q[6].data || []).map(function (g) { var o = Object.assign({}, g); o.familia = fName[g.family_id] || ('#' + g.family_id); return o; });
      setD({ fams: fams, servs: servs, prices: prices, mant: q[3].data || [], tecs: q[4].data || [], sla: q[5].data || [], gar: gar, regs: q[7].data || [], lugs: q[8].data || [] });
    })();
  }
  useEffect(function () { cargar(); }, []);

  function save(tabla, patch, id) {
    (async function () { var r = await supabase.from(tabla).update(patch).eq('id', id); if (r.error) avisar('⛔ ' + r.error.message, T.danger); else cargar(); })();
  }
  function add(tabla, fila) {
    (async function () { var r = await supabase.from(tabla).insert(fila); if (r.error) avisar('⛔ ' + r.error.message, T.danger); else { avisar('✔ creado', T.ok); cargar(); } })();
  }
  function del(tabla, id) {
    (async function () { var r = await supabase.from(tabla).delete().eq('id', id); if (r.error) avisar('⛔ ' + r.error.message, T.danger); else cargar(); })();
  }
  var regOpts = d.regs.map(function (r) { return [String(r.id), r.nombre]; });

  return (
    <div>
      <Tabla titulo="1 · Familias de producto" rows={d.fams}
        cols={[{ k: 'code', label: 'Código', w: 90 }, { k: 'name', label: 'Nombre', w: 170 }, { k: 'tipo', label: 'Tipo', w: 110 }, { k: 'active', label: 'Activa', type: 'check' }]}
        onEdit={function (r, k, v) { save('product_families', { [k]: v }, r.id); }}
        onAdd={function () { add('product_families', { code: 'FAM-NUEVA', name: 'NUEVA', tipo: 'OTRO', active: true }); }}
        onDel={function (r) { del('product_families', r.id); }} />
      <Tabla titulo="2 · Tipos de servicio" rows={d.servs}
        cols={[{ k: 'code', label: 'Código', w: 100 }, { k: 'nombre', label: 'Nombre', w: 140 }, { k: 'aplica', label: 'Aplica', w: 80 }, { k: 'base_price', label: 'Precio base', type: 'num' }, { k: 'sla_horas', label: 'SLA h', type: 'num', w: 70 }, { k: 'genera_venta_mo', label: 'Vende MO', type: 'check' }, { k: 'es_garantia', label: 'Garantía', type: 'check' }, { k: 'active', label: 'Activo', type: 'check' }]}
        onEdit={function (r, k, v) { save('service_types', { [k]: v }, r.id); }}
        onAdd={function () { add('service_types', { code: 'NUEVO', nombre: 'NUEVO SERVICIO', aplica: 'ambos', base_price: 0, sla_horas: 48, genera_venta_mo: true, es_garantia: false, active: true }); }}
        onDel={function (r) { del('service_types', r.id); }} />
      <Tabla titulo="3 · Precios por servicio (modificadores)" rows={d.prices}
        cols={[{ k: 'servicio', label: 'Servicio', type: 'ro', w: 120 }, { k: 'precio_base', label: 'Base', type: 'num' }, { k: 'factor_electrica', label: 'Eléctrica', type: 'num', w: 80 }, { k: 'factor_convencional', label: 'Convenc.', type: 'num', w: 80 }, { k: 'factor_unidad', label: 'Unidad', type: 'num', w: 80 }, { k: 'factor_volumen', label: 'Volumen', type: 'num', w: 80 }]}
        onEdit={function (r, k, v) { save('service_prices', { [k]: v }, r.id); }} />
      <Tabla titulo="4 · Tipos de mantención (A–D)" rows={d.mant}
        cols={[{ k: 'nombre', label: 'Nombre', w: 200 }, { k: 'descripcion', label: 'Servicios incluidos', w: 560 }]}
        onEdit={function (r, k, v) { save('mant_types', { [k]: v }, r.id); }}
        onAdd={function () { add('mant_types', { nombre: 'NUEVA (X)', descripcion: '' }); }}
        onDel={function (r) { del('mant_types', r.id); }} />
      <Tabla titulo="5 · Técnicos (costos y markup)" rows={d.tecs}
        cols={[{ k: 'technician', label: 'Técnico', w: 160 }, { k: 'costo_sueldo_mensual', label: 'Sueldo', type: 'num' }, { k: 'horas_mes', label: 'Horas/mes', type: 'num', w: 80 }, { k: 'costo_x_hora', label: 'Costo×h', type: 'num' }, { k: 'venta_x_hora', label: 'Venta×h', type: 'num' }, { k: 'markup_pct', label: 'Markup %', type: 'num', w: 80 }]}
        onEdit={function (r, k, v) { save('tech_rates', { [k]: v }, r.id); }}
        onAdd={function () { add('tech_rates', { technician: 'NUEVO', costo_sueldo_mensual: 0, horas_mes: 168, costo_x_hora: 0, venta_x_hora: 0, markup_pct: 100 }); }}
        onDel={function (r) { del('tech_rates', r.id); }} />
      <Tabla titulo="6 · SLA (días por servicio × equipo)" rows={d.sla}
        cols={[{ k: 'tipo_servicio', label: 'Servicio', w: 130 }, { k: 'tipo_equipo', label: 'Equipo', w: 160 }, { k: 'dias', label: 'Días', type: 'num', w: 70 }]}
        onEdit={function (r, k, v) { save('sla_matrix', { [k]: v }, r.id); }}
        onAdd={function () { add('sla_matrix', { tipo_servicio: 'ARMADO', tipo_equipo: 'BICICLETA', dias: 3 }); }}
        onDel={function (r) { del('sla_matrix', r.id); }} />
      <Tabla titulo="7 · Garantías por familia" rows={d.gar}
        cols={[{ k: 'familia', label: 'Familia', type: 'ro', w: 170 }, { k: 'meses', label: 'Meses', type: 'num', w: 70 }, { k: 'condiciones', label: 'Condiciones', w: 460 }]}
        onEdit={function (r, k, v) { save('warranty_rules', { [k]: v }, r.id); }} />
      <Tabla titulo="8 · Regiones y zonas" rows={d.regs}
        cols={[{ k: 'codigo', label: 'Código', w: 70 }, { k: 'nombre', label: 'Región', w: 190 }, { k: 'zona', label: 'Zona', w: 90 }]}
        onEdit={function (r, k, v) { save('regions', { [k]: v }, r.id); }}
        onAdd={function () { add('regions', { codigo: 'XX', nombre: 'NUEVA REGIÓN', zona: 'centro' }); }}
        onDel={function (r) { del('regions', r.id); }} />
      <Tabla titulo="9 · Malls y tiendas (lugares de servicio)" rows={d.lugs}
        cols={[{ k: 'tipo', label: 'Tipo', type: 'select', w: 100, opts: [['mall', 'Mall'], ['retail', 'Retail'], ['tienda', 'Tienda'], ['otro', 'Otro']] }, { k: 'nombre', label: 'Nombre', w: 220 }, { k: 'region_id', label: 'Región', type: 'select', num: true, w: 150, opts: regOpts }, { k: 'comuna', label: 'Comuna', w: 130 }, { k: 'address', label: 'Dirección', w: 240 }, { k: 'activo', label: 'Activo', type: 'check' }]}
        onEdit={function (r, k, v) { save('lugares', { [k]: v }, r.id); }}
        onAdd={function () { add('lugares', { tipo: 'retail', nombre: 'NUEVO LUGAR', activo: true }); }}
        onDel={function (r) { del('lugares', r.id); }} />
    </div>
  );
}
