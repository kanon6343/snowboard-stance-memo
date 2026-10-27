(() => {
  const base = new URL('./', document.currentScript?.src || location.href);
  let promptEvent = null;
  let registration = null;
  let offlineReady = false;
  let applyingUpdate = false;
  let versionWorker = null;
  let waitingVersion = '';
  let waitingNotes = [];
  let displayedNotesKey = '';
  const normalizeReleaseInfo = data => {
    if (data?.type !== 'RELEASE_INFO' || typeof data.version !== 'string' || data.version.length > 24 || !/^\d+\.\d+\.\d+$/.test(data.version)) return null;
    const notes = Array.isArray(data.notes) ? data.notes.slice(0, 8).filter(value => typeof value === 'string').map(value => value.trim().slice(0, 240)).filter(Boolean) : [];
    return {version: data.version, notes};
  };
  let versionResolved = false;
  const installedQuery = window.matchMedia?.('(display-mode: standalone)');
  const installed = () => Boolean(installedQuery?.matches || navigator.standalone);
  const byId = id => document.getElementById(id);
  const status = (id, value) => { const el = byId(id); if (el) el.textContent = value; };
  const renderInstall = () => {
    const button = byId('installAppBtn');
    if (button) button.hidden = installed() || !promptEvent;
    status('installStatus', installed() ? 'アプリとして起動しています。'
      : promptEvent ? 'このブラウザーでインストールできます。'
      : 'ブラウザーのメニューから追加できます。下の手順を確認してください。');
  };
  const renderConnection = () => {
    status('offlineStatus', offlineReady
      ? navigator.onLine === false ? 'オフラインです。保存済みのアプリと、この端末の履歴を使えます。'
        : 'オフラインで開く準備ができました。'
      : navigator.onLine === false ? 'オフラインのため、初回の準備には通信が必要です。'
        : 'オフラインで開く準備を確認しています。');
  };
  const requestReleaseInfo = worker => new Promise(resolve => {
    if (typeof MessageChannel === 'undefined') { resolve(null); return; }
    let channel, timer, finished = false;
    const finish = value => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      channel?.port1.close(); channel?.port2.close();
      resolve(value);
    };
    try {
      channel = new MessageChannel();
      timer = setTimeout(() => finish(null), 2000);
      channel.port1.onmessage = event => {
        finish(normalizeReleaseInfo(event.data));
      };
      channel.port1.onmessageerror = () => finish(null);
      worker.postMessage({type: 'GET_RELEASE_INFO'}, [channel.port2]);
    } catch { finish(null); }
  });
  const renderPendingNotes = () => {
    const details = byId('pendingReleaseNotes'), list = byId('pendingReleaseNotesList');
    if (!details || !list) return;
    const key = JSON.stringify([waitingVersion, waitingNotes]);
    if (key !== displayedNotesKey) {
      displayedNotesKey = key; details.open = false; list.replaceChildren();
      for (const text of waitingNotes) { const li = document.createElement('li'); li.textContent = text; list.appendChild(li); }
    }
    details.hidden = waitingNotes.length === 0;
    status('pendingReleaseNotesVersion', waitingVersion ? 'v' + waitingVersion + ' の変更点' : '');
  };
  const renderUpdateVersion = () => {
    status('appUpdateTarget', waitingVersion ? `更新先：v${waitingVersion}`
      : versionResolved ? '更新先のバージョンを取得できませんでした。' : '更新先のバージョンを確認しています。');
    status('applyAppUpdateBtn', waitingVersion ? `v${waitingVersion} に更新する` : '入力を確認して更新する');
    renderPendingNotes();
  };
  const showUpdate = () => {
    const worker = registration?.waiting;
    const ready = byId('appUpdateReady');
    if (ready) ready.hidden = !worker;
    if (!worker) {
      versionWorker = null; waitingVersion = ''; waitingNotes = []; versionResolved = false;
      renderPendingNotes();
      status('appUpdateTarget', ''); status('applyAppUpdateBtn', '入力を確認して更新する');
      status('appUpdateStatus', ''); return;
    }
    status('appUpdateStatus', '更新できます。入力を保存してから切り替えてください。');
    if (versionWorker !== worker) {
      versionWorker = worker; waitingVersion = ''; waitingNotes = []; versionResolved = false;
      requestReleaseInfo(worker).then(info => {
        if (registration?.waiting !== worker || versionWorker !== worker) return;
        waitingVersion = info?.version || ''; waitingNotes = info?.notes || []; versionResolved = true; renderUpdateVersion();
      });
    }
    renderUpdateVersion();
  };
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault(); promptEvent = event; renderInstall();
  });
  window.addEventListener('appinstalled', () => {
    promptEvent = null; renderInstall(); status('installStatus', 'インストールしました。ホーム画面やアプリ一覧から開けます。');
  });
  installedQuery?.addEventListener?.('change', renderInstall);
  window.addEventListener('online', renderConnection);
  window.addEventListener('offline', renderConnection);
  byId('installAppBtn')?.addEventListener('click', async () => {
    if (!promptEvent) return;
    const event = promptEvent; promptEvent = null; renderInstall();
    try {
      await event.prompt();
      const choice = await event.userChoice;
      status('installStatus', choice.outcome === 'accepted' ? 'インストールを受け付けました。' : 'インストールを見送りました。ブラウザーのメニューから再度追加できます。');
    } catch { status('installStatus', 'ブラウザーのメニューからインストールを試してください。'); }
  });
  byId('checkAppUpdateBtn')?.addEventListener('click', async () => {
    if (!registration || navigator.onLine === false) {
      status('appUpdateStatus', '通信とオフライン準備の状態を確認してから、もう一度試してください。'); return;
    }
    status('appUpdateStatus', '最新版を確認しています。');
    try {
      await registration.update();
      if (registration.waiting) {
        if (versionResolved && !waitingVersion) versionWorker = null;
        showUpdate();
      }
      else status('appUpdateStatus', registration.installing ? '新しい版を準備しています。' : '現在は最新の版です。');
    } catch { status('appUpdateStatus', '更新を確認できませんでした。通信できる時にもう一度試してください。'); }
  });
  byId('applyAppUpdateBtn')?.addEventListener('click', () => {
    if (!registration?.waiting) return;
    if (typeof DraftGuard !== 'undefined' && !DraftGuard.checkpoint()) return;
    applyingUpdate = true;
    registration.waiting.postMessage({type: 'ACTIVATE_UPDATE'});
  });
  const setThemeColor = () => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',
      document.documentElement.dataset.theme === 'dark' ? '#101b24' : '#075579');
  };
  setThemeColor();
  new MutationObserver(setThemeColor).observe(document.documentElement, {attributes: true, attributeFilter: ['data-theme']});
  renderInstall(); renderConnection();
  if (!('serviceWorker' in navigator) || !window.isSecureContext) {
    status('offlineStatus', 'この環境ではオフライン準備が使えません。通常のブラウザー表示は利用できます。');
    return;
  }
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (applyingUpdate) location.reload();
    else showUpdate();
  });
  window.addEventListener('load', async () => {
    try {
      registration = await navigator.serviceWorker.register(new URL('sw.js', base).href, {scope: base.href, updateViaCache: 'none'});
      showUpdate();
      const watchInstalling = () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' || worker.state === 'activated') showUpdate();
          if (worker.state === 'redundant') status('offlineStatus', 'オフライン準備に失敗しました。通信を確認して再読み込みしてください。');
        });
      };
      registration.addEventListener('updatefound', watchInstalling);
      watchInstalling();
      navigator.serviceWorker.ready.then(() => { offlineReady = true; renderConnection(); showUpdate(); });
    } catch { status('offlineStatus', 'オフライン準備に失敗しました。通常表示は使えますが、通信を確認してください。'); }
  }, {once: true});
})();
