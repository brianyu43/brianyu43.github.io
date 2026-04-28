// 다크/라이트 모드 토글
(function () {
  const KEY = 'comarchi-theme';
  const saved = localStorage.getItem(KEY);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initial = saved || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', initial);

  function setupToggle() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    const update = () => {
      const cur = document.documentElement.getAttribute('data-theme');
      btn.textContent = cur === 'dark' ? '☀️ 라이트' : '🌙 다크';
    };
    update();
    btn.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme');
      const next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem(KEY, next);
      update();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupToggle);
  } else {
    setupToggle();
  }
})();
