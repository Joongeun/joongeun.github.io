(function () {
  "use strict";

  var root = document.getElementById("tamagotchi");
  var canvas = document.getElementById("tama-canvas");
  var bubble = document.getElementById("tama-bubble");
  if (!root || !canvas) return;

  var ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  var PX = 4;  // each logical pixel = 4 canvas px (16-wide grid -> 64px)
  var OY = 4;  // top offset (rows): pushes the robot down so the sprout has headroom
  var COL = {
    out:  "#0a0c10",
    body: "#c9d1d9",
    dark: "#8b949e",
    gold: "#FDB515",
    face: "#11151c",
    mouth:"#3a4150"
  };
  // Optimus Prime palette (used after the transform) + sprout greens.
  var OPT = {
    blue: "#2f6fc0", blueD: "#1f4f8f", blueL: "#4f8fdc",
    red:  "#c0392b", redD:  "#8f2a20",
    sil:  "#cdd6df", silD:  "#9aa4ad",
    win:  "#13202c", glass: "#2a6fae", eye: "#7fe0ff", glow: "#f5c542"
  };
  var GRN = "#3fae5a", GRN_D = "#2e8c45", BUD = "#9be86b";

  function cell(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * PX, (y + OY) * PX, w * PX, h * PX);
  }

  // Draw the robot for a given pose. legPhase: 0|1, eyes: 'open'|'blink'|'happy'
  function draw(pose) {
    ctx.clearRect(0, 0, 64, 80);

    // ground shadow
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.ellipse(32, 78, 14, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    if (pose.facing < 0) { ctx.translate(64, 0); ctx.scale(-1, 1); }

    if (isOptimus) drawOptimus(pose);
    else drawBot(pose);

    drawSprout();   // grows on the head before the transform

    ctx.restore();
  }

  // ---- Default pixel robot ----
  function drawBot(pose) {
    var armY = pose.eyes === "happy" ? 7 : 8;

    // antenna
    cell(8, 0, 1, 1, COL.gold);
    cell(8, 1, 1, 1, COL.dark);

    // head
    cell(5, 2, 6, 5, COL.body);
    cell(10, 2, 1, 5, COL.dark);           // right shading
    cell(5, 3, 5, 2, COL.face);            // face screen
    // eyes
    if (pose.eyes === "blink") {
      cell(6, 4, 1, 1, COL.dark);
      cell(8, 4, 1, 1, COL.dark);
    } else if (pose.eyes === "happy") {
      cell(6, 3, 1, 1, COL.gold);
      cell(9, 3, 1, 1, COL.gold);
      cell(7, 4, 2, 1, COL.gold);          // smile
    } else {
      cell(6, 3, 1, 1, COL.gold);
      cell(9, 3, 1, 1, COL.gold);
      cell(7, 4, 2, 1, COL.mouth);         // grill
    }

    // neck
    cell(7, 7, 2, 1, COL.dark);

    // body
    cell(4, 8, 8, 5, COL.body);
    cell(11, 8, 1, 5, COL.dark);           // right shading
    cell(4, 12, 8, 1, COL.dark);           // bottom shading
    cell(7, 9, 2, 2, COL.gold);            // chest light
    cell(5, 9, 1, 1, COL.dark);            // panel detail

    // arms
    cell(3, armY, 1, 3, COL.dark);
    cell(12, armY, 1, 3, COL.dark);

    // legs (walk alternation)
    if (pose.legPhase === 0) {
      cell(5, 13, 2, 3, COL.dark);
      cell(9, 13, 2, 2, COL.dark);
    } else {
      cell(5, 13, 2, 2, COL.dark);
      cell(9, 13, 2, 3, COL.dark);
    }
  }

  // ---- Optimus Prime form (reward) ----
  // Cues for recognizability: blue helmet + two silver side antennae, a glowing
  // blue eye visor, a silver faceplate/mouthplate, a red chest (truck cab) with
  // twin windshield windows + a silver grille, and blue limbs.
  function drawOptimus(pose) {
    // side antennae / horns
    cell(4, 2, 1, 2, OPT.sil); cell(11, 2, 1, 2, OPT.sil);
    // helmet
    cell(5, 2, 6, 3, OPT.blue);
    cell(10, 2, 1, 3, OPT.blueD);          // right shade
    cell(6, 2, 4, 1, OPT.blueL);           // forehead highlight
    // glowing eye visor
    cell(6, 3, 4, 1, OPT.win);
    cell(6, 3, 1, 1, OPT.eye); cell(9, 3, 1, 1, OPT.eye);
    // silver faceplate / mouthplate
    cell(6, 5, 4, 2, OPT.sil);
    cell(9, 5, 1, 2, OPT.silD);            // shade
    cell(7, 6, 2, 1, OPT.silD);            // mouth line
    // neck
    cell(7, 7, 2, 1, OPT.silD);
    // shoulders / smokestack tips
    cell(3, 7, 1, 1, OPT.sil); cell(12, 7, 1, 1, OPT.sil);
    // red cab (chest)
    cell(4, 8, 8, 3, OPT.red);
    cell(11, 8, 1, 3, OPT.redD);           // right shade
    // twin windshield windows (dark, faint top glint)
    cell(5, 8, 2, 2, OPT.win); cell(9, 8, 2, 2, OPT.win);
    cell(5, 8, 2, 1, OPT.glass); cell(9, 8, 2, 1, OPT.glass);
    // silver grille / bumper
    cell(4, 10, 8, 1, OPT.sil);
    // blue abdomen
    cell(4, 11, 8, 2, OPT.blue);
    cell(11, 11, 1, 2, OPT.blueD);         // right shade
    cell(4, 12, 8, 1, OPT.blueD);          // bottom shade
    cell(7, 11, 2, 1, OPT.glow);           // belt buckle
    // arms (blue with silver fists)
    cell(3, 8, 1, 3, OPT.blue); cell(12, 8, 1, 3, OPT.blue);
    cell(3, 10, 1, 1, OPT.silD); cell(12, 10, 1, 1, OPT.silD);
    // legs (blue, walk alternation) with silver feet
    if (pose.legPhase === 0) {
      cell(5, 13, 2, 3, OPT.blue); cell(9, 13, 2, 2, OPT.blue);
      cell(5, 15, 2, 1, OPT.silD); cell(9, 14, 2, 1, OPT.silD);
    } else {
      cell(5, 13, 2, 2, OPT.blue); cell(9, 13, 2, 3, OPT.blue);
      cell(5, 14, 2, 1, OPT.silD); cell(9, 15, 2, 1, OPT.silD);
    }
  }

  // ---- Green sprout that grows on the head (the click gateway) ----
  function drawSprout() {
    if (sproutLevel <= 0) return;
    var h = Math.min(sproutLevel, 4);
    for (var s = 0; s <= h; s++) cell(8, 1 - s, 1, 1, GRN);  // stem rises from antenna spot
    if (h >= 1) cell(7, 0, 1, 1, GRN_D);                     // leaves alternate out
    if (h >= 2) cell(9, -1, 1, 1, GRN_D);
    if (h >= 3) cell(7, -2, 1, 1, GRN);
    cell(8, -h, 1, 1, BUD);                                  // bud on top
  }

  /* ---------- State ---------- */
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var W = function () { return window.innerWidth - 64; };
  var x = Math.min(80, W());
  var targetX = x;
  var facing = 1;
  var legPhase = 0;
  var lastStep = 0;
  var blinkUntil = 0;
  var nextBlink = 1500;
  var happyUntil = 0;
  var hopStart = 0;
  var lastMouseMove = 0;
  var nextWander = 2000;
  var nextChatter = 9000;

  // Easter-egg state (driven by robot:* CustomEvents from easteregg.js).
  var sproutLevel = 0;   // green sprout grows on the head as the robot is clicked
  var isOptimus = false; // transforms into Optimus Prime after the Snake game
  var hasBaby = false;   // baby robot companion after the Simon game
  var spinStart = 0, spinUntil = 0;
  var buddyCanvas = null, buddyCtx = null, buddyX = 0;

  var MESSAGES = [
    "beep boop!", "hi there!", "nice work!", "need a hand?",
    "go bears!", "exploring...", "*whirr*", "recycling bits",
    "01001000 01101001", "stay curious"
  ];

  function say(msg, ms) {
    if (!bubble) return;
    bubble.textContent = msg;
    bubble.classList.add("show");
    clearTimeout(say._t);
    say._t = setTimeout(function () { bubble.classList.remove("show"); }, ms || 2600);
  }

  // Cursor tracking -> chase the mouse's x position.
  window.addEventListener("mousemove", function (e) {
    targetX = Math.max(0, Math.min(W(), e.clientX - 32));
    lastMouseMove = performance.now();
  }, { passive: true });

  window.addEventListener("resize", function () { x = Math.min(x, W()); }, { passive: true });

  // Click -> happy hop + speech bubble.
  root.addEventListener("click", function () {
    happyUntil = performance.now() + 1500;
    hopStart = performance.now();
    say(MESSAGES[(Math.floor(performance.now() / 137)) % MESSAGES.length]);
  });

  /* ---------- Baby robot companion (a mini Optimus) ---------- */
  function ensureCompanion() {
    if (hasBaby && !buddyCanvas) {
      buddyCanvas = document.createElement("canvas");
      buddyCanvas.id = "tama-buddy";
      buddyCanvas.width = 40; buddyCanvas.height = 40;
      buddyCanvas.setAttribute("aria-hidden", "true");
      document.body.appendChild(buddyCanvas);
      buddyCtx = buddyCanvas.getContext("2d");
      buddyCtx.imageSmoothingEnabled = false;
      buddyX = x - 30;
    } else if (!hasBaby && buddyCanvas) {
      buddyCanvas.remove(); buddyCanvas = null; buddyCtx = null;
    }
  }

  // Mini Optimus that toddles after the main one.
  function drawBuddy() {
    var c2 = buddyCtx, px = 2, ox = 4, oy = 6; // 16-grid * 2 = 32, centered in 40
    function k(gx, gy, w, h, col) { c2.fillStyle = col; c2.fillRect(ox + gx * px, oy + gy * px, w * px, h * px); }
    c2.clearRect(0, 0, 40, 40);
    c2.fillStyle = "rgba(0,0,0,0.25)";
    c2.beginPath(); c2.ellipse(20, 38, 9, 2, 0, 0, Math.PI * 2); c2.fill();
    k(4, 2, 1, 2, OPT.sil); k(11, 2, 1, 2, OPT.sil);                 // horns
    k(5, 2, 6, 3, OPT.blue); k(10, 2, 1, 3, OPT.blueD);             // helmet
    k(6, 3, 4, 1, OPT.win); k(6, 3, 1, 1, OPT.eye); k(9, 3, 1, 1, OPT.eye); // eyes
    k(6, 5, 4, 1, OPT.sil);                                         // faceplate
    k(4, 8, 8, 4, OPT.red); k(11, 8, 1, 4, OPT.redD);              // chest
    k(5, 8, 2, 2, OPT.win); k(9, 8, 2, 2, OPT.win);                // windows
    k(4, 11, 8, 1, OPT.sil);                                        // grille
    k(5, 12, 2, 3, OPT.blue); k(9, 12, 2, 3, OPT.blue);            // legs
  }

  /* ---------- Cross-module event API (dispatched by easteregg.js) ---------- */
  document.addEventListener("robot:say", function (e) { say(e.detail.msg, e.detail.ms); });
  document.addEventListener("robot:spin", function () {
    if (reduced) return;
    spinStart = performance.now(); spinUntil = spinStart + 900; happyUntil = spinUntil;
  });
  document.addEventListener("robot:sprout", function (e) {
    sproutLevel = Math.max(sproutLevel, (e.detail && e.detail.level) | 0);
  });
  document.addEventListener("robot:transform", function () {
    isOptimus = true;
    happyUntil = performance.now() + 1600; hopStart = performance.now();
    if (!reduced) { spinStart = performance.now(); spinUntil = spinStart + 900; }
  });
  document.addEventListener("robot:baby", function () {
    hasBaby = true; ensureCompanion();
  });

  /* ---------- Loop ---------- */
  function frame(t) {
    var dx = targetX - x;
    var moving = Math.abs(dx) > 6;
    var happy = t < happyUntil;

    // Idle wander: if the mouse hasn't moved recently, pick a new spot.
    if (!reduced && t - lastMouseMove > 4000 && t > nextWander) {
      targetX = Math.floor(Math.random() * W());
      nextWander = t + 3000 + Math.random() * 4000;
    }

    // Spontaneous chatter.
    if (t > nextChatter) {
      if (!happy) say(MESSAGES[(Math.floor(t / 200)) % MESSAGES.length], 2400);
      nextChatter = t + 11000 + Math.random() * 9000;
    }

    // Move.
    if (moving && !happy) {
      facing = dx > 0 ? 1 : -1;
      var speed = reduced ? Math.abs(dx) : Math.min(Math.abs(dx), 1.6);
      x += facing * speed;
      if (t - lastStep > 130) { legPhase ^= 1; lastStep = t; }
    } else {
      legPhase = 0;
    }

    // Blink.
    if (t > nextBlink && !happy) { blinkUntil = t + 130; nextBlink = t + 2200 + Math.random() * 2600; }
    var eyes = happy ? "happy" : (t < blinkUntil ? "blink" : "open");

    draw({ facing: facing, legPhase: legPhase, eyes: eyes });

    // Position + hop + (gateway) spin.
    var hopY = 0;
    if (happy) {
      var hp = (t - hopStart) / 1500;
      hopY = -Math.abs(Math.sin(hp * Math.PI * 3)) * 14 * (1 - hp);
    }
    var spin = "";
    if (t < spinUntil) { spin = " rotate(" + (((t - spinStart) / 900) * 360) + "deg)"; }
    root.style.transform = "translateX(" + x + "px) translateY(" + hopY + "px)" + spin;

    // Companion bot eases along behind the main robot.
    if (buddyCanvas) {
      var bt = x - 30;
      buddyX += (bt - buddyX) * (reduced ? 1 : 0.06);
      drawBuddy();
      var bhopY = reduced ? 0 : Math.sin(t * 0.004) * 2;
      buddyCanvas.style.transform = "translateX(" + buddyX + "px) translateY(" + bhopY + "px)";
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Greet shortly after load.
  setTimeout(function () { say("hi! click me!", 3000); }, 2500);
})();
