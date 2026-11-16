document.documentElement.classList.add('js');

var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!reduceMotion && 'IntersectionObserver' in window) {
  document.querySelectorAll('.page').forEach(function (el) {
    el.classList.add('reveal');
  });

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.reveal').forEach(function (el) {
    observer.observe(el);
  });
}

// 상단 네비 현재 위치 강조 (scrollspy)
(function () {
  var navLinks = document.querySelectorAll('.site-nav__links a');
  if (!navLinks.length || !('IntersectionObserver' in window)) return;

  var sections = Array.prototype.map.call(navLinks, function (link) {
    var id = link.getAttribute('href').slice(1);
    return document.getElementById(id);
  }).filter(Boolean);

  var spy = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var link = document.querySelector('.site-nav__links a[href="#' + entry.target.id + '"]');
      if (!link) return;
      if (entry.isIntersecting) {
        navLinks.forEach(function (l) { l.classList.remove('is-active'); });
        link.classList.add('is-active');
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });

  sections.forEach(function (s) { spy.observe(s); });
})();
