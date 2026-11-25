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
    var fill = dialog.querySelector('[data-bar="' + key + '"]');
    var valueEl = dialog.querySelector('[data-val="' + key + '"]');
    if (!fill || !valueEl) return;
    var pct = Math.min(100, (value / max) * 100);
    if (value > 0) pct = Math.max(pct, 3); // 값이 있으면 눈에 보이는 최소 너비 보장
    fill.style.width = pct + '%';
    valueEl.textContent = labelText;
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

// Truss LLM 출력 검증 파이프라인 흐름 데모 (모달)
(function () {
  var dialog = document.getElementById('truss-pipeline-demo');
  if (!dialog) return;

  var openBtn = document.querySelector('[data-dialog="truss-pipeline-demo"]');
  var closeBtn = dialog.querySelector('.demo-dialog__close');
  var canvas = dialog.querySelector('#pipeline-canvas');
  var serverNode = dialog.querySelector('#pipeline-server');

  var inputNode = dialog.querySelector('#pipeline-input');
  var llmNode = dialog.querySelector('#pipeline-llm');
  var stage1Node = dialog.querySelector('#pipeline-stage-1');
  var stage2Node = dialog.querySelector('#pipeline-stage-2');
  var stage3Node = dialog.querySelector('#pipeline-stage-3');
  var stage4Node = dialog.querySelector('#pipeline-stage-4');

  var START_X = 7;
  var END_X = 94;
  var SPEED = 0.3; // % / frame
  var SPAWN_INTERVAL = 2500;

  // 정상 매수 → 정상 매도 → 비정상 4종(항목검사·항목검사·호출실패·서버검증)을 고정 순서로 반복
  // 실제 출력 스키마(market/side/price/quantity)와 동일한 필드로 구성
  var SCRIPT = [
    { market: 'BTC', side: 'BUY', price: 83000000, quantity: 0.05, invalidKind: 'none' },
    { market: 'ETH', side: 'SELL', price: 4500000, quantity: 1.2, invalidKind: 'none' },
    { market: 'XRP', side: 'HOLD', price: 900, quantity: 500, invalidKind: 'enum' },
    { market: 'BTC', side: 'SELL', price: -500, quantity: 0.1, invalidKind: 'price' },
    { market: 'ETH', side: 'BUY', price: 4300000, quantity: 0.8, invalidKind: 'callfail' },
    { market: 'FAKE', side: 'BUY', price: 1200000, quantity: 3, invalidKind: 'fakecode' }
  ];
  var scriptIndex = 0;

  function updateLabel(p) {
    p.el.textContent = p.market + ' ' + p.side + ' ' + p.price.toLocaleString() + '원 · ' + p.quantity + '개';
  }

  function highlightNode(nodeEl, p) {
    if (!nodeEl) return;
    var cls = p.invalidKind === 'none' ? 'is-hit-pass' : 'is-hit-fail';
    nodeEl.classList.add(cls);
    setTimeout(function () { nodeEl.classList.remove(cls); }, 700);
  }

  // 입력({market, prices[]})이 LLM을 거쳐 결정(JSON)으로 바뀌는 지점.
  function handleLlm(p) {
    p.el.classList.add('is-decision');
    updateLabel(p);
    return false;
  }

  function handleStage1(p) {
    if (p.invalidKind === 'enum' || p.invalidKind === 'price') {
      dropParticle(p, p.invalidKind === 'enum' ? 'side 오류' : '가격 오류');
      return true;
    }
    return false;
  }

  function handleStage2(p) {
    if (p.invalidKind === 'callfail') {
      dropParticle(p, '호출 타임아웃');
      return true;
    }
    return false;
  }

  function handleStage3(p) {
    // 필터링 없음 — 호가 단위로 가격만 스냅해서 변환을 눈으로 보여준다
    p.price = Math.round(p.price / 1000) * 1000;
    updateLabel(p);
    return false;
  }

  function handleStage4(p) {
    if (p.invalidKind === 'fakecode') {
      dropParticle(p, '마켓코드 오류');
      return true;
    }
    return false;
  }

  var CHECKPOINTS = [
    { x: 20, node: llmNode, handle: handleLlm },
    { x: 33, node: stage1Node, handle: handleStage1 },
    { x: 49, node: stage2Node, handle: handleStage2 },
    { x: 65, node: stage3Node, handle: handleStage3 },
    { x: 81, node: stage4Node, handle: handleStage4 }
  ];

  var particles = [];
  var rafId = null;
  var spawnTimer = null;

  function spawnParticle() {
    var data = SCRIPT[scriptIndex % SCRIPT.length];
    scriptIndex++;

    var el = document.createElement('div');
    el.className = 'pipeline-particle';
    el.style.left = START_X + '%';
    el.textContent = '요청';
    canvas.appendChild(el);

    var p = {
      el: el,
      x: START_X,
      nextCheckpoint: 0,
      state: 'moving',
      market: data.market,
      side: data.side,
      price: data.price,
      quantity: data.quantity,
      invalidKind: data.invalidKind
    };
    particles.push(p);
    highlightNode(inputNode, p);
  }

  function dropParticle(p, reasonText) {
    p.state = 'falling';
    p.el.classList.add('is-drop');
    p.el.textContent = reasonText;
    p.el.style.top = '96%';
    p.el.style.opacity = '0';
    setTimeout(function () {
      p.el.remove();
      p.state = 'removed';
    }, 2300);
  }

  function arriveParticle(p) {
    p.state = 'removed';
    p.el.remove();
    highlightNode(serverNode, p);
  }

  function step() {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      if (p.state !== 'moving') continue;

      p.x += SPEED;
      var cp = CHECKPOINTS[p.nextCheckpoint];
      if (cp && p.x >= cp.x) {
        p.nextCheckpoint++;
        highlightNode(cp.node, p);
        if (cp.handle(p)) continue;
      }
      if (p.x >= END_X) {
        arriveParticle(p);
        continue;
      }
      p.el.style.left = p.x + '%';
    }
    particles = particles.filter(function (p) { return p.state !== 'removed'; });
    rafId = requestAnimationFrame(step);
  }

  function start() {
    if (rafId) return;
    scriptIndex = 0;
    spawnParticle();
    spawnTimer = setInterval(spawnParticle, SPAWN_INTERVAL);
    rafId = requestAnimationFrame(step);
  }

  function stop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    clearInterval(spawnTimer);
    particles.forEach(function (p) { p.el.remove(); });
    particles = [];
  }

  if (openBtn) {
    openBtn.addEventListener('click', function () {
      if (dialog.open) return;
      dialog.showModal();
      start();
    });
  }
  if (closeBtn) closeBtn.addEventListener('click', function () { dialog.close(); });
  dialog.addEventListener('click', function (e) {
    if (e.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', stop);
})();

// 증강 오목 Pod 장애·재접속 흐름 데모 (모달)
(function () {
  var dialog = document.getElementById('pod-failover-demo');
  if (!dialog) return;

  var openBtn = document.querySelector('[data-dialog="pod-failover-demo"]');
  var closeBtn = dialog.querySelector('.demo-dialog__close');
  var canvas = dialog.querySelector('#pod-canvas');
  var redisEl = dialog.querySelector('#pod-redis');

  var PODS_PER_CYCLE_MS = 7000;
  var USERS_PER_POD = 2;
  var SLOT_W = 58, SLOT_H = 34, SLOT_GAP = 6, SLOT_COLS = 3;
  var SLOT_START_X = 8, SLOT_START_Y = 34;

  var podEls = [0, 1, 2, 3].map(function (i) { return dialog.querySelector('#pod-box-' + i); });
  var pods = []; // { el, users: [chipId,...] }
  var chips = {}; // id -> { el, podIndex }
  var downTimer = null;
  var rrPointer = 0;
  var downIndex = 0;
  var nextChipId = 1;

  function slotPos(podIndex, slotIndex) {
    var pod = podEls[podIndex];
    var col = slotIndex % SLOT_COLS;
    var row = Math.floor(slotIndex / SLOT_COLS);
    return {
      x: pod.offsetLeft + SLOT_START_X + col * (SLOT_W + SLOT_GAP),
      y: pod.offsetTop + SLOT_START_Y + row * (SLOT_H + SLOT_GAP)
    };
  }

  function placeChip(chipId, podIndex, slotIndex) {
    var pos = slotPos(podIndex, slotIndex);
    var chip = chips[chipId];
    chip.el.style.left = pos.x + 'px';
    chip.el.style.top = pos.y + 'px';
  }

  function createChip(podIndex, slotIndex) {
    var id = nextChipId++;
    var el = document.createElement('div');
    el.className = 'pod-user';
    el.textContent = 'U' + id;
    canvas.appendChild(el);
    chips[id] = { el: el, podIndex: podIndex };
    pods[podIndex].users.push(id);
    placeChip(id, podIndex, slotIndex);
    return id;
  }

  function highlightPod(podIndex) {
    var el = podEls[podIndex];
    el.classList.add('is-hit');
    setTimeout(function () { el.classList.remove('is-hit'); }, 700);
  }

  function flashRedis() {
    redisEl.classList.add('is-active');
    setTimeout(function () { redisEl.classList.remove('is-active'); }, 700);
  }

  // 살아있는 Pod 중 현재 유저가 가장 적은 곳으로 보낸다(로드밸런싱). 동률이면 번갈아가며 분산.
  function pickLeastLoadedPod(excludeIndex) {
    var candidates = [0, 1, 2, 3].filter(function (i) { return i !== excludeIndex; });
    candidates.sort(function (a, b) {
      var diff = pods[a].users.length - pods[b].users.length;
      if (diff !== 0) return diff;
      return ((rrPointer + a) % 4) - ((rrPointer + b) % 4);
    });
    rrPointer++;
    return candidates[0];
  }

  function init() {
    pods = [0, 1, 2, 3].map(function (_, i) { return { el: podEls[i], users: [] }; });
    canvas.querySelectorAll('.pod-user').forEach(function (el) { el.remove(); });
    chips = {};
    nextChipId = 1;
    rrPointer = 0;
    downIndex = 0;
    podEls.forEach(function (el) {
      el.classList.remove('is-down', 'is-hit');
      el.querySelector('.pod-box__status').textContent = '정상';
    });
    for (var p = 0; p < 4; p++) {
      for (var s = 0; s < USERS_PER_POD; s++) createChip(p, s);
    }
  }

  function triggerDown() {
    var podIndex = downIndex;
    downIndex = (downIndex + 1) % 4;

    var pod = pods[podIndex];
    var podEl = podEls[podIndex];
    podEl.classList.add('is-down');
    podEl.querySelector('.pod-box__status').textContent = 'DOWN';

    var migrating = pod.users.slice();
    pod.users = [];
    flashRedis();

    var redisCenter = {
      x: redisEl.offsetLeft + redisEl.offsetWidth / 2 - 25,
      y: redisEl.offsetTop + redisEl.offsetHeight / 2 - 16
    };

    migrating.forEach(function (chipId, i) {
      var chip = chips[chipId];
      chip.el.style.left = redisCenter.x + 'px';
      chip.el.style.top = redisCenter.y + 'px';

      setTimeout(function () {
        var destIndex = pickLeastLoadedPod(podIndex);
        var destSlot = pods[destIndex].users.length;
        pods[destIndex].users.push(chipId);
        chip.podIndex = destIndex;
        placeChip(chipId, destIndex, destSlot);
        highlightPod(destIndex);
      }, 550 + i * 160);
    });

    setTimeout(function () {
      podEl.classList.remove('is-down');
      podEl.querySelector('.pod-box__status').textContent = '정상';
    }, 550 + migrating.length * 160 + 900);
  }

  function scheduleNextDown(delay) {
    downTimer = setTimeout(function () {
      triggerDown();
      scheduleNextDown(PODS_PER_CYCLE_MS);
    }, delay);
  }

  function start() {
    if (downTimer) return;
    init();
    scheduleNextDown(2200); // 첫 장애 발생까지 대기 시간 단축(이후 주기는 PODS_PER_CYCLE_MS 유지)
  }

  function stop() {
    clearTimeout(downTimer);
    downTimer = null;
    canvas.querySelectorAll('.pod-user').forEach(function (el) { el.remove(); });
    podEls.forEach(function (el) {
      el.classList.remove('is-down', 'is-hit');
    });
  }

  if (openBtn) {
    openBtn.addEventListener('click', function () {
      if (dialog.open) return;
      dialog.showModal();
      start();
    });
  }
  if (closeBtn) closeBtn.addEventListener('click', function () { dialog.close(); });
  dialog.addEventListener('click', function (e) {
    if (e.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', stop);
})();

// Re:Walk 스레드·Room 모델 변경 전·후 비교 데모 (모달)
(function () {
  var dialog = document.getElementById('thread-model-demo');
  if (!dialog) return;

  var openBtn = document.querySelector('[data-dialog="thread-model-demo"]');
  var closeBtn = dialog.querySelector('.demo-dialog__close');
  var canvas = dialog.querySelector('#thread-canvas');
  var modeButtons = dialog.querySelectorAll('.mode-toggle__btn');

  var TRAVEL_MS = 600;
  var ACCESS_MS = 500;
  var WAIT_MS = 750;
  var OWNED = [[0, 1], [2, 3], [4, 5]]; // Thread N이 "변경 후"에 전담하는 Room 인덱스 — 레이아웃상 같은 행(行)과 일치

  var threadEls = [0, 1, 2].map(function (i) { return dialog.querySelector('#thread-box-' + i); });
  var threadSubEls = [0, 1, 2].map(function (i) { return dialog.querySelector('#thread-sub-' + i); });
  var roomEls = [0, 1, 2, 3, 4, 5].map(function (i) { return dialog.querySelector('#room-box-' + i); });
  var roomSubEls = [0, 1, 2, 3, 4, 5].map(function (i) { return dialog.querySelector('#room-sub-' + i); });

  var mode = 'before';
  var roomBusy = [false, false, false, false, false, false];
  var timers = [];

  function ownerOf(roomIndex) {
    for (var t = 0; t < OWNED.length; t++) {
      if (OWNED[t].indexOf(roomIndex) !== -1) return t;
    }
    return -1;
  }

  function updateLabels() {
    threadSubEls.forEach(function (el, i) {
      el.textContent = mode === 'before'
        ? '모든 Room 접근 가능'
        : ('Room ' + OWNED[i].map(function (r) { return r + 1; }).join('·') + ' 전담');
    });
    roomSubEls.forEach(function (el, r) {
      el.textContent = mode === 'before' ? '공유 자원' : ('Thread ' + (ownerOf(r) + 1) + ' 전담');
    });
  }

  function highlightBox(el, isPass) {
    var cls = isPass ? 'is-hit-pass' : 'is-hit-fail';
    el.classList.add(cls);
    setTimeout(function () { el.classList.remove(cls); }, 700);
  }

  function threadAccess(threadIndex) {
    var pool = mode === 'before' ? [0, 1, 2, 3, 4, 5] : OWNED[threadIndex];
    var roomIndex = pool[Math.floor(Math.random() * pool.length)];
    var threadEl = threadEls[threadIndex];
    var roomEl = roomEls[roomIndex];

    var pulse = document.createElement('div');
    pulse.className = 'thread-pulse';
    pulse.textContent = 'T' + (threadIndex + 1);
    pulse.style.left = (threadEl.offsetLeft + threadEl.offsetWidth - 10) + 'px';
    pulse.style.top = (threadEl.offsetTop + threadEl.offsetHeight / 2 - 10) + 'px';
    canvas.appendChild(pulse);

    var targetX = roomEl.offsetLeft + roomEl.offsetWidth / 2 - 20;
    var targetY = roomEl.offsetTop + roomEl.offsetHeight / 2 - 10;
    requestAnimationFrame(function () {
      pulse.style.left = targetX + 'px';
      pulse.style.top = targetY + 'px';
    });

    setTimeout(function () {
      function proceed() {
        roomBusy[roomIndex] = true;
        pulse.classList.remove('is-wait');
        pulse.textContent = 'T' + (threadIndex + 1);
        highlightBox(roomEl, true);
        highlightBox(threadEl, true);
        setTimeout(function () {
          roomBusy[roomIndex] = false;
          pulse.remove();
        }, ACCESS_MS);
      }

      if (roomBusy[roomIndex]) {
        pulse.classList.add('is-wait');
        pulse.textContent = 'T' + (threadIndex + 1) + ' 대기';
        highlightBox(roomEl, false);
        highlightBox(threadEl, false);
        setTimeout(proceed, WAIT_MS);
      } else {
        proceed();
      }
    }, TRAVEL_MS);
  }

  function start() {
    if (timers.length) return;
    mode = 'before';
    modeButtons.forEach(function (b) { b.classList.toggle('is-active', b.dataset.mode === 'before'); });
    roomBusy = [false, false, false, false, false, false];
    updateLabels();
    timers = [0, 1, 2].map(function (i) {
      return setInterval(function () { threadAccess(i); }, 1500 + i * 300);
    });
  }

  function stop() {
    timers.forEach(function (t) { clearInterval(t); });
    timers = [];
    canvas.querySelectorAll('.thread-pulse').forEach(function (el) { el.remove(); });
    threadEls.forEach(function (el) { el.classList.remove('is-hit-pass', 'is-hit-fail'); });
    roomEls.forEach(function (el) { el.classList.remove('is-hit-pass', 'is-hit-fail'); });
    roomBusy = [false, false, false, false, false, false];
  }

  modeButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      mode = btn.dataset.mode;
      modeButtons.forEach(function (b) { b.classList.toggle('is-active', b === btn); });
      updateLabels();
    });
  });

  if (openBtn) {
    openBtn.addEventListener('click', function () {
      if (dialog.open) return;
      dialog.showModal();
      start();
    });
  }
  if (closeBtn) closeBtn.addEventListener('click', function () { dialog.close(); });
  dialog.addEventListener('click', function (e) {
    if (e.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', stop);
})();

// Re:Walk Session 생명주기 vs 콜백 실행 시점 타임라인 데모 (모달)
(function () {
  var dialog = document.getElementById('lifecycle-demo');
  if (!dialog) return;

  var openBtn = document.querySelector('[data-dialog="lifecycle-demo"]');
  var closeBtn = dialog.querySelector('.demo-dialog__close');
  var modeButtons = dialog.querySelectorAll('.mode-toggle__btn');
  var bar = dialog.querySelector('#lifecycle-bar');
  var barExt = dialog.querySelector('#lifecycle-bar-ext');
  var playhead = dialog.querySelector('#lifecycle-playhead');
  var markerLogout = dialog.querySelector('#lifecycle-marker-logout');
  var markerCallback = dialog.querySelector('#lifecycle-marker-callback');
  var resultEl = dialog.querySelector('#lifecycle-result');
  var extLabel = dialog.querySelector('#lifecycle-ext-label');

  var LOOP_MS = 4500;
  var LOGOUT_PCT = 36;
  var CALLBACK_PCT = 62;
  var AFTER_END_PCT = 70; // 콜백이 shared_ptr을 쥐고 있어 실제 소멸이 콜백 완료 직후로 늦춰짐

  var mode = 'before';
  var rafId = null;
  var startTs = null;
  var prevProgress = 0;
  var loggedOutFired = false;
  var callbackFired = false;

  resultEl.style.left = CALLBACK_PCT + '%';

  function resetCycleFlags() {
    loggedOutFired = false;
    callbackFired = false;
    markerLogout.classList.remove('is-pass', 'is-fail');
    markerCallback.classList.remove('is-pass', 'is-fail');
    resultEl.classList.remove('is-pass', 'is-fail');
    resultEl.textContent = '';
  }

  function frame(ts) {
    if (startTs === null) startTs = ts;
    var elapsed = (ts - startTs) % LOOP_MS;
    var progress = elapsed / LOOP_MS;

    if (progress < prevProgress) resetCycleFlags();
    prevProgress = progress;

    var barEndFrac = (mode === 'before' ? LOGOUT_PCT : AFTER_END_PCT) / 100;
    var aliveFrac = Math.min(progress, barEndFrac);
    bar.style.width = (aliveFrac * 100) + '%';

    if (mode === 'after' && progress > LOGOUT_PCT / 100) {
      var extFrac = Math.min(progress, AFTER_END_PCT / 100);
      barExt.style.left = LOGOUT_PCT + '%';
      barExt.style.width = Math.max(0, (extFrac * 100) - LOGOUT_PCT) + '%';
      extLabel.classList.add('is-shown');
    } else {
      barExt.style.width = '0%';
      extLabel.classList.remove('is-shown');
    }

    playhead.style.left = (progress * 100) + '%';

    if (!loggedOutFired && progress * 100 >= LOGOUT_PCT) {
      loggedOutFired = true;
      markerLogout.classList.add('is-pass');
    }

    if (!callbackFired && progress * 100 >= CALLBACK_PCT) {
      callbackFired = true;
      var safe = mode === 'after';
      markerCallback.classList.add(safe ? 'is-pass' : 'is-fail');
      resultEl.classList.add(safe ? 'is-pass' : 'is-fail');
      resultEl.textContent = safe ? '정상 접근 — 콜백이 shared_ptr로 수명 연장' : 'Access Violation — 이미 소멸된 Session 참조';
    }

    rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (rafId) return;
    startTs = null;
    prevProgress = 0;
    resetCycleFlags();
    rafId = requestAnimationFrame(frame);
  }

  function stop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  modeButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      mode = btn.dataset.mode;
      modeButtons.forEach(function (b) { b.classList.toggle('is-active', b === btn); });
    });
  });

  if (openBtn) {
    openBtn.addEventListener('click', function () {
      if (dialog.open) return;
      mode = 'before';
      modeButtons.forEach(function (b) { b.classList.toggle('is-active', b.dataset.mode === 'before'); });
      dialog.showModal();
      start();
    });
  }
  if (closeBtn) closeBtn.addEventListener('click', function () { dialog.close(); });
  dialog.addEventListener('click', function (e) {
    if (e.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', stop);
})();

// 살인의 추억 Job Queue 유무 비교 데모 (모달)
(function () {
  var dialog = document.getElementById('jobqueue-demo');
  if (!dialog) return;

  var openBtn = document.querySelector('[data-dialog="jobqueue-demo"]');
  var closeBtn = dialog.querySelector('.demo-dialog__close');
  var modeButtons = dialog.querySelectorAll('.mode-toggle__btn');
  var canvas = dialog.querySelector('#jobqueue-canvas');
  var queueBox = dialog.querySelector('#jq-queue-box');
  var queueSub = queueBox.querySelector('.jq-box__sub');
  var ollamaBox = dialog.querySelector('#jq-ollama-box');
  var doneBox = dialog.querySelector('#jq-done-box');
  var doneCountEl = dialog.querySelector('#jq-done-count');
  var spawnLabel = dialog.querySelector('#jq-spawn-label');
  var timerEl = dialog.querySelector('#jq-timer');

  var BATCH_N = 4;
  var PROCESS_MS = 900;
  var TRAVEL_MS = 500;
  var GAP_AFTER_BATCH_MS = 2400;

  var mode = 'direct';
  var running = false;
  var pendingTimers = [];
  var chipEls = [];

  function schedule(fn, ms) {
    var id = setTimeout(function () {
      pendingTimers = pendingTimers.filter(function (t) { return t !== id; });
      fn();
    }, ms);
    pendingTimers.push(id);
    return id;
  }

  function clearPendingTimers() {
    pendingTimers.forEach(function (id) { clearTimeout(id); });
    pendingTimers = [];
  }

  function rectOf(el) {
    return { left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight };
  }

  function setChipPos(chip, x, y) {
    chip.style.left = x + 'px';
    chip.style.top = y + 'px';
  }

  function spawnPos() {
    var r = rectOf(spawnLabel);
    return { x: r.left + r.width / 2 - 17, y: r.top + r.height / 2 - 10 };
  }

  function queueSlotPos(i) {
    var r = rectOf(queueBox);
    return { x: r.left + r.width / 2 - 17, y: r.top + 32 + i * 20 };
  }

  function directWaitSlotPos(i) {
    var r = rectOf(ollamaBox);
    return { x: r.left - 44, y: r.top + 32 + i * 20 };
  }

  function ollamaSlotPos() {
    var r = rectOf(ollamaBox);
    return { x: r.left + r.width / 2 - 17, y: r.top + r.height / 2 - 10 };
  }

  function doneSlotPos(i) {
    var r = rectOf(doneBox);
    return { x: r.left + r.width / 2 - 17, y: r.top + 32 + i * 20 };
  }

  function updateQueueBoxLabel() {
    queueBox.classList.toggle('is-unused', mode === 'direct');
    queueSub.textContent = mode === 'direct' ? '사용 안 함' : '대기 중';
  }

  function runBatch() {
    // 이전 배치 칩 정리
    chipEls.forEach(function (c) { c.remove(); });
    chipEls = [];
    doneCountEl.textContent = '0';
    timerEl.textContent = '배치 진행 중...';

    var startTs = performance.now();
    var sp = spawnPos();
    var chips = [];
    for (var i = 0; i < BATCH_N; i++) {
      var el = document.createElement('div');
      el.className = 'jq-chip';
      el.textContent = 'R' + (i + 1);
      setChipPos(el, sp.x, sp.y);
      canvas.appendChild(el);
      chipEls.push(el);
      chips.push({ el: el });
    }

    // 동시 제출 직후, 모드에 따라 대기 위치로 이동(대기 상태 시각화)
    schedule(function () {
      chips.forEach(function (chip, i) {
        var pos = mode === 'queue' ? queueSlotPos(i) : directWaitSlotPos(i);
        setChipPos(chip.el, pos.x, pos.y);
      });
    }, 30);

    var idx = 0;
    var doneCount = 0;

    function processNext() {
      if (idx >= chips.length) {
        var elapsed = ((performance.now() - startTs) / 1000).toFixed(1);
        timerEl.textContent = '배치 소요 시간: ' + elapsed + 's (Job Queue 유무 무관)';
        schedule(runBatch, GAP_AFTER_BATCH_MS);
        return;
      }
      var chip = chips[idx];
      var op = ollamaSlotPos();
      chip.el.classList.add('is-active');
      setChipPos(chip.el, op.x, op.y);

      schedule(function () {
        var dp = doneSlotPos(idx);
        setChipPos(chip.el, dp.x, dp.y);
        doneCount++;
        doneCountEl.textContent = String(doneCount);
        idx++;
        processNext();
      }, PROCESS_MS);
    }

    schedule(processNext, TRAVEL_MS);
  }

  function start() {
    if (running) return;
    running = true;
    mode = 'direct';
    modeButtons.forEach(function (b) { b.classList.toggle('is-active', b.dataset.mode === 'direct'); });
    updateQueueBoxLabel();
    runBatch();
  }

  function stop() {
    running = false;
    clearPendingTimers();
    chipEls.forEach(function (c) { c.remove(); });
    chipEls = [];
  }

  modeButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      mode = btn.dataset.mode;
      modeButtons.forEach(function (b) { b.classList.toggle('is-active', b === btn); });
      updateQueueBoxLabel();
    });
  });

  if (openBtn) {
    openBtn.addEventListener('click', function () {
      if (dialog.open) return;
      dialog.showModal();
      start();
    });
  }
  if (closeBtn) closeBtn.addEventListener('click', function () { dialog.close(); });
  dialog.addEventListener('click', function (e) {
    if (e.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', stop);
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
