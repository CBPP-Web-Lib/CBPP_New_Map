var names = {
  "AL": ["Alabama"],
  "AK": ["Alaska"],
  "AZ": ["Arizona"],
  "AR": ["Arkansas"],
  "CA": ["California"],
  "CO": ["Colorado"],
  "CT": ["Connecticut"],
  "DE": ["Delaware"],
  "DC": ["District of Columbia"],
  "FL": ["Florida"],
  "GA": ["Georgia"],
  "HI": ["Hawaiʻi", "Hawaii"],
  "ID": ["Idaho"],
  "IL": ["Illinois"],
  "IN": ["Indiana"],
  "IA": ["Iowa"],
  "KS": ["Kansas"],
  "KY": ["Kentucky"],
  "LA": ["Louisiana"],
  "ME": ["Maine"],
  "MD": ["Maryland"],
  "MA": ["Massachusetts"],
  "MI": ["Michigan"],
  "MN": ["Minnesota"],
  "MS": ["Mississippi"],
  "MO": ["Missouri"],
  "MT": ["Montana"],
  "NE": ["Nebraska"],
  "NV": ["Nevada"],
  "NH": ["New Hampshire"],
  "NJ": ["New Jersey"],
  "NM": ["New Mexico"],
  "NY": ["New York"],
  "NC": ["North Carolina"],
  "ND": ["North Dakota"],
  "OH": ["Ohio"],
  "OK": ["Oklahoma"],
  "OR": ["Oregon"],
  "PA": ["Pennsylvania"],
  "RI": ["Rhode Island"],
  "SC": ["South Carolina"],
  "SD": ["South Dakota"],
  "TN": ["Tennessee"],
  "TX": ["Texas"],
  "UT": ["Utah"],
  "VT": ["Vermont"],
  "VA": ["Virginia"],
  "WA": ["Washington"],
  "WV": ["West Virginia"],
  "WI": ["Wisconsin"],
  "WY": ["Wyoming"],
  "PR": ["Puerto Rico"],
  "GU": ["Guam"],
  "VI": ["Virgin Islands"],
  "US": ["United States"]
};


function object_flip(o) {
  var r = {};
  Object.keys(o).forEach((key) => {
    var names = o[key];
    names.forEach((name)=> {
      r[name] = key;
    });
  })
  return r;
}

var states = object_flip(names);

module.exports = (function() {
  return {
    addStates: function(obj) {
      Object.keys(obj).forEach((code) => {
        names[code] = obj[code]
      })
    },
    getStateName: function(code) {
      return names[code][0];
    },
    getStateCode: function(name) {
      return states[name];
    },
    getStateNames: function() {
      return Object.keys(states);
    },
    getStateCodes: function() {
      return Object.keys(names);
    }
  }
})();
