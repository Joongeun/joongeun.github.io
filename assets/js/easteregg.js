/*
 * Robot arcade easter egg. Self-contained; talks to the robot module only via
 * CustomEvents on `document` (robot:say / robot:spin / robot:sprout /
 * robot:transform / robot:baby). Journey state is in-memory (resets each load).
 *
 * Journey:
 *   Gateway : click the robot -> a green sprout grows on its head; after a few
 *             clicks it nudges you toward the Konami code (re-shown periodically).
 *   Stage 1 : Konami code            -> opens a CRT Snake game.
 *   Stage 2 : beat Snake (5 energon) -> the robot transforms into Optimus Prime.
 *             Click Optimus           -> opens a CRT Simon (memory) game.
 *   Stage 3 : beat Simon (round 6)   -> a baby robot (mini Optimus) spawns.
 */
(function () {
  "use strict";

  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Journey state (in-memory only) ---------- */
  var state = { clicks: 0, gateway: false, snakeWon: false, simonWon: false };
  var SPROUT_MAX = 4;     // sprout reaches full height after this many clicks
  var GATE_AT = 4;        // clicks before the Konami hint first appears
  var modalOpen = false;

  /* ---------- Per-step counters (owner-only metric) ----------
   * Pings a Cloudflare Pages Function (/api/egg) the first time a given browser
   * solves each step. A localStorage flag per step dedupes so each person is
   * counted once per step. View via ?eggstats (or GET /api/egg). No-ops if the
   * endpoint isn't deployed, so it's harmless locally.
   *   step1 = Konami solved, step2 = Snake beaten, step3 = Simon solved. */
  function recordStep(step) {
    var key = "joon_egg_metric_v1_s" + step;
    var done = false;
    try { done = localStorage.getItem(key) === "1"; } catch (e) {}
    if (done) return;
    try { localStorage.setItem(key, "1"); } catch (e) {}
    try { fetch("/api/egg?step=" + step, { method: "POST", keepalive: true }).catch(function () {}); } catch (e) {}
  }
  function showStatsBadge() {
    if (!/[?&]eggstats\b/.test(location.search)) return;
    fetch("/api/egg").then(function (r) { return r.json(); }).then(function (d) {
      function n(v) { return v != null ? v : "?"; }
      var b = document.createElement("div");
      b.className = "egg-stats-badge";
      b.textContent = "🥚 solved — step 1: " + n(d && d.step1) +
                      " · step 2: " + n(d && d.step2) +
                      " · step 3: " + n(d && d.step3);
      document.body.appendChild(b);
    }).catch(function () {});
  }

  /* ---------- Cross-module helpers ---------- */
  function emit(name, detail) { document.dispatchEvent(new CustomEvent(name, { detail: detail })); }
  function robotSay(msg, ms) { emit("robot:say", { msg: msg, ms: ms || 3400 }); }

  /* ---------- Reusable CRT overlay (built once) ---------- */
  var overlay, titleEl, stageEl, statusEl, winEl, closeBtn, teardown = null;
  function buildOverlay() {
    overlay = document.createElement("div");
    overlay.className = "crt-modal";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.innerHTML =
      '<div class="crt-screen">' +
        '<button type="button" class="crt-x" aria-label="Close">×</button>' +
        '<div class="crt-title"></div>' +
        '<div class="crt-stage"></div>' +
        '<div class="crt-status"></div>' +
        '<div class="crt-win"></div>' +
      "</div>";
    document.body.appendChild(overlay);
    titleEl = overlay.querySelector(".crt-title");
    stageEl = overlay.querySelector(".crt-stage");
    statusEl = overlay.querySelector(".crt-status");
    winEl = overlay.querySelector(".crt-win");
    closeBtn = overlay.querySelector(".crt-x");
    closeBtn.addEventListener("click", closeModal);
  }
  function openModal(title) {
    if (!overlay) buildOverlay();
    titleEl.textContent = title;
    stageEl.innerHTML = "";
    statusEl.innerHTML = "";
    winEl.textContent = ""; winEl.classList.remove("show");
    overlay.classList.add("open");
    modalOpen = true;
  }
  function closeModal() {
    if (teardown) { try { teardown(); } catch (e) {} teardown = null; }
    if (overlay) overlay.classList.remove("open");
    modalOpen = false;
  }
  function setStatus(html) { statusEl.innerHTML = html; }
  function showWin(text) { winEl.textContent = text; winEl.classList.add("show"); }

  /* ================= SNAKE ================= */
  function startSnake(onWin) {
    openModal("◄ ENERGON SNAKE ►");
    var COLS = 15, ROWS = 11, CELL = 16, GOAL = 5;
    var cv = document.createElement("canvas");
    cv.className = "crt-canvas";
    cv.width = COLS * CELL; cv.height = ROWS * CELL;
    stageEl.appendChild(cv);
    var g = cv.getContext("2d");
    g.imageSmoothingEnabled = false;
    setStatus("Arrow keys to steer. Eat <b>" + GOAL + "</b> energon cubes. <b>0/" + GOAL + "</b>");

    var snake, dir, pending, food, eaten, alive, timer = null;
    function resetRun() {
      snake = [{ x: 4, y: 5 }, { x: 3, y: 5 }, { x: 2, y: 5 }];
      dir = { x: 1, y: 0 }; pending = dir; alive = true;
      placeFood();
    }
    function placeFood() {
      do {
        food = { x: (Math.random() * COLS) | 0, y: (Math.random() * ROWS) | 0 };
      } while (snake.some(function (s) { return s.x === food.x && s.y === food.y; }));
    }
    function statusLine() {
      setStatus("Arrow keys to steer. Eat <b>" + GOAL + "</b> energon cubes. <b>" + eaten + "/" + GOAL + "</b>");
    }
    eaten = 0; resetRun();

    function step() {
      // apply pending dir if not a direct reversal
      if (pending.x !== -dir.x || pending.y !== -dir.y) dir = pending;
      var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS ||
          snake.some(function (s) { return s.x === head.x && s.y === head.y; })) {
        eaten = 0; resetRun(); statusLine(); return; // collision -> restart run
      }
      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        eaten++; statusLine();
        if (eaten >= GOAL) { win(); return; }
        placeFood();
      } else {
        snake.pop();
      }
    }
    function draw() {
      g.fillStyle = "#05070a"; g.fillRect(0, 0, cv.width, cv.height);
      // food (energon cube)
      g.save();
      g.shadowColor = "#7fe0ff"; g.shadowBlur = 8; g.fillStyle = "#7fe0ff";
      g.fillRect(food.x * CELL + 3, food.y * CELL + 3, CELL - 6, CELL - 6);
      g.restore();
      // snake
      for (var i = snake.length - 1; i >= 0; i--) {
        g.fillStyle = i === 0 ? "#9be86b" : "#3fae5a";
        g.fillRect(snake[i].x * CELL + 1, snake[i].y * CELL + 1, CELL - 2, CELL - 2);
      }
    }
    function loop() { if (!alive) return; step(); draw(); }
    draw();
    timer = setInterval(loop, reduced ? 200 : 130);

    function onKey(e) {
      var k = e.key;
      var d = null;
      if (k === "ArrowUp" || k === "w") d = { x: 0, y: -1 };
      else if (k === "ArrowDown" || k === "s") d = { x: 0, y: 1 };
      else if (k === "ArrowLeft" || k === "a") d = { x: -1, y: 0 };
      else if (k === "ArrowRight" || k === "d") d = { x: 1, y: 0 };
      if (d) { pending = d; e.preventDefault(); }
    }
    document.addEventListener("keydown", onKey);

    function win() {
      alive = false;
      if (timer) { clearInterval(timer); timer = null; }
      showWin("✦ ENERGON FULL — TRANSFORM! ✦");
      setTimeout(function () { closeModal(); onWin(); }, reduced ? 300 : 1100);
    }
    teardown = function () {
      alive = false;
      if (timer) { clearInterval(timer); timer = null; }
      document.removeEventListener("keydown", onKey);
    };
  }

  /* ================= SIMON ================= */
  function startSimon(onWin) {
    openModal("◄ SPARK MEMORY ►");
    var GOAL = 6;
    var grid = document.createElement("div");
    grid.className = "simon-grid";
    var pads = [];
    for (var i = 0; i < 4; i++) {
      var p = document.createElement("button");
      p.type = "button";
      p.className = "simon-pad p" + i;
      p.setAttribute("aria-label", "pad " + (i + 1));
      grid.appendChild(p);
      pads.push(p);
    }
    stageEl.appendChild(grid);

    var seq = [], input = [], locked = true, timers = [], alive = true;
    function clearTimers() { timers.forEach(clearTimeout); timers = []; }
    function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }
    function flash(idx, ms) {
      var pad = pads[idx];
      pad.classList.add("lit");
      later(function () { pad.classList.remove("lit"); }, ms);
    }
    function statusLine() {
      setStatus("Watch, then repeat the sequence. Round <b>" + Math.min(seq.length, GOAL) + "/" + GOAL + "</b>");
    }
    function playSeq() {
      locked = true; grid.classList.add("locked"); input = [];
      var on = reduced ? 520 : 440, gap = reduced ? 300 : 230;
      seq.forEach(function (idx, i) {
        later(function () { if (alive) flash(idx, on - 80); }, i * (on + gap) + 300);
      });
      later(function () {
        if (!alive) return;
        locked = false; grid.classList.remove("locked");
      }, seq.length * (on + gap) + 300);
    }
    function addStep() { seq.push((Math.random() * 4) | 0); }
    function nextRound() { addStep(); statusLine(); later(playSeq, 500); }
    function fail() {
      locked = true; grid.classList.add("locked");
      setStatus("<b>✗ wrong!</b> watch again from the start…");
      seq = []; later(nextRound, 900);
    }
    function press(idx) {
      if (locked || !alive) return;
      flash(idx, 180);
      input.push(idx);
      var i = input.length - 1;
      if (input[i] !== seq[i]) { fail(); return; }
      if (input.length === seq.length) {
        if (seq.length >= GOAL) { win(); return; }
        locked = true; grid.classList.add("locked");
        later(nextRound, 650);
      }
    }
    pads.forEach(function (pad, idx) {
      pad.addEventListener("click", function () { press(idx); });
    });

    statusLine();
    later(nextRound, 600); // start: first round adds the first step

    function win() {
      locked = true; alive = false; clearTimers();
      showWin("✦ MEMORY SYNCED — NEW SPARK! ✦");
      setTimeout(function () { closeModal(); onWin(); }, reduced ? 300 : 1100);
    }
    teardown = function () { alive = false; clearTimers(); };
  }

  /* ---------- GATEWAY: click the robot -> grow a sprout, then nudge Konami ---------- */
  var robot = document.getElementById("tamagotchi");
  var clicksSinceHint = 0;
  function konamiHint() { robotSay("psst — try the gamer code: ↑↑↓↓←→←→ B A", 4800); }
  if (robot) {
    robot.addEventListener("click", function () {
      if (modalOpen) return;
      // Stage 2 reward path: clicking Optimus opens the Simon game.
      if (state.snakeWon && !state.simonWon) {
        startSimon(onSimonWin);
        return;
      }
      if (state.snakeWon) return; // already transformed, nothing more to grow

      state.clicks++;
      emit("robot:sprout", { level: Math.min(SPROUT_MAX, state.clicks) });

      if (!state.gateway) {
        if (state.clicks >= GATE_AT) {
          state.gateway = true; clicksSinceHint = 0;
          robotSay("🌱 whoa, a sprout! …i think there's a secret. " +
                   "gamers know the code ↑↑↓↓…", 5200);
        }
        return;
      }
      // Gateway found: re-show the full hint every few clicks until solved.
      if (++clicksSinceHint >= 4) { clicksSinceHint = 0; konamiHint(); }
    });
  }

  /* ---------- STAGE 1: Konami code (gated behind gateway) -> Snake ---------- */
  var KONAMI = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"];
  var kidx = 0;
  document.addEventListener("keydown", function (e) {
    if (modalOpen || state.snakeWon || !state.gateway) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var key = (e.key || "").toLowerCase();
    kidx = (key === KONAMI[kidx]) ? kidx + 1 : (key === KONAMI[0] ? 1 : 0);
    if (kidx === KONAMI.length) {
      kidx = 0;
      recordStep("1");
      startSnake(onSnakeWin);
    }
  });

  /* ---------- Rewards ---------- */
  function onSnakeWin() {
    state.snakeWon = true;
    recordStep("2");
    emit("robot:spin");
    emit("robot:transform");
    setTimeout(function () {
      robotSay("AUTOBOTS, ROLL OUT! …click me again 🤖", 5200);
    }, 1200);
  }
  function onSimonWin() {
    state.simonWon = true;
    recordStep("3");
    emit("robot:baby");
    robotSay("meet my little buddy! 🤖➕", 5200);
  }

  /* ---------- On load ---------- */
  showStatsBadge(); // owner-only: shows the tally when ?eggstats is in the URL
})();
