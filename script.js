(function () {
  var root = document.documentElement;
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Theme toggle
  var themeBtn = document.querySelector('.theme');
  function currentTheme() {
    return root.dataset.theme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }
  function labelTheme() {
    themeBtn.querySelector('.theme-label').textContent = currentTheme() === 'dark' ? 'Light' : 'Dark';
  }
  themeBtn.addEventListener('click', function () {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) {}
    labelTheme();
  });
  labelTheme();

  // Pointer glow behind the hero
  var backdrop = document.querySelector('.backdrop');
  if (!calm && backdrop) {
    window.addEventListener('pointermove', function (e) {
      if (window.scrollY > window.innerHeight) return;
      backdrop.style.setProperty('--mx', e.clientX + 'px');
      backdrop.style.setProperty('--my', (e.clientY + window.scrollY) + 'px');
    }, { passive: true });
  }

  // Nav: border once scrolled, highlight the section in view
  var top = document.querySelector('.top');
  var links = Array.prototype.slice.call(document.querySelectorAll('nav a'));
  var sections = links.map(function (a) { return document.querySelector(a.getAttribute('href')); });
  function onScroll() {
    top.classList.toggle('stuck', window.scrollY > 8);
    var line = window.innerHeight * 0.35, active = -1;
    sections.forEach(function (s, i) { if (s && s.getBoundingClientRect().top <= line) active = i; });
    links.forEach(function (a, i) { a.classList.toggle('on', i === active); });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Skills map: choose a skill, highlight where it was used
  var names = {
    harness: 'Agentic harness', orchestration: 'Multi-agent orchestration', memory: 'Agentic memory systems',
    voice: 'Voice AI agents', rag: 'Multimodal RAG', text2sql: 'Text2SQL', evals: 'Evals', claude: 'Claude Code'
  };
  var skillBtns = Array.prototype.slice.call(document.querySelectorAll('[data-skill]'));
  var items = Array.prototype.slice.call(document.querySelectorAll('[data-skills]'));
  var status = document.querySelector('.map-status');
  var count = document.querySelector('.map-count');
  var active = null;

  function apply(skill) {
    active = skill;
    document.body.classList.toggle('filtering', !!skill);
    var matches = [];
    items.forEach(function (el) {
      var hit = !!skill && el.dataset.skills.split(' ').indexOf(skill) !== -1;
      el.classList.toggle('match', hit);
      if (hit) matches.push(el);
    });
    skillBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.skill === skill)); });
    status.hidden = !skill;
    if (skill) {
      count.textContent = matches.length + (matches.length === 1 ? ' item uses ' : ' items use ') + names[skill] + '.';
    }
    return matches;
  }
  skillBtns.forEach(function (b) {
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', function () {
      apply(active === b.dataset.skill ? null : b.dataset.skill);
    });
  });
  document.querySelector('.map-clear').addEventListener('click', function () { apply(null); });
  document.querySelector('.map-go').addEventListener('click', function () {
    var first = document.querySelector('[data-skills].match');
    if (first) first.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'center' });
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && active) apply(null); });

  // Stats count up once, when they scroll into view
  var nums = Array.prototype.slice.call(document.querySelectorAll('[data-to]'));
  function fmt(el, v) {
    var dec = Number(el.dataset.dec || 0);
    var s = dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-US');
    return (el.dataset.pre || '') + s + (el.dataset.suf || '');
  }
  if (!calm && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        var el = en.target, to = Number(el.dataset.to), t0 = null;
        function step(t) {
          if (t0 === null) t0 = t;
          var p = Math.min((t - t0) / 1100, 1);
          el.textContent = fmt(el, to * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });
    }, { threshold: 0.6 });
    nums.forEach(function (el) { io.observe(el); });
  }

  // Local time in Bengaluru
  var clock = document.getElementById('clock');
  function tick() {
    try {
      clock.textContent = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }).format(new Date()) + ' IST';
    } catch (e) {}
  }
  tick();
  setInterval(tick, 30000);
})();
