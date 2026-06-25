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

  /* ---------- Side vines ---------- */
  var vines = ["vine-left", "vine-right"].map(function (id) {
    var cv = document.getElementById(id);
    if (!cv) return null;
    return { el: cv, ctx: cv.getContext("2d"), side: id === "vine-left" ? "left" : "right" };
  }).filter(Boolean);

  function sizeVines() {
    vines.forEach(function (v) {
      // Only sized/visible on wide screens (CSS controls display).
      v.el.width = 90;
      v.el.height = window.innerHeight;
    });
  }
  sizeVines();
  window.addEventListener("resize", function () { sizeVines(); placePlants(); }, { passive: true });

  function drawVine(v, t) {
    var ctx = v.ctx, h = v.el.height, w = v.el.width;
    ctx.clearRect(0, 0, w, h);
    var baseX = v.side === "left" ? 20 : w - 20;
    var dir = v.side === "left" ? 1 : -1;          // leaves grow inward
    var amp = reduced ? 0 : 1;
    var i = 0;
    for (var py = h; py >= -8; py -= 4) {
      var k = h - py;
      var x = baseX + Math.sin(k * 0.018 + t * 0.0006 * amp) * 11;
      // stem
      ctx.fillStyle = (i % 2 === 0) ? C.stem : C.stemD;
      ctx.fillRect(Math.round(x), py, 5, 4);
      // leaves at intervals, alternating reach
      if (i % 7 === 0) {
        var ly = py;
        var lx = Math.round(x) + (dir > 0 ? 4 : 0);
        ctx.fillStyle = (i % 14 === 0) ? C.leaf : C.leafD;
        ctx.fillRect(lx, ly, dir * 8, 4);
        ctx.fillRect(lx + dir * 6, ly - 4, dir * 6, 4);
        ctx.fillRect(lx + dir * 10, ly - 6, dir * 4, 4);
        ctx.fillStyle = C.leafL;
        ctx.fillRect(lx + dir * 12, ly - 6, dir * 2, 2);
      }
      // occasional flower bud on the vine
      if (i % 23 === 11) {
        ctx.fillStyle = (i % 46 === 11) ? C.goldP : C.pinkP;
        ctx.fillRect(Math.round(x) + (dir > 0 ? 5 : -3), py - 2, 4, 4);
      }
      i++;
    }
  }

  /* ---------- Loop ---------- */
  function frame(t) {
    plants.forEach(function (p) { drawPlant(p, t); });
    // offsetWidth is 0 when CSS display:none (narrow screens); fixed elements
    // always report offsetParent===null, so we must not use that here.
    vines.forEach(function (v) { if (v.el.offsetWidth > 0) drawVine(v, t); });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
