export const T = {
  bg:'#0B1220', surface:'#111A2E', surface2:'#16233C', border:'#233250',
  text:'#E8EEF7', muted:'#8FA3BF',
  brand:'#FF6B2C', ok:'#2FD47E', warn:'#FFB020', danger:'#FF5C5C', info:'#3EA6FF', violet:'#9D7BFF', teal:'#2CD4BF',
  fam:"-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif",
  r:12
};
export const S = {
  main:{minHeight:'100vh',background:T.bg,color:T.text,fontFamily:T.fam},
  wrap:{maxWidth:1200,margin:'0 auto',padding:'20px 16px'},
  card:{background:T.surface,border:`1px solid ${T.border}`,borderRadius:T.r,padding:16,marginBottom:14},
  h1:{margin:0,fontSize:22,fontWeight:800,letterSpacing:.3},
  h2:{margin:'0 0 12px',fontSize:15,fontWeight:800},
  sub:{color:T.muted,fontSize:13},
  label:{display:'block',fontSize:12,fontWeight:600,color:T.muted,marginBottom:6},
  input:{width:'100%',padding:12,borderRadius:10,border:`1px solid ${T.border}`,background:T.bg,color:T.text,fontSize:15,boxSizing:'border-box',marginBottom:12},
  btn:(bg=T.brand,fg='#0B1220')=>({width:'100%',padding:14,borderRadius:12,border:0,background:bg,color:fg,fontWeight:800,fontSize:15,cursor:'pointer',marginBottom:10}),
  btnO:(c=T.muted)=>({width:'100%',padding:12,borderRadius:12,border:`1.5px solid ${c}`,background:'transparent',color:c,fontWeight:700,fontSize:14,cursor:'pointer',marginBottom:10}),
  pill:(c)=>({display:'inline-block',padding:'4px 10px',borderRadius:999,fontSize:11,fontWeight:800,background:c+'26',color:c,whiteSpace:'nowrap'}),
  th:{textAlign:'left',fontSize:11,fontWeight:700,color:T.muted,textTransform:'uppercase',letterSpacing:.5,padding:'10px 12px',borderBottom:`1px solid ${T.border}`},
  td:{padding:'10px 12px',borderBottom:`1px solid ${T.border}55`,fontSize:14,verticalAlign:'top'},
  row:{display:'flex',gap:8,flexWrap:'wrap'},
  toast:(c)=>({position:'fixed',bottom:24,left:16,right:16,zIndex:99,background:T.surface,border:`2px solid ${c}`,color:c,borderRadius:12,padding:'14px 18px',fontWeight:800,fontSize:15,textAlign:'center',boxShadow:'0 8px 30px rgba(0,0,0,.55)',pointerEvents:'none',fontFamily:T.fam}),
  modal:{position:'fixed',inset:0,background:'rgba(4,8,16,.82)',display:'grid',placeItems:'center',padding:20,zIndex:60},
  modalCard:{background:T.surface,border:`1px solid ${T.border}`,borderRadius:16,padding:20,width:'100%',maxWidth:460}
};
export const estColor = e => ({
  'Ingresada':T.info,'Asignada':T.info,'Aceptada':T.teal,'Rechazada':T.danger,
  'En Ruta':T.brand,'Llegada':T.teal,'Trabajando':T.warn,'Esperando Repuesto':T.danger,
  'Finalizada':T.ok,'Revisión QA':T.violet,'Cerrada':T.ok,'Anulada':T.muted
}[e] || T.muted);
export const fmtCLP = n => '$'+Number(n||0).toLocaleString('es-CL');
export const fmtFecha = d => d ? new Date(d).toLocaleString('es-CL',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}) : '—';
