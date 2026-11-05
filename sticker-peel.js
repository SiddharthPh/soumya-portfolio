// StickerPeel, ported from React Bits (JS + CSS variant) to plain DOM so it runs on the static pages.
// Usage: var s = StickerPeel(parentEl, { imageSrc, width, rotate, ... }); s.destroy();
// Same props as the React version. initialPosition may also be a function (bounds) => {x, y} in parent pixels.
(function () {
  var GRID = 96;
  var PAD = 0.18;
  var MAX_TEXTURE = 1024;
  var MASK_SIZE = 96;
  var LIGHT_HEIGHT = 260;
  var FINISHES = { gloss: 0, matte: 1, holo: 2 };
  var stack = 1;

  var VERTEX = `#version 300 es
in vec2 aGrid;
uniform vec2 uCanvas;
uniform vec2 uMesh;
uniform vec2 uCenter;
uniform vec2 uDir;
uniform float uFold;
uniform float uRadius;
uniform float uAngle;
uniform float uScale;
uniform float uLift;
uniform int uPass;
uniform vec2 uShadowOffset;
uniform vec2 uShadowSlope;
out vec2 vUv;
out float vFold;
out vec3 vNormal;
out vec3 vPos;
out float vHeight;
out float vCurl;
const float PI = 3.14159265;

void main() {
  vec2 local = (aGrid - 0.5) * uMesh;
  float s = dot(local, uDir);
  float d = uFold - s;
  vec3 normal = vec3(0.0, 0.0, 1.0);
  float z = 0.0;
  vec2 p = local;
  if (d > 0.0) {
    float theta = d / uRadius;
    float along = uFold + d - PI * uRadius;
    z = 2.0 * uRadius;
    normal = vec3(0.0, 0.0, -1.0);
    if (theta < PI) {
      along = uFold - uRadius * sin(theta);
      z = uRadius * (1.0 - cos(theta));
      normal = vec3(uDir * sin(theta), cos(theta));
    }
    p += (along - s) * uDir;
  }
  float c = cos(uAngle);
  float sn = sin(uAngle);
  vec2 turned = vec2(c * p.x - sn * p.y, sn * p.x + c * p.y) * uScale;
  vNormal = vec3(c * normal.x - sn * normal.y, sn * normal.x + c * normal.y, normal.z);
  vUv = aGrid;
  vFold = d;
  vCurl = z * uScale;
  float height = z * uScale + uLift;
  vec2 screen = uCenter + turned;
  float depth = 0.0;
  if (uPass == 0 || uPass == 2) {
    vHeight = uPass == 0 ? height : z * uScale;
    screen += uShadowOffset + uShadowSlope * vHeight;
  } else {
    vHeight = height;
    depth = clamp(-height / 1000.0, -1.0, 1.0);
  }
  vPos = vec3(uCenter + turned, height);
  gl_Position = vec4(screen.x / uCanvas.x * 2.0 - 1.0, 1.0 - screen.y / uCanvas.y * 2.0, depth, 1.0);
}`;

  var FRAGMENT = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D uImage;
uniform int uPass;
uniform int uFinish;
uniform vec3 uBack;
uniform vec3 uLight;
uniform float uShine;
uniform float uShadow;
uniform float uTexel;
uniform float uLod;
uniform float uRadius;
uniform vec2 uGlint;
in vec2 vUv;
in float vFold;
in vec3 vNormal;
in vec3 vPos;
in float vHeight;
in float vCurl;
out vec4 outColor;

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

vec3 spectrum(float t) {
  t = fract(t) * 6.0;
  vec3 a = vec3(1.0, 0.478, 0.46);
  vec3 b = vec3(1.0, 0.928, 0.38);
  vec3 c = vec3(0.659, 1.0, 0.38);
  vec3 d = vec3(0.52, 1.0, 0.968);
  vec3 e = vec3(0.48, 0.584, 1.0);
  vec3 f = vec3(0.68, 0.52, 1.0);
  if (t < 1.0) return mix(a, b, t);
  if (t < 2.0) return mix(b, c, t - 1.0);
  if (t < 3.0) return mix(c, d, t - 2.0);
  if (t < 4.0) return mix(d, e, t - 3.0);
  if (t < 5.0) return mix(e, f, t - 4.0);
  return mix(f, a, t - 5.0);
}

float bars(float t) {
  t = fract(t) * 12.0;
  if (t < 3.8) return mix(0.08, 0.6, t / 3.8);
  if (t < 4.5) return mix(0.6, 0.72, (t - 3.8) / 0.7);
  if (t < 5.2) return mix(0.72, 0.6, (t - 4.5) / 0.7);
  if (t < 10.0) return mix(0.6, 0.08, (t - 5.2) / 4.8);
  return 0.08;
}

void main() {
  if (uPass == 0) {
    float alpha;
    if (vFold > 0.0) {
      alpha = textureLod(uImage, vUv, log2(max(1.5 * uTexel, 1.0))).a * (1.0 - smoothstep(0.0, uRadius, vCurl));
    } else {
      alpha = textureLod(uImage, vUv, log2(max((1.2 + vHeight * 0.55) * uTexel, 1.0))).a;
    }
    outColor = vec4(0.0, 0.0, 0.0, alpha * uShadow / (1.0 + vHeight * 0.03));
    return;
  }
  if (uPass == 2) {
    if (vFold <= 0.0) discard;
    float alpha = textureLod(uImage, vUv, log2(max(uTexel, 1.0))).a * smoothstep(0.0, uRadius, vCurl);
    outColor = vec4(alpha);
    return;
  }
  if (uPass == 1 && vFold > 0.0) discard;
  if (uPass == 3 && vFold <= 0.0) discard;
  vec4 art = textureLod(uImage, vUv, uLod);
  if (art.a < 0.004) discard;
  bool front = vNormal.z >= 0.0;
  vec3 n = normalize(front ? vNormal : -vNormal);
  vec3 toLight = normalize(uLight - vPos);
  vec3 halfway = normalize(toLight + vec3(0.0, 0.0, 1.0));
  float diffuse = max(dot(n, toLight), 0.0);
  float nh = max(dot(n, halfway), 0.0);
  vec3 key = normalize(vec3(-0.45, -0.6, 0.66));
  float shade = clamp(0.5 + 0.25 * dot(n, key) / key.z + 0.25 * n.z, 0.5, front ? 1.0 : 1.08);
  if (uPass == 1) shade = 1.0;
  vec3 color;
  if (!front) {
    float grain = hash(floor(vUv * 700.0)) * 0.06 - 0.03;
    color = uBack * (0.7 + 0.3 * diffuse + grain) * art.a + vec3(pow(nh, 24.0) * 0.2 * uShine) * art.a;
  } else if (uFinish == 1) {
    color = art.rgb * (0.8 + 0.22 * diffuse) + vec3(pow(nh, 8.0) * 0.08 * uShine) * art.a;
  } else if (uFinish == 2) {
    vec3 albedo = art.rgb / art.a;
    float lum = dot(albedo, vec3(0.299, 0.587, 0.114));
    float foil = smoothstep(0.5, 0.92, lum);
    vec2 q = vUv - uGlint;
    float near = exp(-dot(q, q) * 3.0);
    float tilt = dot(n.xy, vec2(0.6, 0.8)) * 1.6;
    vec3 rainbow = spectrum((vUv.x + vUv.y) * 0.85 - (uGlint.x + uGlint.y) * 1.2 + tilt);
    float streak = bars((vUv.x - vUv.y) * 2.6 + uGlint.x * 1.8 - uGlint.y * 0.6 + tilt * 0.5);
    float band = smoothstep(0.32, 0.7, streak);
    vec3 silver = vec3(0.8, 0.82, 0.86) * (0.88 + 0.16 * diffuse);
    vec3 film = mix(silver, rainbow * 1.08, clamp(band * (0.55 + 0.45 * near) + 0.18 * near, 0.0, 1.0));
    vec3 ink = albedo * (0.86 + 0.14 * diffuse) + rainbow * band * 0.22 * (0.4 + 0.6 * near);
    vec3 base = mix(albedo * (0.86 + 0.14 * diffuse), mix(ink, film, foil), uShine * 0.6 + 0.4);
    vec2 cell = floor(vUv * 180.0);
    vec2 jitter = vec2(hash(cell), hash(cell + 7.3)) * 0.6 + 0.2;
    float dist = length(fract(vUv * 180.0) - jitter);
    vec3 facet = normalize(vec3(vec2(hash(cell + 2.1), hash(cell + 5.7)) * 2.0 - 1.0, 1.6));
    float glint = pow(max(dot(facet, halfway), 0.0), 60.0) * smoothstep(0.32, 0.05, dist) * step(0.55, hash(cell + 3.1)) * (0.15 + 0.85 * foil);
    color = (base + spectrum(hash(cell) + uGlint.x) * glint * 1.6 * uShine + vec3(pow(nh, 140.0) * 0.4 * uShine)) * art.a;
  } else {
    color = art.rgb * (0.86 + 0.16 * diffuse) + vec3(pow(nh, 220.0) * 0.4 + pow(nh, 24.0) * 0.03) * uShine * art.a;
  }
  float bend = uPass == 3 ? smoothstep(0.0, uRadius * 0.6, vCurl) : 0.0;
  float glare = pow(max(dot(n, normalize(key + vec3(0.0, 0.0, 1.0))), 0.0), 28.0) * bend * (0.18 + 0.3 * uShine);
  outColor = vec4(min(color * shade + vec3(glare) * art.a, vec3(art.a)), art.a);
}`;

  var POST_VERTEX = `#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

  var POST_FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D uSource;
uniform vec2 uStep;
uniform float uSigma;
uniform float uStrength;
uniform int uMode;
in vec2 vUv;
out vec4 outColor;

void main() {
  if (uMode == 1) {
    outColor = vec4(0.0, 0.0, 0.0, texture(uSource, vUv).a * uStrength);
    return;
  }
  vec4 sum = vec4(0.0);
  float total = 0.0;
  for (int i = -8; i <= 8; i++) {
    float offset = float(i);
    float weight = exp(-0.5 * offset * offset / (uSigma * uSigma));
    sum += texture(uSource, vUv + uStep * offset) * weight;
    total += weight;
  }
  outColor = sum / total;
}`;

  var clamp = function (value, min, max) { return Math.min(max, Math.max(min, value)); };
  var wrapAngle = function (angle) { return Math.atan2(Math.sin(angle), Math.cos(angle)); };
  var toRadians = function (degrees) { return (degrees * Math.PI) / 180; };

  var spring = function (state, key, target, frequency, damping, dt) {
    var omega = 2 * Math.PI * frequency;
    var velocity = key + 'V';
    state[velocity] += (omega * omega * (target - state[key]) - 2 * damping * omega * state[velocity]) * dt;
    state[key] += state[velocity] * dt;
  };

  var compile = function (gl, type, source) {
    var shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    gl.deleteShader(shader);
    return null;
  };

  var link = function (gl, vertexSource, fragmentSource) {
    var vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
    var fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
    var program = gl.createProgram();
    if (!vertex || !fragment || !program) return null;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.bindAttribLocation(program, 0, 'aGrid');
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return null;
    }
    var uniforms = {};
    var count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < count; i++) {
      var info = gl.getActiveUniform(program, i);
      if (info) uniforms[info.name] = gl.getUniformLocation(program, info.name);
    }
    return { program: program, uniforms: uniforms };
  };

  var convexHull = function (points) {
    var sorted = points.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    if (sorted.length < 3) return sorted;
    var cross = function (o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); };
    var lower = [];
    sorted.forEach(function (point) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) lower.pop();
      lower.push(point);
    });
    var upper = [];
    for (var i = sorted.length - 1; i >= 0; i--) {
      var point = sorted[i];
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) upper.pop();
      upper.push(point);
    }
    return lower.slice(0, -1).concat(upper.slice(0, -1));
  };

  function StickerPeel(parent, props) {
    var p = Object.assign({
      width: 200, rotate: 0, peelDirection: 0, peelBackHoverPct: 25, peelBackActivePct: 40, curlRadius: 12,
      finish: 'gloss', backColor: '#d4d4d8', lightingIntensity: 0.5, shadowIntensity: 0.6, followPointer: true,
      draggable: true, swing: 1, friction: 0.5, bounce: 0.35, intro: true, initialPosition: 'center', className: ''
    }, props || {});
    var s = {
      imageSrc: p.imageSrc,
      width: Math.max(16, p.width),
      rotate: toRadians(p.rotate),
      peelDirection: toRadians(p.peelDirection),
      hoverPeel: clamp(p.peelBackHoverPct, 0, 100) / 100,
      activePeel: clamp(p.peelBackActivePct, 0, 100) / 100,
      curlRadius: Math.max(2, p.curlRadius),
      finish: FINISHES[p.finish] != null ? FINISHES[p.finish] : 0,
      backColor: p.backColor,
      lighting: clamp(p.lightingIntensity, 0, 1),
      shadow: clamp(p.shadowIntensity, 0, 1),
      followPointer: p.followPointer,
      draggable: p.draggable,
      swing: clamp(p.swing, 0, 3),
      friction: clamp(p.friction, 0, 1),
      bounce: clamp(p.bounce, 0, 1),
      intro: p.intro,
      initialPosition: p.initialPosition,
      onDragStart: p.onDragStart,
      onDragEnd: p.onDragEnd,
      onHoverChange: p.onHoverChange,
      dpr: p.dpr
    };

    var root = document.createElement('div');
    root.className = 'sticker-peel' + (p.className ? ' ' + p.className : '');
    var canvas = document.createElement('canvas');
    canvas.className = 'sticker-peel-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    var hit = document.createElement('div');
    hit.className = 'sticker-peel-hit';
    root.appendChild(canvas);
    root.appendChild(hit);

    var gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: true, depth: true, stencil: false });
    if (!parent || !gl) return null;
    var program = link(gl, VERTEX, FRAGMENT);
    var post = link(gl, POST_VERTEX, POST_FRAGMENT);
    if (!program || !post) return null;
    parent.appendChild(root);

    var u = program.uniforms;
    var pu = post.uniforms;
    var view = { ratio: 1, size: 1, density: 0 };
    var targets = [0, 1].map(function () {
      var target = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, target);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return { texture: target, buffer: gl.createFramebuffer(), width: 0, height: 0 };
    });
    var sizeTargets = function () {
      var width = Math.max(1, Math.round(view.size / 2));
      var height = width;
      targets.forEach(function (target) {
        if (target.width === width && target.height === height) return;
        target.width = width;
        target.height = height;
        gl.bindTexture(gl.TEXTURE_2D, target.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.buffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target.texture, 0);
      });
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    };

    var vertices = new Float32Array((GRID + 1) * (GRID + 1) * 2);
    for (var gy = 0; gy <= GRID; gy++) {
      for (var gx = 0; gx <= GRID; gx++) {
        var vi = (gy * (GRID + 1) + gx) * 2;
        vertices[vi] = gx / GRID;
        vertices[vi + 1] = gy / GRID;
      }
    }
    var indices = new Uint16Array(GRID * GRID * 6);
    var cursor = 0;
    for (var iy = 0; iy < GRID; iy++) {
      for (var ix = 0; ix < GRID; ix++) {
        var a = iy * (GRID + 1) + ix, b = a + 1, c = a + GRID + 1, d = c + 1;
        indices.set([a, b, d, a, d, c], cursor);
        cursor += 6;
      }
    }
    var vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    var vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    var indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    var texture = gl.createTexture();
    var scratch = document.createElement('canvas');
    var scratchContext = scratch.getContext('2d', { willReadFrequently: true });
    var probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    var colorCache = new Map();
    var parse = function (value) {
      var key = String(value);
      var cached = colorCache.get(key);
      if (cached) return cached;
      var rgb = [0.83, 0.83, 0.85];
      if (probe) {
        probe.clearRect(0, 0, 1, 1);
        probe.fillStyle = '#d4d4d8';
        probe.fillStyle = key;
        probe.fillRect(0, 0, 1, 1);
        var px = probe.getImageData(0, 0, 1, 1).data;
        rgb = [px[0] / 255, px[1] / 255, px[2] / 255];
      }
      colorCache.set(key, rgb);
      return rgb;
    };

    var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
    var sticker = { ready: false, aspect: 1, meshX: 1, meshY: 1, texel: 1, mask: null, maskW: 1, maskH: 1, hull: [] };
    var bounds = { width: 1, height: 1 };
    var state = {
      x: 0, y: 0, vx: 0, vy: 0, placed: false, swing: 0, swingV: 0, peel: 0, peelV: 0, lift: 0, liftV: 0,
      dir: s.peelDirection, hover: false, local: { x: 0, y: 0 }, press: null, pivotV: { x: 0, y: 0 },
      light: { x: 0, y: 0, z: LIGHT_HEIGHT }, pointer: { x: 0, y: 0, inside: false },
      intro: s.intro && !reduce ? 0 : 1
    };
    if (state.intro < 1) {
      state.lift = 1.5;
      state.peel = 0.3;
      state.swing = 0.1;
      state.dir += 0.6;
    }
    var raf = 0, last = 0, visible = true, loadedSrc = null, alive = true;

    var height = function () { return s.width * sticker.aspect; };

    var extentAlong = function (dx, dy) {
      var w = s.width, h = height();
      if (!sticker.hull.length) {
        var half = (Math.abs(dx) * w + Math.abs(dy) * h) / 2;
        return [-half, half];
      }
      var min = Infinity, max = -Infinity;
      sticker.hull.forEach(function (pt) {
        var value = pt[0] * w * dx + pt[1] * h * dy;
        if (value < min) min = value;
        if (value > max) max = value;
      });
      return [min, max];
    };

    var load = function (src) {
      loadedSrc = src;
      sticker.ready = false;
      if (!src) return;
      var image = new Image();
      image.crossOrigin = 'anonymous';
      image.decoding = 'async';
      image.onload = function () {
        if (!alive || loadedSrc !== src || !scratchContext) return;
        var iw = image.naturalWidth || 1;
        var ih = image.naturalHeight || 1;
        var fit = Math.min(1, MAX_TEXTURE / (Math.max(iw, ih) * (1 + 2 * PAD)));
        var w = Math.max(1, Math.round(iw * fit));
        var h = Math.max(1, Math.round(ih * fit));
        var padX = Math.round(w * PAD);
        var padY = Math.round(h * PAD);
        scratch.width = w + padX * 2;
        scratch.height = h + padY * 2;
        scratchContext.clearRect(0, 0, scratch.width, scratch.height);
        scratchContext.drawImage(image, padX, padY, w, h);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, scratch);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        sticker.aspect = ih / iw;
        sticker.meshX = scratch.width / w;
        sticker.meshY = scratch.height / h;
        sticker.texel = scratch.width;
        var maskW = Math.max(8, Math.round(MASK_SIZE * Math.min(1, iw / ih)));
        var maskH = Math.max(8, Math.round(MASK_SIZE * Math.min(1, ih / iw)));
        scratch.width = maskW;
        scratch.height = maskH;
        scratchContext.clearRect(0, 0, maskW, maskH);
        scratchContext.drawImage(image, 0, 0, maskW, maskH);
        var pixels = scratchContext.getImageData(0, 0, maskW, maskH).data;
        var mask = new Uint8Array(maskW * maskH).fill(255);
        var queue = [];
        var visit = function (x, y) {
          var i = y * maskW + x;
          if (mask[i] === 0 || pixels[i * 4 + 3] > 100) return;
          mask[i] = 0;
          queue.push(i);
        };
        for (var x = 0; x < maskW; x++) { visit(x, 0); visit(x, maskH - 1); }
        for (var y = 0; y < maskH; y++) { visit(0, y); visit(maskW - 1, y); }
        while (queue.length) {
          var qi = queue.pop();
          var qx = qi % maskW;
          var qy = (qi - qx) / maskW;
          if (qx > 0) visit(qx - 1, qy);
          if (qx < maskW - 1) visit(qx + 1, qy);
          if (qy > 0) visit(qx, qy - 1);
          if (qy < maskH - 1) visit(qx, qy + 1);
        }
        var points = [];
        for (var my = 0; my < maskH; my++) {
          for (var mx = 0; mx < maskW; mx++) {
            if (pixels[(my * maskW + mx) * 4 + 3] > 127) points.push([(mx + 0.5) / maskW - 0.5, (my + 0.5) / maskH - 0.5]);
          }
        }
        sticker.mask = mask;
        sticker.maskW = maskW;
        sticker.maskH = maskH;
        sticker.hull = convexHull(points);
        sticker.ready = true;
        layout();
        wake();
      };
      image.src = src;
    };

    var layout = function () {
      view.ratio = Math.min(s.dpr || window.devicePixelRatio || 1, 2);
      bounds.width = Math.max(1, parent.clientWidth);
      bounds.height = Math.max(1, parent.clientHeight);
      var h = height();
      var size = Math.ceil(Math.hypot(s.width, h) * 1.16 + 2 * (36 + s.curlRadius));
      if (size !== view.size || view.ratio !== view.density) {
        view.size = size;
        view.density = view.ratio;
        root.style.width = size + 'px';
        root.style.height = size + 'px';
        canvas.width = Math.round(size * view.ratio);
        canvas.height = Math.round(size * view.ratio);
      }
      hit.style.width = s.width + 'px';
      hit.style.height = h + 'px';
      // an anchored sticker nobody has moved follows its anchor when the layout changes
      if (sticker.ready && state.placed && !state.moved && typeof s.initialPosition === 'function') {
        var again = s.initialPosition(bounds, { width: s.width, height: h });
        state.x = again.x;
        state.y = again.y;
      }
      if (!state.placed && sticker.ready) {
        var start = s.initialPosition;
        if (typeof start === 'function') {
          var at = start(bounds, { width: s.width, height: h });
          state.x = at.x;
          state.y = at.y;
        } else {
          var offset = start && typeof start === 'object' ? start : { x: 0, y: 0 };
          state.x = bounds.width / 2 + (offset.x || 0);
          state.y = bounds.height / 2 + (offset.y || 0);
        }
        state.light = { x: state.x - s.width * 0.45, y: state.y - h * 0.9, z: LIGHT_HEIGHT * 1.6 };
        state.placed = true;
      }
      confine();
    };

    var reach = function () {
      var angle = s.rotate + state.swing;
      var grow = 1 + 0.07 * Math.max(0, state.lift);
      var w = (s.width / 2) * grow;
      var h = (height() / 2) * grow;
      var c = Math.abs(Math.cos(angle));
      var sn = Math.abs(Math.sin(angle));
      return { x: w * c + h * sn, y: w * sn + h * c };
    };

    var confine = function () {
      var half = reach();
      var minX = Math.min(half.x, bounds.width / 2);
      var maxX = Math.max(bounds.width - half.x, bounds.width / 2);
      var minY = Math.min(half.y, bounds.height / 2);
      var maxY = Math.max(bounds.height - half.y, bounds.height / 2);
      if (state.x < minX) { state.x = minX; if (state.vx < 0) state.vx = -state.vx * s.bounce; }
      else if (state.x > maxX) { state.x = maxX; if (state.vx > 0) state.vx = -state.vx * s.bounce; }
      if (state.y < minY) { state.y = minY; if (state.vy < 0) state.vy = -state.vy * s.bounce; }
      else if (state.y > maxY) { state.y = maxY; if (state.vy > 0) state.vy = -state.vy * s.bounce; }
    };

    var toParent = function (event) {
      var rect = parent.getBoundingClientRect();
      return { x: event.clientX - rect.left - parent.clientLeft, y: event.clientY - rect.top - parent.clientTop };
    };

    var toLocal = function (point) {
      var angle = -(s.rotate + state.swing);
      var scale = 1 + 0.07 * Math.max(0, state.lift);
      var dx = point.x - state.x;
      var dy = point.y - state.y;
      return {
        x: (Math.cos(angle) * dx - Math.sin(angle) * dy) / scale,
        y: (Math.sin(angle) * dx + Math.cos(angle) * dy) / scale
      };
    };

    var solid = function (local) {
      if (!sticker.mask) return false;
      var mx = Math.floor((local.x / s.width + 0.5) * sticker.maskW);
      var my = Math.floor((local.y / height() + 0.5) * sticker.maskH);
      if (mx < 0 || my < 0 || mx >= sticker.maskW || my >= sticker.maskH) return false;
      return sticker.mask[my * sticker.maskW + mx] > 100;
    };

    var draw = function () {
      var size = view.size;
      root.style.transform = 'translate3d(' + (state.x - size / 2) + 'px, ' + (state.y - size / 2) + 'px, 0)';
      var angle = s.rotate + state.swing;
      var scale = 1 + 0.07 * Math.max(0, state.lift);
      hit.style.transform = 'translate(-50%, -50%) rotate(' + angle + 'rad) scale(' + scale + ')';
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clearDepth(1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      if (!sticker.ready) return;
      var w = s.width;
      var h = height();
      var dx = -Math.sin(state.dir);
      var dy = Math.cos(state.dir);
      var ext = extentAlong(dx, dy);
      var peel = clamp(state.peel, 0, 1);
      var fold = ext[0] + peel * (ext[1] - ext[0]);
      var lift = Math.max(0, state.lift);
      var center = size / 2;
      var count = GRID * GRID * 6;
      var peeled = peel > 0.001;
      gl.useProgram(program.program);
      gl.bindVertexArray(vao);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(u.uImage, 0);
      gl.uniform2f(u.uCanvas, size, size);
      gl.uniform2f(u.uMesh, w * sticker.meshX, h * sticker.meshY);
      gl.uniform2f(u.uCenter, center, center);
      gl.uniform2f(u.uDir, dx, dy);
      gl.uniform1f(u.uFold, fold);
      gl.uniform1f(u.uRadius, s.curlRadius);
      gl.uniform1f(u.uAngle, angle);
      gl.uniform1f(u.uScale, scale);
      gl.uniform1f(u.uLift, lift * 26);
      gl.uniform2f(u.uShadowOffset, 1.2, 2.4);
      gl.uniform2f(u.uShadowSlope, 0.28, 0.55);
      gl.uniform1i(u.uFinish, s.finish);
      gl.uniform3fv(u.uBack, parse(s.backColor));
      gl.uniform3f(u.uLight, state.light.x - (state.x - center), state.light.y - (state.y - center), state.light.z);
      gl.uniform1f(u.uShine, s.lighting);
      gl.uniform1f(u.uShadow, s.shadow * 0.55);
      gl.uniform1f(u.uTexel, sticker.texel / (w * sticker.meshX));
      gl.uniform1f(u.uLod, Math.max(0, Math.log2(sticker.texel / (w * sticker.meshX * scale * view.ratio))));
      var glint = toLocal(state.light);
      gl.uniform2f(u.uGlint, glint.x / (w * sticker.meshX) + 0.5, glint.y / (h * sticker.meshY) + 0.5);
      gl.disable(gl.DEPTH_TEST);
      if (peeled) {
        sizeTargets();
        var first = targets[0], second = targets[1];
        gl.bindFramebuffer(gl.FRAMEBUFFER, first.buffer);
        gl.viewport(0, 0, first.width, first.height);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.disable(gl.BLEND);
        gl.uniform1i(u.uPass, 2);
        gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 0);
        gl.useProgram(post.program);
        gl.uniform1i(pu.uSource, 1);
        gl.uniform1i(pu.uMode, 0);
        gl.uniform1f(pu.uSigma, Math.min(4, (2.5 + s.curlRadius * 0.15) / 2));
        gl.activeTexture(gl.TEXTURE1);
        gl.bindFramebuffer(gl.FRAMEBUFFER, second.buffer);
        gl.bindTexture(gl.TEXTURE_2D, first.texture);
        gl.uniform2f(pu.uStep, 1 / first.width, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindFramebuffer(gl.FRAMEBUFFER, first.buffer);
        gl.bindTexture(gl.TEXTURE_2D, second.texture);
        gl.uniform2f(pu.uStep, 0, 1 / first.height);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.useProgram(program.program);
        gl.activeTexture(gl.TEXTURE0);
      }
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.uniform1i(u.uPass, 0);
      gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 0);
      gl.uniform1i(u.uPass, 1);
      gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 0);
      if (peeled) {
        gl.useProgram(post.program);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, targets[0].texture);
        gl.uniform1i(pu.uMode, 1);
        gl.uniform1f(pu.uStrength, s.shadow * 0.6);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.useProgram(program.program);
        gl.activeTexture(gl.TEXTURE0);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LESS);
        gl.uniform1i(u.uPass, 3);
        gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 0);
        gl.disable(gl.DEPTH_TEST);
      }
    };

    var frame = function (now) {
      raf = 0;
      if (!visible || document.hidden) return;
      var dt = last ? clamp((now - last) / 1000, 0.001, 1 / 30) : 1 / 60;
      last = now;
      var h = height();
      if (state.intro < 1 && sticker.ready) state.intro = Math.min(1, state.intro + dt / 1.1);
      var press = state.press;
      var drag = press && press.moving ? press : null;
      if (drag) {
        var target = drag.pointer;
        var prev = drag.pivot;
        var smoothing = 1 - Math.exp(-dt / 0.045);
        var vx = state.pivotV.x + ((target.x - prev.x) / dt - state.pivotV.x) * smoothing;
        var vy = state.pivotV.y + ((target.y - prev.y) / dt - state.pivotV.y) * smoothing;
        var ax = (vx - state.pivotV.x) / dt;
        var ay = (vy - state.pivotV.y) / dt;
        state.pivotV.x = vx;
        state.pivotV.y = vy;
        drag.pivot = { x: target.x, y: target.y };
        var angle = s.rotate + state.swing;
        var rx = -(Math.cos(angle) * drag.grab.x - Math.sin(angle) * drag.grab.y);
        var ry = -(Math.sin(angle) * drag.grab.x + Math.cos(angle) * drag.grab.y);
        var inertia = (s.width * s.width + h * h) / 12 + rx * rx + ry * ry;
        var torque = (rx * -clamp(ay, -24000, 24000) - ry * -clamp(ax, -24000, 24000)) / inertia;
        var omega = 2 * Math.PI * 1.5;
        state.swingV += (torque * 1.1 * s.swing - omega * omega * state.swing - 2 * 0.45 * omega * state.swingV) * dt;
        state.swing = clamp(state.swing + state.swingV * dt, -1.2, 1.2);
        var turned = s.rotate + state.swing;
        var grip = 1 + 0.07 * Math.max(0, state.lift);
        state.x = target.x - (Math.cos(turned) * drag.grab.x - Math.sin(turned) * drag.grab.y) * grip;
        state.y = target.y - (Math.sin(turned) * drag.grab.x + Math.cos(turned) * drag.grab.y) * grip;
        confine();
      } else {
        spring(state, 'swing', 0, 1.4, 0.32, dt);
        var decay = Math.exp(-dt * (1.5 + 9 * s.friction));
        state.vx *= decay;
        state.vy *= decay;
        if (Math.hypot(state.vx, state.vy) < 4) { state.vx = 0; state.vy = 0; }
        state.x += state.vx * dt;
        state.y += state.vy * dt;
        confine();
      }
      var introHold = state.intro < 0.2;
      var peelTarget = introHold ? 0.3 : press ? s.activePeel : state.hover ? s.hoverPeel : 0;
      spring(state, 'peel', peelTarget, press || state.hover ? 3 : 3.6, press || state.hover ? 0.7 : 0.62, dt);
      spring(state, 'lift', drag ? 1 : 0, 3.2, 0.55, dt);
      var dirTarget = s.peelDirection;
      if (press && Math.hypot(press.grab.x, press.grab.y) > Math.min(s.width, h) * 0.12) {
        dirTarget = Math.atan2(press.grab.x, -press.grab.y);
      } else if (s.followPointer && state.hover && Math.hypot(state.local.x, state.local.y) > Math.min(s.width, h) * 0.12) {
        dirTarget = Math.atan2(state.local.x, -state.local.y);
      }
      if (!introHold) state.dir += wrapAngle(dirTarget - state.dir) * (1 - Math.exp(-dt / 0.12));
      var lightTarget = state.pointer.inside
        ? { x: state.pointer.x, y: state.pointer.y, z: LIGHT_HEIGHT }
        : { x: state.x - s.width * 0.45, y: state.y - h * 0.9, z: LIGHT_HEIGHT * 1.6 };
      var follow = 1 - Math.exp(-dt / 0.08);
      state.light.x += (lightTarget.x - state.light.x) * follow;
      state.light.y += (lightTarget.y - state.light.y) * follow;
      state.light.z += (lightTarget.z - state.light.z) * follow;
      canvas.style.opacity = String(clamp(state.intro / 0.12, 0, 1));
      draw();
      var moving =
        (state.intro < 1 && sticker.ready) || press ||
        Math.abs(state.peel - peelTarget) > 0.0005 || Math.abs(state.peelV) > 0.0005 ||
        Math.abs(state.lift - (drag ? 1 : 0)) > 0.0005 || Math.abs(state.liftV) > 0.0005 ||
        Math.abs(state.swing) > 0.0005 || Math.abs(state.swingV) > 0.0005 ||
        state.vx !== 0 || state.vy !== 0 ||
        Math.abs(wrapAngle(dirTarget - state.dir)) > 0.002 ||
        Math.hypot(lightTarget.x - state.light.x, lightTarget.y - state.light.y, lightTarget.z - state.light.z) > 0.5;
      if (moving) raf = requestAnimationFrame(frame);
      else last = 0;
    };

    function wake() {
      if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame);
    }

    var updateHover = function (event) {
      state.local = toLocal(toParent(event));
      setHover(solid(state.local));
      hit.style.cursor = over && s.draggable ? (state.press ? 'grabbing' : 'grab') : '';
    };

    var onPointerMove = function (event) {
      var point = toParent(event);
      state.pointer.x = point.x;
      state.pointer.y = point.y;
      state.pointer.inside = point.x >= 0 && point.y >= 0 && point.x <= bounds.width && point.y <= bounds.height;
      wake();
    };

    var onHitMove = function (event) {
      var press = state.press;
      if (!press) {
        updateHover(event);
      } else if (press.id === event.pointerId) {
        var point = toParent(event);
        press.pointer = point;
        if (!press.moving && Math.hypot(point.x - press.origin.x, point.y - press.origin.y) > 3) {
          press.moving = s.draggable;
          if (press.moving) state.moved = true;
          if (press.moving && s.onDragStart) s.onDragStart();
        }
        press.samples.push({ x: point.x, y: point.y, t: performance.now() });
        if (press.samples.length > 8) press.samples.shift();
      }
      wake();
    };

    var setHover = function (on) {
      if (on === state.hover) return;
      state.hover = on;
      if (s.onHoverChange) s.onHoverChange(on);
    };

    var onHitLeave = function () {
      if (state.press) return;
      setHover(false);
      hit.style.cursor = '';
      wake();
    };

    var onHitDown = function (event) {
      if (event.button !== 0 || !sticker.ready) return;
      updateHover(event);
      if (!state.hover) return;
      var point = toParent(event);
      state.press = { id: event.pointerId, grab: toLocal(point), origin: point, pointer: point, pivot: point, moving: false, samples: [] };
      state.pivotV = { x: 0, y: 0 };
      state.vx = 0;
      state.vy = 0;
      if (hit.setPointerCapture) hit.setPointerCapture(event.pointerId);
      if (s.draggable) {
        hit.style.cursor = 'grabbing';
        stack += 1;
        root.style.zIndex = String(stack);
      }
      event.preventDefault();
      wake();
    };

    var onHitUp = function (event) {
      var press = state.press;
      if (!press || press.id !== event.pointerId) return;
      state.press = null;
      if (hit.hasPointerCapture && hit.hasPointerCapture(event.pointerId)) hit.releasePointerCapture(event.pointerId);
      var now = performance.now();
      var recent = press.samples.filter(function (sample) { return now - sample.t < 90; });
      if (press.moving && recent.length > 1 && !reduce) {
        var ra = recent[0];
        var rb = recent[recent.length - 1];
        var span = Math.max(rb.t - ra.t, 16) / 1000;
        var speed = 2600;
        state.vx = clamp((rb.x - ra.x) / span, -speed, speed);
        state.vy = clamp((rb.y - ra.y) / span, -speed, speed);
      }
      updateHover(event);
      if (event.pointerType !== 'mouse') setHover(false);
      if (press.moving && s.onDragEnd) s.onDragEnd();
      wake();
    };

    var onLeaveWindow = function () { state.pointer.inside = false; wake(); };
    var onVisibility = function () { last = 0; wake(); };

    var resizeObserver = new ResizeObserver(function () { layout(); wake(); });
    resizeObserver.observe(parent);
    var intersection = new IntersectionObserver(function (entries) {
      visible = entries.some(function (entry) { return entry.isIntersecting; });
      if (visible) { last = 0; wake(); }
    });
    intersection.observe(parent);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeaveWindow);
    document.addEventListener('visibilitychange', onVisibility);
    hit.addEventListener('pointermove', onHitMove);
    hit.addEventListener('pointerleave', onHitLeave);
    hit.addEventListener('pointerdown', onHitDown);
    hit.addEventListener('pointerup', onHitUp);
    hit.addEventListener('pointercancel', onHitUp);
    load(s.imageSrc);
    layout();
    wake();

    return {
      root: root,
      destroy: function () {
        alive = false;
        cancelAnimationFrame(raf);
        resizeObserver.disconnect();
        intersection.disconnect();
        window.removeEventListener('pointermove', onPointerMove);
        document.documentElement.removeEventListener('pointerleave', onLeaveWindow);
        document.removeEventListener('visibilitychange', onVisibility);
        gl.deleteTexture(texture);
        targets.forEach(function (target) { gl.deleteTexture(target.texture); gl.deleteFramebuffer(target.buffer); });
        gl.deleteProgram(post.program);
        gl.deleteBuffer(vertexBuffer);
        gl.deleteBuffer(indexBuffer);
        gl.deleteVertexArray(vao);
        gl.deleteProgram(program.program);
        var lose = gl.getExtension('WEBGL_lose_context');
        if (lose) lose.loseContext();
        root.remove();
      }
    };
  }

  // the component's stylesheet, injected once so pages only need the script tag
  var css = document.createElement('style');
  css.textContent =
    '.sticker-peel{position:absolute;left:0;top:0;pointer-events:none;will-change:transform;}' +
    '.sticker-peel-canvas{display:block;width:100%;height:100%;pointer-events:none;}' +
    '.sticker-peel-hit{position:absolute;left:50%;top:50%;pointer-events:auto;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;}';
  document.head.appendChild(css);

  window.StickerPeel = StickerPeel;
})();
