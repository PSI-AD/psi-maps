// ── Scroll behavior ──────────────────────────────────────────────────────────
const nav = document.querySelector('.nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

// ── Mobile menu ───────────────────────────────────────────────────────────────
const mobileMenu = document.getElementById('mobile-menu');
const mobileOpen = document.getElementById('mobile-open');
const mobileClose = document.getElementById('mobile-close');
if (mobileOpen) mobileOpen.addEventListener('click', () => mobileMenu.classList.add('open'));
if (mobileClose) mobileClose.addEventListener('click', () => mobileMenu.classList.remove('open'));
document.querySelectorAll('.mobile-menu-link').forEach(l => {
  l.addEventListener('click', () => mobileMenu.classList.remove('open'));
});

// ── Intersection Observer — fade-in animations ────────────────────────────────
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

// ── Counter animation ─────────────────────────────────────────────────────────
function animateCounter(el, target, suffix = '', prefix = '') {
  const duration = 2000;
  const startTime = performance.now();
  const isFloat = !Number.isInteger(target);
  function update(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 4);
    const current = isFloat ? (eased * target).toFixed(1) : Math.round(eased * target);
    el.textContent = prefix + current + suffix;
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const el = e.target;
      const target = parseFloat(el.dataset.target);
      const suffix = el.dataset.suffix || '';
      const prefix = el.dataset.prefix || '';
      animateCounter(el, target, suffix, prefix);
      counterObserver.unobserve(el);
    }
  });
}, { threshold: 0.5 });
document.querySelectorAll('[data-target]').forEach(el => counterObserver.observe(el));

// ── Map pin stagger animation ─────────────────────────────────────────────────
document.querySelectorAll('.map-pin').forEach((pin, i) => {
  pin.style.animationDelay = `${i * 0.3 + 0.5}s`;
});

// ── Typing animation for hero subtitle ───────────────────────────────────────
const typingEl = document.getElementById('typing-text');
if (typingEl) {
  const phrases = [
    'Know your ROI before you sign.',
    'See your lifestyle before you move.',
    'Discover the market before others do.',
    'Make data-driven decisions, not guesses.',
  ];
  let i = 0, j = 0, deleting = false;
  function type() {
    const phrase = phrases[i];
    typingEl.textContent = deleting ? phrase.slice(0, j--) : phrase.slice(0, j++);
    let delay = deleting ? 40 : 80;
    if (!deleting && j === phrase.length + 1) { deleting = true; delay = 2200; }
    else if (deleting && j < 0) { deleting = false; i = (i + 1) % phrases.length; j = 0; delay = 400; }
    setTimeout(type, delay);
  }
  type();
}

// ── Smooth scroll for anchor links ───────────────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
});

// ── Score bars animate when visible ──────────────────────────────────────────
const barObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const fill = e.target;
      const width = fill.style.width;
      fill.style.width = '0%';
      requestAnimationFrame(() => {
        fill.style.transition = 'width 1.2s cubic-bezier(0.25,0.46,0.45,0.94)';
        fill.style.width = width;
      });
      barObserver.unobserve(fill);
    }
  });
}, { threshold: 0.5 });
document.querySelectorAll('.ai-score-fill').forEach(el => barObserver.observe(el));
