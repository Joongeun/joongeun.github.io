(function () {
  "use strict";

  /* ---------- Scroll progress bar ---------- */
  var bar = document.getElementById("progressBar");
  function updateProgress() {
    var scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    var height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    var pct = height > 0 ? (scrollTop / height) * 100 : 0;
    if (bar) bar.style.width = pct + "%";
  }
  window.addEventListener("scroll", updateProgress, { passive: true });
  updateProgress();

  /* ---------- Typed rotating role ---------- */
  var roleEl = document.getElementById("typed-role");
  var roles = (window.__ROLES__ || []);
  if (roleEl && roles.length) {
    var rIdx = 0, cIdx = 0, deleting = false;
    function tick() {
      var word = roles[rIdx];
      cIdx += deleting ? -1 : 1;
      roleEl.textContent = word.slice(0, cIdx);
      var delay = deleting ? 45 : 90;
      if (!deleting && cIdx === word.length) { deleting = true; delay = 1400; }
      else if (deleting && cIdx === 0) { deleting = false; rIdx = (rIdx + 1) % roles.length; delay = 350; }
      setTimeout(tick, delay);
    }
    tick();
  }

  /* ---------- Scroll reveal ---------- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  if ("IntersectionObserver" in window) {
    // Stagger cards within each grid for a cascade effect.
    document.querySelectorAll(".project-grid").forEach(function (grid) {
      grid.querySelectorAll(".project-card").forEach(function (card, i) {
        card.style.setProperty("--reveal-delay", (i * 0.06) + "s");
      });
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- Scroll-spy: highlight the nav link for the section in view ---------- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".nav-link"));
  var sections = navLinks
    .map(function (l) { return document.getElementById(l.dataset.target); })
    .filter(Boolean);

  function setActive(id) {
    navLinks.forEach(function (l) { l.classList.toggle("active", l.dataset.target === id); });
  }
  function computeActive() {
    // The last section is often too short to ever reach the top threshold, so
    // when we've scrolled to the bottom of the page, force-activate it.
    var doc = document.documentElement;
    var atBottom = window.innerHeight + window.scrollY >= doc.scrollHeight - 4;
    if (atBottom) { setActive(sections[sections.length - 1].id); return; }
    // Active section = the LAST one whose top has scrolled above the threshold
    // line (just below the navbar): i.e. the largest top that is still <= 120.
    var best = null, bestTop = -Infinity;
    sections.forEach(function (s) {
      var top = s.getBoundingClientRect().top;
      if (top <= 120 && top > bestTop) { bestTop = top; best = s.id; }
    });
    if (best) setActive(best);
    else setActive(null);
  }
  if (sections.length) {
    window.addEventListener("scroll", computeActive, { passive: true });
    window.addEventListener("resize", computeActive, { passive: true });
    computeActive();
  }

  /* ---------- Card spotlight (cursor-tracked glow) ---------- */
  document.querySelectorAll(".project-card").forEach(function (card) {
    card.addEventListener("pointermove", function (ev) {
      var rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", (ev.clientX - rect.left) + "px");
      card.style.setProperty("--my", (ev.clientY - rect.top) + "px");
    });
  });
})();
