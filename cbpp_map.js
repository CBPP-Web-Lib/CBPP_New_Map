var topojson = require("topojson");
var text_config = require("./text_config.json");
var getBrightness = require("getbrightness").default;
var {feature} = topojson;
var d3, $, url_root;
var application = {};
var geo_paths = require("./dist/states_50m_topo.json");
require("./cbpp_map.scss");

const hex_rgb = require("hex-rgb");
const rgb_hex = require("rgb-hex");

var {getStateName, getStateCode, getStateNames, getStateCodes} = require("./state_names.js");

module.exports = function(_$, _d3, _url_root) {
  d3 = _d3; $ = _$, url_root = _url_root;
  application.d3 = d3;
  application.$ = $;
  application.url_root = _url_root;
  application.text_config = text_config;
  cbpp_map.utilities = {getStateName, getStateCode, getStateNames, getStateCodes}
  return cbpp_map;
}



function getPaths() {
  return new Promise((resolve)=> {
    var d = geo_paths;
    application.states_50m = feature(d, d.objects.states);
    var projection = d3.geoAlbersUsa().scale(1300).translate([487.5, 305]);
    var pr_proj = d3.geoMercator().scale(1600).translate([2790, 1090]);
    var pr_path = d3.geoPath(pr_proj);
    var path = d3.geoPath(projection);
    application.state_paths = generatePaths(path, pr_path, application.states_50m.features)
    resolve(application.state_paths);
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
  if (options.no_popup===true) {
    return;
  }
  if (options.popup_movement==="sticky") {
    if (popup_exited_recently) {
      return;
    }
    clearTimeout(mousetimer);
    var code = d.state;
    mousetimer = setTimeout(function() {
      var pwrap = global_el.find(".popup-outer-wrap");
      var popup_html = popup_template(code, options, d);
      pwrap.empty().html(popup_html);
      position_popup(global_el, options);
    }, 100);
  } else {
    var code = d.state;
    var pwrap = global_el.find(".popup-outer-wrap");
    var popup_html = popup_template(code, options, d);
    pwrap.empty().html(popup_html);
  }
}

var position_popup = function(global_el, options) { 
  var pwrap = global_el.find(".popup-outer-wrap");
  var mwrap = global_el.find(".map-outer-wrap");
  var offset = mwrap.offset();
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
  var popup_width = pwrap.find(".popup-inner").width();
  var popup_height = pwrap.find(".popup-inner").height();
  if (typeof(options.custom_positioner)==="function") {
    options.custom_positioner({
      pwrap, px, py, width, height, popup_width, popup_height
    })
    return;
  }
  pwrap.find(".popup-inner").css("right", px * popup_width + "px");
  if (py > 0.5) {
    pwrap.find(".popup-inner").css("top", (-popup_height - 40) + "px");
  } else {
    pwrap.find(".popup-inner").css("top", "30px");
  }
}

var popup_template = function(code, options, d) {
  var html = options.popup_generator(code, d.value);
  if (!html) {
    return '';
  }
  return "<div class='popup-inner'>" + html + "</div>";
}

var stateexit = function (global_el, options) {
  if (options.popup_movement==="sticky") {
    clearTimeout(mousetimer);
    mousetimer = setTimeout(function() {
      global_el.find(".popup-outer-wrap").empty();
    }, 100);
  } else {
    global_el.find(".popup-outer-wrap").empty();
  }
}

function cbpp_map(sel, _options) {

  var map = {};
  var data;

  if (typeof(_options)==="undefined") {
    _options = {};
  }

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
    type: "grad", /*grad, bins, or bins_grad */

    /*default is gte lower, lt higher*/
    bin_boundary: "gte-lt",
    bins: [-1, 0, 1], /*these are the boundaries between bins. There should be one more than the number of colors*/

    bin_grad_labels: function(value) { /*array or function that accepts value*/
      return value;
    },

    bin_labels: function(low, high) { /*array or function that accepts lower value and higher value*/
      return low + " &mdash; " + high;
    },

    brightness_threshold: 0.5,

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

    label_size: 18,

    legend_position: "above", /*can be 'above', 'below', or CSS selector for external element*/

    popup_movement: "sticky",

    hover_color: "#eb9123",

    hover_text_color: "#333333",

    click_handler: function(e, d) {
      var {state} = d;
      console.log("You clicked on " + state);
    },

    text_color: default_text_color, /*arguments: data value, fill color*/

    popup_generator: function(state, d) {
      var html =  getStateName(state) + ": " + d;
      return html;
    },

    gradient_stops: [
      {
        value: -1,
        label: "-1"
      }, 
      {
        value: 0,
        label: "0",
      }, 
      {
        value:  1,
        label: "1"
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
    return new Promise((resolve)=> {
      if (typeof(duration)==="undefined") {
        duration = 0;
      }
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
      setTimeout(resolve, duration + 50, );
    });
  }

  map.updateLegend = function(duration) {
    return new Promise((resolve)=> {
      setTimeout(resolve, duration + 50);
      var new_legend = $(document.createElement("div"))
        .addClass("legend-inner");
      
      function make_bin(label, color) {
        var svg = "";
        if (color) {
          svg = `<div class='legend-box'>
            <svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 20 20">
              <rect stroke-width="0.5" stroke="#333333" fill="${color}" x="1" y="1" width="18" height="18" />
            </svg>
          </div>`;
        }
        var template = `<div class='legend-bin-outer'>
          ${svg}
          <div class='legend-label'>${label}</div>
        </div>`; 
        return template;  
      }

      function make_grad_bin(label, width, color, className) {
        var svg = "";
        if (color) {
          svg = `<div class='legend-grad-box'>
            <svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 20 20" preserveAspectRatio="none">
              <rect stroke-width="0" fill="${color}" x="-1" y="-1" width="22" height="22" />
            </svg>
          </div>`;
        } else {
          width = 0;
        }
        var template = `<div class='legend-grad-bin-outer ${className}' style="width:${width}">
          ${svg}
          <div class='bin-gradient-label-outer'><div class='bin-gradient-label-inner'><span>${label}</span></div></div>
        </div>`; 
        return template;  

      }

      if (options.type === "grad") {
        new_legend.addClass("grad-legend");
        var grad = make_gradient(options.gradient_stops, options.grad_colors);
        var custom_values = ``;
        if (options.customValues) {
          var custom_values = `<div class='custom_gradient_labels'>`;
          options.customValues.forEach((customValue) => {
            custom_values += make_bin(customValue.label, customValue.color);
          });
          custom_values += `</div>`;
        }
        new_legend.html(grad + custom_values);
      } else if (options.type === "bins") {
        var html = ``;
        new_legend.addClass("bin-legend");
        options.bin_colors.forEach((bin_color, i) => {
          var label;
          if (typeof(options.bin_labels)==="function") {
            label = options.bin_labels(options.bins[i], options.bins[i+1]);
          } else {
            label = options.bin_labels[i];
          }
          html += make_bin(label, bin_color);
        });
        new_legend.html(html);
      } else if (options.type === "grad_bins") {
        var html = `<div class='bin-grad-legend-main'>`;
        new_legend.addClass("bin-grad-legend");
        options.bins.forEach((bin, i)=> {
          var className = "grad-bin";
          if (i===0) {
            className += " first-bin";
          } else if (i===(options.bins.length - 2)) {
            className += " last-bin";
          } else if (i===(options.bins.length - 1)) {
            className += " fake-bin";
          }
          var label;
          if (typeof(options.bin_grad_labels)==="function") {
            label = options.bin_grad_labels(options.bins[i]);
          } else {
            label = options.bin_grad_labels[i];
          }
          var bin_color = null;
          if (options.bin_colors[i]) {
            bin_color = options.bin_colors[i];
          }
          var width = 100/(options.bins.length - 1) + "%";
          html += make_grad_bin(label, width, bin_color, className);
        });
        html += "</div>";
        var custom_values = "";
        if (options.customValues) {
          var custom_values = `<div class='custom_gradient_labels'>`;
          options.customValues.forEach((customValue) => {
            custom_values += make_bin(customValue.label, customValue.color);
          });
          custom_values += `</div>`;
        }
        new_legend.html(html + custom_values);
      }

      map.legend.empty().append(new_legend);
      

      function make_gradient(stops, colors) {
        var _sel = sel.replace("#", "");
        var grad_id = _sel + "-gradient-def";
        var stop_template = ``;
        var label_template = ``;
        var first_stop = stops[0].value;
        var last_stop = stops[stops.length - 1].value;
        stops.forEach((stop, i)=> {
          var offset = ((stop.value - first_stop) / (last_stop - first_stop)*100) + "%";
          stop_template += `<stop offset="${offset}" stop-color="${colors[i]}" />\n`;
          label_template += `<div class='gradient-label-outer' style='left:${offset}'>
            <div class='gradient-label-inner'>
              <span>
                ${stop.label}
              </span>
            </div>
          </div>\n`;
        });
        var template = `<div class='legend-gradient-outer'>
          <div class='legend-gradient'>
            <svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 500 16" preserveAspectRatio="none">
              <defs>
                <linearGradient id="${grad_id}">
                  ${stop_template}
                </linearGradient>
              </defs>
              <rect stroke-width="0.5" stroke="#333333" fill="url(#${grad_id})" x="-1" y="1" width="502" height="14" />
            </svg>
            <div class='gradient-labels'>
              ${label_template}
            </div>
          </div>
        </div>`
        return template;

      }

    });
  };


  var outer_wrap = d3.select(sel).append("div")
    .attr("class","map-outer-wrap");
  $(outer_wrap.node()).append($(document.createElement("div")).addClass("popup-outer-wrap"));
  map.map_svg = outer_wrap.append("svg")
    .attr("version", "1.1")
    .attr("xmlns", "http://www.w3.org/2000/svg")
    .attr('xmlns:xlink', "http://www.w3.org/1999/xlink");
  var pathGetter = getPaths();
  map.draw = function(duration) {
    if (application.state_paths) {
      return initial_draw(application.state_paths, duration);
    } else {
      return pathGetter.then(function() {
        initial_draw(application.state_paths, duration);
      })
    }
  };
  function initial_draw(paths, duration) {
    var start_data = _options.data;
    delete(_options.data);
    map.setOptions(_options);
    var legend = $(document.createElement("div")).addClass("cbpp-map-legend");
    map.legend = legend
    if (options.legend_position==="above") {
      $(map.map_svg.node()).before(legend);
    } else if (options.legend_position==="below") {
      $(map.map_svg.node()).after(legend);
    } else if (options.legend_position==="none") {
      /*do nothing*/
    } else if ($(options.legend_position).length) {
      $(options.legend_position).empty().append(legend);
    } else {
      throw new Error("legend_position must be 'above', 'below', 'none', or valid CSS selector for an existing element");
    }
    if (options.no_hover!==true) {  
      var svg_style = $(document.createElement("style"));
      svg_style.html(`g.state:hover rect, g.state:hover path {fill:` + options.hover_color + `;}
        g.state.text-inside:hover text {fill:` + options.hover_text_color + `;}`);
      $(map.map_svg.node()).append(svg_style);
    }
    add_state_paths(map.map_svg, paths, options);
    if (start_data && typeof(map.getData()==="undefined")) {
      map.setData(start_data);
    } else {
      map.setData(map.getData());
    }
    event_listeners(sel, options);
    return Promise.all([
      map.fillStates(duration),
      map.updateLegend(0)
    ]).then(()=>{
      if (typeof(options.ready)==="function") {
        options.ready();
      }
    });
  }

  function default_text_color(d, fill) {
    var brightness = getBrightness(fill);
    if (brightness > options.brightness_threshold) {
      return "#000";
    } else {
      return "#fff";
    }
  }
  
  
  return map;

}

var mousetracker = {}, mousetimer, popup_exited_recently = false;

function event_listeners(sel, options) {
  $(window).on("mousemove", function(e) {
    mousetracker.x = e.pageX;
    mousetracker.y = e.pageY;
    if (options.popup_movement==="sticky") {
      if ($(e.target).hasClass(".popup-outer-wrap") || $(e.target).parents(".popup-outer-wrap").length) {
        return;
      }
      if ($(sel).find(e.target).length===0) {
        stateexit($(sel), options);
      }
    } else if (options.popup_movement==="smooth") {
      if ($(e.target).is("g.state *") || $(e.target).is("g.state")) {
        position_popup($(sel), options); 
      } else {
        stateexit($(sel), options)
      }
    } else {
      throw new Error("popup_movement must be 'smooth' or 'sticky'");
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
          stateexit($(sel), options);

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
  svg.attr("viewBox", "0 0 1010 610")
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
    .attr("class",  function(d) {
      if (text_config.outside[d.state]) {
        return "state text-outside";
      } else {
        return "state text-inside";
      }
    })
    .on("mouseenter", function(e, d) {
      stateenter.call(this, e, d, $(svg.node().parentNode.parentNode), options);
    })
    .on("mouseleave", function(e, d) {
      if ($(e.relatedTarget).hasClass("popup-inner")) {
        return;
      }
      if (options.popup_movement==="sticky") {
        stateexit($(svg.node().parentNode.parentNode), options)
      }
    })
    .on("click", function(e, d) {
      if (typeof(options.click_handler)==="function") {
        options.click_handler(e, d);
      }
      if (e.pointerType==="touch") {return;}
    })
    .each(function(d) {
      var state = d.state;
      if (state === "PR" && options.hidePR === true) {
        return;
      }
      if (state === "DC" && options.hideDC === true) {
        return;
      }
      var path = d3.select(this).append("path")
        .attr("d", d.path)
        .attr("name", state)
        .attr("fill", "#fff")
        .attr("stroke", "#000")
        .attr("stroke-width", 0);
      var label = d3.select(this).append("text")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-size",options.label_size + "pt")
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
  } else if (options.type==="bins" || options.type==="grad_bins") {
    return get_bin_color(d, options);
  } else {
    throw new Error("Invalid map type: options.type must be 'grad', 'bins', or 'grad_bins.'");
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
        var low_stop = stop.value;
        var high_stop = gradient_stops[i+1].value;
        if (d >= low_stop && d < high_stop) {
          color = interpolate_hex((d-low_stop)/(high_stop - low_stop), options.grad_colors[i], options.grad_colors[i+1]);
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
  var color, useCustom;
  options.customValues.forEach((customValue)=> {
    if (d >= customValue.values[0] && d < customValue.values[1]) {
      color = customValue.color;
      useCustom = true;
    }
  });
  if (useCustom) {return color;}
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

