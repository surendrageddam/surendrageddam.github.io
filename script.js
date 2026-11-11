(function () {
  var root = document.documentElement;
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };

  /* Theme: notebook or chalkboard */
  var themeBtn = $('.theme');
  function theme() { return root.dataset.theme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); }
  function labelTheme() { $('.theme-label').textContent = theme() === 'dark' ? 'Notebook' : 'Chalkboard'; }
  themeBtn.addEventListener('click', function () {
    var next = theme() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) {}
    labelTheme();
  });
  labelTheme();

  /* Doodles wobble: re-seed the shared noise filter a few times a second */
  var noise = document.getElementById('boil-noise'), seed = 1;
  if (!calm && noise) setInterval(function () { seed = seed % 5 + 1; noise.setAttribute('seed', seed); }, 170);

  /* Nav state */
  var top = $('.top'), links = $$('nav a');
  var targets = links.map(function (a) { return $(a.getAttribute('href')); });
  function onScroll() {
    top.classList.toggle('stuck', window.scrollY > 8);
    var line = window.innerHeight * 0.35, on = -1;
    targets.forEach(function (s, i) { if (s && s.getBoundingClientRect().top <= line) on = i; });
    links.forEach(function (a, i) { a.classList.toggle('on', i === on); });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Skill filter: shared by the orbit and the tags on each project */
  var names = { harness: 'Agentic harness', orchestration: 'Multi-agent orchestration', memory: 'Agentic memory', voice: 'Voice AI agents', rag: 'Multimodal RAG', text2sql: 'Text2SQL', evals: 'Evals', claude: 'Building with Claude Code' };
  var skillBtns = $$('[data-skill]'), items = $$('[data-skills]');
  var bubble = $('.bubble'), bubbleText = $('.bubble-text'), bubbleActions = $('.bubble-actions');
  var active = null;
  function say(text) {
    bubbleText.textContent = text;
    bubble.classList.remove('say'); void bubble.offsetWidth; bubble.classList.add('say');
  }
  var count = 0;
  var idle = "Pick an apple. I'll show you where I used that skill.";
  function announce() {
    if (!active) return;
    bubbleActions.hidden = false;
    say('Ouch! ' + names[active] + ': I used it in ' + count + (count === 1 ? ' place.' : ' places.'));
  }
  function apply(skill) {
    active = skill;
    document.body.classList.toggle('filtering', !!skill);
    count = 0;
    items.forEach(function (el) {
      var hit = !!skill && el.dataset.skills.split(' ').indexOf(skill) !== -1;
      el.classList.toggle('match', hit);
      if (hit) count++;
    });
    skillBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.skill === skill)); });
    bubbleActions.hidden = true;
    if (!skill) say(idle);
    syncApples(skill);
  }
  skillBtns.forEach(function (b) {
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', function () { apply(active === b.dataset.skill ? null : b.dataset.skill); });
  });
  $('.map-clear').addEventListener('click', function () { apply(null); });
  $('.map-go').addEventListener('click', function () {
    var first = $('[data-skills].match');
    if (first) first.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'center' });
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && active) apply(null); });

  /* Newton's tree: each skill is an apple. Pick one and gravity does the rest. */
  var stage = $('.stage'), newton = $('.newton');
  var G = 2600, W = 0, H = 0, R = 20, head = {}, ground = 0, running = false, last = 0;
  var fruit = $$('.apple', stage).map(function (el) {
    return { el: el, skill: el.dataset.skill, fx: Number(el.dataset.x) / 100, fy: Number(el.dataset.y) / 100, x: 0, y: 0, vx: 0, vy: 0, rot: 0, vr: 0, mode: 'home', bonked: false, t: 0, from: null };
  });
  function place(a) {
    a.el.style.transform = 'translate(' + a.x.toFixed(1) + 'px,' + a.y.toFixed(1) + 'px) translate(-50%,-' + R + 'px)';
    a.el.style.setProperty('--rot', a.rot.toFixed(0) + 'deg');
    a.el.style.zIndex = a.mode === 'home' ? '2' : '4';
  }
  function layout() {
    W = stage.clientWidth; H = stage.clientHeight;
    R = fruit[0].el.querySelector('svg').getBoundingClientRect().width / 2 || 20;
    head = { x: 0.4675 * W, y: 0.615 * H, r: 0.07 * W };
    ground = 0.865 * H;
    fruit.forEach(function (a) {
      if (a.mode === 'home') { a.x = a.fx * W; a.y = a.fy * H; }
      else if (a.mode === 'rest') { a.x = Math.min(Math.max(a.x, R), W - R); a.y = ground - R; }
      place(a);
    });
  }
  function bonk(a) {
    a.bonked = true;
    if (a.skill !== active) return;
    newton.classList.add('hit');
    setTimeout(function () { newton.classList.remove('hit'); }, 1500);
    announce();
  }
  function drop(a) {
    a.el.classList.add('down');
    var side = a.fx * W < head.x ? -1 : 1;
    if (calm) { a.mode = 'rest'; a.x = head.x + side * (head.r + R * 2.4); a.y = ground - R; a.rot = side * 20; place(a); bonk(a); return; }
    var dy = (head.y - head.r - R) - a.y;
    a.mode = 'fall'; a.vy = 0; a.vr = side * 200; a.bonked = false;
    if (dy > 12) { var t = Math.sqrt(2 * dy / G); a.vx = (head.x + side * head.r * 0.45 - a.x) / t; }
    else { a.vx = side * 60; bonk(a); }
    kick();
  }
  function sendBack(a) {
    if (a.mode === 'home') return;
    a.el.classList.remove('down');
    if (calm) { a.mode = 'home'; a.rot = 0; layout(); return; }
    a.mode = 'back'; a.t = 0; a.from = { x: a.x, y: a.y };
    kick();
  }
  function syncApples(skill) {
    fruit.forEach(function (a) {
      if (a.skill === skill) { if (a.mode === 'home' || a.mode === 'back') drop(a); else announce(); }
      else sendBack(a);
    });
  }
  function step(a, dt) {
    if (a.mode === 'fall') {
      a.vy += G * dt; a.x += a.vx * dt; a.y += a.vy * dt; a.rot += a.vr * dt;
      var dx = a.x - head.x, dy = a.y - head.y, d = Math.hypot(dx, dy);
      if (!a.bonked && d < head.r + R) {
        var nx = dx / d, ny = dy / d, vn = a.vx * nx + a.vy * ny;
        if (vn < 0) { a.vx -= 1.5 * vn * nx; a.vy -= 1.5 * vn * ny; }
        var side = a.fx * W < head.x ? -1 : 1;
        a.vx = side * Math.max(Math.abs(a.vx), 0.3 * W);
        a.vy = Math.min(a.vy, -0.55 * W);
        a.vr = side * 420;
        bonk(a);
      }
      if (a.x < R) { a.x = R; a.vx = Math.abs(a.vx) * 0.5; }
      if (a.x > W - R) { a.x = W - R; a.vx = -Math.abs(a.vx) * 0.5; }
      if (a.y > ground - R) {
        a.y = ground - R; a.vy = -a.vy * 0.4; a.vx *= 0.6; a.vr = a.vx * 3;
        if (!a.bonked) bonk(a);
        if (Math.abs(a.vy) < 70) { a.mode = 'rest'; a.vy = a.vx = a.vr = 0; }
      }
    } else if (a.mode === 'back') {
      a.t = Math.min(a.t + dt / 0.6, 1);
      var e = 1 - Math.pow(1 - a.t, 3), hx = a.fx * W, hy = a.fy * H;
      a.x = a.from.x + (hx - a.from.x) * e;
      a.y = a.from.y + (hy - a.from.y) * e - Math.sin(a.t * Math.PI) * 30;
      a.rot *= 0.85;
      if (a.t >= 1) { a.mode = 'home'; a.rot = 0; }
    }
    place(a);
  }
  function loop(t) {
    var dt = Math.min((t - last) / 1000, 0.032); last = t;
    var busy = false;
    fruit.forEach(function (a) { if (a.mode === 'fall' || a.mode === 'back') { step(a, dt); busy = busy || a.mode === 'fall' || a.mode === 'back'; } });
    if (busy) requestAnimationFrame(loop); else running = false;
  }
  function kick() { if (running) return; running = true; requestAnimationFrame(function (t) { last = t; loop(t); }); }
  window.addEventListener('resize', layout);
  layout();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);

  /* Newton watches the cursor */
  var eyes = $$('.eye'), pupils = $$('.pupil');
  if (!calm) window.addEventListener('pointermove', function (e) {
    eyes.forEach(function (eye, i) {
      var r = eye.getBoundingClientRect();
      var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      var d = Math.min(Math.hypot(dx, dy) / 40, 1) * 2.6, an = Math.atan2(dy, dx);
      pupils[i].style.transform = 'translate(' + (Math.cos(an) * d).toFixed(1) + 'px,' + (Math.sin(an) * d).toFixed(1) + 'px)';
    });
  }, { passive: true });

  /* Taped screenshots tilt in 3D toward the pointer */
  if (!calm) $$('.shot').forEach(function (el) {
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      el.style.setProperty('--ry', (((e.clientX - r.left) / r.width - 0.5) * 14).toFixed(1) + 'deg');
      el.style.setProperty('--rx', ((0.5 - (e.clientY - r.top) / r.height) * 12).toFixed(1) + 'deg');
    });
    el.addEventListener('pointerleave', function () { el.style.setProperty('--ry', '0deg'); el.style.setProperty('--rx', '0deg'); });
  });

  /* Scroll: headings get their squiggle, notes and cards drop in, numbers count up */
  function fmt(el, v) {
    var dec = Number(el.dataset.dec || 0);
    return (el.dataset.pre || '') + (dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-US')) + (el.dataset.suf || '');
  }
  function countUp(el) {
    var to = Number(el.dataset.to), t0 = null;
    requestAnimationFrame(function step(t) {
      if (t0 === null) t0 = t;
      var p = Math.min((t - t0) / 1100, 1);
      el.textContent = fmt(el, to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    });
  }
  var watch = $$('.sec, .pop');
  $$('.stats .pop, .wins').forEach(function (group) {
    var kids = group.classList.contains('pop') ? [group] : $$('.pop', group);
    kids.forEach(function (k, i) { k.style.setProperty('--i', group.classList.contains('pop') ? $$('.stats .pop').indexOf(group) : i); });
  });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        en.target.classList.add('seen');
        var num = $('[data-to]', en.target);
        if (num && !calm) countUp(num);
      });
    }, { threshold: 0.2 });
    watch.forEach(function (el) { io.observe(el); });
  } else {
    watch.forEach(function (el) { el.classList.add('seen'); });
  }

  /* Scrolling shakes apples loose: they drop through the page, bounce on the bottom edge and roll away */
  if (!calm) (function () {
    var layer = document.createElement('div');
    layer.className = 'rain'; layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);
    var art = fruit[0].el.querySelector('svg').innerHTML, kinds = ['k-red', 'k-green', 'k-gold'];
    var live = [], going = false, prevT = 0, lastY = window.scrollY, travelled = 0;
    function spawn() {
      if (live.length >= 7) return;
      var el = document.createElement('div');
      el.className = 'drop ' + kinds[Math.floor(Math.random() * 3)];
      el.innerHTML = '<svg viewBox="0 0 40 44">' + art + '</svg>';
      var size = 26 + Math.random() * 20, x = Math.random() * (window.innerWidth - size) + size / 2, y = -size;
      var box = stage.getBoundingClientRect();
      if (box.bottom > 120 && box.top < window.innerHeight) {
        var home = fruit.filter(function (a) { return a.mode === 'home'; });
        var pick = home[Math.floor(Math.random() * home.length)];
        if (pick) { var r = pick.el.querySelector('svg').getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 2; size = r.width; }
      }
      el.style.width = size + 'px';
      layer.appendChild(el);
      live.push({ el: el, x: x, y: y, r: size / 2, vx: (Math.random() - 0.5) * 160, vy: Math.random() * 120, rot: Math.random() * 360, vr: (Math.random() - 0.5) * 500, hits: 0, fade: 1 });
      if (!going) { going = true; requestAnimationFrame(function (t) { prevT = t; tickRain(t); }); }
    }
    function tickRain(t) {
      var dt = Math.min((t - prevT) / 1000, 0.032); prevT = t;
      var floor = window.innerHeight;
      live = live.filter(function (d) {
        d.vy += 1900 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.rot += d.vr * dt;
        if (d.y > floor - d.r && d.vy > 0) {
          d.y = floor - d.r; d.hits++;
          d.vy = -d.vy * 0.42; d.vx *= 0.8; d.vr = d.vx * 4;
          if (Math.abs(d.vy) < 90) d.vy = 0;
        }
        if (d.hits >= 2) d.fade -= dt * 1.6;
        if (d.fade <= 0 || d.x < -60 || d.x > window.innerWidth + 60) { d.el.remove(); return false; }
        d.el.style.transform = 'translate(' + d.x.toFixed(1) + 'px,' + d.y.toFixed(1) + 'px) translate(-50%,-50%) rotate(' + d.rot.toFixed(0) + 'deg)';
        d.el.style.opacity = Math.max(d.fade, 0).toFixed(2);
        return true;
      });
      if (live.length) requestAnimationFrame(tickRain); else going = false;
    }
    window.addEventListener('scroll', function () {
      var y = window.scrollY;
      travelled += Math.abs(y - lastY); lastY = y;
      while (travelled > 240) {
        travelled -= 240;
        if (Math.random() < 0.75) spawn();
      }
    }, { passive: true });
  })();

  /* Local time in Bengaluru */
  var clock = document.getElementById('clock');
  function tick() {
    try { clock.textContent = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }).format(new Date()) + ' IST'; } catch (e) {}
  }
  tick(); setInterval(tick, 30000);
})();
