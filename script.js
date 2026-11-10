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
    labelTheme(); draw();
  });
  labelTheme();

  /* Doodles wobble: re-seed the shared noise filter a few times a second */
  var noise = document.getElementById('boil-noise'), seed = 1;
  if (!calm && noise) setInterval(function () { seed = seed % 5 + 1; noise.setAttribute('seed', seed); jitterSeed = seed; }, 170);
  var jitterSeed = 1;

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
  function apply(skill) {
    active = skill;
    document.body.classList.toggle('filtering', !!skill);
    var n = 0;
    items.forEach(function (el) {
      var hit = !!skill && el.dataset.skills.split(' ').indexOf(skill) !== -1;
      el.classList.toggle('match', hit);
      if (hit) n++;
    });
    skillBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.skill === skill)); });
    bubbleActions.hidden = !skill;
    say(skill ? names[skill] + ': I used it in ' + n + (n === 1 ? ' place.' : ' places.') : "Pick a skill. I'll show you where I used it.");
    draw();
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

  /* 3D skill orbit: real buttons placed on a rotating sphere, sketchy strings on a canvas */
  var stage = $('.stage'), canvas = $('canvas', stage), ctx = canvas.getContext('2d');
  var nodes = $$('.node', stage);
  var pts = nodes.map(function (_, i) {
    var y = 1 - 2 * (i + 0.5) / nodes.length, r = Math.sqrt(1 - y * y), phi = i * 2.399963;
    return { x: Math.cos(phi) * r, y: y, z: Math.sin(phi) * r };
  });
  var yaw = 0.4, pitch = 0.3, speed = calm ? 0 : 0.28, want = speed, hovering = false, dragging = false, lastX = 0, lastY = 0;
  var W = 0, H = 0, dpr = 1, screen = [];
  function size() {
    var r = stage.getBoundingClientRect();
    W = r.width; H = r.height; dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr; canvas.height = H * dpr;
  }
  function rand(i) { var x = Math.sin(i * 127.1 + jitterSeed * 311.7) * 43758.5453; return x - Math.floor(x) - 0.5; }
  function draw() {
    if (!W) return;
    var cx = W / 2, cy = H / 2, Rx = W * (W < 420 ? 0.29 : 0.36), Ry = H * 0.36;
    var cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    screen = pts.map(function (p, i) {
      var x1 = p.x * cyw + p.z * syw, z1 = -p.x * syw + p.z * cyw;
      var y2 = p.y * cp - z1 * sp, z2 = p.y * sp + z1 * cp;
      var k = 1 / (1 - z2 * 0.22), depth = (z2 + 1) / 2;
      var s = { x: cx + x1 * Rx * k, y: cy + y2 * Ry * k, depth: depth };
      var el = nodes[i];
      el.style.transform = 'translate(-50%,-50%) translate(' + s.x.toFixed(1) + 'px,' + s.y.toFixed(1) + 'px) scale(' + (0.78 + 0.34 * depth).toFixed(3) + ')';
      el.style.zIndex = String(depth < 0.5 ? 1 + Math.round(depth * 8) : 8 + Math.round(depth * 8));
      el.style.opacity = (0.55 + 0.45 * depth).toFixed(2);
      return s;
    });
    var cs = getComputedStyle(root), ink = cs.getPropertyValue('--ink').trim(), pen = cs.getPropertyValue('--coral').trim();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = 'round';
    screen.forEach(function (s, i) {
      var on = nodes[i].dataset.skill === active;
      var mx = (cx + s.x) / 2 + rand(i) * 26, my = (cy + s.y) / 2 + rand(i + 40) * 26;
      ctx.globalAlpha = on ? 1 : 0.25 + 0.5 * s.depth;
      ctx.strokeStyle = on ? pen : ink;
      ctx.lineWidth = on ? 3 : 1.6;
      ctx.setLineDash(s.depth < 0.45 && !on ? [5, 7] : []);
      for (var pass = 0; pass < 2; pass++) {
        ctx.beginPath();
        ctx.moveTo(cx + rand(i + pass * 9) * 4, cy + rand(i + 3 + pass * 9) * 4);
        ctx.quadraticCurveTo(mx + rand(i + 60 + pass) * 5, my + rand(i + 80 + pass) * 5, s.x, s.y);
        ctx.stroke();
      }
    });
    ctx.globalAlpha = 1;
  }
  var prev = 0, visible = true;
  function frame(t) {
    var dt = Math.min((t - prev) / 1000, 0.05); prev = t;
    speed += ((hovering || dragging ? 0 : want) - speed) * Math.min(dt * 5, 1);
    yaw += speed * dt;
    if (visible) draw();
    requestAnimationFrame(frame);
  }
  stage.addEventListener('pointerenter', function () { hovering = true; });
  stage.addEventListener('pointerleave', function () { hovering = false; });
  stage.addEventListener('focusin', function () { hovering = true; });
  stage.addEventListener('focusout', function () { hovering = false; });
  stage.addEventListener('pointerdown', function (e) {
    if (e.target.closest('.node')) return;
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    stage.classList.add('dragging'); stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    yaw += (e.clientX - lastX) * 0.008;
    pitch = Math.max(-0.9, Math.min(0.9, pitch + (e.clientY - lastY) * 0.006));
    lastX = e.clientX; lastY = e.clientY;
    if (calm) draw();
  });
  function stopDrag() { dragging = false; stage.classList.remove('dragging'); }
  stage.addEventListener('pointerup', stopDrag);
  stage.addEventListener('pointercancel', stopDrag);
  window.addEventListener('resize', function () { size(); draw(); });
  if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe(stage);
  size(); draw();
  if (!calm) requestAnimationFrame(function (t) { prev = t; frame(t); });

  /* The robot watches the cursor */
  var eyes = $$('.eye'), pupils = $$('.pupil');
  if (!calm) window.addEventListener('pointermove', function (e) {
    eyes.forEach(function (eye, i) {
      var r = eye.getBoundingClientRect();
      var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      var d = Math.min(Math.hypot(dx, dy) / 40, 1) * 5, a = Math.atan2(dy, dx);
      pupils[i].style.transform = 'translate(' + (Math.cos(a) * d).toFixed(1) + 'px,' + (Math.sin(a) * d).toFixed(1) + 'px)';
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

  /* Local time in Bengaluru */
  var clock = document.getElementById('clock');
  function tick() {
    try { clock.textContent = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }).format(new Date()) + ' IST'; } catch (e) {}
  }
  tick(); setInterval(tick, 30000);
})();
