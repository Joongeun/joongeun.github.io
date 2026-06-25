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

  function drawPlant(p, t) {
    var ctx = p.ctx;
    ctx.clearRect(0, 0, p.el.width, p.el.height);
    var amp = reduced ? 0 : 2.2;
    var sway = Math.sin(t * 0.0013 + p.phase) * amp;
    var c = makeCell(ctx, p.Hg, sway);
    switch (p.type) {
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
  }

  /* ---------- Falling autumn leaves in the side margins (New England fall) ---------- */
  var leafCanvas = document.getElementById("leaves");
  var lctx = leafCanvas ? leafCanvas.getContext("2d") : null;

  var LEAF_COLORS = ["#d2451e", "#e8731c", "#f0a826", "#c9302c", "#a8531c", "#e0b020", "#b5471f"];
  // 9x9 maple-leaf silhouette (stem at the bottom).
  var LEAF_BMP = [
    "000100000",
    "100100010",
    "010101100",
    "001111000",
    "111111110",
    "000111000",
    "001010100",
    "000010000",
    "000010000"
  ].map(function (row) { return row.split("").map(function (ch) { return ch === "1"; }); });

  var leaves = [], leafW = 0, leafH = 0;
  var CONTENT_HALF = 500; // half of the 1000px content column

  function gutter() { return Math.max(0, (leafW / 2) - CONTENT_HALF); }

  // (re)seed one leaf. atTop=true respawns it just above the viewport.
  function seed(le, atTop) {
    var gw = gutter();
    var side = Math.random() < 0.5 ? -1 : 1;            // -1 left margin, +1 right
    var lx = 8 + Math.random() * Math.max(2, gw - 16);  // x within the margin
    le.side = side;
    le.x = side < 0 ? lx : leafW - lx;
    le.y = atTop ? -16 - Math.random() * 80 : Math.random() * leafH;
    le.vy = 0.45 + Math.random() * 0.9;
    le.vx = side * (0.05 + Math.random() * 0.3);         // drift outward, toward the edge
    le.sway = 0.4 + Math.random() * 0.9;
    le.phase = Math.random() * Math.PI * 2;
    le.angle = Math.random() * Math.PI * 2;
    le.spin = (Math.random() - 0.5) * 0.04;
    le.scale = 0.85 + Math.random() * 0.8;
    le.color = LEAF_COLORS[(Math.random() * LEAF_COLORS.length) | 0];
    return le;
  }

  function initLeaves() {
    if (!leafCanvas) return;
    leafW = leafCanvas.width = window.innerWidth;
    leafH = leafCanvas.height = window.innerHeight;
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
    lctx.save();
    lctx.translate(le.x, le.y);
    lctx.rotate(le.angle);
    var p = 2 * le.scale, s = Math.ceil(p);
    lctx.fillStyle = le.color;
    for (var r = 0; r < 9; r++) {
      for (var c = 0; c < 9; c++) {
        if (LEAF_BMP[r][c]) lctx.fillRect(Math.round((c - 4) * p), Math.round((r - 4) * p), s, s);
      }
    }
    lctx.restore();
  }

  function updateLeaf(le) {
    le.y += le.vy;
    le.phase += 0.02;
    le.x += le.vx + Math.sin(le.phase) * le.sway;
    le.angle += le.spin;
    if (le.y > leafH + 24 || le.x < -24 || le.x > leafW + 24) seed(le, true);
  }

  /* ---------- Loop ---------- */
  function frame(t) {
    plants.forEach(function (p) { drawPlant(p, t); });
    if (lctx && leaves.length) {
      lctx.clearRect(0, 0, leafW, leafH);
      for (var i = 0; i < leaves.length; i++) { updateLeaf(leaves[i]); drawLeaf(leaves[i]); }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
