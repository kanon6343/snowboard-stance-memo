// Theme preferences are isolated from memo data, import/export and other app versions.
(() => {
  const prefix = location.pathname.includes('/dev-haru-detail/') ? 'haru-detail:'
    : location.pathname.includes('/dev-haru/') ? 'haru:'
    : location.pathname.includes('/dev/') || ['localhost', '127.0.0.1'].includes(location.hostname) ? 'dev:' : 'prod:';
  const key = `${prefix}color-theme-v1`;
  const valid = value => ['light', 'dark', 'auto'].includes(value);
  let preference = 'light';
  try {
    const saved = localStorage.getItem(key);
    if (valid(saved)) preference = saved;
  } catch { /* Theme selection still works if browser storage is unavailable. */ }
  const media = window.matchMedia?.('(prefers-color-scheme: dark)');
  const apply = () => {
    document.documentElement.dataset.theme = preference === 'auto'
      ? media?.matches ? 'dark' : 'light' : preference;
  };
  apply();
  media?.addEventListener?.('change', () => {
    if (preference === 'auto') apply();
  });
  document.addEventListener('DOMContentLoaded', () => {
    const select = document.getElementById('colorTheme');
    if (!select) return;
    select.value = preference;
    select.addEventListener('change', () => {
      if (!valid(select.value)) return;
      preference = select.value;
      apply();
      try {
        localStorage.setItem(key, preference);
      } catch {
        const status = document.getElementById('themeStatus');
        if (status) status.textContent = '表示は切り替えましたが、このブラウザーには設定を保存できません。';
      }
    });
  }, {once: true});
})();
