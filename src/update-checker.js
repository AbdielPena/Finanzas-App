// ============================================================
// Update Checker — Verifica si hay nueva version del .exe / APK
// publicada en GitHub Releases y muestra banner al usuario
// ============================================================

const APP_VERSION = '1.0.0'; // sincronizar con package.json y tauri.conf.json
const GITHUB_REPO = 'AbdielPena/Finanzas-App';
const RELEASE_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 horas
const STORAGE_KEY = 'finanzapp_last_update_check';

// Detecta si estamos en Tauri (.exe), Capacitor (APK) o web normal
function detectPlatform() {
  if (typeof window === 'undefined') return 'unknown';
  if (window.__TAURI_INTERNALS__ || window.__TAURI__) return 'tauri';
  if (window.Capacitor) return 'capacitor';
  return 'web';
}

function compareVersions(a, b) {
  const pa = String(a).replace(/^v/, '').split('.').map(Number);
  const pb = String(b).replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const da = pa[i] || 0;
    const db = pb[i] || 0;
    if (da > db) return 1;
    if (da < db) return -1;
  }
  return 0;
}

async function fetchLatestRelease() {
  try {
    const res = await fetch(RELEASE_API, {
      headers: { 'Accept': 'application/vnd.github.v3+json' }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn('[update-checker] no se pudo verificar releases:', e.message);
    return null;
  }
}

function findAssetForPlatform(release, platform) {
  if (!release?.assets) return null;
  const find = (pattern) => release.assets.find(a => pattern.test(a.name));
  if (platform === 'tauri') return find(/-Setup\.exe$/i) || find(/\.msi$/i);
  if (platform === 'capacitor') return find(/\.apk$/i);
  return null;
}

function showUpdateBanner({ version, downloadUrl, releaseUrl, platform }) {
  // Evita duplicados
  if (document.getElementById('update-banner')) return;

  const banner = document.createElement('div');
  banner.id = 'update-banner';
  banner.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; z-index: 99999;
    background: linear-gradient(90deg, #6c63ff 0%, #4a3fcf 100%);
    color: white; padding: 12px 16px;
    display: flex; align-items: center; justify-content: center; gap: 16px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 14px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.25);
    animation: slideDown 0.4s ease-out;
  `;
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    @keyframes slideDown { from { transform: translateY(-100%); } to { transform: translateY(0); } }
    #update-banner button { cursor: pointer; transition: transform 0.15s; }
    #update-banner button:hover { transform: scale(1.05); }
  `;
  document.head.appendChild(styleEl);

  const platformLabel = platform === 'tauri' ? 'Windows' : platform === 'capacitor' ? 'Android' : 'app';

  banner.innerHTML = `
    <span>🚀 Nueva version <strong>${version}</strong> disponible para ${platformLabel}</span>
    <button id="update-banner-download" style="
      background: white; color: #6c63ff; border: none;
      padding: 8px 16px; border-radius: 8px; font-weight: 600;
      font-size: 13px;
    ">Descargar e instalar</button>
    <button id="update-banner-later" style="
      background: transparent; color: white; border: 1px solid rgba(255,255,255,0.4);
      padding: 8px 14px; border-radius: 8px; font-size: 13px;
    ">Mas tarde</button>
  `;

  document.body.appendChild(banner);

  document.getElementById('update-banner-download').addEventListener('click', () => {
    // window.open funciona en Tauri, Capacitor y web (los 3 abren navegador del sistema)
    window.open(downloadUrl, '_blank');
    banner.remove();
  });

  document.getElementById('update-banner-later').addEventListener('click', () => {
    banner.remove();
    // No volver a mostrar por 24h
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  });
}

export async function checkForUpdates({ force = false } = {}) {
  const platform = detectPlatform();

  // Web no necesita update banner (auto-update via reload)
  if (platform === 'web' || platform === 'unknown') return;

  // Throttle: no chequear mas de cada 6 horas
  if (!force) {
    const lastCheck = parseInt(localStorage.getItem(STORAGE_KEY), 10) || 0;
    if (Date.now() - lastCheck < CHECK_INTERVAL_MS) return;
  }
  localStorage.setItem(STORAGE_KEY, String(Date.now()));

  const release = await fetchLatestRelease();
  if (!release) return;

  const latestVersion = release.tag_name || release.name;
  if (!latestVersion) return;

  if (compareVersions(latestVersion, APP_VERSION) <= 0) return; // ya estamos al dia

  const asset = findAssetForPlatform(release, platform);
  if (!asset) return;

  // Espera 2 segundos para que la UI principal cargue antes de mostrar el banner
  setTimeout(() => {
    showUpdateBanner({
      version: latestVersion,
      downloadUrl: asset.browser_download_url,
      releaseUrl: release.html_url,
      platform,
    });
  }, 2000);
}

export default { checkForUpdates, detectPlatform };
