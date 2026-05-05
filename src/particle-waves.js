// ============================================================
// Particle Waves background (Three.js)
// Adaptado de https://21st.dev (componente React) a vanilla JS.
// Usado como fondo animado del login.
// ============================================================
import * as THREE from 'three';

const DEFAULTS = {
  density: 50,
  speed: 0.08,
  amplitude: 50,
  separation: 100,
  particleColor: '#6c63ff',
  bgColor: 'transparent', // dejamos pasar el bg del padre
};

/**
 * Inicializa el efecto de partículas en el contenedor dado.
 * Devuelve una función `destroy()` para limpiar recursos al desmontar.
 */
export function mountParticleWaves(container, opts = {}) {
  const cfg = { ...DEFAULTS, ...opts };

  let camera, scene, renderer, material;
  let particles = [];
  let count = 0;
  let animationId = null;
  let mounted = true;

  const mouse = { x: 0, y: 0 };
  const half = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

  function makeMaterial(color) {
    const canvas = document.createElement('canvas');
    canvas.width = 32; canvas.height = 32;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 32, 32);
    // Halo radial para que las particulas se vean mas suaves
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, color);
    grad.addColorStop(0.4, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(16, 16, 16, 0, Math.PI * 2, true);
    ctx.fill();
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  }

  function buildParticles() {
    if (!scene || !material) return;
    particles.forEach((p) => scene.remove(p));
    particles = [];
    const { density, separation } = cfg;
    for (let ix = 0; ix < density; ix++) {
      for (let iy = 0; iy < density; iy++) {
        const sprite = new THREE.Sprite(material);
        sprite.position.x = ix * separation - (density * separation) / 2;
        sprite.position.z = iy * separation - (density * separation) / 2;
        sprite.position.y = -400;
        sprite.scale.setScalar(10);
        particles.push(sprite);
        scene.add(sprite);
      }
    }
  }

  function onMouseMove(e) {
    mouse.x = e.clientX - half.x;
    mouse.y = e.clientY - half.y;
  }
  function onTouchMove(e) {
    if (e.touches && e.touches.length === 1) {
      mouse.x = e.touches[0].pageX - half.x;
      mouse.y = e.touches[0].pageY - half.y;
    }
  }
  function onResize() {
    if (!camera || !renderer) return;
    half.x = window.innerWidth / 2;
    half.y = window.innerHeight / 2;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function animate() {
    if (!mounted) return;
    animationId = requestAnimationFrame(animate);

    camera.position.x += (mouse.x - camera.position.x) * 0.05;
    camera.position.y += (-mouse.y - camera.position.y) * 0.05;
    camera.lookAt(scene.position);

    const { density, amplitude, speed } = cfg;
    let i = 0;
    for (let ix = 0; ix < density; ix++) {
      for (let iy = 0; iy < density; iy++) {
        const p = particles[i++];
        if (!p) continue;
        p.position.y = -400
          + Math.sin((ix + count) * 0.3) * amplitude
          + Math.sin((iy + count) * 0.5) * amplitude;
        const s = (Math.sin((ix + count) * 0.3) + 1) * 2
                + (Math.sin((iy + count) * 0.5) + 1) * 2;
        p.scale.setScalar(s * 2);
      }
    }
    renderer.render(scene, camera);
    count += speed;
  }

  // ---------- Init ----------
  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 10000);
  camera.position.z = 1000;
  camera.position.y = 800;

  scene = new THREE.Scene();

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: cfg.bgColor === 'transparent' });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (cfg.bgColor !== 'transparent') {
    renderer.setClearColor(new THREE.Color(cfg.bgColor), 1);
  } else {
    renderer.setClearColor(0x000000, 0);
  }
  // Asegura que el canvas no robe los clicks del formulario
  renderer.domElement.style.position = 'absolute';
  renderer.domElement.style.inset = '0';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.pointerEvents = 'none';
  renderer.domElement.style.zIndex = '0';
  container.appendChild(renderer.domElement);

  material = makeMaterial(cfg.particleColor);
  buildParticles();

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('touchmove', onTouchMove, { passive: true });
  window.addEventListener('resize', onResize);

  animate();

  return function destroy() {
    mounted = false;
    if (animationId) cancelAnimationFrame(animationId);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('resize', onResize);
    particles.forEach((p) => scene.remove(p));
    particles = [];
    material?.map?.dispose?.();
    material?.dispose?.();
    renderer.dispose();
    if (renderer.domElement.parentNode === container) {
      container.removeChild(renderer.domElement);
    }
  };
}

export default { mountParticleWaves };
