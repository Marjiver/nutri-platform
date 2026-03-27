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

// Parallax hero léger
window.addEventListener('scroll', () => {
  const y = window.scrollY;
  const c = document.querySelector('.nd-hero-content');
  if (c && y < window.innerHeight) {
    c.style.transform = `translateY(${y*.14}px)`;
    c.style.opacity = 1 - y/(window.innerHeight*.75);
  }
}, { passive: true });

// Smooth scroll ancres
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const t = document.querySelector(a.getAttribute('href'));
    if (t) { e.preventDefault(); t.scrollIntoView({ behavior:'smooth', block:'start' }); }
  });
});
