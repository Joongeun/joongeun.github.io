/*
 * Gospel-journey easter eggs. Self-contained; talks to the robot + garden modules
 * only via CustomEvents on `document` (robot:say / robot:spin / robot:upgrade,
 * garden:flytrap-snap / garden:plant, leaves:burst). Progress persists in localStorage.
 *
 * Journey (each harder; each = a verse overlay + a robot upgrade):
 *   Gateway (easy): rapid-click the robot -> hint nudging the Konami code.
 *   Stage 1: Konami code              -> John 3:16    -> cross emblem
 *   Stage 2: feed the venus flytrap   -> Mark 1:15    -> angel wings
 *   Stage 3: sow a seed (drag packet) -> Matthew 4:19 -> halo + companion + confetti
 */
(function () {
  "use strict";

  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function now() { return performance.now(); }

  /* ---------- Persistence ---------- */
  var KEY = "joon_eggs_v1";
  var DEFAULT = { v: 1, gateway: false, stage1: false, stage2: false, stage3: false, upgrade: 0 };
  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY)); return (s && s.v === 1) ? s : Object.assign({}, DEFAULT); }
    catch (e) { return Object.assign({}, DEFAULT); }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  var state = load();

  /* ---------- Verse data (NIV — edit here) ---------- */
  var ATTRIB = "Scripture quotations taken from the Holy Bible, New International Version® NIV®. " +
               "Copyright © 1973, 1978, 1984, 2011 by Biblica, Inc.™ Used by permission.";
  var VERSES = {
    stage1: { ref: "John 3:16", text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.", upgrade: "a glowing cross" },
    stage2: { ref: "Mark 1:15", text: "“The time has come,” he said. “The kingdom of God has come near. Repent and believe the good news!”", upgrade: "angel wings" },
    stage3: { ref: "Matthew 4:19", text: "“Come, follow me,” Jesus said, “and I will send you out to fish for people.”", upgrade: "a halo and a companion" }
  };

  /* ---------- Cross-module helpers ---------- */
  function emit(name, detail) { document.dispatchEvent(new CustomEvent(name, { detail: detail })); }
  function robotSay(msg, ms) { emit("robot:say", { msg: msg, ms: ms || 3400 }); }
  function setUpgrade(n) {
    state.upgrade = Math.max(state.upgrade, n); save();
    emit("robot:upgrade", { level: state.upgrade });
  }

  /* ---------- CRT verse overlay (built once) ---------- */
  var overlay, refEl, textEl, upEl, closeBtn, lastFocus, onCloseCb;
  function buildOverlay() {
    overlay = document.createElement("div");
    overlay.className = "verse-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "verse-ref");
    overlay.setAttribute("aria-describedby", "verse-text");
    overlay.innerHTML =
      '<div class="verse-card">' +
        '<div class="verse-ref" id="verse-ref"></div>' +
        '<p class="verse-text" id="verse-text"></p>' +
        '<div class="verse-upgrade"></div>' +
        '<button type="button" class="verse-close">[ continue ]</button>' +
        '<div class="verse-attrib">' + ATTRIB + "</div>" +
      "</div>";
    document.body.appendChild(overlay);
    refEl = overlay.querySelector(".verse-ref");
    textEl = overlay.querySelector(".verse-text");
    upEl = overlay.querySelector(".verse-upgrade");
    closeBtn = overlay.querySelector(".verse-close");
    closeBtn.addEventListener("click", closeVerse);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) closeVerse(); });
    overlay.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { closeVerse(); }
      else if (e.key === "Tab") { e.preventDefault(); closeBtn.focus(); } // single control -> trap
    });
  }
  function showVerse(v, onClose) {
    if (!overlay) buildOverlay();
    refEl.textContent = v.ref + " (NIV)";
    textEl.textContent = v.text;
    upEl.textContent = "✨ Robot upgraded: " + v.upgrade;
    onCloseCb = onClose;
    lastFocus = document.activeElement;
    overlay.classList.add("open");
    setTimeout(function () { closeBtn.focus(); }, 30);
  }
  function closeVerse() {
    overlay.classList.remove("open");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    var cb = onCloseCb; onCloseCb = null;
    if (cb) cb();
  }

  /* ---------- Stage completion ---------- */
  function complete(stageKey, verse, level) {
    if (state[stageKey]) return;
    state[stageKey] = true; save();
    setUpgrade(level);
    showVerse(verse, advanceHints);
  }

  /* ---------- GATEWAY: rapid robot clicks ---------- */
  var robot = document.getElementById("tamagotchi");
  var clickTimes = [];
  if (robot) {
    robot.addEventListener("click", function () {
      if (state.gateway) return;
      var t = now();
      clickTimes.push(t);
      clickTimes = clickTimes.filter(function (tt) { return t - tt < 1500; });
      if (clickTimes.length >= 5) {
        state.gateway = true; save();
        emit("robot:spin");
        robotSay("you found a secret… gamers know the code ↑↑↓↓…", 4800);
      }
    });
  }

  /* ---------- STAGE 1: Konami code (gated behind gateway) ---------- */
  var KONAMI = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"];
  var kidx = 0;
  document.addEventListener("keydown", function (e) {
    if (state.stage1 || !state.gateway) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var key = (e.key || "").toLowerCase();
    kidx = (key === KONAMI[kidx]) ? kidx + 1 : (key === KONAMI[0] ? 1 : 0);
    if (kidx === KONAMI.length) { kidx = 0; complete("stage1", VERSES.stage1, 1); }
  });

  /* ---------- STAGE 2: feed the venus flytrap ---------- */
  var feed = 0, flytrapArmed = false;
  function armFlytrap() {
    var fly = document.querySelector('.plant[data-type="flytrap"]');
    if (!fly || flytrapArmed) return;
    flytrapArmed = true;
    fly.classList.add("eg-armed");
    fly.addEventListener("click", function () {
      emit("garden:flytrap-snap");
      if (state.stage2) return;
      feed++;
      if (feed >= 3) complete("stage2", VERSES.stage2, 2);
      else robotSay(feed === 1 ? "*chomp* mmm…" : "one more bite!", 1700);
    });
  }

  /* ---------- STAGE 3: sow a seed (drag the packet) ---------- */
  var packet = document.getElementById("seed-packet");
  var packetReady = false;
  function revealPacket() { if (packet) packet.hidden = false; }
  function plantAt(cx) {
    emit("garden:plant", { x: cx });
    if (!state.stage3) {
      setTimeout(function () {
        complete("stage3", VERSES.stage3, 3);
        emit("leaves:burst", { x: cx, y: window.innerHeight - 40, n: reduced ? 0 : 30 });
      }, reduced ? 200 : 2600);
    }
  }
  function setupPacket() {
    if (!packet || packetReady) return;
    packetReady = true;
    var ghost = null;
    function moveGhost(e) { if (ghost) { ghost.style.left = e.clientX + "px"; ghost.style.top = e.clientY + "px"; } }
    packet.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      try { packet.setPointerCapture(e.pointerId); } catch (err) {}
      packet.classList.add("dragging");
      ghost = document.createElement("div");
      ghost.className = "seed-ghost"; ghost.textContent = "🌱"; // 🌱
      document.body.appendChild(ghost);
      moveGhost(e);
    });
    packet.addEventListener("pointermove", moveGhost);
    packet.addEventListener("pointerup", function (e) {
      packet.classList.remove("dragging");
      if (ghost) { ghost.remove(); ghost = null; }
      plantAt(e.clientX);
    });
    // Keyboard fallback
    packet.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); plantAt(window.innerWidth * 0.3); }
    });
  }

  /* ---------- Breadcrumb hint chaining ---------- */
  function advanceHints() {
    if (!state.gateway) return;                 // discovery; first hint comes from the gateway itself
    if (!state.stage1) { robotSay("try the old gamer code… ↑↑↓↓←→←→ B A", 5200); return; }
    if (!state.stage2) { armFlytrap(); robotSay("something's hungry in the garden… feed it (×3)", 5200); return; }
    if (!state.stage3) { revealPacket(); setupPacket(); robotSay("plant a seed — drag the packet to the ground", 5200); return; }
  }

  /* ---------- Resume on load ---------- */
  setUpgrade(state.upgrade);                     // re-apply wings/halo/companion
  if (state.stage1) armFlytrap();
  if (state.stage2) { revealPacket(); setupPacket(); }
  setTimeout(advanceHints, 6000);
})();
