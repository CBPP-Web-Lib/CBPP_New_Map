var fs = require("fs");
var states = JSON.parse(fs.readFileSync("geojson/ne_50m_admin_1_states_provinces_lakes.json", "utf-8"));
var puerto_rico = JSON.parse(fs.readFileSync("geojson/cb_2019_72_sldu_500k.json", "utf-8"))
states.features = states.features.filter(function(a) {
  return a.properties.admin==="United States of America";
});
states.features.forEach((el)=> {
  el.properties = {
    name: el.properties.iso_3166_2.split("-")[1]
  }
});
var topojson = require("topojson");
var pr_topo = topojson.topology({provinces: puerto_rico});
pr_unified = {type:"Feature", properties: {name: "PR"}, geometry: topojson.merge(pr_topo, pr_topo.objects.provinces.geometries)};
states.features.push(pr_unified);
var topology = topojson.topology({states: states});
topology = topojson.quantize(topology, 1e4);
try {
  fs.mkdirSync("./html/geography")
} catch (ex) {}
fs.writeFileSync("./html/geography/states_50m_topo.json", JSON.stringify(topology), "utf-8");
console.log("Wrote topo file at html/geography/states_50m_topo.json");
