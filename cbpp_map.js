var d3, $;

module.exports = function(_d3, _$) {
  d3 = _d3; $ = _$;
  console.log("hello");
  return cbpp_map;
}

var {getStateName, getStateCode, getStateNames, getStateCodes} = require("./state_names.js");

function cbpp_map(sel) {
  var stateNames = getStateNames();
  var stateCodes = getStateCodes();
  console.log(stateCodes);
  stateCodes.forEach((code)=> {
    console.log(code, getStateName(code));
  });
}