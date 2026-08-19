'use client';
import { useState } from 'react';
import { supabase } from '../supabase';
import { T, S } from '../ui';

const BIANCHI = ['968088807', '96808880-7'];
const TIPOS = { 'ARMADO': 'armado_unidad', 'GARANTIA': 'repuesto_garantia', 'EVALUACION': 'evaluacion', 'POST VENTA': 'servicio', 'DEVOLUCION': 'devolucion_dinero', 'RETIRO': 'retiro', 'RECLAMO': 'reclamo', 'MANTENCION': 'mantencion', 'CAMBIO': 'cambio_producto', 'DESPACHO': 'despacho', 'LEVANTAMIENTO': 'levantamiento', 'ANULACION': 'anulacion' };

function splitLine(line) {
  var out = [], cur = '', q = false;
  for (var i = 0; i < line.length; i++) {
    var ch = line[i];
    if (ch === '"') { q = !q; }
    else if (ch === ';' && !q) { out.push(cur); cur = ''; }
    else { cur += ch; }
  }
  out.push(cur);
  return out;
}
function money(v) { var s = String(v == null ? '' : v).replace(/[^0-9-]/g, ''); if (s === '' || s === '-' || s === '--') return 0; return parseInt(s, 10); }
function num(v) { return parseFloat(String(v == null ? '0' : v).replace(',', '.')) || 0; }
function fdate(v) {
  var s = String(v || '').trim();
  var m = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (m) return m[3] + '-' + m[2] + '-' + m[1];
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[1] + '-' + m[2] + '-' + m[3];
  return null;
}

export default function ModImportar(props) {
  var avisar = props.avisar || function () {};
  var [log, setLog] = useState('');
  var [busy, setBusy] = useState(false);

  function add(s) { setLog(function (l) { return l + s + '\n'; }); }

  async function processFile(file) {
    var text = await file.text();
    var lines = text.split(/\r?\n/).filter(function (l) { return l.trim() !== ''; });
    var rows = [];
    lines.forEach(function (l, ix) {
      var r = splitLine(l);
      var first = String(r[0] || '').trim().toUpperCase();
      if (ix === 0 && (first === 'ID OT' || first.indexOf('ID') === 0 && first.indexOf('OT') >= 0)) return;
      if (!r[0] || String(r[0]).trim() === '') return;
      rows.push(r);
    });
    // dedupe en memoria por ID OT (adiós error de duplicados en el lote)
    var seen = {};
    rows = rows.filter(function (r) { var k = String(r[0]).trim(); if (seen[k]) return false; seen[k] = true; return true; });
    add(file.name + ': ' + rows.length + ' filas únicas.');

    // 1) clientes por RUT
    var custMap = {};
    rows.forEach(function (r) {
      var rut = String(r[4] || r[3] || '').trim();
      if (!rut) return;
      if (!custMap[rut]) custMap[rut] = String(r[2] || '').trim() || 'CLIENTE ' + rut;
    });
    var custArr = Object.keys(custMap).map(function (rut) {
      return { tenant_id: 'dcg', tipo: BIANCHI.indexOf(rut.replace(/[^0-9kK]/g, '')) >= 0 || BIANCHI.indexOf(rut) >= 0 ? 'mayorista' : 'final', rut: rut, nombre: custMap[rut] };
    });
    var cOk = 0;
    for (var c = 0; c < custArr.length; c += 50) {
      var cb = custArr.slice(c, c + 50);
      var cr = await supabase.from('customers').upsert(cb, { onConflict: 'rut' });
      if (cr.error) { add('⚠ Clientes lote ' + c + ': ' + cr.error.message); } else { cOk += cb.length; }
    }
    add('Clientes asegurados: ' + cOk + ' de ' + custArr.length + '.');
    var sel = await supabase.from('customers').select('id,rut').in('rut', Object.keys(custMap));
    var byRut = {};
    (sel.data || []).forEach(function (x) { byRut[x.rut] = x.id; });

    // 2) OTs
    var ots = [];
    var salt = 0;
    rows.forEach(function (r) {
      var rut = String(r[4] || r[3] || '').trim();
      var cid = byRut[rut] || null;
      if (!cid) { salt++; return; }
      var ext = String(r[0]).trim();
      var estado = String(r[14] || '').toLowerCase().indexOf('cerr') >= 0 ? 'Cerrada' : 'Ingresada';
      var fing = fdate(r[1]);
      var kpi = {
        tipo_equipo: String(r[5] || '').trim(), tipo_servicio: String(r[8] || '').trim(),
        horas: num(r[15]), venta_mo: money(r[17]), costo_rep: money(r[18]), venta_rep: money(r[19]),
        venta_total: money(r[20]), costo_total: money(r[23]), margen: money(r[24]), pct_margen: String(r[25] || '').trim(),
        ftf: String(r[32] || '').trim(), dias: num(r[27]), reincidencia: String(r[28] || '').trim(),
        reclamo: String(r[29] || '').trim(), nota: parseInt(r[30], 10) || 0, nivel: String(r[31] || '').trim(),
        usa_rep: String(r[33] || '').trim(), alerta: String(r[34] || '').trim(),
        mes: String(r[36] || '').trim(), anio: String(r[37] || '').trim(), repuesto: String(r[40] || '').trim(), falla: String(r[43] || '').trim()
      };
      ots.push({
        tenant_id: 'dcg', ext_id: ext, ot_number: ext, customer_id: cid,
        tipo: TIPOS[String(r[8] || '').toUpperCase()] || 'servicio',
        tipo_equipo: String(r[5] || '').trim(), estado: estado, canal: 'vba',
        created_at: fing ? fing + 'T12:00:00' : null,
        descripcion: String(r[38] || '').trim() || null,
        tecnico_nombre: String(r[9] || '').trim() || null, quien_registra: String(r[6] || '').trim() || null,
        modelo: String(r[7] || '').trim() || null, modelo_limpio: String(r[41] || '').trim() || String(r[7] || '').trim() || null,
        fecha_promesa: fdate(r[10]), fecha_inicio: fdate(r[11]), fecha_fin_tecnico: fdate(r[12]), fecha_entrega_cliente: fdate(r[13]),
        cantidad_unidades: parseInt(r[39], 10) || 1,
        horas: num(r[15]), costo_mo: money(r[16]), venta_mo: money(r[17]), costo_rep: money(r[18]), venta_rep: money(r[19]),
        venta_total: money(r[20]), iva: money(r[21]), total_pagar: money(r[22]), costo_total: money(r[23]),
        margen: money(r[24]), pct_margen: String(r[25] || '').trim(),
        entrega_tiempo: String(r[26] || '').trim() || 'Pendiente', dias_reparacion: num(r[27]),
        reincidencia: String(r[28] || '').trim() || 'NO', reclamo: String(r[29] || '').trim() || 'NO',
        nota: parseInt(r[30], 10) || 0, nivel: String(r[31] || '').trim() || 'PENDIENTE',
        ftf: String(r[32] || '').trim() || 'SI', usa_repuestos: String(r[33] || '').trim() || 'NO',
        alerta: String(r[34] || '').trim() || 'OK', mes: String(r[36] || '').trim(), anio: String(r[37] || '').trim(),
        repuesto: String(r[40] || '').trim(), falla_fabrica: String(r[43] || '').trim() || 'NO', falla: String(r[43] || '').trim() || 'NO',
        kpi: kpi
      });
    });
    add('OTs preparadas: ' + ots.length + ' · sin cliente: ' + salt + '.');
    var ok = 0, err = '';
    for (var b = 0; b < ots.length; b += 100) {
      var lote = ots.slice(b, b + 100);
      var res = await supabase.from('work_orders').upsert(lote, { onConflict: 'ext_id' });
      if (res.error) { err += 'Lote ' + b + ': ' + res.error.message + ' · '; } else { ok += lote.length; }
    }
    add('OTs cargadas: ' + ok + ' de ' + ots.length + (err ? ' · ERRORES: ' + err : '') + '.');
  }

  async function onFiles(e) {
    var files = Array.prototype.slice.call(e.target.files || []);
    if (!files.length) return;
    setBusy(true); setLog('');
    add('Iniciando import (' + files.length + ' archivo(s))…');
    for (var i = 0; i < files.length; i++) { await processFile(files[i]); }
    var fin = await supabase.from('work_orders').select('id', { count: 'exact', head: true });
    add('TOTAL OTs en base: ' + (fin.count || 0) + '.');
    add('✔ Proceso terminado. Revisa Dashboard/KPIs: los totales deben calzar con tu Excel.');
    setBusy(false);
    avisar('Import terminado', T.ok);
  }

  return (
    <div style={S.card}>
      <h2 style={S.h2}>Importar historial KPIs (CSV de tu Excel)</h2>
      <p style={S.sub}>Selecciona los 4 CSV (KPIs 1–4) juntos. Dedupe por ID OT, clientes por RUT, upsert por ext_id en lotes de 100.</p>
      <input type="file" accept=".csv" multiple disabled={busy} onChange={onFiles} />
      {busy && <p style={{ ...S.sub, color: T.info }}>Procesando… no cierres esta pestaña.</p>}
      <pre style={{ background: T.surface2, borderRadius: 8, padding: 10, fontSize: 12, whiteSpace: 'pre-wrap', minHeight: 120 }}>{log}</pre>
    </div>
  );
}
