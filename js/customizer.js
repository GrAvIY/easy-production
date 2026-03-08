/**
 * EASY PRODUCTION — 3D Customizer  (ES Module)
 *
 * Three.js-based interactive clothing viewer with:
 *  • Clothing shape switching (ExtrudeGeometry from custom paths)
 *  • OrbitControls (rotate / zoom)
 *  • Canvas texture system (color layer + print layer + draw layer)
 *  • Image upload + position / scale / rotate via sliders
 *  • Freehand draw mode with raycasting UV detection
 *  • GLTF model loading from IndexedDB (admin-uploaded .glb files)
 */

/* ─── ES Module imports ──────────────────────────────────────────────────── */
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';

console.log('[Customizer] Module loaded. THREE:', typeof THREE, '| OrbitControls:', typeof OrbitControls);

/*
 * GLTFLoader is loaded LAZILY inside _loadGLTFModel() — NOT here.
 * Reason: top-level await blocks the entire IIFE until the CDN responds.
 * If the CDN is slow, OrbitControls/Three.js scene never initialise.
 * Lazy-loading means the scene and procedural geometry start immediately;
 * GLTF loading kicks in only when a model is actually needed.
 */
let _GLTFLoader = null;

/* Expose OrbitControls to THREE namespace for use inside the IIFE */
if (typeof THREE !== 'undefined') {
  THREE.OrbitControls = OrbitControls;
}

(function () {
  'use strict';

  console.log('[Customizer] IIFE start');

  if (!window.EP_CONFIG?.features?.threeDViewer) {
    console.warn('[Customizer] Disabled by EP_CONFIG.features.threeDViewer');
    return;
  }
  if (typeof THREE === 'undefined') {
    console.error('[Customizer] THREE is not defined — three.min.js not loaded');
    return;
  }
  if (!THREE.OrbitControls) {
    console.error('[Customizer] THREE.OrbitControls not set — OrbitControls CDN import failed');
    return;
  }

  console.log('[Customizer] THREE OK, OrbitControls OK');

  /* ─── Constants ─────────────────────────────────────────────────────────── */
  const CANVAS_SIZE = 1024;

  /* ─── DOM refs ──────────────────────────────────────────────────────────── */
  const viewport       = document.getElementById('customizerViewport');
  const threeCanvas    = document.getElementById('threeCanvas');
  const overlay        = document.getElementById('viewportOverlay');
  const clothingTabs   = document.getElementById('clothingTabs');
  const colorSwatches  = document.getElementById('colorSwatches');
  const colorNameEl    = document.getElementById('colorNameDisplay');
  const uploadBtn      = document.getElementById('uploadBtn');
  const printFileInput = document.getElementById('printFileInput');
  const printTransform = document.getElementById('printTransform');
  const removePrintBtn = document.getElementById('removePrintBtn');
  const drawModeBtn    = document.getElementById('drawModeBtn');
  const clearCanvasBtn = document.getElementById('clearCanvasBtn');
  const drawControls   = document.getElementById('drawControls');

  // Sliders
  const sliderScale  = document.getElementById('sliderScale');
  const sliderRotate = document.getElementById('sliderRotate');
  const sliderX      = document.getElementById('sliderX');
  const sliderY      = document.getElementById('sliderY');
  const valScale     = document.getElementById('valScale');
  const valRotate    = document.getElementById('valRotate');
  const valX         = document.getElementById('valX');
  const valY         = document.getElementById('valY');
  const brushSize    = document.getElementById('brushSize');
  const valBrush     = document.getElementById('valBrush');

  /* ─── State ──────────────────────────────────────────────────────────────── */
  const state = {
    activeType:   EP_CONFIG.viewer.defaultProduct,
    activeColor:  EP_CONFIG.viewer.defaultColor,
    printImage:   null,      // HTMLImageElement
    printScale:   0.40,      // 0–1 fraction of texture
    printRotate:  0,         // degrees
    printOffsetX: 0,         // -0.5 to 0.5 in UV space
    printOffsetY: 0,
    isDrawing:    false,
    drawMode:     false,
    textMode:     false,     // one-shot: next model click places text
    brushColor:     '#1A1A1A',
    brushWidth:     8,
    textColor:      '#1A1A1A',
    textFont:       'Arial',
    textSize:       64,
    textRotate:     0,
    textBold:       false,
    textItalic:     false,
    isGLTFModel:    false,   // true when an IDB/file GLB is loaded (UV Y not flipped)
    isDraggingPrint: false,  // true while user drags print image on model surface
    _lastDrawUV:    null,    // previous UV point for smooth stroke lineTo
  };

  /* ─── Texture canvas layers ─────────────────────────────────────────────── */
  const texCanvas = document.createElement('canvas');
  texCanvas.width  = CANVAS_SIZE;
  texCanvas.height = CANVAS_SIZE;
  const ctx = texCanvas.getContext('2d');

  // Draw canvas (separate layer for freehand drawing)
  const drawCanvas = document.createElement('canvas');
  drawCanvas.width  = CANVAS_SIZE;
  drawCanvas.height = CANVAS_SIZE;
  const dctx = drawCanvas.getContext('2d');

  /* ─── Three.js Setup ────────────────────────────────────────────────────── */
  const scene  = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);

  const camera = new THREE.PerspectiveCamera(
    35,
    viewport.clientWidth / viewport.clientHeight,
    0.01,
    100
  );
  camera.position.set(0, 0, 6);

  const renderer = new THREE.WebGLRenderer({
    canvas: threeCanvas,
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(viewport.clientWidth, viewport.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  console.log('[Customizer] Renderer OK. Viewport size:', viewport.clientWidth, 'x', viewport.clientHeight);

  /* ─── Lighting ──────────────────────────────────────────────────────────── */
  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xfff5e0, 1.4);
  keyLight.position.set(3, 5, 5);
  keyLight.castShadow = true;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xd0e0ff, 0.5);
  fillLight.position.set(-3, 2, 3);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
  rimLight.position.set(0, -3, -3);
  scene.add(rimLight);

  /* ─── OrbitControls ─────────────────────────────────────────────────────── */
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping    = true;
  controls.dampingFactor    = 0.06;
  controls.enablePan        = false;
  controls.minDistance      = 2;
  controls.maxDistance      = 12;
  controls.maxPolarAngle    = Math.PI * 0.85;
  controls.autoRotate       = true;
  controls.autoRotateSpeed  = 0.4;

  /* ─── Raycaster ─────────────────────────────────────────────────────────── */
  const raycaster = new THREE.Raycaster();
  const mouse     = new THREE.Vector2();

  /* ─── Clothing geometry definitions ─────────────────────────────────────── */
  //
  // Each function returns a THREE.ExtrudeGeometry for the front body panel only.
  // Sleeves, hoods and waistbands are 3D meshes added by addClothingExtras().
  // Separating them keeps the UV space clean for print placement.
  //
  // ─── GLTF EXTENSION POINT ────────────────────────────────────────────────
  // Drop .glb files into /assets/models/ and swap buildMesh() to use
  // THREE.GLTFLoader — the rest of the system (canvas texture, draw mode) stays.
  // ─────────────────────────────────────────────────────────────────────────

  // Extrude presets
  const EXTRUDE_BODY = { depth: 0.22, bevelEnabled: true,  bevelSize: 0.024, bevelThickness: 0.013, bevelSegments: 3 };
  const EXTRUDE_BOT  = { depth: 0.18, bevelEnabled: false };
  const EXTRUDE_HAT  = { depth: 0.14, bevelEnabled: true,  bevelSize: 0.020, bevelThickness: 0.010, bevelSegments: 2 };

  /** Generic torso panel — shoulder line → neck curve → body, pre-centred at origin. */
  function torsoShape(shW, nkW, nkRise, h) {
    const t = h / 2, b = -h / 2;
    const s = new THREE.Shape();
    s.moveTo(-shW, t - 0.10);
    s.lineTo(-nkW, t - 0.10);
    s.quadraticCurveTo(0, t + nkRise - 0.10, nkW, t - 0.10);
    s.lineTo( shW, t - 0.10);
    s.lineTo( shW * 0.93, b);
    s.lineTo(-shW * 0.93, b);
    s.closePath();
    return s;
  }

  function makeTshirtGeometry()    { return new THREE.ExtrudeGeometry(torsoShape(1.02, 0.22, 0.17, 2.20), EXTRUDE_BODY); }
  function makeLongsleeveGeometry(){ return new THREE.ExtrudeGeometry(torsoShape(1.02, 0.22, 0.17, 2.20), EXTRUDE_BODY); }
  function makeHoodieGeometry()    { return new THREE.ExtrudeGeometry(torsoShape(1.06, 0.22, 0.15, 2.35), EXTRUDE_BODY); }
  function makeZipHoodieGeometry() { return new THREE.ExtrudeGeometry(torsoShape(1.06, 0.22, 0.15, 2.35), EXTRUDE_BODY); }
  function makeSweatshirtGeometry(){ return new THREE.ExtrudeGeometry(torsoShape(1.02, 0.28, 0.13, 2.30), EXTRUDE_BODY); }

  function makeShortsGeometry() {
    const s = new THREE.Shape();
    s.moveTo(-1.05,  0.55); s.lineTo( 1.05,  0.55);
    s.lineTo( 1.05,  0.30); s.lineTo( 0.58,  0.30);
    s.lineTo( 0.58, -0.82); s.quadraticCurveTo( 0.30, -0.92,  0.06, -0.82);
    s.lineTo( 0.06,  0.12); s.lineTo(-0.06,  0.12);
    s.lineTo(-0.06, -0.82); s.quadraticCurveTo(-0.30, -0.92, -0.58, -0.82);
    s.lineTo(-0.58,  0.30); s.lineTo(-1.05,  0.30);
    s.closePath();
    return new THREE.ExtrudeGeometry(s, EXTRUDE_BOT);
  }

  function makePantsGeometry() {
    const s = new THREE.Shape();
    s.moveTo(-1.05,  0.60); s.lineTo( 1.05,  0.60);
    s.lineTo( 1.05,  0.38); s.lineTo( 0.58,  0.38);
    s.lineTo( 0.58, -2.02); s.quadraticCurveTo( 0.30, -2.14,  0.06, -2.02);
    s.lineTo( 0.06,  0.16); s.lineTo(-0.06,  0.16);
    s.lineTo(-0.06, -2.02); s.quadraticCurveTo(-0.30, -2.14, -0.58, -2.02);
    s.lineTo(-0.58,  0.38); s.lineTo(-1.05,  0.38);
    s.closePath();
    return new THREE.ExtrudeGeometry(s, EXTRUDE_BOT);
  }

  function makeHatGeometry() {
    const s = new THREE.Shape();
    const R = 0.88, seg = 28;
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI;
      const x = Math.cos(a) * R, y = Math.sin(a) * R * 0.70;
      i === 0 ? s.moveTo(x, y) : s.lineTo(x, y);
    }
    s.lineTo(-R * 1.18, -0.05); s.lineTo(-R * 1.18, -0.24);
    s.lineTo( R * 1.18, -0.24); s.lineTo( R * 1.18, -0.05);
    s.closePath();
    return new THREE.ExtrudeGeometry(s, EXTRUDE_HAT);
  }

  /* ─── Geometry map ──────────────────────────────────────────────────────── */
  const GEOMETRIES = {
    tshirt:     makeTshirtGeometry,
    longsleeve: makeLongsleeveGeometry,
    hoodie:     makeHoodieGeometry,
    ziphoodie:  makeZipHoodieGeometry,
    sweatshirt: makeSweatshirtGeometry,
    shorts:     makeShortsGeometry,
    pants:      makePantsGeometry,
    hat:        makeHatGeometry,
  };

  /* ─── 3D extras: sleeves, hoods, waistbands ─────────────────────────────── */
  let extraMaterial = null;

  function buildExtraMaterial() {
    const base = new THREE.Color(state.activeColor);
    if (extraMaterial) extraMaterial.dispose();
    extraMaterial = new THREE.MeshStandardMaterial({
      color: base.clone().multiplyScalar(0.78),
      roughness: 0.93,
      metalness: 0.0,
    });
  }

  /**
   * Appends 3D sleeve / hood / waistband meshes to the group.
   * Coordinates are in pre-scale shape-space (same space as ExtrudeGeometry).
   * Sleeve centre is derived from the shoulder attachment point + angle θ.
   */
  function addClothingExtras(type, group) {
    buildExtraMaterial();

    function put(geo, x, y, z, rx, ry, rz) {
      const m = new THREE.Mesh(geo, extraMaterial);
      m.position.set(x, y, z);
      if (rx !== undefined) m.rotation.set(rx, ry, rz);
      m.castShadow = true;
      group.add(m);
    }

    // Tapered cylinder angled θ rad from vertical, attached at shoulder (shX, shY)
    function addSleeve(rTop, rBot, len, shX, shY, θ) {
      const cx = shX + (len / 2) * Math.sin(θ);
      const cy = shY - (len / 2) * Math.cos(θ);
      put(new THREE.CylinderGeometry(rTop, rBot, len, 14), cx, cy, 0, 0, 0, θ);
    }

    switch (type) {
      case 'tshirt':
        addSleeve(0.245, 0.200, 0.76, -1.02, 0.92,  0.38);
        addSleeve(0.245, 0.200, 0.76,  1.02, 0.92, -0.38);
        // Crew-neck collar ring
        put(new THREE.TorusGeometry(0.215, 0.042, 8, 22, Math.PI * 1.55), 0, 0.98, 0.12, Math.PI / 2, 0, 0);
        break;

      case 'longsleeve':
        addSleeve(0.225, 0.160, 1.58, -1.02, 0.92,  0.50);
        addSleeve(0.225, 0.160, 1.58,  1.02, 0.92, -0.50);
        put(new THREE.TorusGeometry(0.215, 0.042, 8, 22, Math.PI * 1.55), 0, 0.98, 0.12, Math.PI / 2, 0, 0);
        break;

      case 'hoodie':
      case 'ziphoodie':
        addSleeve(0.265, 0.205, 1.42, -1.06, 0.95,  0.48);
        addSleeve(0.265, 0.205, 1.42,  1.06, 0.95, -0.48);
        // Hood dome — sphere segment behind collar
        put(new THREE.SphereGeometry(0.86, 30, 22, 0, Math.PI * 2, 0, Math.PI * 0.60), 0, 1.25, -0.30);
        // Hood tunnel opening ring
        put(new THREE.TorusGeometry(0.58, 0.036, 8, 26, Math.PI * 1.38), 0, 1.44, 0.10, Math.PI / 2, 0, 0);
        break;

      case 'sweatshirt':
        addSleeve(0.265, 0.215, 1.16, -1.02, 0.92,  0.46);
        addSleeve(0.265, 0.215, 1.16,  1.02, 0.92, -0.46);
        put(new THREE.TorusGeometry(0.270, 0.048, 8, 22, Math.PI * 1.58), 0, 0.98, 0.12, Math.PI / 2, 0, 0);
        break;

      case 'shorts':
        put(new THREE.CylinderGeometry(1.04, 1.04, 0.11, 22), 0, 0.51, 0);
        break;

      case 'pants':
        put(new THREE.CylinderGeometry(1.04, 1.04, 0.11, 22), 0, 0.56, 0);
        break;

      case 'hat':
        // Pompom at crown
        put(new THREE.SphereGeometry(0.14, 16, 16), 0, 0.88, 0.05);
        break;
    }
  }

  /* ─── Texture system ────────────────────────────────────────────────────── */
  let canvasTexture = null;

  function compositeTexture() {
    const W = CANVAS_SIZE;
    const H = CANVAS_SIZE;

    ctx.clearRect(0, 0, W, H);

    // 1. Base clothing color
    ctx.fillStyle = state.activeColor;
    ctx.fillRect(0, 0, W, H);

    // 2. Subtle fabric-like gradient overlay for depth
    const grad = ctx.createRadialGradient(W * 0.4, H * 0.35, 0, W / 2, H / 2, W * 0.7);
    grad.addColorStop(0,   'rgba(255,255,255,0.06)');
    grad.addColorStop(0.5, 'rgba(0,0,0,0)');
    grad.addColorStop(1,   'rgba(0,0,0,0.12)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // 3. Print image
    if (state.printImage) {
      const cx = W / 2 + state.printOffsetX * W;
      const cy = H / 2 + state.printOffsetY * H;
      const size = W * state.printScale;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((state.printRotate * Math.PI) / 180);
      ctx.drawImage(state.printImage, -size / 2, -size / 2, size, size);
      ctx.restore();
    }

    // 4. Freehand draw layer
    ctx.drawImage(drawCanvas, 0, 0);

    // Refresh Three.js texture (procedural geometry uses canvasTexture directly)
    if (canvasTexture) {
      canvasTexture.needsUpdate = true;
    }
    // GLTF model uses a cloned texture with flipY=false — update it too
    if (clothingGroup) {
      clothingGroup.traverse(function (obj) {
        if (obj.isMesh && obj.material && obj.material._epGltfTex) {
          obj.material._epGltfTex.needsUpdate = true;
        }
      });
    }
  }

  /* ─── Material ──────────────────────────────────────────────────────────── */
  canvasTexture = new THREE.CanvasTexture(texCanvas);
  canvasTexture.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.MeshStandardMaterial({
    map: canvasTexture,
    roughness: 0.88,
    metalness: 0.0,
    side: THREE.FrontSide,
  });

  const sideMaterial = new THREE.MeshStandardMaterial({
    color: 0x1A1A1A,
    roughness: 0.95,
    metalness: 0.0,
  });

  /* ─── Mesh management ────────────────────────────────────────────────────── */
  let clothingGroup = null;
  let clothingMesh  = null;
  let _meshGen      = 0; // incremented on every buildMesh call; stale async results self-cancel

  function _clearScene() {
    if (clothingGroup) {
      scene.remove(clothingGroup);
      clothingGroup.traverse(obj => { if (obj.isMesh) obj.geometry.dispose(); });
      clothingGroup = null;
      clothingMesh  = null;
    }
  }

  async function buildMesh(type) {
    const gen = ++_meshGen; // capture generation for this call
    console.log('[Customizer] buildMesh called for:', type, '(gen', gen + ')');

    _clearScene();

    // ── Priority 1: Admin-uploaded model from IndexedDB ───────────────────────
    if (typeof EpDB !== 'undefined') {
      try {
        console.log('[Customizer] Checking IDB for model:', type);
        const modelBuf = await EpDB.models.get(type);
        if (gen !== _meshGen) { console.log('[Customizer] gen', gen, 'superseded, discarding IDB result'); return; }
        if (modelBuf) {
          console.log('[Customizer] IDB model found:', type, Math.round(modelBuf.byteLength / 1024) + 'KB — loading GLTF...');
          await _loadGLTFModel(modelBuf);
          if (gen !== _meshGen) { _clearScene(); return; } // another tab clicked while loading
          compositeTexture();
          console.log('[Customizer] IDB model loaded and rendered OK');
          return;
        } else {
          console.log('[Customizer] No IDB model for:', type);
        }
      } catch (e) {
        if (gen !== _meshGen) return;
        console.error('[Customizer] IDB/GLTF error for "' + type + '":', e.message, e);
      }
    } else {
      console.warn('[Customizer] EpDB not defined — js/db.js not loaded?');
    }

    // ── Priority 2: File path from EP_CONFIG.viewer.models ────────────────────
    const modelPath = EP_CONFIG?.viewer?.models?.[type];
    if (modelPath) {
      try {
        console.log('[Customizer] Trying file path:', modelPath);
        const resp = await fetch(modelPath);
        if (gen !== _meshGen) return;
        if (resp.ok) {
          const modelBuf = await resp.arrayBuffer();
          if (gen !== _meshGen) return;
          console.log('[Customizer] File loaded:', modelPath, Math.round(modelBuf.byteLength / 1024) + 'KB');
          await _loadGLTFModel(modelBuf);
          if (gen !== _meshGen) { _clearScene(); return; }
          compositeTexture();
          return;
        } else {
          console.log('[Customizer] File not found (HTTP ' + resp.status + '):', modelPath);
        }
      } catch (e) {
        if (gen !== _meshGen) return;
        if (e.name !== 'TypeError') {
          console.warn('[Customizer] File path load error:', modelPath, e.message);
        }
      }
    }

    // ── Priority 3: Procedural geometry (always available) ───────────────────
    if (gen !== _meshGen) return;
    console.log('[Customizer] Using procedural geometry for:', type);
    clothingGroup = new THREE.Group();

    const geoFn = GEOMETRIES[type] || GEOMETRIES.tshirt;
    const geo   = geoFn();

    geo.computeBoundingBox();
    const box = geo.boundingBox;
    geo.translate(-(box.min.x + box.max.x) / 2, -(box.min.y + box.max.y) / 2, 0);

    clothingMesh = new THREE.Mesh(geo, [material, sideMaterial, sideMaterial]);
    clothingMesh.castShadow = true;
    clothingGroup.add(clothingMesh);

    addClothingExtras(type, clothingGroup);

    geo.computeBoundingBox();
    const size = new THREE.Vector3();
    geo.boundingBox.getSize(size);
    clothingGroup.scale.setScalar(2.8 / Math.max(size.x, size.y));

    state.isGLTFModel = false;
    scene.add(clothingGroup);
    compositeTexture();
  }

  /** Load a GLB ArrayBuffer, apply the canvas texture to all meshes. */
  async function _loadGLTFModel(arrayBuffer) {
    // Lazily load GLTFLoader on first use — avoids blocking the IIFE with a top-level await
    if (!_GLTFLoader) {
      console.log('[Customizer] Loading GLTFLoader from CDN...');
      try {
        const mod = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js');
        _GLTFLoader = mod.GLTFLoader;
        console.log('[Customizer] GLTFLoader loaded OK');
      } catch (e) {
        throw new Error('GLTFLoader CDN import failed: ' + e.message);
      }
    }

    return new Promise(function (resolve, reject) {
      const blob   = new Blob([arrayBuffer], { type: 'model/gltf-binary' });
      const url    = URL.createObjectURL(blob);
      console.log('[Customizer] Blob URL created, starting GLTFLoader.load()...');
      const loader = new _GLTFLoader();

      loader.load(url, function (gltf) {
        URL.revokeObjectURL(url);
        console.log('[Customizer] GLTF onLoad — scene children:', gltf.scene.children.length);
        clothingGroup = new THREE.Group();

        // GLTF textures use flipY=false (Y=0 at top per GLTF spec).
        // Clone the canvas texture with flipY=false so it maps correctly.
        const gltfTex = canvasTexture.clone();
        gltfTex.flipY = false;
        gltfTex.needsUpdate = true;

        gltf.scene.traverse(function (obj) {
          if (!obj.isMesh) return;

          // Keep only the normalMap from the original GLB — it provides 3D
          // surface detail (folds, stitching).  roughness and metalness are
          // forced to fabric values so the canvas colour maps correctly:
          //   metalness > 0  → colour becomes specular F0, not diffuse → wrong colour
          //   low roughness  → specular highlights dominate → washed-out colour
          const src = Array.isArray(obj.material) ? obj.material[0] : obj.material;
          const mat = new THREE.MeshStandardMaterial({
            map:         gltfTex,
            roughness:   0.88,  // fabric — never inherit from GLB
            metalness:   0.0,   // clothing is non-metallic; any metalness breaks colour
            normalMap:   (src && src.normalMap)   ? src.normalMap   : null,
            normalScale: (src && src.normalScale) ? src.normalScale.clone() : new THREE.Vector2(1, 1),
            side:        THREE.DoubleSide,
          });
          // Tag so compositeTexture() can keep the canvas in sync
          mat._epGltfTex = gltfTex;

          obj.material   = mat;
          obj.castShadow = true;
          if (!clothingMesh) clothingMesh = obj; // first mesh for UV raycasting
        });
        state.isGLTFModel = true;

        clothingGroup.add(gltf.scene);

        // Center the model at origin
        const box3c = new THREE.Box3().setFromObject(clothingGroup);
        const center = new THREE.Vector3();
        box3c.getCenter(center);
        gltf.scene.position.sub(center);

        // Auto-scale to fill viewport (~2.8 units tall)
        const box3 = new THREE.Box3().setFromObject(clothingGroup);
        const sz   = new THREE.Vector3();
        box3.getSize(sz);
        const maxDim = Math.max(sz.x, sz.y, sz.z);
        if (maxDim > 0) clothingGroup.scale.setScalar(2.8 / maxDim);

        scene.add(clothingGroup);
        resolve();
      }, undefined, function (err) {
        URL.revokeObjectURL(url);
        console.error('[Customizer] GLTF onError:', err);
        reject(err);
      });
    });
  }

  /* ─── UI — Clothing tabs ────────────────────────────────────────────────── */
  const clothingIcons = {
    tshirt:     '👕',
    longsleeve: '👔',
    hoodie:     '🧥',
    ziphoodie:  '🤐',
    sweatshirt: '🫧',
    shorts:     '🩳',
    pants:      '👖',
    hat:        '🧢',
  };

  // Built-in product tabs (skip ones hidden via admin)
  const _hiddenProducts = (function () {
    try { return JSON.parse(localStorage.getItem('ep_hidden_products') || '[]'); }
    catch (_) { return []; }
  })();

  Object.entries(EP_CONFIG.products).forEach(([key, prod]) => {
    if (_hiddenProducts.includes(key)) return;
    const btn = document.createElement('button');
    btn.className = 'clothing-tab' + (key === state.activeType ? ' active' : '');
    btn.dataset.type = key;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', key === state.activeType ? 'true' : 'false');
    btn.innerHTML = `
      <span class="clothing-tab__icon">${clothingIcons[key] || '👕'}</span>
      <span>${prod.label}</span>
    `;
    btn.addEventListener('click', () => switchClothing(key));
    clothingTabs.appendChild(btn);
  });

  // Custom product tabs added via admin panel (stored in localStorage)
  try {
    const customProds = JSON.parse(localStorage.getItem('ep_custom_products') || '[]');
    customProds.forEach(prod => {
      const btn = document.createElement('button');
      btn.className = 'clothing-tab';
      btn.dataset.type = prod.key;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', 'false');
      btn.innerHTML = `
        <span class="clothing-tab__icon">👕</span>
        <span>${prod.label}</span>
      `;
      btn.addEventListener('click', () => switchClothing(prod.key));
      clothingTabs.appendChild(btn);
    });
  } catch (_) {}

  function switchClothing(type) {
    state.activeType = type;
    document.querySelectorAll('.clothing-tab').forEach(b => {
      const active = b.dataset.type === type;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    buildMesh(type).catch(e => console.error('[Customizer] switchClothing buildMesh error:', e));
    // Sync with calculator dropdown — only dispatch if the option actually exists.
    // If the type is a custom product key (e.g. 'custom_123'), it won't be in
    // the <select> options; assigning it leaves value as '' which then fires
    // switchClothing('') and overrides the correct buildMesh with procedural geometry.
    const calcProduct = document.getElementById('calcProduct');
    if (calcProduct && calcProduct.value !== type) {
      calcProduct.value = type;
      // Only dispatch if the browser actually accepted the value (option exists)
      if (calcProduct.value === type) {
        calcProduct.dispatchEvent(new Event('change'));
      }
    }
  }

  /* ─── UI — Color swatches ───────────────────────────────────────────────── */
  EP_CONFIG.viewer.colors.forEach((c, i) => {
    const btn = document.createElement('button');
    btn.className = 'color-swatch' + (i === 0 ? ' active' : '');
    btn.style.background = c.hex;
    btn.dataset.hex  = c.hex;
    btn.dataset.name = c.name;
    btn.setAttribute('aria-label', c.name);
    btn.addEventListener('click', () => selectColor(c.hex, c.name, btn));
    colorSwatches.appendChild(btn);
  });

  function selectColor(hex, name, btn) {
    state.activeColor = hex;
    document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    if (colorNameEl) colorNameEl.textContent = name;

    // Tint side + sleeve/hood materials to match clothing colour
    const base = new THREE.Color(hex);
    sideMaterial.color = base.clone().multiplyScalar(0.35);
    if (extraMaterial) extraMaterial.color = base.clone().multiplyScalar(0.78);

    compositeTexture();
  }

  /* ─── UI — Print upload ─────────────────────────────────────────────────── */
  if (uploadBtn) {
    uploadBtn.addEventListener('click', () => printFileInput.click());
  }

  if (printFileInput) {
    printFileInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;

      // 20 MB guard
      if (file.size > 20 * 1024 * 1024) {
        alert('Файл слишком большой. Максимальный размер — 20 МБ.');
        return;
      }

      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        state.printImage = img;
        if (printTransform) printTransform.hidden = false;
        // Auto-place at front-face centre so image lands on visible surface
        snapCameraFront();
        _setPrintToViewCenter();
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        alert('Не удалось загрузить изображение. Проверьте формат файла.');
        URL.revokeObjectURL(url);
      };
      img.src = url;
    });
  }

  /* ─── UI — Print sliders ────────────────────────────────────────────────── */
  function bindSlider(slider, valEl, suffix, callback) {
    if (!slider) return;
    slider.addEventListener('input', () => {
      if (valEl) valEl.textContent = slider.value + suffix;
      callback(parseFloat(slider.value));
    });
  }

  bindSlider(sliderScale, valScale, '%', v => {
    state.printScale = v / 100;
    compositeTexture();
  });

  bindSlider(sliderRotate, valRotate, '°', v => {
    state.printRotate = v;
    compositeTexture();
  });

  bindSlider(sliderX, valX, '', v => {
    state.printOffsetX = v / 100;
    compositeTexture();
  });

  bindSlider(sliderY, valY, '', v => {
    // Invert Y so slider up = print up visually
    state.printOffsetY = -(v / 100);
    compositeTexture();
  });

  /* ─── UI — Remove print ─────────────────────────────────────────────────── */
  if (removePrintBtn) {
    removePrintBtn.addEventListener('click', () => {
      state.printImage = null;
      if (printTransform) printTransform.hidden = true;
      if (printFileInput) printFileInput.value = '';
      [sliderScale, sliderRotate, sliderX, sliderY].forEach(s => {
        if (s) s.value = s.id === 'sliderScale' ? 40 : 0;
      });
      ['valScale:40%','valRotate:0°','valX:0','valY:0'].forEach(pair => {
        const [id, val] = pair.split(':');
        const el = document.getElementById(id);
        if (el) el.textContent = val;
      });
      compositeTexture();
    });
  }

  /* ─── Draw mode ─────────────────────────────────────────────────────────── */
  if (drawModeBtn) {
    drawModeBtn.addEventListener('click', () => {
      state.drawMode    = !state.drawMode;
      state._lastDrawUV = null;
      drawModeBtn.dataset.active = state.drawMode ? 'true' : 'false';
      drawModeBtn.textContent = state.drawMode ? '✓ Режим рисования' : 'Режим рисования';
      controls.enabled = !state.drawMode; // disable orbit while drawing
      if (drawControls) drawControls.hidden = !state.drawMode;
      viewport.style.cursor = state.drawMode ? 'crosshair' : 'grab';
      // Pause auto-rotation during drawing; resume 3 s after leaving draw mode
      if (state.drawMode) {
        _stopAutoRotate();
      } else {
        _scheduleAutoRotate();
      }
    });
  }

  if (clearCanvasBtn) {
    clearCanvasBtn.addEventListener('click', () => {
      dctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      compositeTexture();
    });
  }

  // Brush size slider
  if (brushSize) {
    brushSize.addEventListener('input', () => {
      state.brushWidth = parseInt(brushSize.value, 10);
      if (valBrush) valBrush.textContent = brushSize.value;
    });
  }

  // Brush color pickers (draw tool)
  document.querySelectorAll('#drawControls .brush-color').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#drawControls .brush-color').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.brushColor = btn.dataset.color;
    });
  });

  /* ─── Text tool controls ─────────────────────────────────────────────────── */
  // Font select
  const textFontSel = document.getElementById('textFontSelect');
  if (textFontSel) {
    textFontSel.addEventListener('change', () => { state.textFont = textFontSel.value; });
  }

  // Size slider
  const textSizeSlider = document.getElementById('textSizeSlider');
  const valTextSize    = document.getElementById('valTextSize');
  if (textSizeSlider) {
    textSizeSlider.addEventListener('input', () => {
      state.textSize = parseInt(textSizeSlider.value);
      if (valTextSize) valTextSize.textContent = textSizeSlider.value;
    });
  }

  // Rotation slider
  const textRotateSlider = document.getElementById('textRotateSlider');
  const valTextRotate    = document.getElementById('valTextRotate');
  if (textRotateSlider) {
    textRotateSlider.addEventListener('input', () => {
      state.textRotate = parseInt(textRotateSlider.value);
      if (valTextRotate) valTextRotate.textContent = textRotateSlider.value + '°';
    });
  }

  // Print — center front / back buttons
  const printCenterFrontBtn = document.getElementById('printCenterFrontBtn');
  const printCenterBackBtn  = document.getElementById('printCenterBackBtn');
  if (printCenterFrontBtn) {
    printCenterFrontBtn.addEventListener('click', () => {
      if (!state.printImage) return;
      snapCameraFront();
      _setPrintToViewCenter();
    });
  }
  if (printCenterBackBtn) {
    printCenterBackBtn.addEventListener('click', () => {
      if (!state.printImage) return;
      snapCameraBack();
      _setPrintToViewCenter();
    });
  }

  // Bold / Italic toggles
  const textBoldBtn   = document.getElementById('textBoldBtn');
  const textItalicBtn = document.getElementById('textItalicBtn');
  if (textBoldBtn) {
    textBoldBtn.addEventListener('click', () => {
      state.textBold = !state.textBold;
      textBoldBtn.dataset.active = state.textBold ? 'true' : 'false';
      textBoldBtn.classList.toggle('active', state.textBold);
    });
  }
  if (textItalicBtn) {
    textItalicBtn.addEventListener('click', () => {
      state.textItalic = !state.textItalic;
      textItalicBtn.dataset.active = state.textItalic ? 'true' : 'false';
      textItalicBtn.classList.toggle('active', state.textItalic);
    });
  }

  // Text color pickers
  document.querySelectorAll('#textColorSwatches .brush-color').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#textColorSwatches .brush-color').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.textColor = btn.dataset.color;
    });
  });

  // "В центр" button
  const textCenterBtn = document.getElementById('textCenterBtn');
  if (textCenterBtn) {
    textCenterBtn.addEventListener('click', () => {
      const txt = document.getElementById('textInput')?.value?.trim();
      if (!txt) return;
      placeTextCenter();
    });
  }

  // "Нажать на модель" toggle
  const textPlaceBtn = document.getElementById('textPlaceBtn');
  if (textPlaceBtn) {
    textPlaceBtn.addEventListener('click', () => {
      const txt = document.getElementById('textInput')?.value?.trim();
      if (!txt) {
        const input = document.getElementById('textInput');
        if (input) { input.focus(); input.style.borderColor = 'red'; setTimeout(() => { input.style.borderColor = ''; }, 1500); }
        return;
      }
      state.textMode = !state.textMode;
      textPlaceBtn.dataset.active = state.textMode ? 'true' : 'false';
      textPlaceBtn.textContent = state.textMode ? '✕ Отменить размещение' : '📍 Нажать на модель';
      controls.enabled = !state.textMode;
      viewport.style.cursor = state.textMode ? 'crosshair' : 'grab';
    });
  }

  /* ─── Draw via raycasting ────────────────────────────────────────────────── */
  function getMouseUV(event) {
    const rect = viewport.getBoundingClientRect();
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;

    mouse.x = ((clientX - rect.left) / rect.width)  * 2 - 1;
    mouse.y = -((clientY - rect.top)  / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    if (!clothingGroup) return null;

    // Intersect entire group (recursive=true) so multi-mesh GLTF models work fully
    const hits = raycaster.intersectObject(clothingGroup, true);
    const hit = hits.find(h => h.uv);
    if (!hit) return null;

    return hit.uv;
  }

  function _uvToCanvas(uv) {
    const x = uv.x * CANVAS_SIZE;
    // GLTF spec: UV y=0 is top (no flip). Three.js procedural: y=0 is bottom (flipY=true).
    const y = state.isGLTFModel ? uv.y * CANVAS_SIZE : (1 - uv.y) * CANVAS_SIZE;
    return { x, y };
  }

  /** Fire a ray from the exact centre of the viewport (NDC 0,0) and return hit UV. */
  function getViewCenterUV() {
    if (!clothingGroup) return null;
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const hits = raycaster.intersectObject(clothingGroup, true);
    const hit = hits.find(h => h.uv);
    return hit ? hit.uv : null;
  }

  /** Snap camera so the model's FRONT face (positive Z) is fully visible. */
  function snapCameraFront() {
    const dist = Math.max(camera.position.length(), 5);
    camera.position.set(0, 0, dist);
    camera.lookAt(0, 0, 0);
    controls.target.set(0, 0, 0);
    controls.update();
  }

  /** Snap camera so the model's BACK face (negative Z) is fully visible. */
  function snapCameraBack() {
    const dist = Math.max(camera.position.length(), 5);
    camera.position.set(0, 0, -dist);
    camera.lookAt(0, 0, 0);
    controls.target.set(0, 0, 0);
    controls.update();
  }

  /** Reset print offsets to view-centre UV; sync sliders. */
  function _setPrintToViewCenter() {
    const uv = getViewCenterUV();
    if (uv) {
      _placePrintAtUV(uv);
    } else {
      // Fallback: canvas centre
      state.printOffsetX = 0;
      state.printOffsetY = 0;
      if (sliderX) { sliderX.value = 0; if (valX) valX.textContent = '0'; }
      if (sliderY) { sliderY.value = 0; if (valY) valY.textContent = '0'; }
      compositeTexture();
    }
  }

  function drawOnUV(uv) {
    const pt = _uvToCanvas(uv);

    dctx.lineWidth   = state.brushWidth;
    dctx.strokeStyle = state.brushColor;
    dctx.lineCap     = 'round';
    dctx.lineJoin    = 'round';

    if (state._lastDrawUV) {
      const prev = _uvToCanvas(state._lastDrawUV);
      dctx.beginPath();
      dctx.moveTo(prev.x, prev.y);
      dctx.lineTo(pt.x, pt.y);
      dctx.stroke();
    } else {
      // First dot in a new stroke
      dctx.beginPath();
      dctx.arc(pt.x, pt.y, state.brushWidth / 2, 0, Math.PI * 2);
      dctx.fillStyle = state.brushColor;
      dctx.fill();
    }
    state._lastDrawUV = { x: uv.x, y: uv.y };

    compositeTexture();
  }

  /** Draw text on the draw canvas at the given UV point. */
  function placeTextAtUV(uv) {
    const input = document.getElementById('textInput');
    const txt = input ? input.value.trim() : '';
    if (!txt) return;
    const pt = _uvToCanvas(uv);
    _renderText(pt.x, pt.y);
  }

  function placeTextCenter() {
    const input = document.getElementById('textInput');
    const txt = input ? input.value.trim() : '';
    if (!txt) return;
    // Snap to front and use view-centre UV so it lands on the visible face
    snapCameraFront();
    const uv = getViewCenterUV();
    if (uv) {
      const pt = _uvToCanvas(uv);
      _renderText(pt.x, pt.y);
    } else {
      _renderText(CANVAS_SIZE / 2, CANVAS_SIZE / 2);
    }
  }

  function _renderText(cx, cy) {
    const input = document.getElementById('textInput');
    const txt = (input ? input.value.trim() : '') || '';
    if (!txt) return;

    const weight = state.textBold   ? 'bold '   : '';
    const style  = state.textItalic ? 'italic ' : '';
    dctx.save();
    dctx.translate(cx, cy);
    dctx.rotate((state.textRotate * Math.PI) / 180);
    dctx.font        = `${style}${weight}${state.textSize}px ${state.textFont}`;
    dctx.fillStyle   = state.textColor;
    dctx.textAlign   = 'center';
    dctx.textBaseline = 'middle';
    // Thin outline for legibility on any background
    dctx.strokeStyle = (state.textColor === '#FFFFFF' || state.textColor === 'white') ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.55)';
    dctx.lineWidth   = Math.max(1, state.textSize / 22);
    dctx.lineJoin    = 'round';
    dctx.strokeText(txt, 0, 0);
    dctx.fillText(txt, 0, 0);
    dctx.restore();
    compositeTexture();
  }

  /** Place the print image centred on the UV point the user clicked/dragged. */
  function _placePrintAtUV(uv) {
    // Convert UV [0,1] centre 0.5 → print offset centre 0
    state.printOffsetX = uv.x - 0.5;
    // Y axis differs by model type (see _uvToCanvas)
    state.printOffsetY = state.isGLTFModel ? uv.y - 0.5 : 0.5 - uv.y;

    // Sync sliders so they stay consistent with the dragged position
    if (sliderX) { sliderX.value = Math.round(state.printOffsetX * 100); if (valX) valX.textContent = sliderX.value; }
    // sliderY uses inverted mapping: slider value = −printOffsetY × 100
    if (sliderY) { sliderY.value = Math.round(-state.printOffsetY * 100); if (valY) valY.textContent = sliderY.value; }

    compositeTexture();
  }

  /* ─── Idle auto-rotation (resumes 3 s after last interaction) ────────────── */
  let _idleTimer    = null;
  let _overlayHidden = false;

  function _hideOverlay() {
    if (_overlayHidden) return;
    _overlayHidden = true;
    if (overlay) overlay.classList.add('hidden');
  }

  function _stopAutoRotate() {
    controls.autoRotate = false;
    clearTimeout(_idleTimer);
  }

  function _scheduleAutoRotate() {
    clearTimeout(_idleTimer);
    if (state.drawMode) return; // don't resume while drawing
    _idleTimer = setTimeout(function () {
      if (!state.drawMode) controls.autoRotate = true;
    }, 3000);
  }

  /* ─── Viewport mouse events ──────────────────────────────────────────────── */
  viewport.addEventListener('mousedown', function (e) {
    _hideOverlay();
    _stopAutoRotate();

    // Text placement mode — one-shot: place text then exit mode
    if (state.textMode) {
      const uv = getMouseUV(e);
      if (uv) placeTextAtUV(uv);
      state.textMode = false;
      const btn = document.getElementById('textPlaceBtn');
      if (btn) { btn.dataset.active = 'false'; btn.textContent = '📍 Нажать на модель'; }
      controls.enabled = true;
      viewport.style.cursor = 'grab';
      return;
    }

    // Print-placement drag: click/drag on model surface to reposition print
    if (state.printImage && !state.drawMode) {
      const uv = getMouseUV(e);
      if (uv) {
        state.isDraggingPrint = true;
        controls.enabled = false;
        _placePrintAtUV(uv);
      }
      return;
    }

    // Draw mode
    if (state.drawMode) {
      state.isDrawing   = true;
      state._lastDrawUV = null;
      const uv = getMouseUV(e);
      if (uv) drawOnUV(uv);
    }
  });

  viewport.addEventListener('mousemove', function (e) {
    if (state.isDraggingPrint) {
      const uv = getMouseUV(e);
      if (uv) _placePrintAtUV(uv);
      return;
    }
    if (!state.drawMode || !state.isDrawing) return;
    const uv = getMouseUV(e);
    if (uv) drawOnUV(uv);
  });

  viewport.addEventListener('mouseup', function () {
    state.isDrawing   = false;
    state._lastDrawUV = null;
    if (state.isDraggingPrint) {
      state.isDraggingPrint = false;
      controls.enabled = !state.drawMode;
    }
    _scheduleAutoRotate();
  });

  viewport.addEventListener('mouseleave', function () {
    state.isDrawing   = false;
    state._lastDrawUV = null;
    if (state.isDraggingPrint) {
      state.isDraggingPrint = false;
      controls.enabled = !state.drawMode;
    }
    _scheduleAutoRotate();
  });

  // Touch support
  viewport.addEventListener('touchstart', function (e) {
    _hideOverlay();
    _stopAutoRotate();

    if (state.textMode) {
      e.preventDefault();
      const uv = getMouseUV(e);
      if (uv) placeTextAtUV(uv);
      state.textMode = false;
      const btn = document.getElementById('textPlaceBtn');
      if (btn) { btn.dataset.active = 'false'; btn.textContent = '📍 Нажать на модель'; }
      controls.enabled = true;
      viewport.style.cursor = 'grab';
      return;
    }

    if (state.printImage && !state.drawMode) {
      e.preventDefault();
      const uv = getMouseUV(e);
      if (uv) {
        state.isDraggingPrint = true;
        controls.enabled = false;
        _placePrintAtUV(uv);
      }
      return;
    }

    if (!state.drawMode) return;
    e.preventDefault();
    state.isDrawing   = true;
    state._lastDrawUV = null;
    const uv = getMouseUV(e);
    if (uv) drawOnUV(uv);
  }, { passive: false });

  viewport.addEventListener('touchmove', function (e) {
    if (state.isDraggingPrint) {
      e.preventDefault();
      const uv = getMouseUV(e);
      if (uv) _placePrintAtUV(uv);
      return;
    }
    if (!state.drawMode || !state.isDrawing) return;
    e.preventDefault();
    const uv = getMouseUV(e);
    if (uv) drawOnUV(uv);
  }, { passive: false });

  viewport.addEventListener('touchend', function () {
    state.isDrawing   = false;
    state._lastDrawUV = null;
    if (state.isDraggingPrint) {
      state.isDraggingPrint = false;
      controls.enabled = !state.drawMode;
    }
    _scheduleAutoRotate();
  });

  /* ─── Resize handler ────────────────────────────────────────────────────── */
  function onResize() {
    const w = viewport.clientWidth;
    const h = viewport.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  const resizeObserver = new ResizeObserver(onResize);
  resizeObserver.observe(viewport);

  /* ─── Render loop ────────────────────────────────────────────────────────── */
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }

  /* ─── Init ───────────────────────────────────────────────────────────────── */
  compositeTexture();
  animate();
  console.log('[Customizer] Calling buildMesh for initial type:', state.activeType);
  buildMesh(state.activeType)
    .then(() => {
      console.log('[Customizer] buildMesh resolved — hiding overlay');
      if (overlay) overlay.classList.add('hidden');
    })
    .catch(e => {
      console.error('[Customizer] buildMesh rejected:', e);
      // Always hide overlay even on total failure so the UI isn't stuck
      if (overlay) overlay.classList.add('hidden');
    });

  // Expose minimal public API for cross-module sync
  window.EPCustomizer = {
    switchClothing,
    selectColor,
    getState: () => ({ ...state }),
  };

})();
