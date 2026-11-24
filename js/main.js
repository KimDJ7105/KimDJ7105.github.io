document.documentElement.classList.add('js');

var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// 앵커 클릭 스크롤 — 표지(#top)는 position:sticky라 브라우저 기본 앵커 이동이
// 가끔 어긋나서, 직접 scrollTo로 처리. 나머지는 scrollIntoView로 통일.
document.querySelectorAll('a[href^="#"]').forEach(function (link) {
  var id = link.getAttribute('href').slice(1);
  if (!id) return;
  var target = document.getElementById(id);
  if (!target) return;

  link.addEventListener('click', function (e) {
    e.preventDefault();
    var behavior = reduceMotion ? 'auto' : 'smooth';
    if (id === 'top') {
      window.scrollTo({ top: 0, left: 0, behavior: behavior });
    } else {
      target.scrollIntoView({ behavior: behavior, block: 'start' });
    }
    history.pushState(null, '', '#' + id);
  });
});

if (!reduceMotion && 'IntersectionObserver' in window) {
  document.querySelectorAll('.page:not(.page--cover)').forEach(function (el) {
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

// 유튜브 썸네일 클릭 시 그 자리에서 바로 재생
document.querySelectorAll('.video__thumb').forEach(function (thumb) {
  thumb.addEventListener('click', function (e) {
    e.preventDefault();
    var id = thumb.getAttribute('data-yt-id');
    var iframe = document.createElement('iframe');
    iframe.className = 'video__iframe';
    iframe.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1';
    iframe.title = thumb.querySelector('img').alt;
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.loading = 'lazy';
    thumb.replaceWith(iframe);
  });
});

// GeoIP 타일 동기화 3안 비교 데모 (모달)
(function () {
  var dialog = document.getElementById('tile-sync-demo');
  if (!dialog) return;

  var openBtn = document.querySelector('[data-dialog="tile-sync-demo"]');
  var closeBtn = dialog.querySelector('.demo-dialog__close');
  var usersInput = dialog.querySelector('#demo-users');
  var changesInput = dialog.querySelector('#demo-changes');
  var GRID = 11250;

  function setBar(key, value, max, labelText) {
    var el = dialog.querySelector('[data-bar="' + key + '"]');
    if (!el) return;
    var pct = Math.min(100, (value / max) * 100);
    if (value > 0) pct = Math.max(pct, 3); // 값이 있으면 눈에 보이는 최소 너비 보장
    el.style.width = pct + '%';
    el.textContent = labelText;
  }

  function render() {
    var users = Number(usersInput.value);
    var changes = Number(changesInput.value);
    dialog.querySelector('[data-out="users"]').textContent = users;
    dialog.querySelector('[data-out="changes"]').textContent = changes;

    var mem1 = users * changes;
    var mem2 = GRID;
    var mem3 = changes;
    var memMax = Math.max(mem1, mem2, mem3, 1);

    var scan1 = users * changes;
    var scan2 = GRID;
    var scan3 = changes;
    var scanMax = Math.max(scan1, scan2, scan3, 1);

    setBar('mem-1', mem1, memMax, '약 ' + mem1.toLocaleString() + '칸');
    setBar('mem-2', mem2, memMax, mem2.toLocaleString() + '칸');
    setBar('mem-3', mem3, memMax, mem3.toLocaleString() + '칸');

    setBar('scan-1', scan1, scanMax, '약 ' + scan1.toLocaleString() + '회');
    setBar('scan-2', scan2, scanMax, scan2.toLocaleString() + '칸 전체 스캔');
    setBar('scan-3', scan3, scanMax, scan3.toLocaleString() + '건');
  }

  if (openBtn) {
    openBtn.addEventListener('click', function () {
      render();
      dialog.showModal();
    });
  }
  if (closeBtn) {
    closeBtn.addEventListener('click', function () { dialog.close(); });
  }
  dialog.addEventListener('click', function (e) {
    if (e.target === dialog) dialog.close();
  });
  usersInput.addEventListener('input', render);
  changesInput.addEventListener('input', render);
})();

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
