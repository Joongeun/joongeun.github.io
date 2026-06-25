(function () {
  "use strict";

  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var PX = 4;

  var C = {
    stem:  "#3fae5a", stemD: "#2f7d42",
    leaf:  "#5ad16f", leafD: "#39a14f", leafL: "#86e89a",
    goldP: "#FDB515", goldC: "#b9810f",
    pinkP: "#ff7eb6", pinkC: "#d65b97",
    tOut:  "#49b85f", tOutD: "#2f8f43", tIn: "#d94f6b", tInD: "#a83552", tooth: "#f0f6fc"
  };

  /* Draw a grid cell with per-row sway (top of plant sways more than the base). */
  function makeCell(ctx, Hg, sway) {
    return function (gx, gy, gw, gh, color) {
      var cy = gy + gh / 2;
      var f = Math.pow(Math.max(0, (Hg - cy) / Hg), 1.4);
      var shift = sway * f;
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(gx * PX + shift), gy * PX, gw * PX, gh * PX);
    };
  }

  /* ---------- Plant renderers (12-wide grid unless noted) ---------- */
  function grass(c) {
    c(3, 12, 1, 8, C.leafD); c(3, 12, 1, 1, C.leafL);
    c(5, 7, 1, 13, C.leaf);  c(5, 7, 1, 1, C.leafL);
    c(6, 10, 1, 10, C.leafD);
    c(8, 8, 1, 12, C.leaf);  c(8, 8, 1, 1, C.leafL);
    c(9, 13, 1, 7, C.leafD);
    c(2, 15, 1, 5, C.leafD);
  }

  function sprout(c) {
    c(5, 9, 2, 11, C.stem); c(6, 9, 1, 11, C.stemD);   // stem
    c(2, 12, 3, 2, C.leaf); c(3, 11, 2, 1, C.leafD);    // left leaf
    c(7, 10, 3, 2, C.leaf); c(7, 9, 2, 1, C.leafD);     // right leaf
    c(5, 7, 2, 2, C.leaf);  c(5, 6, 2, 1, C.leafL);     // top bud
  }

  function flower(c, hue) {
    var P = hue === "pink" ? C.pinkP : C.goldP;
    var CN = hue === "pink" ? C.pinkC : C.goldC;
    c(5, 8, 1, 12, C.stem); c(6, 8, 1, 12, C.stemD);    // stem
    c(2, 13, 3, 2, C.leaf); c(7, 12, 3, 2, C.leaf);     // leaves
    // blossom
    c(4, 2, 4, 4, P);
    c(3, 3, 1, 2, P); c(8, 3, 1, 2, P);
    c(5, 1, 2, 1, P); c(5, 6, 2, 1, P);
    c(5, 3, 2, 2, CN);                                   // center
  }

  function fern(c) {
    c(5, 4, 2, 16, C.stemD);                            // central stem
    var ys = [6, 9, 12, 15];
    for (var i = 0; i < ys.length; i++) {
      var y = ys[i];
      c(2, y, 3, 1, C.leaf); c(2, y + 1, 2, 1, C.leafD);   // left frond
      c(7, y, 3, 1, C.leaf); c(8, y + 1, 2, 1, C.leafD);   // right frond
    }
    c(5, 2, 2, 2, C.leafL);                             // tip
  }

  // Venus flytrap (14-wide grid). `open` 0 (snapped shut) .. 1 (gaping).
  function flytrap(c, open) {
    c(6, 13, 2, 9, C.stemD);                            // stem
    c(3, 18, 3, 2, C.leaf); c(8, 18, 3, 2, C.leaf);     // base leaves
    c(8, 16, 3, 1, C.leafD);
    var lift = Math.round(open * 3);
    // lower lobe (fixed)
    c(4, 9, 6, 4, C.tOut); c(9, 9, 1, 4, C.tOutD);
    c(5, 9, 4, 2, C.tIn);  c(5, 11, 4, 1, C.tInD);
    // lower teeth
    c(4, 8, 1, 1, C.tooth); c(6, 8, 1, 1, C.tooth); c(8, 8, 1, 1, C.tooth);
    // upper lobe (rotates open upward)
    var uy = 5 - lift;
    c(4, uy, 6, 4, C.tOut); c(9, uy, 1, 4, C.tOutD);
    c(5, uy + 1, 4, 2, C.tIn);
    // upper teeth point down toward the gap
    c(4, uy + 4, 1, 1, C.tooth); c(6, uy + 4, 1, 1, C.tooth); c(8, uy + 4, 1, 1, C.tooth);
  }

  /* ---------- Set up plant canvases ---------- */
  var plants = Array.prototype.slice.call(document.querySelectorAll(".garden .plant")).map(function (cv) {
    var w = cv.parentNode ? window.innerWidth : 0;
    return {
      el: cv,
      ctx: cv.getContext("2d"),
      type: cv.dataset.type,
      hue: cv.dataset.hue,
      leftPct: parseFloat(cv.dataset.left) || 0,
      Hg: cv.height / PX,
      Wg: cv.width / PX,
      phase: (parseFloat(cv.dataset.left) || 0) * 0.7,
      open: 0.8,
      nextSnap: 2500 + Math.random() * 4000,
      snapT: 0
    };
  });

  function placePlants() {
    plants.forEach(function (p) { p.el.style.left = p.leftPct + "%"; });
  }
  placePlants();

  function easeOut(x) { return 1 - (1 - x) * (1 - x); }

  function drawPlant(p, t) {
    var ctx = p.ctx;
    ctx.clearRect(0, 0, p.el.width, p.el.height);
    var amp = reduced ? 0 : 2.2;
    var sway = Math.sin(t * 0.0013 + p.phase) * amp;
    var c = makeCell(ctx, p.Hg, sway);

    // Growing plant (planted via the seed packet): rise from the ground over ~3s.
    var growScaled = false;
    if (p.growth != null) {
      p.growth = reduced ? 1 : Math.min(1, (t - p.growthStart) / 3000);
      var g = easeOut(p.growth);
      ctx.save();
      ctx.translate(0, p.el.height);
      ctx.scale(1, g);
      ctx.translate(0, -p.el.height);
      growScaled = true;
    }

    switch (p.type) {
      case "grow":   if (p.growth < 0.5) sprout(c); else flower(c, p.hue); break;
      case "grass":  grass(c); break;
      case "sprout": sprout(c); break;
      case "flower": flower(c, p.hue); break;
      case "fern":   fern(c); break;
      case "flytrap":
        if (!reduced) {
          p.snapT += 16;
          if (p.snapT > p.nextSnap) { p.open = 0; p.snapT = 0; p.nextSnap = 3000 + Math.random() * 5000; }
          // ease back open after a snap; gentle breathing otherwise
          var target = 0.78 + Math.sin(t * 0.002 + p.phase) * 0.08;
          p.open += (target - p.open) * (p.open < 0.3 ? 0.06 : 0.12);
        }
        flytrap(c, p.open);
        break;
    }
    if (growScaled) ctx.restore();
  }

  /* ---------- Falling autumn leaves in the side margins (New England fall) ---------- */
  var leafCanvas = document.getElementById("leaves");
  var lctx = leafCanvas ? leafCanvas.getContext("2d") : null;
  var TAU = Math.PI * 2;

  // Pre-rendered smooth vector leaf sprites (built once). Each = species x palette.
  var LEAF_S = 44; // logical sprite box
  var SPECIES = [
    { r: function (th) { return 0.50 + 0.50 * Math.pow(Math.abs(Math.cos(2.5 * th)), 0.35); }, stretch: 1.00 }, // maple (5 lobes)
    { r: function (th) { return 0.80 + 0.20 * Math.cos(7 * th); }, stretch: 1.12 },                              // oak (scalloped)
    { r: function (th) { return 0.86 + 0.14 * Math.cos(2 * th); }, stretch: 1.28 }                               // birch (ovate)
  ];
  var PALETTES = [
    { base: "#7a1f12", mid: "#c9302c", tip: "#f0a826", vein: "#5a1408", hi: "#ffd9a0" },
    { base: "#8a3b0f", mid: "#e8731c", tip: "#f7c948", vein: "#5e2606", hi: "#ffe6b0" },
    { base: "#7d5a10", mid: "#e0b020", tip: "#f4e08a", vein: "#553f08", hi: "#fff2c0" },
    { base: "#6e1410", mid: "#b5471f", tip: "#d98a2b", vein: "#4a0d08", hi: "#ffd9a0" }
  ];

  function leafPath(o, S, spec) {
    var cx = S / 2, cy = S * 0.46, R = S * 0.40, steps = 56;
    o.beginPath();
    for (var i = 0; i <= steps; i++) {
      var th = (i / steps) * TAU - Math.PI / 2;          // start at the tip (up)
      var rr = R * spec.r(th);
      var x = cx + Math.cos(th) * rr;
      var y = cy + Math.sin(th) * rr * spec.stretch;
      if (i === 0) o.moveTo(x, y); else o.lineTo(x, y);
    }
    o.closePath();
    return { cx: cx, cy: cy, R: R, stretch: spec.stretch };
  }

  function makeSprite(spec, pal) {
    var q = 3, S = LEAF_S;                                // supersample for smooth edges
    var cv = document.createElement("canvas");
    cv.width = S * q; cv.height = S * q;
    var o = cv.getContext("2d");
    o.scale(q, q);
    // body with gradient + soft drop shadow
    o.save();
    o.shadowColor = "rgba(0,0,0,0.28)"; o.shadowBlur = 3; o.shadowOffsetY = 1.5;
    var g = o.createLinearGradient(0, S * 0.86, 0, S * 0.06);
    g.addColorStop(0, pal.base); g.addColorStop(0.55, pal.mid); g.addColorStop(1, pal.tip);
    o.fillStyle = g;
    var m = leafPath(o, S, spec);
    o.fill();
    o.restore();
    // veins (midrib + branches)
    o.strokeStyle = pal.vein; o.lineWidth = 1; o.lineCap = "round";
    var bottom = m.cy + m.R * m.stretch, top = m.cy - m.R * m.stretch;
    o.beginPath();
    o.moveTo(m.cx, bottom * 0.96); o.lineTo(m.cx, top + 2);
    [0.66, 0.5, 0.36].forEach(function (f) {
      var yy = m.cy + (bottom - m.cy) * (f - 0.0) - (bottom - m.cy) * 0.0;
      var vy = m.cy - (m.cy - top) * (1 - f);
      o.moveTo(m.cx, vy); o.lineTo(m.cx - m.R * 0.5 * f, vy - m.R * 0.22);
      o.moveTo(m.cx, vy); o.lineTo(m.cx + m.R * 0.5 * f, vy - m.R * 0.22);
    });
    o.stroke();
    // stem
    o.strokeStyle = pal.vein; o.lineWidth = 1.6;
    o.beginPath(); o.moveTo(m.cx, bottom * 0.96); o.lineTo(m.cx, S - 2); o.stroke();
    // soft highlight
    o.globalAlpha = 0.18;
    var hg = o.createRadialGradient(m.cx - m.R * 0.25, top + m.R * 0.4, 1, m.cx, m.cy, m.R);
    hg.addColorStop(0, pal.hi); hg.addColorStop(1, "rgba(255,255,255,0)");
    o.fillStyle = hg; leafPath(o, S, spec); o.fill();
    o.globalAlpha = 1;
    return { canvas: cv, S: S };
  }

  var SPRITES = [];
  for (var si = 0; si < SPECIES.length; si++) {
    for (var pi = 0; pi < PALETTES.length; pi++) SPRITES.push(makeSprite(SPECIES[si], PALETTES[pi]));
  }

  var leaves = [], leafW = 0, leafH = 0;
  var CONTENT_HALF = 500; // half of the 1000px content column

  function gutter() { return Math.max(0, (leafW / 2) - CONTENT_HALF); }

  // (re)seed one leaf. atTop=true respawns it just above the viewport.
  function seed(le, atTop) {
    var gw = gutter();
    var side = Math.random() < 0.5 ? -1 : 1;            // -1 left margin, +1 right
    var lx = 8 + Math.random() * Math.max(2, gw - 16);  // x within the margin
    le.burst = false;
    le.side = side;
    le.x = side < 0 ? lx : leafW - lx;
    le.y = atTop ? -16 - Math.random() * 80 : Math.random() * leafH;
    le.vy = 0.45 + Math.random() * 0.9;
    le.vx = side * (0.05 + Math.random() * 0.3);         // drift outward, toward the edge
    le.sway = 0.4 + Math.random() * 0.9;
    le.phase = Math.random() * TAU;
    le.angle = Math.random() * TAU;
    le.spin = (Math.random() - 0.5) * 0.02;             // slower for smoothness
    le.tumblePhase = Math.random() * TAU;
    le.tumbleRate = 0.6 + Math.random() * 0.8;
    le.scale = (16 + Math.random() * 14) / LEAF_S;      // ~16-30px on screen
    le.alpha = 0.82 + Math.random() * 0.18;
    le.sprite = (Math.random() * SPRITES.length) | 0;
    return le;
  }

  function initLeaves() {
    if (!leafCanvas) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    leafW = window.innerWidth; leafH = window.innerHeight;
    leafCanvas.width = Math.round(leafW * dpr);
    leafCanvas.height = Math.round(leafH * dpr);
    leafCanvas.style.width = leafW + "px";
    leafCanvas.style.height = leafH + "px";
    lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    leaves = [];
    if (reduced) return;                                 // honor reduced-motion: no falling leaves
    var gw = gutter();
    if (gw < 70) return;                                 // margins too narrow — skip to protect content
    var count = Math.max(4, Math.min(14, Math.round(gw / 22)));
    for (var i = 0; i < count; i++) leaves.push(seed({}, false));
  }
  initLeaves();
  var resizeT;
  window.addEventListener("resize", function () {
    clearTimeout(resizeT);
    resizeT = setTimeout(function () { placePlants(); initLeaves(); }, 150);
  }, { passive: true });

  function drawLeaf(le) {
    var sp = SPRITES[le.sprite];
    lctx.save();
    lctx.translate(le.x, le.y);
    lctx.rotate(le.angle);
    var flip = Math.cos(le.phase * le.tumbleRate + le.tumblePhase); // +1..-1 fakes the 3D edge-on flip
    lctx.scale(le.scale * flip, le.scale);
    lctx.globalAlpha = le.alpha;
    lctx.drawImage(sp.canvas, -sp.S / 2, -sp.S / 2, sp.S, sp.S);
    lctx.restore();
  }

  // returns false when a burst leaf should be removed
  function updateLeaf(le) {
    if (le.burst) {
      le.vy += 0.12;                                     // gravity
      le.x += le.vx; le.y += le.vy;
      le.angle += le.spin; le.phase += 0.04;
      return le.y < leafH + 40 && le.x > -40 && le.x < leafW + 40;
    }
    le.y += le.vy;
    le.phase += 0.02;
    le.x += le.vx + Math.sin(le.phase) * le.sway;
    le.angle += le.spin;
    if (le.y > leafH + 24 || le.x < -24 || le.x > leafW + 24) seed(le, true);
    return true;
  }

  /* ---------- Easter-egg event hooks ---------- */
  document.addEventListener("garden:flytrap-snap", function () {
    for (var i = 0; i < plants.length; i++) {
      if (plants[i].type === "flytrap") { plants[i].open = 0; plants[i].snapT = 0; }
    }
  });

  document.addEventListener("garden:plant", function (e) {
    spawnGrowingPlant(e.detail && e.detail.x);
  });

  document.addEventListener("leaves:burst", function (e) {
    if (reduced || !lctx) return;
    var d = e.detail || {};
    burstLeaves(d.x != null ? d.x : leafW / 2, d.y != null ? d.y : leafH - 40, d.n || 24);
  });

  function spawnGrowingPlant(clientX) {
    var garden = document.querySelector(".garden");
    if (!garden) return;
    var cv = document.createElement("canvas");
    cv.className = "plant"; cv.width = 48; cv.height = 80;
    garden.appendChild(cv);
    var leftPct = clientX != null
      ? Math.max(1, Math.min(99, (clientX / window.innerWidth) * 100))
      : Math.random() * 100;
    cv.style.left = leftPct + "%";
    plants.push({
      el: cv, ctx: cv.getContext("2d"), type: "grow",
      hue: Math.random() < 0.5 ? "gold" : "pink",
      leftPct: leftPct, Hg: cv.height / PX, Wg: cv.width / PX,
      phase: leftPct * 0.7, open: 0.8, nextSnap: 0, snapT: 0,
      growth: 0, growthStart: performance.now()
    });
  }

  function burstLeaves(x, y, n) {
    for (var i = 0; i < n; i++) {
      var ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI; // upward fan
      var spd = 2 + Math.random() * 4.5;
      leaves.push({
        burst: true,
        x: x + (Math.random() - 0.5) * 30, y: y + (Math.random() - 0.5) * 20,
        vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
        sway: 0, phase: Math.random() * TAU,
        angle: Math.random() * TAU, spin: (Math.random() - 0.5) * 0.25,
        tumblePhase: Math.random() * TAU, tumbleRate: 0.6 + Math.random() * 0.8,
        scale: (16 + Math.random() * 14) / LEAF_S, alpha: 1,
        sprite: (Math.random() * SPRITES.length) | 0
      });
    }
  }

  /* ---------- Loop ---------- */
  function frame(t) {
    plants.forEach(function (p) { drawPlant(p, t); });
    if (lctx && leaves.length) {
      lctx.clearRect(0, 0, leafW, leafH);
      for (var i = leaves.length - 1; i >= 0; i--) {
        if (!updateLeaf(leaves[i])) { leaves.splice(i, 1); continue; }
        drawLeaf(leaves[i]);
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
