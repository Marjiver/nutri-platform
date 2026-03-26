// Dropdown connexion
function toggleConnDropdown() {
  document.getElementById('connMenu').classList.toggle('open');
}
document.addEventListener('click', e => {
  const dd = document.getElementById('connDropdown');
  if (dd && !dd.contains(e.target)) {
    document.getElementById('connMenu')?.classList.remove('open');
  }
});

// Animation entrée hero
document.addEventListener('DOMContentLoaded', () => {
  const el = document.querySelector('.hero-content');
  if (el) {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    setTimeout(() => {
      el.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
      el.style.opacity = '1';
      el.style.transform = 'none';
    }, 80);
  }
  const mockup = document.querySelector('.hero-mockup');
  if (mockup) {
    mockup.style.opacity = '0';
    mockup.style.transform = 'translateY(32px)';
    setTimeout(() => {
      mockup.style.transition = 'opacity 0.7s ease 0.2s, transform 0.7s ease 0.2s';
      mockup.style.opacity = '1';
      mockup.style.transform = 'none';
    }, 80);
  }
});

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
});
