(() => {
  const SLOT_HEIGHT = () =>
    parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--slot-h")) || 92;

  const tones = ["black", "mint", "cream", "green-deep"];
  const viewport = document.getElementById("wheelViewport");
  const drum = document.getElementById("wheelDrum");
  const openBtn = document.getElementById("openBtn");
  const selectedMeta = document.getElementById("selectedMeta");
  const clicker = document.getElementById("clicker");
  const hint = document.getElementById("hint");

  let tools = [];
  let offset = 0;
  let velocity = 0;
  let dragging = false;
  let lastY = 0;
  let lastT = 0;
  let lastIndex = 0;
  let rafId = 0;
  let copies = 9;
  let audioCtx = null;

  function ensureAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
  }

  function playClick(intensity = 1) {
    ensureAudio();
    if (!audioCtx) return;

    const t0 = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

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
    gain.connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.08);
  }

  function bumpClicker() {
    clicker.classList.remove("tick");
    // Force reflow so rapid ticks still animate
    void clicker.offsetWidth;
    clicker.classList.add("tick");
    window.setTimeout(() => clicker.classList.remove("tick"), 90);
  }

  function toolAtLogicalIndex(index) {
    const n = tools.length;
    return tools[((index % n) + n) % n];
  }

  function buildSlots() {
    drum.innerHTML = "";
    const total = tools.length * copies;
    for (let i = 0; i < total; i += 1) {
      const tool = toolAtLogicalIndex(i);
      const slot = document.createElement("div");
      slot.className = "slot";
      slot.dataset.tone = tones[i % tones.length];
      slot.dataset.index = String(i);
      slot.setAttribute("role", "option");
      slot.id = `slot-${i}`;

      const name = document.createElement("span");
      name.className = "slot-name";
      name.textContent = tool.name;
      slot.appendChild(name);

      const divider = document.createElement("span");
      divider.className = "slot-divider";
      divider.setAttribute("aria-hidden", "true");
      slot.appendChild(divider);

      drum.appendChild(slot);
    }

    // Start near the middle copy so users can spin both ways.
    const midCopy = Math.floor(copies / 2);
    const visible = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--visible-slots")) || 5;
    const centerPad = Math.floor(visible / 2);
    offset = -((midCopy * tools.length + centerPad) * SLOT_HEIGHT());
    applyTransform(false);
    syncSelection(true);
  }

  function applyTransform(animateFrame) {
    drum.style.transform = `translate3d(0, ${offset}px, 0)`;
    if (!animateFrame) return;
  }

  function normalizeOffset() {
    const h = SLOT_HEIGHT();
    const cycle = tools.length * h;
    if (!cycle) return;

    const visible = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--visible-slots")) || 5;
    const centerPad = Math.floor(visible / 2);
    // Keep the drum in the middle copies so infinite scroll never runs out.
    const min = -((copies - 2) * tools.length + centerPad) * h;
    const max = -(1 * tools.length + centerPad) * h;

    while (offset < min) offset += cycle;
    while (offset > max) offset -= cycle;
  }

  function currentIndex() {
    const h = SLOT_HEIGHT();
    const visible = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--visible-slots")) || 5;
    const centerPad = Math.floor(visible / 2);
    // offset is negative; center slot index = -offset/h - centerPad rounded
    return Math.round(-offset / h) - centerPad;
  }

  function snapOffsetForIndex(index) {
    const h = SLOT_HEIGHT();
    const visible = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--visible-slots")) || 5;
    const centerPad = Math.floor(visible / 2);
    return -((index + centerPad) * h);
  }

  function syncSelection(silent) {
    const index = currentIndex();
    const tool = toolAtLogicalIndex(index);
    if (!tool) return;

    drum.setAttribute("aria-activedescendant", `slot-${((index % (tools.length * copies)) + tools.length * copies) % (tools.length * copies)}`);
    selectedMeta.textContent = tool.description || "";
    openBtn.disabled = !tool.url;
    openBtn.dataset.url = tool.url || "";
    openBtn.setAttribute("aria-label", `Open ${tool.name}`);

    if (!silent && index !== lastIndex) {
      const delta = Math.min(3, Math.abs(index - lastIndex));
      playClick(0.65 + delta * 0.2);
      bumpClicker();
      lastIndex = index;
    } else if (silent) {
      lastIndex = index;
    }
  }

  function tick() {
    if (!dragging) {
      // Friction + soft snap toward nearest slot
      const nearest = currentIndex();
      const target = snapOffsetForIndex(nearest);
      const dist = target - offset;

      if (Math.abs(velocity) < 0.15 && Math.abs(dist) < 0.6) {
        offset = target;
        velocity = 0;
        applyTransform(true);
        normalizeOffset();
        applyTransform(true);
        syncSelection(false);
        rafId = 0;
        return;
      }

      // Blend coasting with magnetic snap
      velocity += dist * 0.08;
      velocity *= 0.86;
      offset += velocity;
    }

    normalizeOffset();
    applyTransform(true);

    const index = currentIndex();
    if (index !== lastIndex) {
      syncSelection(false);
    }

    rafId = requestAnimationFrame(tick);
  }

  function startLoop() {
    if (!rafId) rafId = requestAnimationFrame(tick);
  }

  function onPointerDown(e) {
    ensureAudio();
    dragging = true;
    velocity = 0;
    lastY = e.clientY;
    lastT = performance.now();
    viewport.setPointerCapture?.(e.pointerId);
    hint.style.opacity = "0.35";
    startLoop();
  }

  function onPointerMove(e) {
    if (!dragging) return;
    const now = performance.now();
    const dy = e.clientY - lastY;
    const dt = Math.max(8, now - lastT);
    offset += dy;
    velocity = (dy / dt) * 16;
    lastY = e.clientY;
    lastT = now;
  }

  function onPointerUp() {
    if (!dragging) return;
    dragging = false;
    // Give a little coast if the flick was strong
    if (Math.abs(velocity) > 18) {
      velocity *= 1.15;
    }
    startLoop();
  }

  function onWheel(e) {
    e.preventDefault();
    ensureAudio();
    velocity += e.deltaY * 0.08;
    startLoop();
  }

  openBtn.addEventListener("click", () => {
    const url = openBtn.dataset.url;
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  });

  viewport.addEventListener("pointerdown", onPointerDown);
  viewport.addEventListener("pointermove", onPointerMove);
  viewport.addEventListener("pointerup", onPointerUp);
  viewport.addEventListener("pointercancel", onPointerUp);
  viewport.addEventListener("wheel", onWheel, { passive: false });

  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      ensureAudio();
      const dir = e.key === "ArrowUp" ? 1 : -1;
      velocity += dir * 12;
      startLoop();
    } else if (e.key === "Enter" || e.key === " ") {
      if (!openBtn.disabled) {
        e.preventDefault();
        openBtn.click();
      }
    }
  });

  fetch("tools.json")
    .then((res) => {
      if (!res.ok) throw new Error("Failed to load tools.json");
      return res.json();
    })
    .then((data) => {
      tools = Array.isArray(data) ? data.filter((t) => t && t.name) : [];
      if (!tools.length) throw new Error("No tools found");
      buildSlots();
      hint.textContent = "Swipe or drag the wheel up or down";
    })
    .catch((err) => {
      console.error(err);
      hint.textContent = "Unable to load coding tools.";
      selectedMeta.textContent = "";
    });
})();
