(() => {
  const tools = Array.isArray(window.CODING_TOOLS) ? window.CODING_TOOLS : [];
  const canvas = document.getElementById("wheelCanvas");
  const ctx = canvas.getContext("2d");
  const openBtn = document.getElementById("openBtn");
  const selectedMeta = document.getElementById("selectedMeta");
  const liveSelected = document.getElementById("liveSelected");
  const clicker = document.getElementById("clicker");
  const hint = document.getElementById("hint");

  const SLOT_TONES = [
    { fill: ["#1a1d22", "#0a0b0d", "#15181d"], text: "#f0d56a" },
    { fill: ["#9fe0b4", "#4fa86d", "#2f6d46"], text: "#0d1a12" },
    { fill: ["#fffdf8", "#e8dfcf", "#cfc3ae"], text: "#1a1a1a" },
    { fill: ["#3d8f58", "#1f5132", "#143824"], text: "#f0d56a" }
  ];
  const VISIBLE = 5;

  const state = {
    offset: 0,
    velocity: 0,
    dragging: false,
    lastY: 0,
    lastT: 0,
    lastIndex: 0,
    slotH: 112,
    audioCtx: null,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    looping: false
  };

  function toolAt(index) {
    const n = tools.length;
    if (!n) return null;
    return tools[((index % n) + n) % n];
  }

  function currentIndex() {
    const centerPad = Math.floor(VISIBLE / 2);
    return Math.round(-state.offset / state.slotH) - centerPad;
  }

  function snapOffsetForIndex(index) {
    const centerPad = Math.floor(VISIBLE / 2);
    return -((index + centerPad) * state.slotH);
  }

  function ensureAudio() {
    if (!state.audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) state.audioCtx = new AC();
    }
    if (state.audioCtx && state.audioCtx.state === "suspended") {
      state.audioCtx.resume().catch(() => {});
    }
  }

  function playClick(intensity = 1) {
    ensureAudio();
    if (!state.audioCtx) return;
    const t0 = state.audioCtx.currentTime;
    const osc = state.audioCtx.createOscillator();
    const gain = state.audioCtx.createGain();
    const filter = state.audioCtx.createBiquadFilter();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(880 + intensity * 120, t0);
    osc.frequency.exponentialRampToValueAtTime(220, t0 + 0.05);
    filter.type = "bandpass";
    filter.frequency.value = 1400;
    filter.Q.value = 4;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.18 * intensity, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.07);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(state.audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.08);
  }

  function bumpClicker() {
    clicker.classList.remove("tick");
    void clicker.offsetWidth;
    clicker.classList.add("tick");
    window.setTimeout(() => clicker.classList.remove("tick"), 90);
  }

  function drawRoundedRect(x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function drawSlot(x, y, w, h, index) {
    const tool = toolAt(index);
    if (!tool) return;
    const tone = SLOT_TONES[((index % SLOT_TONES.length) + SLOT_TONES.length) % SLOT_TONES.length];
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, tone.fill[0]);
    grad.addColorStop(0.5, tone.fill[1]);
    grad.addColorStop(1, tone.fill[2]);
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);

    ctx.fillStyle = "#c8d0d8";
    ctx.fillRect(x, y + h - 5, w, 5);

    const pegX = x + w - 18;
    const pegY = y + h - 2.5;
    const pegGrad = ctx.createRadialGradient(pegX, pegY - 1, 0.5, pegX, pegY, 4);
    pegGrad.addColorStop(0, "#ff7a7a");
    pegGrad.addColorStop(0.6, "#e31c23");
    pegGrad.addColorStop(1, "#9e0b12");
    ctx.beginPath();
    ctx.arc(pegX, pegY, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = pegGrad;
    ctx.fill();

    ctx.fillStyle = tone.text;
    ctx.font = `700 ${Math.max(28, Math.floor(h * 0.42))}px "Bebas Neue", "Arial Black", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    ctx.fillText(String(tool.name).toUpperCase(), x + w / 2, y + h / 2 - 1);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  function draw() {
    const w = canvas.width / state.dpr;
    const h = canvas.height / state.dpr;
    const rim = 16;
    const innerX = rim;
    const innerW = w - rim * 2;

    ctx.clearRect(0, 0, w, h);

    const frameGrad = ctx.createLinearGradient(0, 0, w, 0);
    frameGrad.addColorStop(0, "#6a737c");
    frameGrad.addColorStop(0.35, "#e8eef4");
    frameGrad.addColorStop(0.55, "#9aa3ad");
    frameGrad.addColorStop(1, "#5c656e");
    drawRoundedRect(0, 0, w, h, 18);
    ctx.fillStyle = frameGrad;
    ctx.fill();

    ctx.fillStyle = "#0d1117";
    ctx.fillRect(innerX, 8, innerW, h - 16);

    ctx.save();
    ctx.beginPath();
    ctx.rect(innerX, 8, innerW, h - 16);
    ctx.clip();

    const first = Math.floor(-state.offset / state.slotH) - 1;
    for (let i = 0; i < VISIBLE + 3; i += 1) {
      const index = first + i;
      const y = state.offset + index * state.slotH;
      drawSlot(innerX, y, innerW, state.slotH, index);
    }
    ctx.restore();

    const bandY = (h - state.slotH) / 2;
    ctx.strokeStyle = "rgba(240, 213, 106, 0.9)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(innerX, bandY);
    ctx.lineTo(innerX + innerW, bandY);
    ctx.moveTo(innerX, bandY + state.slotH);
    ctx.lineTo(innerX + innerW, bandY + state.slotH);
    ctx.stroke();
    ctx.fillStyle = "rgba(240, 213, 106, 0.08)";
    ctx.fillRect(innerX, bandY, innerW, state.slotH);

    const fadeTop = ctx.createLinearGradient(0, 8, 0, h * 0.28);
    fadeTop.addColorStop(0, "rgba(7, 9, 13, 0.88)");
    fadeTop.addColorStop(1, "rgba(7, 9, 13, 0)");
    ctx.fillStyle = fadeTop;
    ctx.fillRect(innerX, 8, innerW, h * 0.28);

    const fadeBot = ctx.createLinearGradient(0, h * 0.72, 0, h - 8);
    fadeBot.addColorStop(0, "rgba(7, 9, 13, 0)");
    fadeBot.addColorStop(1, "rgba(7, 9, 13, 0.88)");
    ctx.fillStyle = fadeBot;
    ctx.fillRect(innerX, h * 0.72, innerW, h * 0.28 - 8);

    for (let i = 0; i < VISIBLE; i += 1) {
      const cy = 8 + (i + 0.5) * state.slotH;
      const pegGrad = ctx.createRadialGradient(w - 8, cy - 2, 1, w - 8, cy, 6);
      pegGrad.addColorStop(0, "#ff6b6b");
      pegGrad.addColorStop(0.55, "#e31c23");
      pegGrad.addColorStop(1, "#9e0b12");
      ctx.beginPath();
      ctx.arc(w - 8, cy, 5, 0, Math.PI * 2);
      ctx.fillStyle = pegGrad;
      ctx.fill();
      ctx.strokeStyle = "#d8dee6";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function syncSelection(silent) {
    const index = currentIndex();
    const tool = toolAt(index);
    if (!tool) return;

    selectedMeta.textContent = tool.description || "";
    liveSelected.textContent = `Selected ${tool.name}`;
    openBtn.disabled = !tool.url;
    openBtn.dataset.url = tool.url || "";
    openBtn.setAttribute("aria-label", `Open ${tool.name}`);

    if (!silent && index !== state.lastIndex) {
      playClick(0.75);
      bumpClicker();
      state.lastIndex = index;
    } else if (silent) {
      state.lastIndex = index;
    }
  }

  function startLoop() {
    if (state.looping) return;
    state.looping = true;

    const run = () => {
      if (!state.dragging) {
        const nearest = currentIndex();
        const target = snapOffsetForIndex(nearest);
        const dist = target - state.offset;

        if (Math.abs(state.velocity) < 0.15 && Math.abs(dist) < 0.6) {
          state.offset = target;
          state.velocity = 0;
          draw();
          syncSelection(false);
          state.looping = false;
          return;
        }

        state.velocity += dist * 0.08;
        state.velocity *= 0.86;
        state.offset += state.velocity;
      }

      draw();
      if (currentIndex() !== state.lastIndex) syncSelection(false);
      requestAnimationFrame(run);
    };

    requestAnimationFrame(run);
  }

  function resize() {
    const cssW = canvas.clientWidth || 360;
    const cssH = Math.round(cssW * (720 / 640));
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.round(cssW * state.dpr);
    canvas.height = Math.round(cssH * state.dpr);
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    state.slotH = cssH / VISIBLE;
    draw();
  }

  function onPointerDown(e) {
    ensureAudio();
    state.dragging = true;
    state.velocity = 0;
    state.lastY = e.clientY;
    state.lastT = performance.now();
    canvas.setPointerCapture?.(e.pointerId);
    hint.style.opacity = "0.35";
    startLoop();
  }

  function onPointerMove(e) {
    if (!state.dragging) return;
    const now = performance.now();
    const dy = e.clientY - state.lastY;
    const dt = Math.max(8, now - state.lastT);
    state.offset += dy;
    state.velocity = (dy / dt) * 16;
    state.lastY = e.clientY;
    state.lastT = now;
  }

  function onPointerUp() {
    if (!state.dragging) return;
    state.dragging = false;
    if (Math.abs(state.velocity) > 18) state.velocity *= 1.15;
    startLoop();
  }

  openBtn.addEventListener("click", () => {
    const url = openBtn.dataset.url;
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  });

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      ensureAudio();
      state.velocity += e.deltaY * 0.08;
      startLoop();
    },
    { passive: false }
  );

  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      ensureAudio();
      state.velocity += (e.key === "ArrowUp" ? 1 : -1) * 12;
      startLoop();
    } else if ((e.key === "Enter" || e.key === " ") && !openBtn.disabled) {
      e.preventDefault();
      openBtn.click();
    }
  });

  window.addEventListener("resize", resize);

  if (!tools.length) {
    hint.textContent = "Unable to load coding tools.";
    return;
  }

  resize();
  state.offset = snapOffsetForIndex(0);
  draw();
  syncSelection(true);
  hint.textContent = "Swipe or drag the wheel up or down";
})();
