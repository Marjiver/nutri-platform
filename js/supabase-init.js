(function () {
  var SUPA_URL  = 'https://phgjpwaptrrjonoimmne.supabase.co';
  var SUPA_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoZ2pwd2FwdHJyam9ub2ltbW5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NTUxOTgsImV4cCI6MjA5MDEzMTE5OH0.jFqP_7-i7YEfs5KA8ge58AUTdg-gblelrlSaQ0s-ApY';
  try {
    if (typeof supabase === 'undefined') throw new Error('supabase-js non charge');
    window._supa = supabase.createClient(SUPA_URL, SUPA_ANON);
    window.sb = window._supa;
    console.info('[NutriDoc] Supabase OK');
  } catch (e) {
    console.error('[NutriDoc] Erreur Supabase:', e);
  }
})();
