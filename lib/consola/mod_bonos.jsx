'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S } from '../ui';

const fmtCLP = (n) => '$' + Math.round(n || 0).toLocaleString('es-CL');
const DEF = {
  tecnicos: ['ALVARO ROJAS', 'CLAUDIO MOLINA', 'MAYCOLL GODOY'],
  umbral_bicis: 50, bono_base_bici: 50000, bono_extra_bici: 1400,
  bono_maquina: 1400, bono_otros: 1400,
  claudio_otros_entero_3: true, maycoll_suma_taller: true, maycoll_bono_cero: true,
  descuento_por_falla: true, monto_por_falla: 1400,
  descuento_ots_abiertas: true, monto_por_ot_abierta: 1400
};

export default function ModBonos(props) {
  const avisar = props.avisar || function () {};
  const [ots, setOts] = useState([]);
  const [rules, setRules] = useState(DEF);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [edit, setEdit] = useState(false);

  useEffect(function () { (async function () {
    const [o, b] = await Promise.all([
      supabase.from('work_orders').select('*').limit(5000),
      supabase.from('bonus_rules').select('*').eq('clave', 'bonos').maybeSingle()
    ]);
    setOts(o.data || []);
    if (b.data && b.data.valor) {
      const v = typeof b.data.valor === 'string' ? JSON.parse(b.data.valor) : b.data.valor;
      setRules(Object.assign({}, DEF, v));
    }
  })(); }, []);

  function K(o) { return o.kpi || {}; }
  function cant(o) { return Number(o.cantidad_unidades || 0); }
  function enRango(o) {
    if (!o.fecha_ingreso) return false;
    const f = String(o.fecha_ingreso).slice(0, 10);
    if (desde && f < desde) return false;
    if (hasta && f > hasta) return false;
    return true;
  }
  function esTec(o, name) {
    const t = String(o.tecnico_nombre || '').toUpperCase();
    if (t.indexOf(String(name).toUpperCase()) >= 0) return true;
    if (rules.maycoll_suma_taller && String(name).indexOf('MAYCOLL') >= 0 && t.indexOf('TALLER') >= 0) return true;
    return false;
  }
  function set(k, v) { setRules(function (r) { const n = Object.assign({}, r); n[k] = v; return n; }); }

  async function save() {
    const { error } = await supabase.from('bonus_rules')
      .upsert({ tenant_id: 'dcg', clave: 'bonos', valor: JSON.stringify(rules) }, { onConflict: 'tenant_id,clave' });
    if (error) avisar('Error al guardar: ' + error.message, T.danger);
    else avisar('Reglas de bonos guardadas', T.ok);
    setEdit(false);
  }

  const filas = rules.tecnicos.map(function (name) {
    const mine = ots.filter(function (o) { return enRango(o) && esTec(o, name); });
    const sv = function (o) { return String(K(o).tipo_servicio || '').toUpperCase(); };
    const eq = function (o) { return String(K(o).tipo_equipo || '').toUpperCase(); };
    const bicis = mine.filter(function (o) { return sv(o) === 'ARMADO' && eq(o) === 'BICICLETA'; }).reduce(function (a, o) { return a + cant(o); }, 0);
    const maq = mine.filter(function (o) { return sv(o) === 'ARMADO' && eq(o) === 'MAQUINA'; }).reduce(function (a, o) { return a + cant(o); }, 0);
    const otros = mine.filter(function (o) { return sv(o) !== 'ARMADO'; }).reduce(function (a, o) { return a + cant(o); }, 0);
    const fallas = mine.filter(function (o) { return String(K(o).reincidencia || '').toUpperCase() === 'FALLA'; }).length;
    const abiertas = mine.filter(function (o) { return String(o.estado || '') !== 'Cerrada'; }).reduce(function (a, o) { return a + cant(o); }, 0);
    const base = bicis >= rules.umbral_bicis ? rules.bono_base_bici : 0;
    const extra = bicis > rules.umbral_bicis ? (bicis - rules.umbral_bicis) * rules.bono_extra_bici : 0;
    const bmaq = maq * rules.bono_maquina;
    const botros = (String(name).indexOf('CLAUDIO MOLINA') >= 0 && rules.claudio_otros_entero_3)
      ? Math.floor(otros / 3) * rules.bono_otros : otros * rules.bono_otros;
    const descF = rules.descuento_por_falla ? fallas * rules.monto_por_falla : 0;
    const descA = rules.descuento_ots_abiertas ? abiertas * rules.monto_por_ot_abierta : 0;
    const total = (rules.maycoll_bono_cero && String(name).indexOf('MAYCOLL') >= 0)
      ? 0 : base + extra + bmaq + botros - descF - descA;
    return { name: name, bicis: bicis, maq: maq, otros: otros, base: base, extra: extra, bmaq: bmaq, botros: botros, fallas: fallas, descA: descA, total: total };
  });

  function num(k, l) {
    return (
      <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, marginBottom: 6 }}>
        <span style={{ width: 220 }}>{l}</span>
        <input type="number" style={{ width: 110, padding: '5px 8px', borderRadius: 6, border: '1px solid #ccc', fontSize: 12 }} value={rules[k]} onChange={function (e) { set(k, Number(e.target.value)); }} />
      </label>
    );
  }
  function chk(k, l) {
    return (
      <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, marginBottom: 6 }}>
        <input type="checkbox" checked={!!rules[k]} onChange={function (e) { set(k, e.target.checked); }} />
        <span>{l}</span>
      </label>
    );
  }

  const editor = edit ? (
    <div style={{ background: T.surface2, borderRadius: 10, padding: 12, marginBottom: 12 }}>
      {num('umbral_bicis', 'Umbral bicis (piso bono base)')}
      {num('bono_base_bici', 'Bono base bicis ($)')}
      {num('bono_extra_bici', 'Bono extra por bici sobre umbral ($)')}
      {num('bono_maquina', 'Bono por máquina ($)')}
      {num('bono_otros', 'Bono por otro trabajo ($)')}
      {num('monto_por_falla', 'Descuento por falla ($)')}
      {num('monto_por_ot_abierta', 'Descuento por OT abierta ($)')}
      {chk('claudio_otros_entero_3', 'Regla Claudio: ENTERO(otros/3)')}
      {chk('maycoll_suma_taller', 'Regla Maycoll: suma TALLER')}
      {chk('maycoll_bono_cero', 'Regla Maycoll: bono total = 0')}
      {chk('descuento_por_falla', 'Descontar fallas')}
      {chk('descuento_ots_abiertas', 'Descontar OTs abiertas')}
      <button style={S.btn(T.ok)} onClick={save}>Guardar reglas</button>
    </div>
  ) : null;

  return (
    <div style={S.card}>
      <h2 style={S.h2}>Liquidador de bonos (técnicos internos)</h2>
      <p style={S.sub}>Misma lógica de tu Excel LIQUIDADOR_BONOS. Rango de fechas = celdas B1/B2.</p>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <label style={{ fontSize: 12 }}>Desde <input type="date" style={S.input} value={desde} onChange={function (e) { setDesde(e.target.value); }} /></label>
        <label style={{ fontSize: 12 }}>Hasta <input type="date" style={S.input} value={hasta} onChange={function (e) { setHasta(e.target.value); }} /></label>
        <button style={S.btn(T.info)} onClick={function () { setEdit(!edit); }}>{edit ? 'Cerrar reglas' : 'Editar reglas'}</button>
      </div>
      {editor}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th style={S.th}>Técnico</th><th style={S.th}>Bicis</th><th style={S.th}>Máquinas</th>
            <th style={S.th}>Otros</th><th style={S.th}>Base</th><th style={S.th}>Extra</th>
            <th style={S.th}>B.Máq</th><th style={S.th}>B.Otros</th><th style={S.th}>Fallas</th>
            <th style={S.th}>Desc. abiertas</th><th style={S.th}>TOTAL</th>
          </tr></thead>
          <tbody>
            {filas.map(function (f) {
              return (
                <tr key={f.name}>
                  <td style={S.td}>{f.name}</td><td style={S.td}>{f.bicis}</td><td style={S.td}>{f.maq}</td>
                  <td style={S.td}>{f.otros}</td><td style={S.td}>{fmtCLP(f.base)}</td><td style={S.td}>{fmtCLP(f.extra)}</td>
                  <td style={S.td}>{fmtCLP(f.bmaq)}</td><td style={S.td}>{fmtCLP(f.botros)}</td>
                  <td style={S.td}>{f.fallas}</td><td style={S.td}>{fmtCLP(f.descA)}</td>
                  <td style={{ ...S.td, fontWeight: 800 }}>{fmtCLP(f.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
