var topojson = require("topojson");
var text_config = require("./text_config.json");
var get_brightness = require("getbrightness");
var {feature} = topojson;
var d3, $, url_root;
var application = {};
require("./cbpp_map.scss");

const hex_rgb = require("hex-rgb");
const rgb_hex = require("rgb-hex");

module.exports = function(_$, _d3, _url_root) {
  d3 = _d3; $ = _$, url_root = _url_root;
  application.d3 = d3;
  application.$ = $;
  application.url_root = _url_root;
  application.text_config = text_config;
  console.log("hello");
  return cbpp_map;
}

var {getStateName, getStateCode, getStateNames, getStateCodes} = require("./state_names.js");
const { default: getBrightness } = require("getbrightness");

function getPaths() {
  return new Promise((resolve)=> {
    console.log(application);
    $.get(application.url_root + "./geography/states_50m_topo.json", function(d) {
      application.states_50m = feature(d, d.objects.states);
      var projection = d3.geoAlbersUsa().scale(1300).translate([487.5, 305]);
      var pr_proj = d3.geoMercator().scale(1600).translate([2790, 1090]);
      var pr_path = d3.geoPath(pr_proj);
      var path = d3.geoPath(projection);
      resolve(generatePaths(path, pr_path, application.states_50m.features));
    });
  });
}

function generatePaths(pathgen, pr_pathgen, features) {
  var r = {};
  features.forEach((feature) => {
    var state = feature.properties.name;
    if (state === "PR") {
      r[state] = pr_pathgen(feature);
    } else {
      r[state] = pathgen(feature);
    }
  })
  return r;
}


var stateenter = function(e, d, global_el, options) {
  if (popup_exited_recently) {
    return;
  }
  clearTimeout(mousetimer);
  var code = d.state;
  mousetimer = setTimeout(function() {
    console.log("stateenter");
    var pwrap = global_el.find(".popup-outer-wrap");
    var mwrap = global_el.find(".map-outer-wrap");
    var offset = mwrap.offset();
    console.log(offset);
    var height = mwrap.height();
    var width = mwrap.width();
    //var {pageX, pageY} = e;
    var x = mousetracker.x - offset.left;
    var y = mousetracker.y - offset.top;
    var px = x/width;
    var py = y/height;
    var pos = [
      (px*100) + "%",
      (py*100) + "%"
    ];
    pwrap.css("left", pos[0]).css("top", pos[1]);
    var popup_html = popup_template(code, options, d);
    pwrap.empty().html(popup_html);
  }, 100);
}

var popup_template = function(code, options, d) {
  var html = options.popup_generator(code, d.value);
  return "<div class='popup-inner'>" + html + "</div>";
}

var stateexit = function (global_el) {
  console.log("stateexit");
  clearTimeout(mousetimer);
  mousetimer = setTimeout(function() {
    global_el.find(".popup-outer-wrap").empty();
  }, 100);
}

function cbpp_map(sel, _options) {

  var map = {};
  var data;

  map.setData = function(_data) {
    data = {};
    $.extend(true, data, _data);
    this.map_svg.selectAll("g.state").each(function() {
      var datum = d3.select(this).datum();
      datum.value = _data[datum.state];
      d3.select(this).datum(datum);
    });
  }

  map.getData = function() {
    var r = {};
    $.extend(true, r, data);
    return r;
  }

  var stateNames = getStateNames();
  var stateCodes = getStateCodes();

  var options = {
    type: "grad", /*grad or bins*/

    /*default is gte lower, lt higher*/
    bin_boundary: "gte-lt",
    bins: [-1, 0, 1], /*these are the boundaries between bins. There should be one more than the number of colors*/

    customValues: [
      {
        values: [-100, -98],
        label: "-99 custom code example",
        color: "#ed1c24"
      }
    ], /*can be used in conjuction with gradient for solid colors not in the range*/

    grad_colors: ["#a0917d", "#ffffff", "#0c61a4"], /*should be equal to number of gradient stops*/

    bin_colors: ["#a0917d", "#0c61a4"], /*shoudl be one less than the number of bin boundaries*/

    not_in_range_color: "#aaaaaa",

    hover_color: "#eb9123",

    text_color: default_text_color, /*arguments: data value, fill color*/

    popup_generator: function(state, d) {
      console.log(d);
      var html =  getStateName(state) + ": " + d;
      console.log(html);
      return html;
    },

    gradient_stops: [
      {
        value: -1,
        position: 0, /*between 0 and 1, or "auto" for linear based on value*/
      }, {
        value: 0,
        position: 0.5,
      }, {
        value: 1,
        position: 1
      }
    ]
  }

  map.setOptions = function(_options) {
    $.extend(true, options, _options);
  }

  map.clearOption = function(name_arr) {
    var failure = false;
    var op = options;
    name_arr.forEach((key, i)=> {
      if (i === name_arr.length - 1) {
        delete(op[key]);
      } else if (op[key]) {
        op = op[key];
      } else {
        failure = true;
      }
    });
    if (failure) {
      throw new Error("Failed to clear options " + name_arr.join("."));
    }
  }

  map.fillStates = function(duration) {
    this.map_svg.selectAll("g.state").each(function(d) {
      var fill = get_color(d.value, options);
      d3.select(this).selectAll("path, rect").transition()
        .duration(duration)
        .attr("fill", fill);
      var state = d.state;
      if (!text_config.outside[state]) {
        d3.select(this).selectAll("text")
          .transition()
          .duration(duration)
          .attr("fill", options.text_color(d, fill));
      }

    });
  }




  var outer_wrap = d3.select(sel).append("div")
    .attr("class","map-outer-wrap");
  $(outer_wrap.node()).append($(document.createElement("div")).addClass("popup-outer-wrap"));
  map.map_svg = outer_wrap.append("svg")
    .attr("version", "1.1")
    .attr("xmlns", "http://www.w3.org/2000/svg")
    .attr('xmlns:xlink', "http://www.w3.org/1999/xlink");
  getPaths().then((paths)=> {
    var start_data = _options.data;
    delete(_options.data);
    map.setOptions(_options);
    add_state_paths(map.map_svg, paths, options);
    map.setData(start_data);
    event_listeners(sel, options);
    map.fillStates(0);
  })
  
  
  return map;

}

var mousetracker = {}, mousetimer, popup_exited_recently = false;

function event_listeners(sel, options) {
  $(window).on("mousemove", function(e) {
    mousetracker.x = e.pageX;
    mousetracker.y = e.pageY;
    if ($(e.target).hasClass(".popup-outer-wrap") || $(e.target).parents(".popup-outer-wrap").length) {
      return;
    }
    if ($(sel).find(e.target).length===0) {
      stateexit($(sel));
    }
  });
  $(sel).find(".popup-outer-wrap").on("mouseenter", function() {
    clearTimeout(mousetimer);
  });
  var popup_clicker = (function() {
    var clearSelection = false;
    $(sel).find(".popup-outer-wrap").on("mousedown", function(e) {
      var node = window.getSelection().anchorNode;
      var str = window.getSelection().toString();
      if (node && str!=="") {
        if (node.nodeType === 3) {
          node = node.parentNode;
        }
        if ($(node).parents(".popup-outer-wrap").length || $(node).hasClass(".popup-outer-wrap")) {
          clearSelection = true;
        }
      }
    });
    $(sel).find(".popup-outer-wrap").on("mouseup", function(e) {
      var node = window.getSelection().toString();
      if (node==="") {
        if (!clearSelection) {
          setTimeout(function() {
            popup_exited_recently = false;
          }, 200);
          popup_exited_recently = true;
          stateexit($(sel));

        }
      }
      clearSelection = false;
    });
  })();
  
}

function add_state_paths(svg, paths, options) {
  var data = [];
  Object.keys(paths).forEach((state) => {
    var path = paths[state];
    data.push({state, path});
  });
  /*Object.keys(application.text_config.noOutline).forEach((territory)=> {
    data.push([territory, null])
  });*/
  svg.attr("viewBox", "0 0 995 610")
    .attr("class", "cbpp-map");

  /*text placement relies on svg being displayed
  and having actual dimensions while it's drawn*/
  var temp_svg = svg.node().cloneNode(true);
  $(temp_svg).css("visibility", "hidden");
  $("body").append(temp_svg);
  var borders = svg.append("g")
    .attr("class", "stateborders")
    .attr("opacity", "0.7")
    .attr("pointer-events", "none");
  svg.selectAll("g.state")
    .data(data, function(d) {
      return d.state;
    })
    .enter()
    .append("g")
    .attr("class", "state")
    .on("mouseenter", function(e, d) {
      stateenter.call(this, e, d, $(svg.node().parentNode.parentNode), options);
    })
    .on("mouseleave", function(e, d) {
      if ($(e.relatedTarget).hasClass("popup-inner")) {
        return;
      }
      stateexit($(svg.node().parentNode.parentNode))
    })
    .on("click", function(e, d) {
      if (typeof(options.clickHandler)==="function") {
        options.clickHandler(e, d);
      }
      if (e.pointerType==="touch") {return;}
    })
    .each(function(d) {
      var state = d.state;
      var path = d3.select(this).append("path")
        .attr("d", d.path)
        .attr("name", state)
        .attr("fill", "#fff")
        .attr("stroke", "#000")
        .attr("stroke-width", 0);
      var label = d3.select(this).append("text")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-size","18pt")
        .attr("opacity",0.8)
        .text(state)
       // .attr("fill", application.text_colors.dark);
      /*if (application.text_config.useFullName[state]) {
        label.style("font-size","13pt");
      }*/
      var center;
      if (application.text_config.text.absOffset[state]) {
        center = application.text_config.text.absOffset[state];
        label.attr("text-anchor", "end");
      }
      /*else if (application.text_config.noOutline[state]) {
               center = application.text_config.noOutline[state];
               label.attr("text-anchor","end");
             } */
      else {
        var clone = path.node().cloneNode();
        $(temp_svg).append(clone);
        var bbox = clone.getBBox();
        center = [bbox.x + bbox.width / 2, bbox.y + bbox.height / 2];
        if (application.text_config.text.offset[state]) {
          center[0] += application.text_config.text.offset[state][0];
          center[1] += application.text_config.text.offset[state][1];
        }
      }

      var border_clone = path.clone()
        .attr("class", "state-border")
        .attr("stroke-width", "1")
        .attr("fill", "none")
        .node();
      $(border_clone).detach();
      borders.node().appendChild(border_clone);
      label.attr("x", center[0]).attr("y", center[1]);
      if (application.text_config.lines[state]) {
        var g = d3.select(this).append("g")
          .attr("class", "lines");
        application.text_config.lines[state].forEach((segment) => {
          g.append("line")
            .attr("x1", segment[0])
            .attr("y1", segment[1])
            .attr("x2", segment[2])
            .attr("y2", segment[3])
            .attr("stroke", "#aaa")
            .attr("stroke-width", 1);
        });
      }
      if (application.text_config.outside[state]) {
        label.attr("class", "outside");
      }
      if (application.text_config.boxes[state]) {
        var rect = d3.select(this).append("rect")
          .attr("class", "state-box")
          .attr("width", 18)
          .attr("height", 18)
          .attr("fill", "none")
          .attr("stroke", "#aaa")
          .attr("stroke-width", 1)
          .attr("y", center[1] - 11);
        if (application.text_config.boxes[state] === "left") {
          rect.attr("x", center[0] - 25);
        } else {
          rect.attr("x", center[0] + 5);
        }
      }
    })
  borders.raise();
  $(temp_svg).remove();

}

function get_color(d, options) {
  if (options.type === "grad") {
    return get_grad_color(d, options);
  } else if (options.type==="bins") {
    return get_bin_color(d, options);
  } else {
    throw new Error("invalid map type: must be 'grad' or 'bins'");
  }
}

function get_grad_color(d, options) {
  var gradient_stops = [];
  $.extend(true, gradient_stops, options.gradient_stops);
  gradient_stops.sort((a, b)=> {
    return a.value - b.value;
  });
  var min, max;
  min = gradient_stops[0].value;
  max = gradient_stops[gradient_stops.length - 1].value;
  var color, useCustom;
  options.customValues.forEach((customValue)=> {
    if (d >= customValue.values[0] && d < customValue.values[1]) {
      color = customValue.color;
      useCustom = true;
    }
  });
  if (useCustom) {return color;}
  if (d < min || d > max) {
    color =  options.not_in_range_color;
  } else {
    gradient_stops.forEach((stop, i)=> {
      if (i===gradient_stops.length - 1) {
        return options.grad_colors[i];
      } else {
        var low_stop = stop;
        var high_stop = gradient_stops[i+1];
        if (d >= low_stop.value && d < high_stop.value) {
          color = interpolate_hex((d-low_stop.value)/(high_stop.value - low_stop.value), options.grad_colors[i], options.grad_colors[i+1]);
        }
      }
    });
  }
  return color;
}

function get_bin_color(d, options) {
  var bins = [];
  $.extend(true, bins, options.bins);
  bins.sort((a, b)=> {
    return a - b;
  });
  var color;
  color = options.not_in_range_color;
  bins.forEach((bin, i)=> {
    if (i === bins[bin.length - 1]) {return;}
    if (d >= bin && d < bins[i+1]) {
      color = options.bin_colors[i];
    }
  });
  return color;
}

function interpolate_hex(d, c1, c2) {
  if (c1[0]==="#") {
    c1 = hex_rgb(c1);
  }
  if (c2[0]==="#") {
    c2 = hex_rgb(c2);
  }
  var r = {};
  Object.keys(c1).forEach((channel)=> {
    r[channel] = Math.round(d*(c2[channel] - c1[channel]) + c1[channel]);
  });
  var rhex = "#" + rgb_hex(r.red, r.green, r.blue);
  return rhex;
} 

function default_text_color(d, fill) {
  var brightness = getBrightness(fill);
  if (brightness > 0.5) {
    return "#000";
  } else {
    return "#fff";
  }
}