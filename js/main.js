/* Mejoras opcionales: la página funciona igual sin este archivo. */
(function () {
  "use strict";

  /* Marca en el menú la sección que se está viendo */
  var links = document.querySelectorAll(".nav a[href^='#']");
  var map = {};
  links.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });

  if ("IntersectionObserver" in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) { a.removeAttribute("aria-current"); });
        var a = map[e.target.id];
        if (a) a.setAttribute("aria-current", "true");
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(map).forEach(function (id) {
      var s = document.getElementById(id);
      if (s) spy.observe(s);
    });
  }

  /* Resplandor que sigue al cursor sobre las tarjetas */
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (reduce || !fine) return;

  var sel = ".skill, .project, .yt-card, .job, .cve__card, .contact__links a, .stat";
  var raf = 0, ev;
  document.addEventListener("pointermove", function (e) {
    ev = e;
    if (raf) return;
    raf = requestAnimationFrame(function () {
      raf = 0;
      var el = ev.target.closest && ev.target.closest(sel);
      if (!el) return;
      var r = el.getBoundingClientRect();
      el.style.setProperty("--mx", (ev.clientX - r.left) + "px");
      el.style.setProperty("--my", (ev.clientY - r.top) + "px");
    });
  }, { passive: true });
})();