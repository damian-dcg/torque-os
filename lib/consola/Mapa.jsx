'use client';
import { useEffect, useRef } from 'react';
export default function Mapa(props){
  var markers=props.markers||[];
  var linea=props.linea||null;
  var ref=useRef(null); var mapRef=useRef(null);
  useEffect(function(){
    var done=function(){
      if(!window.L||!ref.current)return;
      if(mapRef.current){ mapRef.current.remove(); mapRef.current=null; }
      var map=window.L.map(ref.current);
      mapRef.current=map;
      window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap'}).addTo(map);
      var pts=[];
      markers.forEach(function(m){
        var mk=window.L.marker([m.lat,m.lng]).addTo(map);
        if(m.popup) mk.bindPopup(m.popup);
        pts.push([m.lat,m.lng]);
      });
      if(linea&&linea.length>1){ window.L.polyline(linea,{color:'#0E8074',weight:4}).addTo(map); }
      if(pts.length) map.fitBounds(pts,{padding:[30,30]}); else map.setView([-33.45,-70.66],5);
    };
    if(window.L){ done(); return; }
    var link=document.createElement('link'); link.rel='stylesheet'; link.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(link);
    var s=document.createElement('script'); s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; s.onload=done; document.head.appendChild(s);
    return function(){ if(mapRef.current){ mapRef.current.remove(); mapRef.current=null; } };
  },[markers,linea]);
  return <div ref={ref} style={{width:'100%',height:props.height||380,borderRadius:10}}/>;
}
