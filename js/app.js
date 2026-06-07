/* app.js — the journal: search, filter, stats, and the editorial index layout.
   Pure data helpers come from js/data.js (window.SL). No framework, no build. */
(function () {
  "use strict";

  var SL = window.SL;
  var DASH = SL.DASH;
  var ALL = [];

  var state = {
    filter: "all",   // all | music | sports | other
    query: "",
    sort: "new",     // new | old
    statsOpen: false
  };

  var $ = function (s) { return document.querySelector(s); };
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function dash(v) { return (v != null && String(v).length) ? esc(v) : DASH; }

  // ---- stats ---------------------------------------------------------------
  function computeStats(list) {
    var music = list.filter(function (e) { return e.type === "music"; });
    var sports = list.filter(function (e) { return e.type === "sports"; });
    var artists = SL.tally(music.map(function (e) { return e.headliner; }));
    var teams = SL.tally(sports.reduce(function (a, e) {
      // If Rob went to see a specific team (e.g. the visiting Mets at a Braves game), count only that.
      if (e.saw) return a.concat([e.saw]);
      return a.concat([e.home, e.away]);
    }, []));
    var venues = SL.tally(list.map(function (e) { return e.venue; }));
    var cities = SL.tally(list.map(function (e) { return e.city; }));
    var years = SL.tally(list.map(SL.yearOf));
    var dated = list.filter(function (e) { return e.date; }).map(function (e) { return e.date; }).sort();
    return {
      total: list.length, music: music.length, sports: sports.length,
      artists: artists, teams: teams, venues: venues, cities: cities,
      yearsActive: years.length, first: dated[0] || null,
      byYear: years.slice().sort(function (a, b) { return Number(b[0]) - Number(a[0]); })
    };
  }

  // ---- render pieces -------------------------------------------------------
  function iconLinks(e) {
    var out = ['<a class="tlink yt" href="' + SL.ytLink(e) + '" target="_blank" rel="noopener" title="' +
      (e.youtube ? "Watch video" : "Search YouTube") + '">YouTube</a>'];
    if (e.type === "music") {
      out.push('<a class="tlink sl" href="' + SL.setlistLink(e) + '" target="_blank" rel="noopener" title="Setlist">Setlist</a>');
    }
    return '<span class="ilinks">' + out.join("") + "</span>";
  }

  // ---- LAYOUT: index (editorial) -------------------------------------------
  // Day-and-month only; the year lives in the group header above each block.
  function shortDate(e) {
    if (!e || !e.date) return DASH;
    var p = e.date.split("-").map(Number);
    var m = p[1], d = p[2];
    if (!m) return DASH;
    return SL.MONTHS[m - 1] + (d ? " " + d : "");
  }

  function indexRow(e) {
    var kicker = e.type === "sports" ? (e.league || "Sports") : (e.type === "other" ? "Live" : "Concert");
    // Only the music "w/ support" reads as a subtitle here; sports league is the kicker.
    var sub = e.type === "music" ? SL.subtitle(e) : "";
    return '' +
      '<div class="iv-row iv-' + e.type + '">' +
        '<div class="iv-date">' + shortDate(e) + "</div>" +
        '<div class="iv-left">' +
          '<div class="iv-kicker">' + esc(kicker) + "</div>" +
          '<div class="iv-name">' + dash(SL.title(e)) +
            (sub ? ' <span class="iv-support">' + esc(sub) + "</span>" : "") + "</div>" +
          '<div class="iv-sub">' +
            '<span class="iv-place">' + dash(SL.place(e)) + "</span>" +
            iconLinks(e) +
          "</div>" +
        "</div>" +
      "</div>";
  }

  // ---- stats panel ---------------------------------------------------------
  function statList(rows, unit, limit) {
    if (!rows.length) return '<div class="muted">' + DASH + "</div>";
    var max = rows[0][1];
    return rows.slice(0, limit || 10).map(function (r) {
      return '<div class="rank">' +
        '<div class="rank-bar" style="width:' + Math.round((r[1] / max) * 100) + '%"></div>' +
        '<span class="rank-name">' + esc(r[0]) + "</span>" +
        '<span class="rank-n">' + r[1] + (unit ? " " + unit : "") + "</span></div>";
    }).join("");
  }
  function renderStats(s) {
    var bar =
      '<div class="kpis">' +
        '<div class="kpi"><b>' + s.total + "</b><span>events</span></div>" +
        '<div class="kpi"><b>' + s.music + "</b><span>concerts</span></div>" +
        '<div class="kpi"><b>' + s.sports + "</b><span>games</span></div>" +
        '<div class="kpi"><b>' + s.artists.length + "</b><span>artists</span></div>" +
        '<div class="kpi"><b>' + s.yearsActive + "</b><span>years</span></div>" +
        '<div class="kpi"><b>' + (s.first ? s.first.slice(0, 4) : DASH) + "</b><span>first</span></div>" +
      "</div>";
    var panels = [];
    if (state.filter !== "sports") panels.push('<section class="spanel"><h4>Most-seen artists</h4>' + statList(s.artists, "") + "</section>");
    if (state.filter !== "music") panels.push('<section class="spanel"><h4>Most-seen teams</h4>' + statList(s.teams, "") + "</section>");
    panels.push('<section class="spanel"><h4>Top venues</h4>' + statList(s.venues, "") + "</section>");
    panels.push('<section class="spanel"><h4>Top cities</h4>' + statList(s.cities, "") + "</section>");
    panels.push('<section class="spanel spanel-years"><h4>By year</h4><div class="year-grid">' + statList(s.byYear, "", 99) + "</div></section>");
    return bar + '<div class="sdetail">' + panels.join("") + "</div>";
  }

  // ---- main render ---------------------------------------------------------
  function currentList() {
    var list = ALL.slice();
    if (state.filter !== "all") list = list.filter(function (e) { return e.type === state.filter; });
    list = list.filter(function (e) { return SL.matchesSearch(e, state.query); });
    list.sort(function (a, b) {
      var av = a.date || "", bv = b.date || "";
      return state.sort === "new" ? bv.localeCompare(av) : av.localeCompare(bv);
    });
    return list;
  }

  function renderContent(list) {
    var content = $("#content");
    if (!list.length) {
      content.className = "";
      content.innerHTML = '<div class="empty">No events match. Try fewer words, or clear the search.</div>';
      return;
    }
    content.className = "index-view";
    var counts = {};
    list.forEach(function (e) { var y = SL.yearOf(e) || DASH; counts[y] = (counts[y] || 0) + 1; });
    var html = [];
    var curYear = null;
    list.forEach(function (e) {
      var y = SL.yearOf(e) || DASH;
      if (y !== curYear) {
        curYear = y;
        html.push('<div class="iv-yearhead"><span class="iv-yh-year">' + esc(y) + "</span>" +
          '<span class="iv-yh-count">' + counts[y] + (counts[y] === 1 ? " show" : " shows") + "</span></div>");
      }
      html.push(indexRow(e));
    });
    content.innerHTML = html.join("");
  }

  function render() {
    var list = currentList();
    $("#stats").innerHTML = renderStats(computeStats(list));
    document.body.classList.toggle("stats-open", state.statsOpen);
    $("#statsToggle").textContent = state.statsOpen ? "📊 Hide stats ▴" : "📊 Show stats ▾";
    renderContent(list);
    $("#count").textContent = list.length + " shown";
    Array.prototype.forEach.call(document.querySelectorAll("[data-filter]"), function (b) {
      b.classList.toggle("active", b.dataset.filter === state.filter);
    });
  }

  // ---- wire up -------------------------------------------------------------
  function wire() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-filter]"), function (b) {
      b.addEventListener("click", function () { state.filter = b.dataset.filter; render(); });
    });
    $("#search").addEventListener("input", function (e) { state.query = e.target.value; render(); });
    $("#sort").addEventListener("change", function (e) { state.sort = e.target.value; render(); });
    $("#statsToggle").addEventListener("click", function () { state.statsOpen = !state.statsOpen; render(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "/" && document.activeElement !== $("#search")) { e.preventDefault(); $("#search").focus(); }
    });
  }

  SL.loadEvents().then(function (data) {
    ALL = Array.isArray(data) ? data : [];
    wire();
    render();
  }).catch(function (err) {
    $("#content").innerHTML = '<div class="empty">Could not load events.<br><small>' +
      esc(err.message) + "<br>Run a local server (python3 -m http.server) instead of opening the file directly.</small></div>";
  });
})();
