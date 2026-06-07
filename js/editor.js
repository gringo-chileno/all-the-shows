/* Show Log — editor: client-only form backed by a localStorage working copy.
   Same pattern as Wine Life's editor: seed from the published JSON, edit a
   working copy in the browser, export events.json when ready to publish. */
(function () {
  "use strict";

  var SL = window.SL;
  var STORE_KEY = "showLog.workingCopy";

  var working = [];   // array of event objects
  var support = [];   // chips for the entry being edited

  var f = {
    form: document.getElementById("form"),
    id: document.getElementById("editing-id"),
    type: document.getElementById("f-type"),
    date: document.getElementById("f-date"),
    grpMusic: document.getElementById("grp-music"),
    grpSports: document.getElementById("grp-sports"),
    fieldSetlist: document.getElementById("field-setlist"),
    headliner: document.getElementById("f-headliner"),
    supportInput: document.getElementById("f-support-input"),
    supportChips: document.getElementById("support-chips"),
    away: document.getElementById("f-away"),
    home: document.getElementById("f-home"),
    league: document.getElementById("f-league"),
    title: document.getElementById("f-title"),
    venue: document.getElementById("f-venue"),
    city: document.getElementById("f-city"),
    country: document.getElementById("f-country"),
    source: document.getElementById("f-source"),
    youtube: document.getElementById("f-youtube"),
    setlist: document.getElementById("f-setlist"),
    notes: document.getElementById("f-notes"),
    deleteBtn: document.getElementById("delete-btn"),
    list: document.getElementById("entry-list"),
    count: document.getElementById("entry-count")
  };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  // ---- persistence ---------------------------------------------------------
  function save() { localStorage.setItem(STORE_KEY, JSON.stringify(working)); }

  function loadWorking() {
    var raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      try { working = JSON.parse(raw) || []; return Promise.resolve(); }
      catch (e) { working = []; }
    }
    return SL.loadEvents().then(function (data) { working = data || []; save(); })
      .catch(function () { working = []; });
  }

  // ---- type-driven field visibility ---------------------------------------
  function applyType() {
    var t = f.type.value;
    f.grpSports.hidden = (t !== "sports");
    f.grpMusic.hidden = (t === "sports");        // music + other share the act fields
    f.fieldSetlist.style.display = (t === "music") ? "" : "none";
  }

  // ---- chip input ----------------------------------------------------------
  function renderChips(container, input, arr) {
    Array.prototype.slice.call(container.querySelectorAll(".chip")).forEach(function (c) { c.remove(); });
    arr.forEach(function (text, i) {
      var chip = el("span", "chip", text);
      var x = el("button", null, "×"); x.type = "button";
      x.addEventListener("click", function () { arr.splice(i, 1); renderChips(container, input, arr); });
      chip.appendChild(x);
      container.insertBefore(chip, input);
    });
  }
  function wireChipInput(input, container, arr) {
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        var v = input.value.trim().replace(/,$/, "");
        if (v) { arr.push(v); input.value = ""; renderChips(container, input, arr); }
      } else if (e.key === "Backspace" && !input.value && arr.length) {
        arr.pop(); renderChips(container, input, arr);
      }
    });
  }

  // ---- form <-> object -----------------------------------------------------
  function blankForm() {
    f.id.value = "";
    f.type.value = "music";
    f.date.value = "";
    f.headliner.value = "";
    f.away.value = ""; f.home.value = ""; f.league.value = "";
    f.title.value = "";
    f.venue.value = ""; f.city.value = ""; f.country.value = "Chile";
    f.source.value = "Memory";
    f.youtube.value = ""; f.setlist.value = "";
    f.notes.value = "";
    support = [];
    renderChips(f.supportChips, f.supportInput, support);
    applyType();
    f.deleteBtn.hidden = true;
    window.scrollTo(0, 0);
  }

  function loadIntoForm(e) {
    f.id.value = e.id || "";
    f.type.value = e.type || "music";
    f.date.value = e.date || "";
    f.headliner.value = e.headliner || "";
    f.away.value = e.away || ""; f.home.value = e.home || ""; f.league.value = e.league || "";
    f.title.value = e.title || "";
    f.venue.value = e.venue || ""; f.city.value = e.city || ""; f.country.value = e.country || "Chile";
    f.source.value = e.source || "Memory";
    f.youtube.value = e.youtube || ""; f.setlist.value = e.setlist || "";
    f.notes.value = e.notes || "";
    support = (e.support || []).slice();
    renderChips(f.supportChips, f.supportInput, support);
    applyType();
    f.deleteBtn.hidden = false;
    window.scrollTo(0, 0);
  }

  function nameForId(t, headliner, away, home) {
    if (t === "sports") return [away, home].filter(Boolean).join("-") || "game";
    return headliner || "event";
  }

  function readForm() {
    var t = f.type.value;
    var date = f.date.value || null;
    var nm = nameForId(t, f.headliner.value.trim(), f.away.value.trim(), f.home.value.trim());
    var id = f.id.value || ((date ? date : "undated") + "-" + SL.slugify(nm));
    return {
      id: id,
      type: t,
      date: date,
      headliner: t === "sports" ? "" : f.headliner.value.trim(),
      support: t === "sports" ? [] : support.slice(),
      away: t === "sports" ? f.away.value.trim() : null,
      home: t === "sports" ? f.home.value.trim() : null,
      league: t === "sports" ? f.league.value.trim() : null,
      title: f.title.value.trim(),
      venue: f.venue.value.trim(),
      city: f.city.value.trim(),
      country: f.country.value,
      youtube: f.youtube.value.trim() || null,
      setlist: t === "music" ? (f.setlist.value.trim() || null) : null,
      source: f.source.value.trim() || "Memory",
      notes: f.notes.value.trim()
    };
  }

  // ---- list ----------------------------------------------------------------
  function renderList() {
    f.list.innerHTML = "";
    f.count.textContent = String(working.length);
    working.slice().sort(function (a, b) {
      return String(b.date || "").localeCompare(String(a.date || ""));
    }).forEach(function (e) {
      var row = el("div", "entry-row");
      var label = el("div");
      label.appendChild(el("strong", null, SL.title(e)));
      var meta = [SL.fmtDate(e), e.type, SL.place(e)].filter(Boolean).join("  ·  ");
      label.appendChild(el("div", "muted", meta));
      row.appendChild(label);
      var actions = el("div", "entry-actions");
      var edit = el("button", "link-btn", "Edit"); edit.type = "button";
      edit.addEventListener("click", function () { loadIntoForm(e); });
      actions.appendChild(edit);
      row.appendChild(actions);
      f.list.appendChild(row);
    });
  }

  // ---- actions -------------------------------------------------------------
  function upsert(entry) {
    var idx = -1;
    working.forEach(function (e, i) { if (e.id === entry.id) idx = i; });
    if (idx >= 0) working[idx] = entry; else working.push(entry);
    save(); renderList();
  }
  function download(filename, text) {
    var blob = new Blob([text], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    a.remove(); URL.revokeObjectURL(url);
  }
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    var ta = document.createElement("textarea");
    ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    ta.remove(); return Promise.resolve();
  }
  function flash(msg) {
    var box = document.getElementById("flash") || (function () {
      var b = el("div", "note-box"); b.id = "flash";
      f.form.parentNode.insertBefore(b, f.form); return b;
    })();
    box.textContent = msg;
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function fillDatalist(id, values) {
    var dl = document.getElementById(id);
    if (!dl) return;
    values.forEach(function (v) { var o = document.createElement("option"); o.value = v; dl.appendChild(o); });
  }

  function wire() {
    wireChipInput(f.supportInput, f.supportChips, support);
    f.type.addEventListener("change", applyType);

    f.form.addEventListener("submit", function (e) {
      e.preventDefault();
      var entry = readForm();
      if (!SL.title(entry) || SL.title(entry) === SL.DASH) {
        flash("Add an act or a matchup first.");
        return;
      }
      upsert(entry);
      blankForm();
      flash("Saved “" + SL.title(entry) + "”. Export when you're ready to publish.");
    });

    document.getElementById("new-btn").addEventListener("click", blankForm);
    document.getElementById("reload-btn").addEventListener("click", function () {
      if (!confirm("Replace the working copy with the published data file? Unsaved edits are lost.")) return;
      SL.loadEvents().then(function (data) { working = data || []; save(); renderList(); blankForm(); });
    });
    document.getElementById("import-file").addEventListener("change", function (e) {
      var file = e.target.files[0]; if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var data = JSON.parse(reader.result);
          if (!Array.isArray(data)) throw new Error("Not an array");
          working = data; save(); renderList(); blankForm();
          flash("Imported " + data.length + " events.");
        } catch (err) { alert("That file isn't valid events JSON: " + err.message); }
      };
      reader.readAsText(file);
    });
    document.getElementById("export-btn").addEventListener("click", function () {
      download("events.json", JSON.stringify(working, null, 2) + "\n");
    });
    document.getElementById("copy-entry-btn").addEventListener("click", function () {
      copyText(JSON.stringify(readForm(), null, 2)).then(function () { flash("Copied this entry's JSON to the clipboard."); });
    });
    f.deleteBtn.addEventListener("click", function () {
      var id = f.id.value; if (!id) return;
      if (!confirm("Delete this entry from the working copy?")) return;
      working = working.filter(function (e) { return e.id !== id; });
      save(); renderList(); blankForm();
    });
  }

  fillDatalist("venue-list", SL.COMMON_VENUES);
  fillDatalist("city-list", SL.COMMON_CITIES);
  fillDatalist("league-list", SL.LEAGUES);

  loadWorking().then(function () { blankForm(); wire(); renderList(); });
})();
