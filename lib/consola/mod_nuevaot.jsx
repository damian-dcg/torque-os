'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S } from '../ui';
import { emit } from '../data';

var SVC_SHORT = { 'ARMADO':'ARM','GARANTIA':'GAR','EVALUACION':'EVA','MANTENCION':'MAN','POST VENTA':'POS','RECLAMO':'REC','DEVOLUCION':'DEV','CAMBIO':'CAM','DESPACHO':'DES','LEVANTAMIENTO':'LEV','RETIRO':'RET','ANULACION':'ANU' };
var FAM_ELECTRICAS = ['BICICLETA ELECTRICA', 'SCOOTER ELECTRICO', 'TROTADORA'];
var PORTAL_DEF = { flujo: 'armado_final', nombre: '', rut: '', telefono: '', whatsapp: '', email: '', region_id: '', comuna: '', direccion: '', boleta: '', fecha_compra: '', tienda: '', producto: '', modelo_ot: '', falla: '', cantidad: 1, direccion_bodega: '' };

export default function ModNuevaOT(props) {
  var avisar = props.avisar || function () {};
  var onOk = props.onOk || function () {};
  var [cust, setCust] = useState([]); var [fams, setFams] = useState([]); var [prods, setProds] = useState([]);
  var [servs, setServs] = useState([]); var [sla, setSla] = useState([]); var [regs, setRegs] = useState([]);
  var [coms, setComs] = useState([]); var [lugs, setLugs] = useState([]); var [sats, setSats] = useState([]);
  var [users, setUsers] = useState([]); var [carga, setCarga] = useState({}); var [busy, setBusy] = useState(false);
  var [f, setF] = useState({ cliente: '', modal: false, portal: Object.assign({}, PORTAL_DEF), direccion: '', lugar: 'domicilio', lugar_id: '', familia_id: '', modelo: '', serie: '', cantidad: 1, electrica: false, servicio: 'ARMADO', prioridad: 'media', descripcion: '', asig: '', fecha: '' });
  function set(k, v) { setF(function (o) { var n = Object.assign({}, o); n[k] = v; return n; }); }
  function setP(k, v) { setF(function (o) { var n = Object.assign({}, o); n.portal = Object.assign({}, o.portal, { [k]: v }); return n; }); }
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

  var clienteSel = null; cust.forEach(function (c) { if (c.id === Number(f.cliente)) clienteSel = c; });
  var regActiva = clienteSel && clienteSel.region_id ? String(clienteSel.region_id) : f.region_id_ot || '';
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
  var comunasDe = coms.filter(function (c) { return c.region_id === Number(f.portal.region_id); });
  var lugaresDe = lugs.filter(function (l) { return l.activo !== false && (!regActiva || !l.region_id || l.region_id === Number(regActiva)); });
  var lugarSel = null; lugs.forEach(function (l) { if (l.id === Number(f.lugar_id)) lugarSel = l; });
  var espReq = fam ? (fam.tipo === 'BICICLETA' ? 'bici' : fam.tipo === 'MAQUINA' ? 'fitness' : null) : null;
  var tecInternos = users.filter(function (u) { return u.rol === 'tecnico' || u.rol === 'tecnico_sat'; });
  var satsOrdenados = sats.map(function (s) {
    return { id: s.id, nombre: s.nombre, esp: s.especialidad, ok: (!regActiva || s.region_id === Number(regActiva)) && (!espReq || s.especialidad === 'ambos' || s.especialidad === espReq) };
  }).sort(function (a, b) { return (b.ok ? 1 : 0) - (a.ok ? 1 : 0) || (carga['s' + a.id] || 0) - (carga['s' + b.id] || 0); });
  var sugeridos = tecInternos.slice(0, 3).map(function (u) { return u.nombre; })
    .concat(satsOrdenados.filter(function (s) { return s.ok; }).slice(0, 3).map(function (s) { return s.nombre; }));
  var P = f.portal;

  async function crearCliente() {
    if (!P.nombre) { avisar('⛔ Nombre / razón social obligatorio', T.danger); return; }
    var tipoC = P.flujo === 'armado_retail' ? 'retail' : 'final';
    var ci = await supabase.from('customers').insert([{ tenant_id: 'dcg', nombre: P.nombre, rut: P.rut || null, tipo: tipoC, telefono: P.telefono || null, whatsapp: P.whatsapp || null, email: P.email || null, region_id: P.region_id ? Number(P.region_id) : null, comuna: P.comuna || null, direccion: P.direccion || null }]).select();
    if (ci.error) { avisar('⛔ ' + ci.error.message, T.danger); return; }
    var nc = ci.data[0];
    setCust(function (arr) { return arr.concat([nc]); });
    setF(function (o) { var n = Object.assign({}, o); n.cliente = String(nc.id); n.modal = false; return n; });
    avisar('✅ Cliente completo creado: ' + nc.nombre, T.ok);
  }

  async function crear() {
    setBusy(true);
    try {
      var cid = f.cliente ? Number(f.cliente) : null;
      if (!cid) { avisar('⛔ Selecciona o crea un cliente', T.danger); setBusy(false); return; }
      var dirOT = f.direccion || (lugarSel && lugarSel.address) || (clienteSel && clienteSel.direccion) || null;
      var mx = await supabase.from('work_orders').select('ot_number');
      var maxN = 50000; (mx.data || []).forEach(function (o) { var n = parseInt(o.ot_number, 10); if (!isNaN(n) && n > maxN) maxN = n; });
      var asigC = null, asigU = null;
      if (f.asig) { if (f.asig.indexOf('sat:') === 0) asigC = Number(f.asig.slice(4)); else asigU = Number(f.asig.slice(4)); }
      var portal = { flujo: P.flujo, boleta: P.boleta || null, fecha_compra: P.fecha_compra || null, tienda: P.tienda || null, producto: P.producto || null, modelo_ot: P.modelo_ot || null, falla: P.falla || null, cantidad: Number(P.cantidad) || 1, direccion_bodega: P.direccion_bodega || null };
      var wi = await supabase.from('work_orders').insert([{
        tenant_id: 'dcg', ot_number: String(maxN + 1), customer_id: cid,
        tipo: f.servicio, tipo_equipo: tipoEq || null, modalidad: mod,
        estado: asigC || asigU ? 'Asignada' : 'Ingresada', prioridad: f.prioridad, canal: 'interno',
        descripcion: f.descripcion || (P.falla ? 'Falla: ' + P.falla : null),
        region_id: regActiva ? Number(regActiva) : (clienteSel && clienteSel.region_id) || null,
        comuna: (clienteSel && clienteSel.comuna) || null,
        direccion: dirOT, lugar_tipo: f.lugar, lugar_id: f.lugar_id ? Number(f.lugar_id) : null,
        modelo: f.modelo || P.modelo_ot || null, modelo_limpio: String(f.modelo || P.modelo_ot || '').replace(/[\s.-]/g, '').toUpperCase() || null,
        cantidad_unidades: Number(f.cantidad) || 1, checklist_code: checklist,
        fecha_promesa: promesa, fecha_programada: f.fecha || null, quien_registra: 'consola',
        datos_portal: portal,
        asignado_company_id: asigC, asignado_user_id: asigU,
        kpi: { tipo_servicio: f.servicio, tipo_equipo: tipoEq }
      }]);
      if (wi.error) { avisar('⛔ ' + wi.error.message, T.danger); setBusy(false); return; }
      if (f.serie && f.familia_id) {
        await supabase.from('assets').insert([{ tenant_id: 'dcg', customer_id: cid, family_id: Number(f.familia_id), serial: f.serie, model: f.modelo || null, ubicacion: (clienteSel && clienteSel.comuna) || null }]);
      }
      emit(); onOk();
      avisar('✔ OT-' + (maxN + 1) + ' creada · checklist ' + checklist + (f.fecha ? ' · programada ' + f.fecha : ''), T.ok);
      setF({ cliente: '', modal: false, portal: Object.assign({}, PORTAL_DEF), direccion: '', lugar: 'domicilio', lugar_id: '', familia_id: '', modelo: '', serie: '', cantidad: 1, electrica: false, servicio: f.servicio, prioridad: 'media', descripcion: '', asig: '', fecha: '' });
    } catch (e) { avisar('⛔ ' + e.message, T.danger); }
    setBusy(false);
  }

  return (
    <div style={S.card}>
      <h2 style={S.h2}>Nueva OT (maestros definitivos)</h2>
      <p style={S.sub}>1 Cliente · 2 Lugar del servicio · 3 Equipo · 4 Servicio · 5 Checklist + fechas · 6 Asignación</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <label style={S.label}>Cliente</label>
          <select style={S.input} value={f.cliente} onChange={function (e) { set('cliente', e.target.value); }}>
            <option value="">— Seleccionar —</option>
            {cust.map(function (c) { return <option key={c.id} value={c.id}>{c.nombre}{c.rut ? ' · ' + c.rut : ''}</option>; })}
          </select>
          <button style={{ ...S.btnO(T.info), width: 'auto', marginBottom: 10 }} onClick={function () { set('modal', true); }}>＋ Crear cliente nuevo (panel completo)</button>
          {clienteSel ? <div style={{ ...S.card, background: T.surface2, marginBottom: 0 }}>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 14 }}>{clienteSel.nombre} <span style={{ color: T.muted, fontWeight: 600 }}>· {clienteSel.tipo}</span></p>
            <p style={{ ...S.sub, margin: '4px 0' }}>RUT {clienteSel.rut || '—'} · {clienteSel.telefono || clienteSel.whatsapp || 'sin teléfono'} · {clienteSel.email || 'sin email'}</p>
            <p style={{ ...S.sub, margin: '0 0 8px' }}>{clienteSel.direccion || 'sin dirección'}{clienteSel.comuna ? ', ' + clienteSel.comuna : ''}</p>
            <input style={{ ...S.input, marginBottom: 0 }} placeholder="Dirección distinta para esta OT (opcional)" value={f.direccion} onChange={function (e) { set('direccion', e.target.value); }} />
          </div> : null}
        </div>
        <div>
          <label style={S.label}>¿Dónde se realiza el servicio?</label>
          <select style={S.input} value={f.lugar} onChange={function (e) { set('lugar', e.target.value); set('lugar_id', ''); }}>
            <option value="domicilio">Domicilio del cliente</option>
            <option value="taller">Taller central (San Pablo 1910)</option>
            <option value="lugar">Mall / tienda (maestro)</option>
          </select>
          {f.lugar === 'lugar' ? <select style={S.input} value={f.lugar_id} onChange={function (e) { set('lugar_id', e.target.value); }}>
            <option value="">— Selecciona mall / tienda —</option>
            {lugaresDe.map(function (l) { return <option key={l.id} value={l.id}>{l.tipo === 'mall' ? '🛍 ' : '🏬 '}{l.nombre}{l.comuna ? ' · ' + l.comuna : ' · nacional'}</option>; })}
          </select> : null}
          {f.lugar === 'domicilio' ? <p style={S.sub}>Se usará la dirección del cliente{clienteSel ? ': ' + (clienteSel.direccion || '—') : ''}.</p> : null}
          {f.lugar === 'lugar' && lugarSel ? <p style={S.sub}>Dirección del punto: {lugarSel.address || 'por definir en el maestro'}.</p> : null}
        </div>
        <div>
          <label style={S.label}>Familia / Modelo / Serie</label>
          <select style={S.input} value={f.familia_id} onChange={function (e) { onFamilia(e.target.value); }}>
            <option value="">— Familia —</option>
            {fams.map(function (x) { return <option key={x.id} value={x.id}>{x.name} ({x.tipo})</option>; })}
          </select>
          <select style={S.input} value={f.modelo} onChange={function (e) { set('modelo', e.target.value); }}>
            <option value="">— Modelo del catálogo (opcional) —</option>
            {modelos.map(function (p) { return <option key={p.id} value={p.model}>{p.model} · {p.sku}</option>; })}
          </select>
          <input style={S.input} placeholder="N° de serie" value={f.serie} onChange={function (e) { set('serie', e.target.value); }} />
          <label style={{ ...S.label, marginBottom: 0 }}><input type="checkbox" checked={f.electrica} onChange={function (e) { set('electrica', e.target.checked); }} /> Equipo eléctrico (solo familias eléctricas; se ajusta solo al cambiar familia)</label>
        </div>
        <div>
          <label style={S.label}>Servicio / Cantidad / Prioridad</label>
          <select style={S.input} value={f.servicio} onChange={function (e) { set('servicio', e.target.value); }}>
            {servs.map(function (s) { return <option key={s.id} value={s.code}>{s.nombre}</option>; })}
          </select>
          <input style={S.input} type="number" min="1" value={f.cantidad} onChange={function (e) { set('cantidad', e.target.value); }} />
          <select style={S.input} value={f.prioridad} onChange={function (e) { set('prioridad', e.target.value); }}>
            <option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option>
          </select>
        </div>
      </div>
      <div style={{ ...S.card, background: T.surface2, marginTop: 14 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <b style={{ fontSize: 13 }}>Checklist automático: {checklist}</b>
          <span>· Tipo equipo: {tipoEq || '—'} · Modalidad: {mod}</span>
          <label style={{ fontSize: 13 }}>· <b>Fecha programada (la agendas tú):</b>
            <input style={{ ...S.input, width: 150, marginLeft: 6, marginBottom: 0 }} type="date" value={f.fecha} onChange={function (e) { set('fecha', e.target.value); }} />
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

      {f.modal ? <div style={S.modal}>
        <div style={S.modalCard} onClick={function (e) { e.stopPropagation(); }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 800 }}>Crear cliente + solicitud (igual que /solicitud)</h3>
          <label style={S.label}>Tipo de solicitud</label>
          <select style={S.input} value={P.flujo} onChange={function (e) { setP('flujo', e.target.value); }}>
            <option value="armado_final">Armado · cliente final</option>
            <option value="armado_retail">Armado · retail / volumen</option>
            <option value="garantia">Garantía</option>
            <option value="postventa">Post-venta</option>
          </select>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input style={S.input} placeholder={P.flujo === 'armado_retail' ? 'Razón social *' : 'Nombre completo *'} value={P.nombre} onChange={function (e) { setP('nombre', e.target.value); }} />
            <input style={S.input} placeholder="RUT" value={P.rut} onChange={function (e) { setP('rut', e.target.value); }} />
            <input style={S.input} placeholder="Teléfono" value={P.telefono} onChange={function (e) { setP('telefono', e.target.value); }} />
            <input style={S.input} placeholder="WhatsApp" value={P.whatsapp} onChange={function (e) { setP('whatsapp', e.target.value); }} />
            <input style={S.input} placeholder="Email" value={P.email} onChange={function (e) { setP('email', e.target.value); }} />
            <select style={S.input} value={P.region_id} onChange={function (e) { setP('region_id', e.target.value); setP('comuna', ''); }}>
              <option value="">— Región —</option>
              {regs.map(function (r) { return <option key={r.id} value={r.id}>{r.nombre}</option>; })}
            </select>
            <select style={S.input} value={P.comuna} onChange={function (e) { setP('comuna', e.target.value); }} disabled={!P.region_id}>
              <option value="">{P.region_id ? '— Comuna —' : 'Primero región'}</option>
              {comunasDe.map(function (c) { return <option key={c.id} value={c.nombre}>{c.nombre}</option>; })}
            </select>
            <input style={S.input} placeholder="Dirección" value={P.direccion} onChange={function (e) { setP('direccion', e.target.value); }} />
          </div>
          <div style={{ ...S.card, background: T.surface2, padding: 10 }}>
            <b style={{ fontSize: 12, color: T.muted }}>DATOS DE LA SOLICITUD (van a la OT, no al cliente)</b>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 6 }}>
              {P.flujo !== 'postventa' ? <input style={S.input} placeholder="N° boleta / factura" value={P.boleta} onChange={function (e) { setP('boleta', e.target.value); }} /> : null}
              {P.flujo !== 'postventa' ? <input style={S.input} type="date" value={P.fecha_compra} onChange={function (e) { setP('fecha_compra', e.target.value); }} /> : null}
              {P.flujo === 'armado_final' || P.flujo === 'garantia' ? <input style={S.input} placeholder="Tienda de compra" value={P.tienda} onChange={function (e) { setP('tienda', e.target.value); }} /> : null}
              {P.flujo === 'armado_retail' ? <input style={S.input} type="number" min="1" placeholder="Cantidad unidades" value={P.cantidad} onChange={function (e) { setP('cantidad', e.target.value); }} /> : null}
              {P.flujo === 'armado_retail' ? <input style={S.input} placeholder="Dirección bodega / tienda" value={P.direccion_bodega} onChange={function (e) { setP('direccion_bodega', e.target.value); }} /> : null}
              <input style={S.input} placeholder="Producto" value={P.producto} onChange={function (e) { setP('producto', e.target.value); }} />
              <input style={S.input} placeholder="Modelo" value={P.modelo_ot} onChange={function (e) { setP('modelo_ot', e.target.value); }} />
              {P.flujo === 'garantia' || P.flujo === 'postventa' ? <input style={{ ...S.input, gridColumn: '1/-1' }} placeholder="Falla reportada" value={P.falla} onChange={function (e) { setP('falla', e.target.value); }} /> : null}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button style={{ ...S.btn(T.ok), flex: 1 }} onClick={crearCliente}>✔ Crear cliente y vincular</button>
            <button style={{ ...S.btn(T.muted), width: 120 }} onClick={function () { set('modal', false); }}>Cancelar</button>
          </div>
        </div>
      </div> : null}
    </div>
  );
}
