// cudatraining language switcher (ko <-> en)
// Wraps any content carrying `data-lang="ko"` or `data-lang="en"`.
// Persists selection via localStorage and syncs URL hash (#en / #ko).
(function initLangSwitch() {
  const btns = document.querySelectorAll('[data-switch]');
  if (!btns.length) return;
  const apply = (lang) => {
    document.documentElement.lang = lang === 'en' ? 'en' : 'ko';
    document.querySelectorAll('[data-lang]').forEach((el) => {
      el.hidden = el.dataset.lang !== lang;
    });
    btns.forEach((b) => {
      const active = b.dataset.switch === lang;
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', String(active));
    });
    try { localStorage.setItem('cudatraining-lang', lang); } catch (e) {}
    const hash = lang === 'en' ? '#en' : '';
    history.replaceState(null, '', location.pathname + location.search + hash);
  };
  btns.forEach((b) => b.addEventListener('click', () => apply(b.dataset.switch)));
  const hashLang =
    location.hash === '#en' ? 'en' :
    location.hash === '#ko' ? 'ko' : null;
  let saved = null;
  try { saved = localStorage.getItem('cudatraining-lang'); } catch (e) {}
  apply(hashLang || saved || 'ko');
})();
