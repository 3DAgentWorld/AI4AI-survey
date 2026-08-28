/* ============================================================
   AI4AI Survey — project page scripts
   Theme toggle, constellation canvas, reveals, scrollspy,
   reading progress, BibTeX copy.
   ============================================================ */

(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- theme ---------------- */
  var root = document.documentElement;

  function applyTheme(t) {
    root.setAttribute("data-theme", t);
    try { localStorage.setItem("ai4ai-theme", t); } catch (e) { /* private mode */ }
  }

  var saved = null;
  try { saved = localStorage.getItem("ai4ai-theme"); } catch (e) { /* ignore */ }
  if (saved === "dark" || saved === "light") {
    applyTheme(saved);
  } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    applyTheme("dark");
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".theme-toggle");
    if (!btn) return;
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
  });

  /* ---------------- reveal on scroll ---------------- */
  var revealEls = document.querySelectorAll(".reveal");
  if (reducedMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("visible"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ---------------- reading progress bar ---------------- */
  var bar = document.getElementById("progress-bar");
  if (bar) {
    var ticking = false;
    var onScroll = function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var doc = document.documentElement;
        var max = doc.scrollHeight - window.innerHeight;
        var pct = max > 0 ? (window.scrollY / max) * 100 : 0;
        bar.style.width = Math.min(100, Math.max(0, pct)) + "%";
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------------- TOC scrollspy ---------------- */
  var toc = document.querySelector(".toc");
  if (toc && "IntersectionObserver" in window) {
    var heads = Array.prototype.slice.call(
      document.querySelectorAll(".paper-body h2.sec, .paper-body h3.subsec, h2.refs-heading")
    );
    var links = {};
    toc.querySelectorAll("a[href^='#']").forEach(function (a) {
      links[a.getAttribute("href").slice(1)] = a.closest("li");
    });
    var visibleIds = new Set();
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) visibleIds.add(entry.target.id);
        else visibleIds.delete(entry.target.id);
      });
      // pick the topmost visible heading
      var active = null;
      for (var i = 0; i < heads.length; i++) {
        if (visibleIds.has(heads[i].id)) { active = heads[i].id; break; }
      }
      if (!active) {
        // fallback: last heading above viewport
        for (var j = heads.length - 1; j >= 0; j--) {
          if (heads[j].getBoundingClientRect().top < 140) { active = heads[j].id; break; }
        }
      }
      toc.querySelectorAll("li.toc-active").forEach(function (li) { li.classList.remove("toc-active"); });
      if (active && links[active]) links[active].classList.add("toc-active");
    }, { rootMargin: "-80px 0px -62% 0px", threshold: 0 });
    heads.forEach(function (h) { spy.observe(h); });
  }

  /* ---------------- BibTeX copy ---------------- */
  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".bib-copy");
    if (!btn) return;
    var box = btn.closest(".bib-wrap") || btn.parentElement;
    var pre = box.querySelector("pre, .bib-box");
    if (!pre) return;
    var text = pre.innerText;
    function done(ok) {
      btn.textContent = ok ? "Copied ✓" : "Press Ctrl+C";
      setTimeout(function () { btn.textContent = "Copy"; }, 1800);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
    } else {
      var ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); done(true); } catch (err) { done(false); }
      document.body.removeChild(ta);
    }
  });

  /* ---------------- hero constellation canvas ---------------- */
  var canvas = document.getElementById("constellation");
  if (canvas && !reducedMotion) {
    var ctx = canvas.getContext("2d");
    var W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);
    var nodes = [];
    var NODE_COUNT = 46;
    var running = true;

    function resize() {
      var rect = canvas.getBoundingClientRect();
      W = rect.width; H = rect.height;
      canvas.width = W * DPR;
      canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    function seedNodes() {
      nodes = [];
      for (var i = 0; i < NODE_COUNT; i++) {
        nodes.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.22,
          vy: (Math.random() - 0.5) * 0.22,
          r: Math.random() * 1.6 + 0.7,
          gold: Math.random() < 0.14
        });
      }
    }

    function frame() {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      var LINK = 130;
      for (var i = 0; i < nodes.length; i++) {
        var a = nodes[i];
        a.x += a.vx; a.y += a.vy;
        if (a.x < -20) a.x = W + 20; if (a.x > W + 20) a.x = -20;
        if (a.y < -20) a.y = H + 20; if (a.y > H + 20) a.y = -20;
        for (var j = i + 1; j < nodes.length; j++) {
          var b = nodes[j];
          var dx = a.x - b.x, dy = a.y - b.y;
          var d2 = dx * dx + dy * dy;
          if (d2 < LINK * LINK) {
            var alpha = (1 - Math.sqrt(d2) / LINK) * 0.16;
            ctx.strokeStyle = "rgba(139,157,255," + alpha.toFixed(3) + ")";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      for (var k = 0; k < nodes.length; k++) {
        var n = nodes[k];
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = n.gold ? "rgba(207,165,74,0.75)" : "rgba(160,176,230,0.7)";
        ctx.fill();
      }
      requestAnimationFrame(frame);
    }

    resize();
    seedNodes();
    requestAnimationFrame(frame);

    var resizeTimer = null;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { resize(); seedNodes(); }, 180);
    });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { running = false; }
      else if (!running) { running = true; requestAnimationFrame(frame); }
    });
  }
})();
