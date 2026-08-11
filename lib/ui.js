export const T = { bg:'#E2E6EB', surface:'#F6F7F9', surface2:'#E7EAEE', border:'#BFC9D4', text:'#131C26', muted:'#44566A', brand:'#0E8074', ok:'#15803D', warn:'#B45309', danger:'#B91C1C', info:'#1D4ED8', violet:'#6D28D9', teal:'#0F766E', fam:"'Inter','Segoe UI',system-ui,Arial,sans-serif", r:12 };
export const S = {
  main:{minHeight:'100vh',background:T.bg,color:T.text,fontFamily:T.fam},
  wrap:{padding:'20px 18px',maxWidth:1280,margin:'0 auto'},
  card:{background:T.surface,border:'1px solid '+T.border,borderRadius:T.r,padding:16,marginBottom:14},
  h1:{margin:0,fontSize:20,fontWeight:800,color:T.text},
  h2:{margin:'0 0 12px',fontSize:15,fontWeight:800,color:T.text},
  sub:{color:T.muted,fontSize:13},
  label:{display:'block',fontSize:12,fontWeight:600,color:T.muted,marginBottom:6},
  input:{width:'100%',padding:11,borderRadius:8,border:'1px solid '+T.border,background:'#fff',color:T.text,fontSize:14,boxSizing:'border-box',marginBottom:12},
  btn:function(bg,fg){ return {width:'100%',padding:13,borderRadius:8,border:0,background:bg||T.brand,color:fg||'#fff',fontWeight:700,fontSize:14,cursor:'pointer',marginBottom:10}; },
  btnO:function(c){ return {width:'100%',padding:11,borderRadius:8,border:'1.5px solid '+(c||T.muted),background:'transparent',color:c||T.muted,fontWeight:700,fontSize:13,cursor:'pointer',marginBottom:10}; },
  pill:function(c){ return {display:'inline-block',padding:'3px 10px',borderRadius:999,fontSize:11,fontWeight:700,background:c+'1F',color:c,whiteSpace:'nowrap'}; },
  th:{textAlign:'left',fontSize:11,fontWeight:700,color:T.muted,textTransform:'uppercase',padding:'10px 12px',borderBottom:'1px solid '+T.border,background:T.surface2},
  td:{padding:'10px 12px',borderBottom:'1px solid '+T.border,fontSize:14,color:T.text,verticalAlign:'top'},
  toast:function(c){ return {position:'fixed',bottom:24,left:16,right:16,zIndex:99,background:'#111827',border:'2px solid '+c,color:'#fff',borderRadius:12,padding:'14px 18px',fontWeight:700,fontSize:14,textAlign:'center',pointerEvents:'none'}; },
  modal:{position:'fixed',inset:0,background:'rgba(15,23,42,.55)',display:'grid',placeItems:'center',padding:20,zIndex:60},
  modalCard:{background:T.surface,border:'1px solid '+T.border,borderRadius:16,padding:20,width:'100%',maxWidth:560,color:T.text}
};
export function estColor(e){ return {'Ingresada':T.info,'Asignada':T.info,'Aceptada':T.teal,'Rechazada':T.danger,'En Ruta':T.warn,'Llegada':T.teal,'Trabajando':T.warn,'Esperando Repuesto':T.danger,'Finalizada':T.ok,'Revisión QA':T.violet,'Cerrada':T.ok,'Anulada':T.muted}[e]||T.muted; }
export function fmtCLP(n){ return '$'+Number(n||0).toLocaleString('es-CL'); }
export function fmtFecha(d){ return d?new Date(d).toLocaleString('es-CL',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'—'; }
