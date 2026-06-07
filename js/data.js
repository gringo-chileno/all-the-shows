/* Show Log — shared data helpers (plain script, exposes window.SL).
   Mirrors the Wine Life convention: pure data helpers live here, shared by
   both the journal (app.js) and the editor (editor.js). */
(function () {
  "use strict";

  var DASH = "—";

  // Shown first in the editor pickers. Free-text entry is always allowed too.
  var COMMON_VENUES = [
    "Movistar Arena", "Estadio Nacional", "Estadio Monumental",
    "Estadio San Carlos de Apoquindo", "Teatro Caupolicán", "Teatro Coliseo",
    "Teatro Cariola", "Caja de Compensación", "Lollapalooza Chile",
    "Wrigley Field", "United Center", "Soldier Field", "Guaranteed Rate Field",
    "Chicago Theatre", "Allstate Arena"
  ];
  var COMMON_CITIES = [
    "Santiago", "Valparaíso", "Viña del Mar", "Concepción",
    "Chicago", "Buenos Aires", "Mendoza", "New York", "Los Angeles"
  ];
  var LEAGUES = [
    "MLB", "NBA", "NFL", "NHL", "MLS",
    "Primera División", "Copa Libertadores", "Premier League", "La Liga",
    "Champions League", "Tennis", "Other"
  ];

  var MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  function yearOf(e) { return e && e.date ? e.date.slice(0, 4) : null; }

  function fmtDate(e) {
    if (!e || !e.date) return DASH;
    var p = e.date.split("-").map(Number);
    var y = p[0], m = p[1], d = p[2];
    if (!y) return DASH;
    if (!m) return String(y);
    return MONTHS[m - 1] + " " + (d ? d + ", " : "") + y;
  }

  // The big label for an event. Falls back from explicit title -> headliner ->
  // "away @ home" -> dash.
  function title(e) {
    if (!e) return DASH;
    if (e.title) return e.title;
    if (e.type === "sports") {
      if (e.away && e.home) return e.away + " @ " + e.home;
      return e.home || e.away || DASH;
    }
    return e.headliner || DASH;
  }

  function subtitle(e) {
    if (!e) return "";
    if (e.type === "music") return (e.support && e.support.length) ? "w/ " + e.support.join(", ") : "";
    if (e.type === "sports") return e.league || "";
    return "";
  }

  function place(e) {
    return [e.venue, e.city].filter(Boolean).join(" · ");
  }

  function fmt(value) {
    if (value === null || value === undefined || value === "") return DASH;
    return String(value);
  }

  function slugify(name) {
    return String(name || "")
      .toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "") // strip accents
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  // Multi-word search: true when EVERY query word appears somewhere in the
  // event's text fields (per Rob's CLAUDE.md search rules). Word-order agnostic.
  function searchBlob(e) {
    return [
      e.headliner, (e.support || []).join(" "), e.home, e.away, e.league,
      e.title, e.venue, e.city, e.country, e.notes, e.type, yearOf(e)
    ].filter(Boolean).join(" ").toLowerCase();
  }
  function matchesSearch(e, query) {
    var q = String(query || "").trim().toLowerCase();
    if (!q) return true;
    var hay = searchBlob(e);
    return q.split(/\s+/).every(function (w) { return hay.indexOf(w) !== -1; });
  }

  // External links: use the explicit URL if present, else build a safe search.
  function ytLink(e) {
    if (e.youtube) return e.youtube;
    var name = e.type === "sports" ? title(e) : (e.headliner || title(e));
    var q = (name + " " + (e.type === "music" ? "live" : "highlights") + " " + (yearOf(e) || "")).trim();
    return "https://www.youtube.com/results?search_query=" + encodeURIComponent(q);
  }
  function setlistLink(e) {
    if (e.setlist) return e.setlist;
    var q = ((e.headliner || title(e)) + " " + (e.date || "")).trim();
    return "https://www.setlist.fm/search?query=" + encodeURIComponent(q);
  }

  function tally(arr) {
    var m = new Map();
    arr.filter(Boolean).forEach(function (k) { m.set(k, (m.get(k) || 0) + 1); });
    return Array.from(m.entries()).sort(function (a, b) {
      return b[1] - a[1] || String(a[0]).localeCompare(b[0]);
    });
  }

  // Load the dataset. Works over http(s); file:// will fail fetch (use a server).
  function loadEvents() {
    return fetch("data/events.json", { cache: "no-store" }).then(function (res) {
      if (!res.ok) throw new Error("Failed to load events.json (" + res.status + ")");
      return res.json();
    });
  }

  window.SL = {
    DASH: DASH, MONTHS: MONTHS,
    COMMON_VENUES: COMMON_VENUES, COMMON_CITIES: COMMON_CITIES, LEAGUES: LEAGUES,
    yearOf: yearOf, fmtDate: fmtDate, title: title, subtitle: subtitle, place: place,
    fmt: fmt, slugify: slugify, matchesSearch: matchesSearch,
    ytLink: ytLink, setlistLink: setlistLink, tally: tally, loadEvents: loadEvents
  };
})();
