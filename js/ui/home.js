const header = document.getElementById('ndHeader');
window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

function toggleConn() {
  document.getElementById('ndConnMenu').classList.toggle('open');
}
document.addEventListener('click', e => {
  if (!document.getElementById('ndConnWrap')?.contains(e.target))
    document.getElementById('ndConnMenu')?.classList.remove('open');
});

function togglePricing(which) {
  const panels = { diet:'panelDiet', presc:'panelPresc' };
  const btns   = { diet:'btnTarifsDiet', presc:'btnTarifsPresc' };
  const panel  = document.getElementById(panels[which]);
  const btn    = document.getElementById(btns[which]);
  const isOpen = panel.classList.toggle('open');
  btn.classList.toggle('open', isOpen);
}

// Scroll reveal
const obs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('revealed'); obs.unobserve(e.target); } });
}, { threshold: 0.12 });
document.querySelectorAll('[data-reveal]').forEach(el => obs.observe(el));

// Canvas particules vertes
(function() {
  const hero = document.getElementById('heroCanvas');
  if (!hero) return;
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:.45';
  hero.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  let W, H, pts;
  function resize() { W = canvas.width = hero.offsetWidth; H = canvas.height = hero.offsetHeight; }
  function init() {
    pts = Array.from({ length: 55 }, () => ({
      x: Math.random()*W, y: Math.random()*H,
      r: Math.random()*1.4+.4,
      vx: (Math.random()-.5)*.25, vy: (Math.random()-.5)*.25,
      a: Math.random()*.7+.3
    }));
  }
  function draw() {
    ctx.clearRect(0,0,W,H);
    pts.forEach(p => {
      p.x+=p.vx; p.y+=p.vy;
      if(p.x<0)p.x=W; if(p.x>W)p.x=0;
      if(p.y<0)p.y=H; if(p.y>H)p.y=0;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(93,202,165,${p.a*.55})`; ctx.fill();
    });
    for(let i=0;i<pts.length;i++) for(let j=i+1;j<pts.length;j++){
      const dx=pts[i].x-pts[j].x, dy=pts[i].y-pts[j].y, d=Math.sqrt(dx*dx+dy*dy);
      if(d<110){
        ctx.beginPath(); ctx.moveTo(pts[i].x,pts[i].y); ctx.lineTo(pts[j].x,pts[j].y);
        ctx.strokeStyle=`rgba(29,158,117,${.1*(1-d/110)})`; ctx.lineWidth=.5; ctx.stroke();
      }
    }
    requestAnimationFrame(draw);
  }
  resize(); init(); draw();
  window.addEventListener('resize', () => { resize(); init(); });
})();

// Scroll : indicateur uniquement, pas d'opacité sur le contenu
window.addEventListener('scroll', () => {
  const scrollEl = document.querySelector('.nd-hero-scroll');
  if (scrollEl) scrollEl.style.opacity = Math.max(0, 1 - window.scrollY / 200);
}, { passive: true });

// ── Parallaxe souris sur les blocs hero ─────────────────────
(function() {
  const hero = document.querySelector('.nd-hero');
  if (!hero) return;

  // Chaque bloc avec data-depth reçoit un mouvement proportionnel
  // Les cartes flottantes, la grille de fond, le titre
  const layers = [
    { sel: '.nd-hero-mockup',    depth: 0.025 },
    { sel: '.nd-hero-canvas',    depth: 0.008 },
    { sel: '.nd-hero-title',     depth: 0.012 },
    { sel: '.nd-hero-eyebrow',   depth: 0.018 },
    { sel: '.nd-hero-sub',       depth: 0.010 },
    { sel: '.nd-hero-trust',     depth: 0.008 },
    { sel: '.nd-mc-1',           depth: 0.030 },
    { sel: '.nd-mc-2',           depth: 0.045 },
    { sel: '.nd-mc-3',           depth: 0.055 },
  ];

  const resolvedLayers = layers.map(l => ({
    el: document.querySelector(l.sel),
    depth: l.depth
  })).filter(l => l.el);

  let mouseX = 0, mouseY = 0;
  let targetX = 0, targetY = 0;
  let raf = null;

  hero.addEventListener('mousemove', e => {
    const rect  = hero.getBoundingClientRect();
    // Coordonnées relatives au centre, normalisées -1 à 1
    mouseX = (e.clientX - rect.left - rect.width  / 2) / (rect.width  / 2);
    mouseY = (e.clientY - rect.top  - rect.height / 2) / (rect.height / 2);
  });

  hero.addEventListener('mouseleave', () => {
    mouseX = 0; mouseY = 0;
  });

  function animateParallax() {
    // Lerp pour fluidité
    targetX += (mouseX - targetX) * 0.06;
    targetY += (mouseY - targetY) * 0.06;

    resolvedLayers.forEach(({ el, depth }) => {
      const maxShift = 40; // px max
      const tx = targetX * maxShift * depth * 100;
      const ty = targetY * maxShift * depth * 100;
      el.style.transform = `translate(${tx}px, ${ty}px)`;
    });

    raf = requestAnimationFrame(animateParallax);
  }

  animateParallax();
})();


// Smooth scroll ancres
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const t = document.querySelector(a.getAttribute('href'));
    if (t) { e.preventDefault(); t.scrollIntoView({ behavior:'smooth', block:'start' }); }
  });
});
