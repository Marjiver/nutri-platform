(function() {
  window.addEventListener('load', function() {
    setTimeout(function() {
      const timing = performance.timing;
      if(timing) console.log('[Performance] Page chargée en ' + (timing.loadEventEnd - timing.navigationStart) + 'ms');
    }, 0);
  });
})();
