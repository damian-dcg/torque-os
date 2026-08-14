'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S, fmtCLP } from '../ui';
const WC_STATUS={'open':'Abierto','under_review':'En revisión','approved':'Aprobado','rejected':'Rechazado','rma_sent':'RMA enviado','resolved':'Resuelto','closed':'Cerrado'};
const WC_COLOR={'open':T.warn,'under_review':T.info,'approved':T.ok,'rejected':T.danger,'rma_sent':T.violet,'resolved':T.ok,'closed':T.muted};
export default function ModGarantias(props){
  var avisar=props.avisar||function(){};
  var [cases,setCases]=useState([]); var [contracts,setContracts]=useState([]);
  var [claims,setClaims]=useState([]); var [campaigns,setCampaigns]=useState([]);
  var [completions,setCompletions]=useState([]); var [certs,setCerts]=useState([]);
  var [bulletins,setBulletins]=useState([]);
  var [ots,setOts]=useState([]); var [assets,setAssets]=useState([]); var [cust,setCust]=useState({});
  var [tab,setTab]=useState('casos');
  async function cargar(){
    var r=await Promise.all([
      supabase.from('warranty_cases').select('*').order('id',{ascending:false}).limit(200),
      supabase.from('brand_contracts').select('*').order('id',{ascending:false}),
      supabase.from('brand_claims').select('*').order('id',{ascending:false}).limit(200),
      supabase.from('recall_campaigns').select('*').order('id',{ascending:false}),
      supabase.from('recall_completions').select('*').order('id',{ascending:false}).limit(200),
      supabase.from('technician_certs').select('*').order('id',{ascending:false}),
      supabase.from('brand_bulletins').select('*').order('id',{ascending:false}),
      supabase.from('work_orders').select('*').order('id',{ascending:false}).limit(300),
      supabase.from('assets').select('*').limit(300),
      supabase.from('customers').select('id,nombre')
    ]);
    setCases(r[0].data||[]); setContracts(r[1].data||[]); setClaims(r[2].data||[]);
    setCampaigns(r[3].data||[]); setCompletions(r[4].data||[]); setCerts(r[5].data||[]);
    setBulletins(r[6].data||[]); setOts(r[7].data||[]); setAssets(r[8].data||[]);
    var cm={}; (r[9].data||[]).forEach(function(c){cm[c.id]=c;}); setCust(cm);
  }
  useEffect(function(){ cargar(); },[]);
  function otOf(id){ return ots.find(function(o){return o.id===id;}); }
  function assetOf(id){ return assets.find(function(a){return a.id===id;}); }
  function contractActive(brand){
    var now=new Date();
    return contracts.find(function(c){ return c.brand_name===brand&&c.active&&(!c.end_date||new Date(c.end_date)>=now); });
  }
  function warrantyValid(a){
    if(!a) return false;
    if(a.warranty_until) return new Date(a.warranty_until)>=new Date();
    return false;
  }

  async function nuevoCaso(){
    var otId=Number(window.prompt('ID de OT:')); var ot=otOf(otId);
    if(!ot){ avisar('⛗ OT inválida',T.danger); return; }
    var asset=assetOf(ot.asset_id)||null;
    var brand=window.prompt('Marca (ej: Bianchi):')||'Bianchi';
    var type=window.prompt('Tipo (manufacturer/brand_service/supplier_part/internal_service/extended):','manufacturer')||'manufacturer';
    var valid=warrantyValid(asset);
    var contract=contractActive(brand);
    if(type!=='internal_service'&&!contract){ avisar('⚠ RN-05: sin contrato vigente de '+brand+'. Se crea como interno.',T.warn); }
    var cov=valid?'cubierta':'no_cubierta';
    await supabase.from('warranty_cases').insert([{ot_id:ot.id,asset_id:ot.asset_id||null,original_ot_id:null,brand_name:brand,type:type,serial:asset?asset.serial:null,status:'open',coverage:cov}]);
    avisar('✅ Caso creado · cobertura: '+cov+(valid?' (garantía vigente)':' (vencida)'),T.ok); cargar();
  }
  async function setStatus(c,st){
    var patch={status:st};
    if(st==='rma_sent') patch.rma_number='RMA-'+Date.now().toString().slice(-6);
    await supabase.from('warranty_cases').update(patch).eq('id',c.id);
    avisar('✅ Estado: '+WC_STATUS[st],T.ok); cargar();
  }
  async function enviarClaim(c){
    var num='CLM-'+Date.now().toString().slice(-6);
    await supabase.from('brand_claims').insert([{warranty_case_id:c.id,claim_number:num,status:'submitted'}]);
    avisar('✅ Reclamo '+num+' enviado a '+c.brand_name,T.ok); cargar();
  }
  async function resolverClaim(cl){
    var st=window.prompt('Estado (approved/rejected):','approved');
    var amt=Number(window.prompt('Monto aprobado/reembolso:')||0);
    await supabase.from('brand_claims').update({status:st,approved_amount:amt}).eq('id',cl.id);
    if(st==='approved') await supabase.from('warranty_cases').update({approved_cost:amt,status:'resolved'}).eq('id',cl.warranty_case_id);
    avisar('✅ Reclamo '+st+(amt?(' · reembolso '+fmtCLP(amt)):''),T.ok); cargar();
  }
  async function nuevaCampana(){
    var brand=window.prompt('Marca:')||'Bianchi';
    var code=window.prompt('Código de campaña:')||'RC-'+Date.now().toString().slice(-4);
    var desc=window.prompt('Descripción:')||'';
    var pattern=window.prompt('Patrón de serie afectado (ej: BFT25):')||'';
    await supabase.from('recall_campaigns').insert([{brand_name:brand,code:code,description:desc,serial_pattern:pattern}]);
    avisar('✅ Campaña creada',T.ok); cargar();
  }
  async function afectados(camp){
    var list=assets.filter(function(a){ return !camp.serial_pattern||String(a.serial||'').toUpperCase().indexOf(String(camp.serial_pattern).toUpperCase())===0; });
    for(var i=0;i<list.length;i++){
      var a=list[i]; var c=cust[a.customer_id]||{};
      var done=completions.some(function(x){return x.campaign_id===camp.id&&x.asset_id===a.id;});
      if(done) continue;
      var ok=window.confirm('Notificar y crear OT de campaña para '+ (c.nombre||'cliente') +' · serie '+a.serial+'?');
      if(!ok) continue;
      var ot=await supabase.from('work_orders').insert([{customer_id:a.customer_id,asset_id:a.id,tipo:'recall',estado:'Ingresada',canal:'interno',descripcion:'Campaña '+camp.code+' · '+camp.description}]).select();
      await supabase.from('notifications').insert([{rol_destino:'agente',tipo:'recall',titulo:'Recall '+camp.code+' · '+(c.nombre||''),ot_id:ot.data&&ot.data[0]?ot.data[0].id:null}]);
    }
    avisar('✅ OTs de campaña generadas',T.ok); cargar();
  }
  async function completarRecall(camp){
    var assetId=Number(window.prompt('ID del activo completado:'));
    var otId=Number(window.prompt('ID de OT:')||0)||null;
    await supabase.from('recall_completions').insert([{campaign_id:camp.id,asset_id:assetId,ot_id:otId}]);
    avisar('✅ Recall completado',T.ok); cargar();
  }
  async function nuevoCert(){
    var tech=window.prompt('Técnico:'); if(!tech)return;
    var brand=window.prompt('Marca:')||'Bianchi';
    var cert=window.prompt('Certificación:')||'';
    var until=window.prompt('Vigente hasta (YYYY-MM-DD):')||null;
    await supabase.from('technician_certs').insert([{technician_name:tech,brand_name:brand,cert_name:cert,valid_until:until}]);
    avisar('✅ Certificado registrado',T.ok); cargar();
  }

  return (
    <div>
      <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
        {['casos','contratos','claims','recalls','certs'].map(function(t){
          return <button key={t} onClick={function(){ setTab(t); }} style={{padding:'8px 14px',borderRadius:999,border:tab===t?'0':'1px solid '+T.border,background:tab===t?T.brand:'transparent',color:tab===t?'#fff':T.text,fontWeight:600,fontSize:13,cursor:'pointer'}}>{t}</button>;
        })}
      </div>

      {tab==='casos'? <div style={S.card}>
        <div style={{display:'flex',justifyContent:'space-between',gap:8,marginBottom:10}}>
          <h2 style={S.h2}>Casos de garantía ({cases.length})</h2>
          <button style={{...S.btn(T.brand),width:'auto',marginBottom:0}} onClick={nuevoCaso}>+ Caso</button>
        </div>
        {cases.map(function(c){ var o=otOf(c.ot_id);
          return <div key={c.id} style={{border:'1px solid '+T.border,borderRadius:10,padding:12,marginBottom:10,background:T.surface2}}>
            <div style={{display:'flex',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}>
              <b>Caso #{c.id} · {c.brand_name} · OT-{o?o.ot_number:'?'}</b>
              <span style={S.pill(WC_COLOR[c.status]||T.muted)}>{WC_STATUS[c.status]||c.status}</span>
            </div>
            <p style={{...S.sub,margin:'6px 0'}}>Serie {c.serial||'—'} · Tipo {c.type} · Cobertura <b style={{color:c.coverage==='cubierta'?T.ok:T.danger}}>{c.coverage}</b> · RMA {c.rma_number||'—'}</p>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              <button style={{...S.btnO(T.info),width:'auto',marginBottom:0}} onClick={function(){ setStatus(c,'under_review'); }}>Revisar</button>
              <button style={{...S.btnO(T.ok),width:'auto',marginBottom:0}} onClick={function(){ setStatus(c,'approved'); }}>Aprobar</button>
              <button style={{...S.btnO(T.violet),width:'auto',marginBottom:0}} onClick={function(){ setStatus(c,'rma_sent'); }}>Enviar RMA</button>
              <button style={{...S.btnO(T.warn),width:'auto',marginBottom:0}} onClick={function(){ enviarClaim(c); }}>Reclamo a marca</button>
              <button style={{...S.btnO(T.muted),width:'auto',marginBottom:0}} onClick={function(){ setStatus(c,'closed'); }}>Cerrar</button>
            </div>
          </div>;
        })}
        {cases.length===0? <p style={S.sub}>Sin casos de garantía.</p> : null}
      </div> : null}

      {tab==='contratos'? <div style={S.card}>
        <h2 style={S.h2}>Contratos de marca ({contracts.length})</h2>
        {contracts.map(function(c){
          var now=new Date(); var vig=c.active&&(!c.end_date||new Date(c.end_date)>=now);
          return <div key={c.id} style={{border:'1px solid '+T.border,borderRadius:10,padding:10,marginBottom:8,background:T.surface2}}>
            <div style={{display:'flex',justifyContent:'space-between',gap:8}}>
              <b>{c.brand_name}</b><span style={S.pill(vig?T.ok:T.danger)}>{vig?'VIGENTE':'VENCIDO'}</span>
            </div>
            <p style={{...S.sub,margin:'4px 0'}}>{c.start_date||'—'} → {c.end_date||'—'} · Tarifa MO {fmtCLP(c.labor_rate)} · Categorías {(c.categories||[]).join(', ')}</p>
          </div>;
        })}
        {contracts.length===0? <p style={S.sub}>Sin contratos. La validación RN-05 usa estos contratos.</p> : null}
      </div> : null}

      {tab==='claims'? <div style={S.card}>
        <h2 style={S.h2}>Reclamos a marca / reembolsos ({claims.length})</h2>
        {claims.map(function(cl){ var c=cases.find(function(x){return x.id===cl.warranty_case_id;});
          return <div key={cl.id} style={{border:'1px solid '+T.border,borderRadius:10,padding:10,marginBottom:8,background:T.surface2}}>
            <div style={{display:'flex',justifyContent:'space-between',gap:8}}>
              <b>{cl.claim_number} · {c?c.brand_name:'—'}</b>
              <span style={S.pill(cl.status==='approved'?T.ok:cl.status==='rejected'?T.danger:T.warn)}>{cl.status}</span>
            </div>
            <p style={{...S.sub,margin:'4px 0'}}>Reembolso {fmtCLP(cl.approved_amount)}</p>
            {cl.status==='submitted'? <button style={{...S.btnO(T.ok),width:'auto',marginBottom:0}} onClick={function(){ resolverClaim(cl); }}>Resolver</button> : null}
          </div>;
        })}
        {claims.length===0? <p style={S.sub}>Sin reclamos.</p> : null}
      </div> : null}

      {tab==='recalls'? <div style={S.card}>
        <div style={{display:'flex',justifyContent:'space-between',gap:8,marginBottom:10}}>
          <h2 style={S.h2}>Recalls / campañas ({campaigns.length})</h2>
          <button style={{...S.btn(T.brand),width:'auto',marginBottom:0}} onClick={nuevaCampana}>+ Campaña</button>
        </div>
        {campaigns.map(function(cp){
          var done=completions.filter(function(x){return x.campaign_id===cp.id;}).length;
          var aff=assets.filter(function(a){ return !cp.serial_pattern||String(a.serial||'').toUpperCase().indexOf(String(cp.serial_pattern).toUpperCase())===0; }).length;
          return <div key={cp.id} style={{border:'1px solid '+T.border,borderRadius:10,padding:10,marginBottom:8,background:T.surface2}}>
            <div style={{display:'flex',justifyContent:'space-between',gap:8}}>
              <b>{cp.code} · {cp.brand_name}</b><span style={S.pill(cp.active?T.ok:T.muted)}>{cp.active?'activa':'cerrada'}</span>
            </div>
            <p style={{...S.sub,margin:'4px 0'}}>{cp.description} · Afectados ~{aff} · Completados {done}</p>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              <button style={{...S.btnO(T.warn),width:'auto',marginBottom:0}} onClick={function(){ afectados(cp); }}>Notificar + OTs</button>
              <button style={{...S.btnO(T.ok),width:'auto',marginBottom:0}} onClick={function(){ completarRecall(cp); }}>Completar</button>
            </div>
          </div>;
        })}
        {campaigns.length===0? <p style={S.sub}>Sin campañas de recall.</p> : null}
      </div> : null}

      {tab==='certs'? <div style={S.card}>
        <div style={{display:'flex',justifyContent:'space-between',gap:8,marginBottom:10}}>
          <h2 style={S.h2}>Técnicos certificados ({certs.length})</h2>
          <button style={{...S.btn(T.brand),width:'auto',marginBottom:0}} onClick={nuevoCert}>+ Certificado</button>
        </div>
        {certs.map(function(c){
          var exp=c.valid_until&&new Date(c.valid_until)<new Date();
          return <p key={c.id} style={{fontSize:13,margin:'4px 0'}}>{c.technician_name} · {c.brand_name} · {c.cert_name} · <span style={{color:exp?T.danger:T.ok}}>{exp?'VENCIDO':'vigente hasta '+c.valid_until}</span></p>;
        })}
        {certs.length===0? <p style={S.sub}>Sin certificaciones.</p> : null}
      </div> : null}
    </div>);
}
