'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S } from '../ui';
import { emit } from '../data';

var SVC_SHORT = { 'ARMADO':'ARM','GARANTIA':'GAR','EVALUACION':'EVA','MANTENCION':'MAN','POST VENTA':'POS','RECLAMO':'REC','DEVOLUCION':'DEV','CAMBIO':'CAM','DESPACHO':'DES','LEVANTAMIENTO':'LEV','RETIRO':'RET','ANULACION':'ANU' };
var FAM_ELECTRICAS = ['BICICLETA ELECTRICA', 'SCOOTER ELECTRICO', 'TROTADORA'];

export default function ModNuevaOT(props) {
  var avisar = props.avisar || function () {};
  var onOk = props.onOk || function () {};
  var [cust, setCust] = useState([]); var [fams, setFams] = useState([]); var [prods, setProds] = useState([]);
  var [servs, setServs] = useState([]); var [sla, setSla] = useState([]); var [regs, setRegs] = useState([]);
  var [coms, setComs] = useState([]); var [lugs, setLugs] = useState([]); var [sats, setSats] = useState([]);
  var [users, setUsers] = useState([]); var [carga, setCarga] = useState({}); var [busy, setBusy] = useState(false);
  var [f, setF] = useState({ cliente: '', nuevo: false, nombre: '', rut: '', region_id: '', comuna: '', direccion: '', lugar: 'domicilio', lugar_id: '', familia_id: '', modelo: '', serie: '', cantidad: 1, electrica: false, servicio: 'ARMADO', prioridad: 'media', descripcion: '', asig: '', fecha: '' });
  function set(k, v) { setF(function (o) { var n = Object.assign({}, o); n[k] = v; return n; }); }
  function onFamilia(v) {
    var name = '';
    fams.forEach(function (x) { if (x.id === Number(v)) name = x.name || ''; });
    setF(function (o) { var n = Object.assign({}, o); n.familia_id = v; n.electrica = FAM_ELECTRICAS.indexOf(name) >= 0; return n; });
  }

  useEffect(function () { (async function () {
    var r = await Promise.all([
      supabase.from('customers').select('*').order('nombre').limit(500),
      supabase.from('product_families').select('*').order('id'),
      supabase.from('product_catalog').select('*'),
      supabase.from('service_types').select('*').order('id'),
      supabase.from('sla_matrix').select('*'),
      supabase.from('regions').select('*').order('id'),
      supabase.from('comunas').select('*').order('nombre'),
      supabase.from('lugares').select('*').order('nombre'),
      supabase.from('companies').select('*').eq('tipo', 'sat'),
      supabase.from('users').select('*'),
      supabase.from('work_orders').select('asignado_user_id,asignado_company_id,estado').limit(2000)
    ]);
    setCust(r[0].data || []); setFams(r[1].data || []); setProds(r[2].data || []);
    setServs((r[3].data || []).filter(function (s) { return s.active !== false; }));
    setSla(r[4].data || []); setRegs(r[5].data || []); setComs(r[6].data || []); setLugs(r[7].data || []);
    setSats((r[8].data || []).filter(function (s) { return s.activo; }));
    setUsers(r[9].data || []);
    var c = {}; (r[10].data || []).forEach(function (o) {
      if (o.estado === 'Cerrada') return;
      if (o.asignado_company_id) c['s' + o.asignado_company_id] = (c['s' + o.asignado_company_id] || 0) + 1;
      if (o.asignado_user_id) c['u' + o.asignado_user_id] = (c['u' + o.asignado_user_id] || 0) + 1;
    });
    setCarga(c);
  })(); }, []);

  var fam = null; fams.forEach(function (x) { if (x.id === Number(f.familia_id)) fam = x; });
  var tipoEq = fam ? (f.electrica && fam.tipo === 'BICICLETA' ? 'BICICLETA ELECTRICA' : f.electrica && fam.tipo === 'SCOOTER' ? 'SCOOTER ELECTRICO' : fam.tipo) : '';
  var mod = Number(f.cantidad) > 1 ? 'VOL'
    : (tipoEq === 'MAQUINA' ? (f.electrica ? 'ME' : 'MC')
    : (tipoEq === 'BICICLETA ELECTRICA' || tipoEq === 'SCOOTER ELECTRICO' ? 'BE' : 'BU'));
  var checklist = 'CK-' + (SVC_SHORT[f.servicio] || 'REP') + '-' + mod;
  var slaRow = null; sla.forEach(function (x) { if (x.tipo_servicio === f.servicio && x.tipo_equipo === tipoEq) slaRow = x; });
  var slaDias = (slaRow && slaRow.dias) || 15;
  var promesa = new Date(Date.now() + slaDias * 86400000).toISOString().slice(0, 10);
  var fueraSLA = f.fecha && f.fecha > promesa;
  var modelos = prods.filter(function (p) { return p.family_id === Number(f.familia_id); });
  var comunasDe = coms.filter(function (c) { return c.region_id === Number(f.region_id); });
  var lugaresDe = lugs.filter(function (l) { return l.activo !== false && (!f.region_id || !l.region_id || l.region_id === Number(f.region_id)); });
  var espReq = fam ? (fam.tipo === 'BICICLETA' ? 'bici' : fam.tipo === 'MAQUINA' ? 'fitness' : null) : null;
  var tecInternos = users.filter(function (u) { return u.rol === 'tecnico' || u.rol === 'tecnico_sat'; });
  var satsOrdenados = sats.map(function (s) {
    return { id: s.id, nombre: s.nombre, esp: s.especialidad, ok: (!f.region_id || s.region_id === Number(f.region_id)) && (!espReq || s.especialidad === 'ambos' || s.especialidad === espReq) };
  }).sort(function (a, b) { return (b.ok ? 1 : 0) - (a.ok ? 1 : 0) || (carga['s' + a.id] || 0) - (carga['s' + b.id] || 0); });
  var sugeridos = tecInternos.slice(0, 3).map(function (u) { return u.nombre; })
    .concat(satsOrdenados.filter(function (s) { return s.ok; }).slice(0, 3).map(function (s) { return s.nombre; }));

  async function crear() {
    setBusy(true);
    try {
      var cid = f.cliente ? Number(f.cliente) : null;
      if (f.nuevo) {
        if (!f.nombre) { avisar('⛔ Nombre del cliente obligatorio', T.danger); setBusy(false); return; }
        var ci = await supabase.from('customers').insert([{ tenant_id: 'dcg', nombre: f.nombre, rut: f.rut || null, tipo: 'final', region_id: f.region_id ? Number(f.region_id) : null, comuna: f.comuna || null, direccion: f.direccion || null }]).select();
        if (ci.error) { avisar('⛔ ' + ci.error.message, T.danger); setBusy(false); return; }
        cid = ci.data[0].id;
      }
      if (!cid) { avisar('⛔ Selecciona o crea un cliente', T.danger); setBusy(false); return; }
      var mx = await supabase.from('work_orders').select('ot_number');
      var maxN = 50000; (mx.data || []).forEach(function (o) { var n = parseInt(o.ot_number, 10); if (!isNaN(n) && n > maxN) maxN = n; });
      var asigC = null, asigU = null;
      if (f.asig) { if (f.asig.indexOf('sat:') === 0) asigC = Number(f.asig.slice(4)); else asigU = Number(f.asig.slice(4)); }
      var wi = await supabase.from('work_orders').insert([{
        tenant_id: 'dcg', ot_number: String(maxN + 1), customer_id: cid,
        tipo: f.servicio, tipo_equipo: tipoEq || null, modalidad: mod,
        estado: asigC || asigU ? 'Asignada' : 'Ingresada', prioridad: f.prioridad, canal: 'interno',
        descripcion: f.descripcion || null, region_id: f.region_id ? Number(f.region_id) : null,
        comuna: f.comuna || null, direccion: f.direccion || null,
        lugar_tipo: f.lugar, lugar_id: f.lugar_id ? Number(f.lugar_id) : null,
        modelo: f.modelo || null, modelo_limpio: (f.modelo || '').replace(/[\s.-]/g, '').toUpperCase() || null,
        cantidad_unidades: Number(f.cantidad) || 1, checklist_code: checklist,
        fecha_promesa: promesa, fecha_programada: f.fecha || null, quien_registra: 'consola',
        asignado_company_id: asigC, asignado_user_id: asigU,
        kpi: { tipo_servicio: f.servicio, tipo_equipo: tipoEq }
      }]);
      if (wi.error) { avisar('⛔ ' + wi.error.message, T.danger); setBusy(false); return; }
      if (f.serie && f.familia_id) {
        await supabase.from('assets').insert([{ tenant_id: 'dcg', customer_id: cid, family_id: Number(f.familia_id), serial: f.serie, model: f.modelo || null, ubicacion: f.comuna || null }]);
      }
      emit(); onOk();
      avisar('✔ OT-' + (maxN + 1) + ' creada · checklist ' + checklist + (f.fecha ? ' · programada ' + f.fecha : ''), T.ok);
      setF({ cliente: '', nuevo: false, nombre: '', rut: '', region_id: f.region_id, comuna: '', direccion: '', lugar: 'domicilio', lugar_id: '', familia_id: '', modelo: '', serie: '', cantidad: 1, electrica: false, servicio: f.servicio, prioridad: 'media', descripcion: '', asig: '', fecha: '' });
    } catch (e) { avisar('⛔ ' + e.message, T.danger); }
    setBusy(false);
  }

  return (
    <div style={S.card}>
      <h2 style={S.h2}>Nueva OT (maestros definitivos)</h2>
      <p style={S.sub}>1 Cliente · 2 Lugar y dirección · 3 Equipo · 4 Servicio · 5 Checklist + fechas · 6 Asignación</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={S.label}>Cliente</label>
          <select style={S.input} value={f.cliente} onChange={function (e) { set('cliente', e.target.value); }} disabled={f.nuevo}>
            <option value="">— Seleccionar —</option>
            {cust.map(function (c) { return <option key={c.id} value={c.id}>{c.nombre}{c.rut ? ' · ' + c.rut : ''}</option>; })}
          </select>
          <label style={{ ...S.label, marginTop: 6 }}><input type="checkbox" checked={f.nuevo} onChange={function (e) { set('nuevo', e.target.checked); }} /> Crear cliente nuevo</label>
          {f.nuevo ? <div>
            <input style={S.input} placeholder="Nombre / razón social" value={f.nombre} onChange={function (e) { set('nombre', e.target.value); }} />
            <input style={{ ...S.input, marginTop: 6 }} placeholder="RUT" value={f.rut} onChange={function (e) { set('rut', e.target.value); }} />
          </div> : null}
        </div>
        <div>
          <label style={S.label}>Región / Comuna (maestro)</label>
          <select style={S.input} value={f.region_id} onChange={function (e) { set('region_id', e.target.value); set('comuna', ''); set('lugar_id', ''); }}>
            <option value="">— Región —</option>
            {regs.map(function (r) { return <option key={r.id} value={r.id}>{r.nombre}</option>; })}
          </select>
          <select style={{ ...S.input, marginTop: 6 }} value={f.comuna} onChange={function (e) { set('comuna', e.target.value); }} disabled={!f.region_id}>
            <option value="">{f.region_id ? '— Comuna —' : 'Primero elige región'}</option>
            {comunasDe.map(function (c) { return <option key={c.id} value={c.nombre}>{c.nombre}</option>; })}
          </select>
          <label style={S.label}>¿Dónde se realiza el servicio?</label>
          <select style={S.input} value={f.lugar} onChange={function (e) { set('lugar', e.target.value); set('lugar_id', ''); }}>
            <option value="domicilio">Domicilio del cliente</option>
            <option value="taller">Taller central (San Pablo 1910)</option>
            <option value="lugar">Mall / tienda (maestro)</option>
          </select>
          {f.lugar === 'lugar' ? <select style={{ ...S.input, marginTop: 6 }} value={f.lugar_id} onChange={function (e) { set('lugar_id', e.target.value); }}>
            <option value="">— Selecciona mall / tienda —</option>
            {lugaresDe.map(function (l) { return <option key={l.id} value={l.id}>{l.tipo === 'mall' ? '🛍 ' : '🏬 '}{l.nombre}{l.comuna ? ' · ' + l.comuna : ' · nacional'}</option>; })}
          </select> : null}
          <input style={{ ...S.input, marginTop: 6 }} placeholder="Dirección del cliente (si aplica)" value={f.direccion} onChange={function (e) { set('direccion', e.target.value); }} />
        </div>
        <div>
          <label style={S.label}>Familia / Modelo / Serie</label>
          <select style={S.input} value={f.familia_id} onChange={function (e) { onFamilia(e.target.value); }}>
            <option value="">— Familia —</option>
            {fams.map(function (x) { return <option key={x.id} value={x.id}>{x.name} ({x.tipo})</option>; })}
          </select>
          <select style={{ ...S.input, marginTop: 6 }} value={f.modelo} onChange={function (e) { set('modelo', e.target.value); }}>
            <option value="">— Modelo del catálogo (opcional) —</option>
            {modelos.map(function (p) { return <option key={p.id} value={p.model}>{p.model} · {p.sku}</option>; })}
          </select>
          <input style={{ ...S.input, marginTop: 6 }} placeholder="N° de serie" value={f.serie} onChange={function (e) { set('serie', e.target.value); }} />
          <label style={{ ...S.label, marginTop: 6 }}><input type="checkbox" checked={f.electrica} onChange={function (e) { set('electrica', e.target.checked); }} /> Equipo eléctrico (solo familias eléctricas; se ajusta solo al cambiar familia)</label>
        </div>
        <div>
          <label style={S.label}>Servicio / Cantidad / Prioridad</label>
          <select style={S.input} value={f.servicio} onChange={function (e) { set('servicio', e.target.value); }}>
            {servs.map(function (s) { return <option key={s.id} value={s.code}>{s.nombre}</option>; })}
          </select>
          <input style={{ ...S.input, marginTop: 6 }} type="number" min="1" value={f.cantidad} onChange={function (e) { set('cantidad', e.target.value); }} />
          <select style={{ ...S.input, marginTop: 6 }} value={f.prioridad} onChange={function (e) { set('prioridad', e.target.value); }}>
            <option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option>
          </select>
        </div>
      </div>
      <div style={{ ...S.card, background: T.surface2, marginTop: 12 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <b style={{ fontSize: 13 }}>Checklist automático: {checklist}</b>
          <span>· Tipo equipo: {tipoEq || '—'} · Modalidad: {mod}</span>
          <label style={{ fontSize: 13 }}>· <b>Fecha programada (la agendas tú):</b>
            <input style={{ ...S.input, width: 150, marginLeft: 6 }} type="date" value={f.fecha} onChange={function (e) { set('fecha', e.target.value); }} />
          </label>
        </div>
        <p style={{ margin: '8px 0 0', fontSize: 13, fontWeight: 700, color: fueraSLA ? T.danger : T.text }}>
          Límite SLA (fecha promesa, para el semáforo): {promesa} ({slaDias} días)
          {fueraSLA ? ' · ⚠ OJO: programaste después del límite SLA' : ''}
        </p>
      </div>
      <div style={{ marginTop: 12 }}>
        <label style={S.label}>Asignación (★ = coincide región/especialidad · carga = OTs abiertas)</label>
        <select style={S.input} value={f.asig} onChange={function (e) { set('asig', e.target.value); }}>
          <option value="">— Sin asignar (queda en buzón) —</option>
          <optgroup label={'Técnicos internos (' + tecInternos.length + ')'}>
            {tecInternos.map(function (u) { return <option key={'tec:' + u.id} value={'tec:' + u.id}>{u.nombre} · carga {carga['u' + u.id] || 0}</option>; })}
          </optgroup>
          <optgroup label={'SSTT autorizados (' + satsOrdenados.length + ')'}>
            {satsOrdenados.map(function (s) { return <option key={'sat:' + s.id} value={'sat:' + s.id}>{s.ok ? '★ ' : ''}{s.nombre} ({s.esp || 'ambos'}) · carga {carga['s' + s.id] || 0}</option>; })}
          </optgroup>
        </select>
        <p style={S.sub}>Sugeridos (internos primero, luego SSTT de tu región): {sugeridos.join(' · ') || '—'}</p>
      </div>
      <textarea style={{ ...S.input, marginTop: 12, minHeight: 70 }} placeholder="Descripción / falla reportada" value={f.descripcion} onChange={function (e) { set('descripcion', e.target.value); }} />
      <button style={{ ...S.btn(T.ok), marginTop: 12 }} disabled={busy} onClick={crear}>{busy ? 'Creando…' : '✔ Crear OT'}</button>
    </div>
  );
}
