// PMPP 단권화 Tweaks

(function () {
  const body = document.body;

  // persisted defaults
  const defaults = /*EDITMODE-BEGIN*/{
    "theme": "light",
    "tint": "default",
    "density": "normal",
    "cols": "3"
  }/*EDITMODE-END*/;

  const state = Object.assign({}, defaults);

  function apply() {
    body.dataset.theme   = state.theme;
    body.dataset.tint    = state.tint;
    body.dataset.density = state.density;
    body.dataset.cols    = state.cols;
    // reflect button active states
    document.querySelectorAll('#tweaks-panel .seg').forEach(seg => {
      const key = seg.dataset.key;
      seg.querySelectorAll('button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === state[key]);
      });
    });
  }

  function setKey(key, value) {
    state[key] = value;
    apply();
    try {
      window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [key]: value } }, '*');
    } catch (e) {}
  }

  // Build panel
  function buildPanel() {
    const panel = document.createElement('div');
    panel.id = 'tweaks-panel';
    panel.innerHTML = `
      <h5>Tweaks <span class="dot">●</span></h5>
      <div class="row">
        <label>테마</label>
        <div class="seg" data-key="theme">
          <button data-value="light">Light</button>
          <button data-value="dark">Dark</button>
        </div>
      </div>
      <div class="row">
        <label>색상 강도</label>
        <div class="seg" data-key="tint">
          <button data-value="soft">Soft</button>
          <button data-value="default">Default</button>
          <button data-value="strong">Strong</button>
        </div>
      </div>
      <div class="row">
        <label>밀도 (글자 크기)</label>
        <div class="seg" data-key="density">
          <button data-value="tight">Tight</button>
          <button data-value="normal">Normal</button>
          <button data-value="loose">Loose</button>
        </div>
      </div>
      <div class="row">
        <label>컬럼 수</label>
        <div class="seg" data-key="cols">
          <button data-value="2">2</button>
          <button data-value="3">3</button>
          <button data-value="4">4</button>
        </div>
      </div>
      <div class="row" style="margin-top:10px; border-top:1px solid #333; padding-top:8px; font-size:10px; color:#888;">
        Ctrl/⌘+P → A4 가로 / 여백 없음 / 배경 그래픽 포함
      </div>
    `;
    document.body.appendChild(panel);

    panel.querySelectorAll('.seg button').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.parentElement.dataset.key;
        setKey(key, btn.dataset.value);
      });
    });
  }

  // Edit mode protocol
  window.addEventListener('message', (e) => {
    const d = e.data || {};
    if (d.type === '__activate_edit_mode') {
      document.getElementById('tweaks-panel')?.classList.add('on');
    } else if (d.type === '__deactivate_edit_mode') {
      document.getElementById('tweaks-panel')?.classList.remove('on');
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    buildPanel();
    apply();
    try {
      window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    } catch (e) {}
  });
})();
