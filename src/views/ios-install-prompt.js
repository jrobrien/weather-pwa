const STORAGE_KEY = 'pwa-ios-prompt-dismissed';

function shouldShow() {
  const ua = navigator.userAgent;
  const isIOS       = /iphone|ipad|ipod/i.test(ua);
  const isSafari    = /safari/i.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/i.test(ua);
  const isInstalled = window.navigator.standalone === true;
  return isIOS && isSafari && !isInstalled && !localStorage.getItem(STORAGE_KEY);
}

export function maybeShowInstallPrompt() {
  if (!shouldShow()) return;

  const banner = document.createElement('div');
  banner.className = 'ios-banner';
  banner.innerHTML = `
    <div class="ios-banner-body">
      <svg class="ios-share-icon" viewBox="0 0 24 24" fill="none"
           stroke="#007aff" stroke-width="2" width="22" height="22">
        <path d="M8 6l4-4 4 4M12 2v13"/>
        <path d="M20 13v8a1 1 0 01-1 1H5a1 1 0 01-1-1v-8"/>
      </svg>
      <span>Tap <strong>Share</strong>, then <strong>Add to Home Screen</strong></span>
    </div>
    <button class="ios-banner-dismiss" aria-label="Dismiss">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2.5" width="14" height="14">
        <path d="M18 6L6 18M6 6l12 12"/>
      </svg>
    </button>
    <div class="ios-banner-arrow"></div>`;

  document.getElementById('app').appendChild(banner);

  banner.querySelector('.ios-banner-dismiss').addEventListener('click', () => {
    banner.classList.add('ios-banner-out');
    setTimeout(() => banner.remove(), 280);
    localStorage.setItem(STORAGE_KEY, '1');
  });
}
