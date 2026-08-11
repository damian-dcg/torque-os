'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { T, S } from '../ui';
import TablaPro from './TablaPro';
import ImportExport from './ImportExport';

export default function ModProductos(props){
  var avisar=props.avisar||function(){};
  var s1=useState([]),rows=s1[0],setRows=s1[1];
  var s2=useState([]),fams=s2[0],setFams=s2[1];
  async function cargar(){
    var r=await Promise.all([
      supabase.from('product_catalog').select('*').order('id',{ascending:false}).limit(500),
      supabase.from('product_families').select('*')
    ]);
    setRows(r[0].data||[]); setFams(r[1].data||[]);
  }
  useEffect(function(){ cargar(); },[]);
  return (
    <div>
      <ImportExport nombre="PRODUCTOS" headers={['brand','model','sku','warranty_months','warranty_conditions']} onRows={async function(rs){
        var n=0;
        for(var i=0;i<rs.length;i++){
          var r=rs[i];
          if(!r.model&&!r.sku) continue;
          var e=await supabase.from('product_catalog').insert([{brand:r.brand||null,model:r.model||null,sku:r.sku||null,warranty_months:Number(r.warranty_months)||6,warranty_conditions:r.warranty_conditions||null}]);
          if(!e.error) n++;
        }
        cargar();
        return '✅ '+n+' productos cargados';
      }}/>
      <TablaPro titulo="Fichas de producto (garantía configurable)" rows={rows}
        campos={[['brand','Marca'],['model','Modelo'],['sku','SKU'],['warranty_months','Garantía (meses)','num'],['warranty_conditions','Condiciones']]}
        onEdit={function(r,k,v){ supabase.from('product_catalog').update({[k]:v}).eq('id',r.id).then(cargar); }}
        onAdd={function(f){ supabase.from('product_catalog').insert([{brand:f.brand||null,model:f.model||null,sku:f.sku||null,warranty_months:Number(f.warranty_months)||6,warranty_conditions:f.warranty_conditions||null}]).then(function(e){ if(e.error) avisar('⛗ '+e.error.message,T.danger); else cargar(); }); }}
        onDel={function(r){ if(window.confirm('¿Eliminar '+(r.model||r.sku)+'?')) supabase.from('product_catalog').delete().eq('id',r.id).then(cargar); }}
        addLabel="+ Nueva ficha"/>
    </div>);
}
