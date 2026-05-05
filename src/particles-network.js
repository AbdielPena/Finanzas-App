// ============================================================
// Particles Network background (particles.js)
// Red de puntos conectados con líneas, estilo fintech.
// Adaptado del componente React de 21st.dev a vanilla JS.
// Theme-aware: cyan/azul en dark, azul claro en light.
// ============================================================

let scriptLoading = null;

function loadParticlesJs() {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.particlesJS) return Promise.resolve(window.particlesJS);
  if (scriptLoading) return scriptLoading;
  // particles.js es UMD legacy — el import npm no siempre setea el global.
  // CDN directo es más confiable y se cachea bien.
  scriptLoading = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-particles-lib]');
    if (existing && window.particlesJS) return resolve(window.particlesJS);
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js';
    s.async = true;
    s.dataset.particlesLib = '1';
    s.onload = () => resolve(window.particlesJS);
    s.onerror = (e) => reject(new Error('particles.js CDN load failed'));
    document.head.appendChild(s);
  });
  return scriptLoading;
}

function destroyExisting(containerId) {
  // particles.js mantiene un array global con todas las instancias
  if (Array.isArray(window.pJSDom) && window.pJSDom.length > 0) {
    window.pJSDom = window.pJSDom.filter((entry) => {
      const tag = entry?.pJS?.canvas?.tag;
      const matches = tag?.parentElement?.id === containerId;
      if (matches) {
        try { entry.pJS.fn.vendors.destroypJS(); } catch {}
        return false;
      }
      return true;
    });
  }
  // Asegura limpiar canvas residuales
  const existing = document.querySelectorAll(`#${containerId} canvas`);
  existing.forEach((c) => c.remove());
}

/**
 * Monta la red de partículas dentro del contenedor (id) dado.
 * @param {string} containerId - id del div donde se renderiza
 * @param {{ theme?: 'dark'|'light' }} opts
 * @returns {() => void} destroy()
 */
export async function mountParticlesNetwork(containerId, opts = {}) {
  const theme = opts.theme || 'dark';
  const particlesJS = await loadParticlesJs();
  if (!particlesJS) return () => {};

  destroyExisting(containerId);

  const colors = theme === 'dark'
    ? { particles: '#00f5ff', lines: '#00d9ff', accent: '#0096c7' }
    : { particles: '#0277bd', lines: '#0288d1', accent: '#039be5' };

  particlesJS(containerId, {
    particles: {
      number: { value: window.innerWidth < 600 ? 70 : 120, density: { enable: true, value_area: 900 } },
      color: { value: colors.particles },
      shape: { type: 'circle', stroke: { width: 0.5, color: colors.accent } },
      opacity: {
        value: 0.55,
        random: true,
        anim: { enable: true, speed: 1, opacity_min: 0.25 },
      },
      size: {
        value: 2.6,
        random: true,
        anim: { enable: true, speed: 2, size_min: 0.8 },
      },
      line_linked: {
        enable: true,
        distance: 160,
        color: colors.lines,
        opacity: 0.32,
        width: 1.1,
      },
      move: { enable: true, speed: 1.2, random: true, out_mode: 'bounce' },
    },
    interactivity: {
      detect_on: 'canvas',
      events: {
        onhover: { enable: true, mode: 'grab' },
        onclick: { enable: false },
        resize: true,
      },
      modes: {
        grab: { distance: 200, line_linked: { opacity: 0.7 } },
      },
    },
    retina_detect: true,
  });

  return function destroy() {
    destroyExisting(containerId);
  };
}

export default { mountParticlesNetwork };
