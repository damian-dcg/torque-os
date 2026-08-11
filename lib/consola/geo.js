export async function geocode(dir){
  try{
    var r=await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q='+encodeURIComponent(dir+', Chile'));
    var j=await r.json();
    if(j&&j[0]) return {lat:parseFloat(j[0].lat),lng:parseFloat(j[0].lon)};
  }catch(e){}
  return null;
}
