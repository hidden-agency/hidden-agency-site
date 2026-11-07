// À remplir avant la mise en ligne (voir task_plan.md).
const CONFIG = {
  BOOKING_URL: 'https://calendly.com/contact-myhiddenagency/appel-decouverte', // agenda intégré
  WHATSAPP_URL: '', // ex. https://wa.me/33600000000
  // Workflow n8n « Hidden Agency · Diagnostic site » (RzE1E4kET6HHacAa) → table « Diagnostics site » + alerte email
  LEAD_WEBHOOK_URL: 'https://nans952.app.n8n.cloud/webhook/hidden-agency-diagnostic',
};

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function wireLinks() {
  if (CONFIG.WHATSAPP_URL) {
    document.querySelectorAll('[data-whatsapp]').forEach((link) => {
      link.href = CONFIG.WHATSAPP_URL;
      link.target = '_blank';
      link.rel = 'noopener';
      link.hidden = false;
    });
  }
}

function initHeader() {
  const header = document.querySelector('[data-header]');
  const toggle = document.querySelector('[data-menu-toggle]');
  const menu = document.querySelector('[data-menu]');
  const stickyCta = document.querySelector('[data-sticky-cta]');
  const booking = document.querySelector('#reserver');

  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    menu.classList.toggle('is-open', open);
    header.classList.toggle('menu-open', open);
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (event) => { if (event.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') setMenu(false); });

  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 24);
    // Le bouton collant ne revient qu'une fois le diagnostic dépassé, comme rappel.
    const pastBooking = booking.getBoundingClientRect().bottom < 0;
    stickyCta.classList.toggle('is-visible', pastBooking);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

function initReveal() {
  const items = document.querySelectorAll('.reveal');
  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  items.forEach((el, i) => {
    el.style.transitionDelay = `${(i % 4) * 90}ms`;
    observer.observe(el);
  });
}

// Constellation dorée : des points qui dérivent et se relient quand ils sont proches.
const LINK_DISTANCE = 150;
const AREA_PER_POINT = 14000;
const MIN_POINTS = 24;
const MAX_POINTS = 110;
const DRIFT_SPEED = 0.18;
const POINTER_RADIUS = 200;

function initConstellation(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  let width = 0;
  let height = 0;
  let points = [];
  let frame = 0;
  let running = false;
  const pointer = { x: -9999, y: -9999 };

  const makePoint = () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * DRIFT_SPEED,
    vy: (Math.random() - 0.5) * DRIFT_SPEED,
    r: 0.6 + Math.random() * 1.4,
    phase: Math.random() * Math.PI * 2,
  });

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.max(MIN_POINTS, Math.min(MAX_POINTS, Math.round((width * height) / AREA_PER_POINT)));
    points = Array.from({ length: count }, makePoint);
  };

  const draw = (time) => {
    ctx.clearRect(0, 0, width, height);
    for (const p of points) {
      if (!prefersReducedMotion) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
      }
    }
    ctx.lineWidth = 0.6;
    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      for (let j = i + 1; j < points.length; j++) {
        const b = points[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d > LINK_DISTANCE) continue;
        ctx.strokeStyle = `rgba(212,175,106,${(1 - d / LINK_DISTANCE) * 0.32})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      const dp = Math.hypot(a.x - pointer.x, a.y - pointer.y);
      if (dp < POINTER_RADIUS) {
        ctx.strokeStyle = `rgba(241,217,160,${(1 - dp / POINTER_RADIUS) * 0.6})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(pointer.x, pointer.y);
        ctx.stroke();
      }
    }
    for (const p of points) {
      const glow = 0.55 + 0.45 * Math.sin(time / 900 + p.phase);
      if (p.r > 1.5) {
        const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 7);
        halo.addColorStop(0, `rgba(241,217,160,${0.35 * glow})`);
        halo.addColorStop(1, 'rgba(241,217,160,0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = `rgba(241,217,160,${0.5 + 0.5 * glow})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const loop = (time) => {
    draw(time);
    if (running) frame = requestAnimationFrame(loop);
  };
  const start = () => {
    if (running || prefersReducedMotion) return;
    running = true;
    frame = requestAnimationFrame(loop);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(frame);
  };

  resize();
  draw(0);

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { resize(); draw(0); }, 150);
  });

  const host = canvas.parentElement;
  host.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
  });
  host.addEventListener('pointerleave', () => { pointer.x = -9999; pointer.y = -9999; });

  new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop())).observe(canvas);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
}

// Projecteur doré qui suit le pointeur sur les cartes (souris uniquement).
function initSpotlight() {
  if (prefersReducedMotion || !window.matchMedia('(hover: hover)').matches) return;
  document.querySelectorAll('[data-spot]').forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${event.clientX - rect.left}px`);
      card.style.setProperty('--my', `${event.clientY - rect.top}px`);
    });
  });
}

wireLinks();
initHeader();
initReveal();
initSpotlight();
document.querySelectorAll('[data-constellation]').forEach(initConstellation);
