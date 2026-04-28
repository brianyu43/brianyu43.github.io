// CSAPP 한글판 — 정적 사이트 스크립트 (file:// 호환)

(function () {
  // ===== 테마 토글 =====
  const root = document.documentElement;
  const stored = (function () { try { return localStorage.getItem('csapp-theme'); } catch (_) { return null; } })();
  if (stored === 'light' || stored === 'dark') root.setAttribute('data-theme', stored);

  function setTheme(t) {
    root.setAttribute('data-theme', t);
    try { localStorage.setItem('csapp-theme', t); } catch (_) {}
    const btn = document.querySelector('.theme-toggle');
    if (btn) btn.textContent = t === 'light' ? '🌙' : '☀️';
  }

  document.addEventListener('click', function (e) {
    const t = e.target.closest('.theme-toggle');
    if (!t) return;
    const cur = root.getAttribute('data-theme') || 'dark';
    setTheme(cur === 'light' ? 'dark' : 'light');
  });

  // 초기 아이콘 동기화
  document.addEventListener('DOMContentLoaded', function () {
    const btn = document.querySelector('.theme-toggle');
    if (btn) btn.textContent = (root.getAttribute('data-theme') === 'light') ? '🌙' : '☀️';

    // ===== 사이드바 활성 섹션 표시 (스크롤 스파이) =====
    const links = Array.from(document.querySelectorAll('.sidebar a[href^="#"]'));
    if (links.length === 0) return;

    const idToLink = new Map();
    links.forEach(a => {
      const id = decodeURIComponent(a.getAttribute('href').slice(1));
      idToLink.set(id, a);
    });

    const sections = links
      .map(a => document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1))))
      .filter(Boolean);

    function setActive(id) {
      links.forEach(a => a.classList.remove('active'));
      const a = idToLink.get(id);
      if (a) a.classList.add('active');
    }

    if ('IntersectionObserver' in window) {
      const obs = new IntersectionObserver(entries => {
        // 화면에 보이는 것 중 가장 위쪽 것 활성화
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      }, { rootMargin: '-80px 0px -65% 0px', threshold: 0 });
      sections.forEach(s => obs.observe(s));
    }

    // ===== 사이드바 검색 =====
    const search = document.querySelector('.search-box');
    if (search) {
      search.addEventListener('input', function () {
        const q = search.value.trim().toLowerCase();
        document.querySelectorAll('.sidebar li').forEach(li => {
          const text = (li.textContent || '').toLowerCase();
          li.style.display = (q === '' || text.includes(q)) ? '' : 'none';
        });
      });
    }

    // ===== 키보드 단축키: ←/→ 로 이전/다음 챕터 =====
    document.addEventListener('keydown', function (e) {
      if (e.target && /input|textarea/i.test(e.target.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowLeft') {
        const a = document.querySelector('.ch-footer a.prev');
        if (a) window.location.href = a.href;
      } else if (e.key === 'ArrowRight') {
        const a = document.querySelector('.ch-footer a.next');
        if (a) window.location.href = a.href;
      }
    });
  });
})();
