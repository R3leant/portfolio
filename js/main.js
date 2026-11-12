/* Mejoras opcionales: la página funciona igual sin este archivo.
   ----------------------------------------------------------------
   1. Menú: marca la sección que se está viendo.
   2. Revelados al hacer scroll, rótulos que se descifran y títulos
      que suben palabra a palabra.
   3. Contadores de las cifras.
   4. Terminales que se escriben solos (portada y simulación del CVE).
   5. Grafo de ataque de la portada (canvas).
   6. Puntero: mira que fija los enlaces, resplandor e inclinación 3D.
   Con "prefers-reduced-motion: reduce" solo se ejecuta el punto 1.   */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* ---------- 1. Menú: sección activa ---------- */
  var links = $$(".nav a[href^='#']");
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
    /* Se observa también la portada: al volver arriba no queda ninguna marcada */
    Object.keys(map).concat("inicio").forEach(function (id) {
      var s = document.getElementById(id);
      if (s) spy.observe(s);
    });
  }

  if (reduce || !("IntersectionObserver" in window)) return;

  /* A partir de aquí, todo es movimiento. La clase "anim" activa en el CSS
     los estados ocultos de los revelados (sin ella, todo se ve). */
  var bootMs = root.classList.contains("no-boot") ? 0 : 1300;
  root.classList.add("anim");

  /* Un clic o una tecla saltan la secuencia de arranque */
  if (bootMs) {
    var skipBoot = function () {
      root.classList.add("no-boot");
      window.removeEventListener("pointerdown", skipBoot);
      window.removeEventListener("keydown", skipBoot);
    };
    window.addEventListener("pointerdown", skipBoot);
    window.addEventListener("keydown", skipBoot);
    setTimeout(function () {
      window.removeEventListener("pointerdown", skipBoot);
      window.removeEventListener("keydown", skipBoot);
    }, 2200);
  }

  /* Ejecuta cb(el) la primera vez que cada elemento entra en pantalla */
  function onView(els, cb, threshold) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        cb(e.target);
      });
    }, { threshold: threshold == null ? 0.15 : threshold, rootMargin: "0px 0px -5% 0px" });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 2. Revelados ---------- */

  /* Tarjetas: selector → dirección de entrada ("" = desde abajo) */
  var REVEAL = {
    ".job": "",
    ".cve__card": "right",
    ".term": "",
    ".skill": "",
    ".timeline__item": "left",
    ".yt-card": "left",
    ".project": "right",
    ".contact__links li": "right"
  };
  var cards = [];
  Object.keys(REVEAL).forEach(function (sel) {
    var seen = new Map();   /* posición entre hermanos, para la cascada */
    $$(sel).forEach(function (el) {
      var i = seen.get(el.parentNode) || 0;
      seen.set(el.parentNode, i + 1);
      el.classList.add("reveal");
      if (REVEAL[sel]) el.classList.add("reveal--" + REVEAL[sel]);
      el.style.setProperty("--i", i);
      cards.push(el);
    });
  });

  function reveal(el) {
    var i = parseInt(el.style.getPropertyValue("--i"), 10) || 0;
    el.classList.add("is-in");
    /* Al terminar se retiran las clases para no interferir con el hover */
    setTimeout(function () {
      el.classList.remove("reveal", "reveal--left", "reveal--right", "is-in");
      el.style.removeProperty("--i");
    }, 2100 + i * 110);
  }

  /* Texto que se "descifra": caracteres aleatorios que se van resolviendo */
  var GLYPHS = "!<>-_\\/[]{}=+*^?#$%&01";
  function scramble(el, ms) {
    var final = el.textContent, len = final.length, t0 = 0, drawn = 0;
    if (/^H\d$/.test(el.tagName)) el.setAttribute("aria-label", final);
    requestAnimationFrame(function frame(now) {
      if (!t0) t0 = now;
      var p = Math.min(1, (now - t0) / ms);
      if (p === 1) { el.textContent = final; return; }
      if (now - drawn > 45) {
        drawn = now;
        var solved = Math.floor(p * len), out = "";
        for (var i = 0; i < len; i++) {
          var c = final.charAt(i);
          out += (i < solved || c === " ") ? c : GLYPHS.charAt((Math.random() * GLYPHS.length) | 0);
        }
        el.textContent = out;
      }
      requestAnimationFrame(frame);
    });
  }

  /* Envuelve cada palabra para que pueda subir desde una máscara */
  function splitWords(el) {
    var text = el.textContent.replace(/\s+/g, " ").trim();
    el.setAttribute("aria-label", text);
    el.textContent = "";
    text.split(" ").forEach(function (word, i) {
      var mask = document.createElement("span");
      var inner = document.createElement("span");
      mask.className = "w";
      mask.setAttribute("aria-hidden", "true");
      inner.textContent = word;
      inner.style.setProperty("--w", i);
      mask.appendChild(inner);
      el.appendChild(mask);
      el.appendChild(document.createTextNode(" "));
    });
    el.classList.add("split");
  }

  var heads = $$(".section__head, .cve__intro, .contact__intro");
  heads.forEach(function (head) {
    head.classList.add("fx-head");
    var title = $(".section__title, .contact__title", head);
    if (title) splitWords(title);
  });

  function showHead(head) {
    head.classList.add("in-view");
    var kicker = $(".section__kicker", head);
    var id = $(".cve__id", head);
    if (kicker) scramble(kicker, 750);
    if (id) setTimeout(function () { scramble(id, 1100); }, 150);
  }

  /* ---------- 3. Contadores ---------- */
  var counters = $$(".count").filter(function (el) {
    var raw = el.getAttribute("data-to");
    var to = parseFloat(raw);
    if (isNaN(to)) return false;
    var dec = (raw.split(".")[1] || "").length;
    el._final = el.textContent;
    el._to = to;
    el._fmt = function (v) { return v.toFixed(dec).replace(".", ","); };
    el.textContent = el._fmt(0);
    return true;
  });

  function count(el) {
    var wait = el.closest(".hero") ? 950 : 250;
    setTimeout(function () {
      var t0 = 0;
      requestAnimationFrame(function step(now) {
        if (!t0) t0 = now;
        var p = Math.min(1, (now - t0) / 1900);
        var eased = 1 - Math.pow(1 - p, 4);
        el.textContent = p < 1 ? el._fmt(el._to * eased) : el._final;
        if (p < 1) requestAnimationFrame(step);
      });
    }, wait);
  }

  /* ---------- 4. Terminales ---------- */

  /* Portada: escribe y borra en bucle las frases de data-typed */
  var typed = $("[data-typed]");
  if (typed) {
    var phrases = typed.getAttribute("data-typed").split("|");
    var pi = 0, ci = 0, erasing = false;
    typed.textContent = "";
    setTimeout(function tick() {
      var full = phrases[pi];
      ci += erasing ? -1 : 1;
      typed.textContent = full.slice(0, ci);
      var wait = erasing ? 20 : 34 + Math.random() * 52;
      if (!erasing && ci === full.length) { erasing = true; wait = 2200; }
      else if (erasing && ci === 0) { erasing = false; pi = (pi + 1) % phrases.length; wait = 380; }
      setTimeout(tick, wait);
    }, bootMs + 1000);
  }

  /* Terminal con líneas: los comandos (data-t="cmd") se teclean, la salida aparece de golpe */
  var terms = $$("[data-term]");
  terms.forEach(function (term) {
    var body = $(".term__body", term);
    if (!body) return;
    body.style.minHeight = body.offsetHeight + "px";   /* reserva el alto: sin saltos */
    term._lines = $$(".term__line", term).map(function (line) {
      var text = line.textContent;
      line.textContent = "";
      line.hidden = true;
      return { el: line, text: text };
    });
  });

  function playTerm(term) {
    var lines = term._lines || [];
    (function next(i) {
      if (i >= lines.length) return;
      var line = lines[i], el = line.el;
      el.hidden = false;
      if (el.getAttribute("data-t") === "cmd" && line.text) {
        var k = 0;
        el.classList.add("is-typing");
        (function type() {
          el.textContent = line.text.slice(0, ++k);
          if (k < line.text.length) setTimeout(type, 14 + Math.random() * 34);
          else setTimeout(function () { el.classList.remove("is-typing"); next(i + 1); }, 450);
        })();
      } else {
        el.textContent = line.text;
        setTimeout(function () { next(i + 1); }, el.getAttribute("data-t") === "ok" ? 320 : 80);
      }
    })(0);
  }

  /* Los observadores arrancan cuando termina la secuencia de inicio */
  setTimeout(function () {
    onView(cards, reveal);
    onView(heads, showHead, 0.3);
    onView($$(".chain, .timeline"), function (el) { el.classList.add("in-view"); });
    onView($$(".severity"), function (el) { el.classList.add("in-view"); }, 0.9);
    onView(counters, count, 0.5);
    onView(terms, function (term) { setTimeout(function () { playTerm(term); }, 500); }, 0.4);
  }, bootMs);

  /* ---------- 5. Grafo de ataque ----------
     Una red de equipos. Desde un acceso inicial, el ataque salta de nodo en
     nodo (movimiento lateral) hasta comprometer el objetivo; entonces se
     resalta la ruta seguida y vuelve a empezar desde otro punto. */
  (function () {
    var canvas = $(".hero__net");
    var ctx = canvas && canvas.getContext && canvas.getContext("2d");
    var hero = canvas && canvas.parentElement;
    if (!ctx || !hero) return;

    var W = 0, H = 0, nodes = [], edges = [], pulses = [], path = [];
    var ptr = { x: -9999, y: -9999 };
    var col = { accent: "#E5484D", line: "#2E2E36", muted: "#9B9BA4", rgb: "229,72,77" };
    var clock = 0, last = 0, raf = 0, visible = false, started = false;
    var fade = 0;            /* aparición inicial del grafo */
    var wash = 1;            /* 1 = ataque visible; baja a 0 al reiniciar */
    var state = "run", stateT = 0, nextHop = 0, foothold = null, target = null, stamp = 0;

    function readColors() {
      var cs = getComputedStyle(root);
      col.accent = cs.getPropertyValue("--accent").trim() || col.accent;
      col.line = cs.getPropertyValue("--line-strong").trim() || col.line;
      col.muted = cs.getPropertyValue("--muted").trim() || col.muted;
      var m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(col.accent);
      if (m) col.rgb = parseInt(m[1], 16) + "," + parseInt(m[2], 16) + "," + parseInt(m[3], 16);
    }

    function build() {
      var r = hero.getBoundingClientRect();
      var w = Math.round(r.width), h = Math.round(r.height);
      if (!w || !h || (w === W && h === H)) return;
      W = w; H = h;

      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      /* Zonas con contenido: ahí el grafo se atenúa para no estorbar la lectura */
      var zones = [];
      [[".hero__text", 0.24], [".photo-stage", 0.55], [".stats", 0.2]].forEach(function (z) {
        var el = $(z[0], hero);
        if (!el) return;
        var b = el.getBoundingClientRect();
        zones.push({ x: b.left - r.left - 18, y: b.top - r.top - 18, w: b.width + 36, h: b.height + 36, k: z[1] });
      });
      function dimAt(x, y) {
        for (var i = 0; i < zones.length; i++) {
          var z = zones[i];
          if (x > z.x && x < z.x + z.w && y > z.y && y < z.y + z.h) return z.k;
        }
        return 1;
      }

      /* Nodos repartidos al azar, guardando una distancia mínima entre ellos */
      var total = Math.max(16, Math.min(64, Math.round(W * H / 22000)));
      var minD = Math.sqrt(W * H / total) * 0.62;
      var tries = 0, i, j;
      nodes = [];
      while (nodes.length < total && tries++ < total * 40) {
        var x = 14 + Math.random() * (W - 28);
        var y = 14 + Math.random() * (H * 0.84 - 14);
        var free = true;
        for (i = 0; i < nodes.length; i++) {
          var ddx = nodes[i].ox - x, ddy = nodes[i].oy - y;
          if (ddx * ddx + ddy * ddy < minD * minD) { free = false; break; }
        }
        if (!free) continue;
        nodes.push({
          ox: x, oy: y, x: x, y: y,
          ph: Math.random() * 6.283, sp: 0.25 + Math.random() * 0.35, amp: 3 + Math.random() * 5,
          dim: dimAt(x, y), links: [], owned: false, busy: false, parent: null, hit: -1e9, mark: 0
        });
      }

      /* Cada nodo se une a sus tres vecinos más cercanos */
      edges = [];
      var done = {};
      for (i = 0; i < nodes.length; i++) {
        var near = [];
        for (j = 0; j < nodes.length; j++) {
          if (j === i) continue;
          var ex = nodes[j].ox - nodes[i].ox, ey = nodes[j].oy - nodes[i].oy;
          near.push({ j: j, d: ex * ex + ey * ey });
        }
        near.sort(function (a, b) { return a.d - b.d; });
        near.slice(0, 3).forEach(function (o) {
          var key = i < o.j ? i + "-" + o.j : o.j + "-" + i;
          if (done[key]) return;
          done[key] = 1;
          var e = { a: nodes[i], b: nodes[o.j], len: Math.sqrt(o.d), used: false };
          edges.push(e);
          nodes[i].links.push(e);
          nodes[o.j].links.push(e);
        });
      }
      newRun();
    }

    /* Nodos alcanzables desde uno dado */
    function reachable(start) {
      var out = [start], q = [start];
      start.mark = ++stamp;
      while (q.length) {
        var n = q.shift();
        for (var i = 0; i < n.links.length; i++) {
          var m = n.links[i].a === n ? n.links[i].b : n.links[i].a;
          if (m.mark === stamp) continue;
          m.mark = stamp;
          out.push(m);
          q.push(m);
        }
      }
      return out;
    }

    /* Nuevo ataque: acceso inicial al azar y, como objetivo, el nodo alcanzable más lejano */
    function newRun() {
      var i;
      for (i = 0; i < nodes.length; i++) {
        nodes[i].owned = false; nodes[i].busy = false; nodes[i].parent = null; nodes[i].hit = -1e9;
      }
      for (i = 0; i < edges.length; i++) edges[i].used = false;
      pulses = []; path = []; wash = 1; state = "run";
      foothold = target = null;
      if (nodes.length < 4) return;

      var pool = nodes.filter(function (n) { return n.dim === 1; });
      if (pool.length < 2) pool = nodes;
      var best = null;
      for (var t = 0; t < 6; t++) {
        var start = pool[(Math.random() * pool.length) | 0];
        var reach = reachable(start);
        var far = null, score = -1;
        for (i = 0; i < reach.length; i++) {
          var n = reach[i];
          if (n === start) continue;
          var dx = n.ox - start.ox, dy = n.oy - start.oy;
          var s = (dx * dx + dy * dy) * (n.dim === 1 ? 1 : 0.35);
          if (s > score) { score = s; far = n; }
        }
        if (far && (!best || score > best.score)) best = { start: start, far: far, score: score };
        if (best && reach.length > nodes.length * 0.6) break;
      }
      if (!best) return;
      foothold = best.start;
      target = best.far;
      foothold.owned = true;
      foothold.hit = clock;
      nextHop = clock + 700;
    }

    /* Lanza un salto desde un nodo comprometido a uno vecino, casi siempre hacia el objetivo */
    function hop() {
      var cands = [];
      for (var i = 0; i < edges.length; i++) {
        var e = edges[i];
        var from = e.a.owned && !e.b.owned ? e.a : (e.b.owned && !e.a.owned ? e.b : null);
        if (!from) continue;
        var to = from === e.a ? e.b : e.a;
        if (to.busy) continue;
        var dx = to.ox - target.ox, dy = to.oy - target.oy;
        cands.push({ e: e, from: from, to: to, d: dx * dx + dy * dy });
      }
      if (!cands.length) return false;
      cands.sort(function (a, b) { return a.d - b.d; });
      var pick = Math.random() < 0.7 ? cands[0] : cands[(Math.random() * Math.min(cands.length, 4)) | 0];
      pick.to.busy = true;
      pulses.push({ e: pick.e, from: pick.from, to: pick.to, t0: clock, dur: 360 + pick.e.len * 2.2 });
      return true;
    }

    function step() {
      if (!foothold) return;
      for (var i = pulses.length - 1; i >= 0; i--) {
        var p = pulses[i];
        if (clock - p.t0 < p.dur) continue;
        pulses.splice(i, 1);
        p.to.owned = true; p.to.busy = false; p.to.parent = p.from; p.to.hit = clock;
        p.e.used = true;
        if (p.to === target && state === "run") {
          state = "won"; stateT = clock;
          path = [];
          for (var n = target; n; n = n.parent) path.push(n);
        }
      }
      if (state === "run") {
        if (clock >= nextHop) {
          var launched = hop();
          nextHop = clock + 360 + Math.random() * 420;
          if (!launched && !pulses.length) { state = "won"; stateT = clock; }
        }
      } else if (state === "won") {
        if (clock - stateT > 3200) { state = "fade"; stateT = clock; }
      } else {
        wash = Math.max(0, 1 - (clock - stateT) / 800);
        if (wash === 0) newRun();
      }
    }

    function seg(ax, ay, bx, by) {
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }
    function ring(x, y, r) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 6.2832);
    }

    function draw() {
      var t = clock / 1000, i, n, e, a;
      ctx.clearRect(0, 0, W, H);

      for (i = 0; i < nodes.length; i++) {
        n = nodes[i];
        n.x = n.ox + Math.cos(t * n.sp + n.ph) * n.amp;
        n.y = n.oy + Math.sin(t * n.sp * 1.3 + n.ph) * n.amp;
      }

      /* Enlaces: grises; en rojo los que ya ha recorrido el ataque */
      ctx.lineWidth = 1;
      for (i = 0; i < edges.length; i++) {
        e = edges[i];
        a = Math.min(e.a.dim, e.b.dim) * fade;
        ctx.strokeStyle = col.line;
        ctx.globalAlpha = 0.85 * a;
        seg(e.a.x, e.a.y, e.b.x, e.b.y);
        if (e.used && wash > 0) {
          ctx.strokeStyle = col.accent;
          ctx.globalAlpha = 0.6 * a * wash;
          seg(e.a.x, e.a.y, e.b.x, e.b.y);
        }
      }

      /* Hilos hacia el puntero */
      ctx.strokeStyle = col.accent;
      for (i = 0; i < nodes.length; i++) {
        n = nodes[i];
        var px = n.x - ptr.x, py = n.y - ptr.y, pd = Math.sqrt(px * px + py * py);
        n.near = pd < 180 ? 1 - pd / 180 : 0;
        if (n.near > 0) {
          ctx.globalAlpha = n.near * 0.5 * fade;
          seg(n.x, n.y, ptr.x, ptr.y);
        }
      }

      /* Ruta de ataque completa: trazo discontinuo que avanza hacia el objetivo */
      if (path.length > 1 && wash > 0) {
        ctx.strokeStyle = col.accent;
        ctx.lineWidth = 2;
        ctx.shadowColor = col.accent;
        ctx.shadowBlur = 12;
        ctx.setLineDash([10, 8]);
        ctx.lineDashOffset = clock / 22;
        for (i = 0; i < path.length - 1; i++) {
          ctx.globalAlpha = Math.min(path[i].dim, path[i + 1].dim) * fade * wash;
          seg(path[i].x, path[i].y, path[i + 1].x, path[i + 1].y);
        }
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;
        ctx.lineWidth = 1;
      }

      /* Saltos en curso: cabeza brillante con estela */
      for (i = 0; i < pulses.length; i++) {
        var p = pulses[i];
        var k = Math.min(1, (clock - p.t0) / p.dur);
        var ek = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        var tk = Math.max(0, ek - 0.3);
        var hx = p.from.x + (p.to.x - p.from.x) * ek, hy = p.from.y + (p.to.y - p.from.y) * ek;
        var tx = p.from.x + (p.to.x - p.from.x) * tk, ty = p.from.y + (p.to.y - p.from.y) * tk;
        a = Math.max(Math.min(p.from.dim, p.to.dim), 0.45) * fade;
        var g = ctx.createLinearGradient(tx, ty, hx, hy);
        g.addColorStop(0, "rgba(" + col.rgb + ",0)");
        g.addColorStop(1, "rgba(" + col.rgb + ",1)");
        ctx.strokeStyle = g;
        ctx.globalAlpha = a;
        ctx.lineWidth = 2;
        seg(tx, ty, hx, hy);
        ctx.lineWidth = 1;
        ctx.fillStyle = col.accent;
        ctx.shadowColor = col.accent;
        ctx.shadowBlur = 14;
        ring(hx, hy, 2.6);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      /* Nodos */
      for (i = 0; i < nodes.length; i++) {
        n = nodes[i];
        a = n.dim * fade;
        ctx.globalAlpha = Math.min(1, 0.6 + n.near) * a;
        ctx.strokeStyle = n.near > 0.05 ? col.accent : col.muted;
        ring(n.x, n.y, 2.2 + n.near * 1.5);
        ctx.stroke();

        if (n.owned && wash > 0) {
          var age = clock - n.hit;
          if (age < 700) {                         /* onda de impacto */
            ctx.strokeStyle = col.accent;
            ctx.globalAlpha = (1 - age / 700) * a * wash;
            ring(n.x, n.y, 4 + (age / 700) * 20);
            ctx.stroke();
          }
          ctx.fillStyle = col.accent;
          ctx.shadowColor = col.accent;
          ctx.shadowBlur = 10;
          ctx.globalAlpha = a * wash;
          ring(n.x, n.y, 3.2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      /* Marcas y rótulos del acceso inicial y del objetivo */
      if (foothold && target) {
        ctx.font = "500 10px 'IBM Plex Mono', ui-monospace, Consolas, monospace";
        ctx.textBaseline = "middle";

        a = foothold.dim * fade * wash;
        ctx.strokeStyle = col.accent;
        ctx.globalAlpha = 0.7 * a;
        ring(foothold.x, foothold.y, 8);
        ctx.stroke();
        label(foothold, "ACCESO INICIAL", col.accent, 0.9 * a);

        var owned = target.owned;
        var beat = 0.5 + 0.5 * Math.sin(t * (owned ? 9 : 3.5));
        a = target.dim * fade * wash;
        ctx.strokeStyle = owned ? col.accent : col.muted;
        ctx.globalAlpha = (owned ? 0.5 + 0.5 * beat : 0.45 + 0.4 * beat) * a;
        ctx.save();                                 /* rombo que gira despacio */
        ctx.translate(target.x, target.y);
        ctx.rotate(Math.PI / 4 + t * 0.4);
        ctx.strokeRect(-7, -7, 14, 14);
        ctx.restore();
        if (owned) {
          ctx.globalAlpha = (1 - beat) * 0.6 * a;
          ring(target.x, target.y, 12 + beat * 14);
          ctx.stroke();
        }
        label(target, owned ? "OBJETIVO COMPROMETIDO" : "OBJETIVO", owned ? col.accent : col.muted, 0.9 * a);
      }
      ctx.globalAlpha = 1;
    }

    function label(n, text, color, alpha) {
      if (n.dim < 1) return;                        /* nunca encima del contenido */
      var left = n.x > W - 190;
      ctx.textAlign = left ? "right" : "left";
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;
      ctx.fillText(text, n.x + (left ? -16 : 16), n.y + 1);
    }

    function frame(now) {
      raf = 0;
      if (!visible || document.hidden) return;
      var dt = Math.min(50, now - (last || now));
      last = now;
      clock += dt;
      fade = Math.min(1, fade + dt / 1500);
      step();
      draw();
      raf = requestAnimationFrame(frame);
    }
    function play() {
      if (raf || !started || !visible || document.hidden) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    }

    readColors();
    window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", readColors);

    /* Solo se anima mientras la portada está en pantalla y la pestaña visible */
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      play();
    }).observe(hero);
    document.addEventListener("visibilitychange", play);

    var resizeT = 0;
    if ("ResizeObserver" in window) {
      new ResizeObserver(function () {
        clearTimeout(resizeT);
        resizeT = setTimeout(build, 250);
      }).observe(hero);
    }

    hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect();
      ptr.x = e.clientX - r.left;
      ptr.y = e.clientY - r.top;
    }, { passive: true });
    hero.addEventListener("pointerleave", function () { ptr.x = ptr.y = -9999; });

    setTimeout(function () {
      started = true;
      build();
      play();
    }, bootMs + 300);
  })();

  /* ---------- 6. Puntero ---------- */
  if (!fine) return;

  /* Mira que sigue al cursor (y "fija" los enlaces) y resplandor de fondo */
  var reticle = document.createElement("div");
  var glow = document.createElement("div");
  reticle.className = "reticle";
  reticle.innerHTML = "<i></i>";
  glow.className = "spotlight";
  reticle.setAttribute("aria-hidden", "true");
  glow.setAttribute("aria-hidden", "true");
  document.body.appendChild(glow);
  document.body.appendChild(reticle);

  var CARD = ".skill, .project, .yt-card, .job, .cve__card, .contact__links a, .stat";
  var TILT = ".skill, .project";
  var tx = 0, ty = 0, rx = 0, ry = 0, gx = 0, gy = 0, loop = 0, ev = null, tilted = null;

  function follow() {
    loop = 0;
    rx += (tx - rx) * 0.24; ry += (ty - ry) * 0.24;   /* la mira va pegada al cursor */
    gx += (tx - gx) * 0.08; gy += (ty - gy) * 0.08;   /* el resplandor, con más inercia */
    reticle.style.transform = "translate3d(" + rx.toFixed(1) + "px," + ry.toFixed(1) + "px,0)";
    glow.style.transform = "translate3d(" + gx.toFixed(1) + "px," + gy.toFixed(1) + "px,0)";

    if (ev) {
      var target = ev.target && ev.target.closest ? ev.target : null;
      var card = target && target.closest(CARD);
      if (card) {
        var r = card.getBoundingClientRect();
        card.style.setProperty("--mx", (ev.clientX - r.left) + "px");
        card.style.setProperty("--my", (ev.clientY - r.top) + "px");
      }
      var tilt = target && target.closest(TILT);
      if (tilted && tilted !== tilt) {
        tilted.style.removeProperty("--rx");
        tilted.style.removeProperty("--ry");
      }
      if (tilt) {
        var b = tilt.getBoundingClientRect();
        tilt.style.setProperty("--rx", ((ev.clientX - b.left) / b.width - 0.5).toFixed(3));
        tilt.style.setProperty("--ry", ((ev.clientY - b.top) / b.height - 0.5).toFixed(3));
      }
      tilted = tilt;
      reticle.classList.toggle("is-lock", !!(target && target.closest("a, button, summary")));
      ev = null;
    }
    if (Math.abs(tx - gx) + Math.abs(ty - gy) > 0.4) loop = requestAnimationFrame(follow);
  }

  document.addEventListener("pointermove", function (e) {
    if (e.pointerType && e.pointerType !== "mouse") return;
    ev = e;
    tx = e.clientX; ty = e.clientY;
    if (!reticle.classList.contains("is-on")) {
      rx = gx = tx; ry = gy = ty;
      reticle.classList.add("is-on");
      glow.classList.add("is-on");
    }
    if (!loop) loop = requestAnimationFrame(follow);
  }, { passive: true });

  root.addEventListener("mouseleave", function () {
    reticle.classList.remove("is-on");
    glow.classList.remove("is-on");
    if (tilted) { tilted.style.removeProperty("--rx"); tilted.style.removeProperty("--ry"); tilted = null; }
  });
  document.addEventListener("pointerdown", function () { reticle.classList.add("is-down"); });
  document.addEventListener("pointerup", function () { reticle.classList.remove("is-down"); });

  /* La foto se inclina siguiendo al puntero (sustituye a la rejilla 3x3 del CSS) */
  var stage = $(".photo-stage");
  var photo = stage && $(".photo", stage);
  if (photo) {
    stage.addEventListener("pointermove", function (e) {
      var r = stage.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      photo.style.transitionDuration = ".25s";
      photo.style.transform = "rotateX(" + (-y * 20).toFixed(2) + "deg) rotateY(" + (x * 20).toFixed(2) + "deg)";
    }, { passive: true });
    stage.addEventListener("pointerleave", function () {
      photo.style.transitionDuration = "";
      photo.style.transform = "";
    });
  }
})();
