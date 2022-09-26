var dl = require("cbpp_geojson_from_url");

Promise.all([
  dl("https://www.naturalearthdata.com/http//www.naturalearthdata.com/download/50m/cultural/ne_50m_admin_1_states_provinces_lakes.zip"),
  dl("https://www2.census.gov/geo/tiger/GENZ2019/shp/cb_2019_72_sldu_500k.zip")
]).then(function() {
  console.log("All shapefiles downloaded and converted");
});