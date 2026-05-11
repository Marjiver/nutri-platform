// ============================================================
//  supabase-init.js — initialisation globale du client Supabase
//  À inclure dans toutes les pages APRÈS le CDN supabase-js
//  <script src="js/supabase-init.js"></script>
// ============================================================
(function () {
  const SUPA_URL  = 'https://phgjpwaptrrjonoimmne.supabase.co';
  const SUPA_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoZ2pwd2FwdHJyam9ub2ltbW5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NTUxOTgsImV4cCI6MjA5MDEzMTE5OH0.jFqP_7-i7YEfs5KA8ge58AUTdg-gblelrlSaQ0s-ApY';
  try {
    if (typeof supabase === 'undefined') throw new Error('supabase-js non chargé');
    window._supa = supabase.createClient(SUPA_URL, SUPA_ANON);
    // Alias pratique
    window.sb = window._supa;
    console.info('[NutriDoc] Supabase initialisé ✓');
  } catch (e) {
    console.error('[NutriDoc] Erreur init Supabase:', e);
  }
})();
