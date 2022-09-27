var topojson = require("topojson");
var text_config = require("./text_config.json");
var {feature} = topojson;
var d3, $, url_root;
var application = {};

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

console.log(document.currentScript);

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


var stateenter = function(e, d) {
  if (popup_exited_recently) {
    return;
  }
  clearTimeout(mousetimer);
  mousetimer = setTimeout(function() {
    var {sel, configurator} = application;
    var pwrap = $(sel).find(".popup-outer-wrap");
    var mwrap = $(sel).find(".map-outer-wrap");
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
    var year_1 = d[1][2];
    var year_2 = d[1][3];
    var main_config = d[1][5];
    var {dataset} = main_config;
    var addtl_config = application.more_config[dataset];
    
    var popup_table = get_popup_table(year_1, year_2, main_config, addtl_config);
    var title = application.stateNames[d[0]] + "<br><a class='profile-link' name='" + d[0] + "'>View State Profile</a>";
    var code = d[0];
    var races_list = configurator.getChoice("race").options;
    var race_short = {};
    races_list.forEach((race)=> {
      race_short[race.value] = race.name;
    });
    if (d[1][5].race) {
      title += "<div class='race-subtitle-popup'>" + race_short[d[1][5].race] + "</div>";
    }
    var popup_html = popup_template({title, code, popup_table});
    pwrap.empty().html(popup_html);
    pwrap.find("span.y2").text(compare_years[1]);
    var popup_width = pwrap.find(".popup-inner").width();
    var height = pwrap.find(".popup-inner").height();
    pwrap.find(".popup-inner").css("right", px * popup_width + "px");
    if (py > 0.5) {
      pwrap.find(".popup-inner").css("top", (-height - 40) + "px");
    } else {
      pwrap.find(".popup-inner").css("top", "30px");
    }
  }, 100);
}

var stateexit = function (e, d) {
  clearTimeout(mousetimer);
  mousetimer = setTimeout(function() {
    var {sel} = application;
    $(sel).find(".popup-outer-wrap").empty();
  }, 100);
}

function cbpp_map(sel, _options) {
  var stateNames = getStateNames();
  var stateCodes = getStateCodes();
  var options = {}
  $.extend(true, options, _options);
  application.map_svg = d3.select(sel).append("svg")
    .attr("version", "1.1")
    .attr("xmlns", "http://www.w3.org/2000/svg")
    .attr('xmlns:xlink', "http://www.w3.org/1999/xlink");
  getPaths().then((paths)=> {
    add_state_paths(application.map_svg, paths, options);
    event_listeners();
  })
  
}

var mousetracker = {}, mousetimer, popup_exited_recently = false;

function event_listeners(options) {
  var {sel} = application;
  $(window).on("mousemove", function(e) {
    mousetracker.x = e.pageX;
    mousetracker.y = e.pageY;
    if ($(e.target).hasClass(".popup-outer-wrap") || $(e.target).parents(".popup-outer-wrap").length) {
      return;
    }
    if ($(sel).find(".cbpp-map").find(e.target).length===0)
    if ($(sel).find(e.target).length===0) {
      stateexit();
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
          stateexit();

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
    data.push([state, path]);
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
      return d[0];
    })
    .enter()
    .append("g")
    .attr("class", "state")
    .on("mouseenter", stateenter)
    .on("mouseleave", function(e, d) {
      if ($(e.relatedTarget).hasClass("popup-inner")) {
        return;
      }
      stateexit.call(e, d)
    })
    .on("click", function(e, d) {
      if (e.pointerType==="touch") {return;}
      var state = d[0];
      var {sel} = application;
      $(sel).find("select[name='state-picker']").val(state);
      state_profile(state);
      $(sel).find(".tab[name='profiles']").trigger("click");
    })
    .each(function(d) {
      var state = d[0];
      var path = d3.select(this).append("path")
        .attr("d", d[1])
        .attr("name", state)
        .attr("fill", "#fff")
        .attr("stroke", "#000")
        .attr("stroke-width", 0);
      var label = d3.select(this).append("text")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-family","proxima-nova-condensed","sans-serif")
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