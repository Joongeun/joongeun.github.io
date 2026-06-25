(function () {
  "use strict";

  var root = document.getElementById("tamagotchi");
  var canvas = document.getElementById("tama-canvas");
  var bubble = document.getElementById("tama-bubble");
  if (!root || !canvas) return;

  var ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  var PX = 4; // each logical pixel = 4 canvas px (16x16 grid -> 64x64)
  var COL = {
    out:  "#0a0c10",
    body: "#c9d1d9",
    dark: "#8b949e",
    gold: "#FDB515",
    face: "#11151c",
    mouth:"#3a4150"
  };

  function cell(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * PX, y * PX, w * PX, h * PX);
  }

  // Draw the robot for a given pose. legPhase: 0|1, eyes: 'open'|'blink'|'happy'
  function draw(pose) {
    ctx.clearRect(0, 0, 64, 64);

    // ground shadow
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.ellipse(32, 62, 14, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    if (pose.facing < 0) { ctx.translate(64, 0); ctx.scale(-1, 1); }

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

    ctx.restore();
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

    // Position + hop.
    var hopY = 0;
    if (happy) {
      var hp = (t - hopStart) / 1500;
      hopY = -Math.abs(Math.sin(hp * Math.PI * 3)) * 14 * (1 - hp);
    }
    root.style.transform = "translateX(" + x + "px) translateY(" + hopY + "px)";

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Greet shortly after load.
  setTimeout(function () { say("hi! click me!", 3000); }, 2500);
})();
