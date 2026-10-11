/**
 * Synthesized sound effects with Web Audio: an engine tone that follows speed, gunshots and impacts
 * as short noise bursts, and a two-tone siren while the player is wanted. No audio files are used.
 * The context is created on the first user gesture, as browsers require.
 */
export class Sfx {
  private context: AudioContext | null = null;
  private noise: AudioBuffer | null = null;
  private engine: { osc: OscillatorNode; gain: GainNode } | null = null;
  private siren: { osc: OscillatorNode; gain: GainNode; timer: number } | null = null;

  unlock(): void {
    if (this.context) return;
    try {
      this.context = new AudioContext();
      const length = Math.floor(this.context.sampleRate * 0.25);
      this.noise = this.context.createBuffer(1, length, this.context.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    } catch {
      this.context = null;
    }
  }

  /** Engine tone for the car being driven, or null to silence it. */
  setEngine(speedKmh: number | null): void {
    const ctx = this.context;
    if (!ctx) return;
    if (speedKmh === null) {
      if (this.engine) {
        this.engine.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
      }
      return;
    }
    if (!this.engine) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      const gain = ctx.createGain();
      gain.gain.value = 0;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      this.engine = { osc, gain };
    }
    this.engine.osc.frequency.setTargetAtTime(38 + speedKmh * 1.1, ctx.currentTime, 0.05);
    this.engine.gain.gain.setTargetAtTime(0.04, ctx.currentTime, 0.1);
  }

  gunshot(): void {
    this.burst(0.25, 2400, 0.35);
  }

  impact(strength: number): void {
    this.burst(0.18, 220, Math.min(0.5, strength));
  }

  setSiren(on: boolean): void {
    const ctx = this.context;
    if (!ctx) return;
    if (on && !this.siren) {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      const gain = ctx.createGain();
      gain.gain.value = 0.03;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      let high = false;
      const timer = window.setInterval(() => {
        high = !high;
        osc.frequency.setValueAtTime(high ? 950 : 700, ctx.currentTime);
      }, 500);
      this.siren = { osc, gain, timer };
    } else if (!on && this.siren) {
      window.clearInterval(this.siren.timer);
      this.siren.osc.stop();
      this.siren.osc.disconnect();
      this.siren = null;
    }
  }

  private burst(seconds: number, frequency: number, volume: number): void {
    const ctx = this.context;
    if (!ctx || !this.noise) return;
    const source = ctx.createBufferSource();
    source.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + seconds);
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start();
    source.stop(ctx.currentTime + seconds);
  }
}
