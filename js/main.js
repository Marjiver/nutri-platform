// js/main.js — Page d'accueil
console.log('NutriPlan chargé.');

// Animation d'entrée légère sur le hero
document.addEventListener('DOMContentLoaded', () => {
  const hero = document.querySelector('.hero-content');
  if (hero) {
    hero.style.opacity = '0';
    hero.style.transform = 'translateY(20px)';
    setTimeout(() => {
      hero.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      hero.style.opacity = '1';
      hero.style.transform = 'none';
    }, 100);
  }
});
