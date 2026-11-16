let ctx;
/** Short two-note chime: rising when accepted, falling when rejected. Silent if blocked. */
export function chime(good = true) {
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    const [a, b] = good ? [660, 880] : [440, 330];
    [a, b].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = f;
      const t = ctx.currentTime + i * 0.14;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.16, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.32);
    });
  } catch {
    /* autoplay blocked or no audio device */
  }
}
