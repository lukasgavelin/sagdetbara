/**
 * Tidsbaserad rundtimer. Räknar från en absolut sluttid i stället för att
 * räkna ner med setInterval, så den inte driver eller tappar tid när
 * webbläsaren stryper timers i bakgrunden.
 * @license MIT
 */

export class RoundTimer {
  /**
   * @param {{
   *   now?: () => number,
   *   setInterval?: typeof setInterval,
   *   clearInterval?: typeof clearInterval,
   *   tickMs?: number,
   *   onSecond?: (secondsLeft: number) => void,
   *   onExpire?: () => void
   * }} [options]
   */
  constructor({
    now = () => performance.now(),
    setInterval: setIntervalFn = (fn, ms) => setInterval(fn, ms),
    clearInterval: clearIntervalFn = (id) => clearInterval(id),
    tickMs = 200,
    onSecond = () => {},
    onExpire = () => {}
  } = {}) {
    this.now = now;
    this.setIntervalFn = setIntervalFn;
    this.clearIntervalFn = clearIntervalFn;
    this.tickMs = tickMs;
    this.onSecond = onSecond;
    this.onExpire = onExpire;

    this.intervalId = null;
    this.endsAt = 0;
    this.remainingMs = 0;
    this.duration = 0;
    this.lastSecond = null;
    this.running = false;
    this.paused = false;
  }

  /** Sekunder kvar (avrundat uppåt) */
  get secondsLeft() {
    const ms = this.paused || !this.running ? this.remainingMs : Math.max(0, this.endsAt - this.now());
    return Math.ceil(ms / 1000);
  }

  /** @param {number} seconds */
  start(seconds) {
    this.stop();
    this.duration = seconds;
    this.remainingMs = seconds * 1000;
    this.endsAt = this.now() + this.remainingMs;
    this.running = true;
    this.paused = false;
    this.lastSecond = seconds;
    this.#schedule();
  }

  pause() {
    if (!this.running || this.paused) return;
    this.remainingMs = Math.max(0, this.endsAt - this.now());
    this.paused = true;
    this.#unschedule();
  }

  resume() {
    if (!this.running || !this.paused) return;
    this.endsAt = this.now() + this.remainingMs;
    this.paused = false;
    this.#schedule();
  }

  stop() {
    this.#unschedule();
    this.running = false;
    this.paused = false;
  }

  /** Kör en kontroll direkt (t.ex. när sidan blir synlig igen) */
  tick() {
    if (!this.running || this.paused) return;
    const msLeft = Math.max(0, this.endsAt - this.now());
    const seconds = Math.ceil(msLeft / 1000);
    if (seconds !== this.lastSecond) {
      this.lastSecond = seconds;
      this.onSecond(seconds);
    }
    if (msLeft <= 0) {
      this.stop();
      this.remainingMs = 0;
      this.onExpire();
    }
  }

  #schedule() {
    this.#unschedule();
    this.intervalId = this.setIntervalFn(() => this.tick(), this.tickMs);
  }

  #unschedule() {
    if (this.intervalId !== null) {
      this.clearIntervalFn(this.intervalId);
      this.intervalId = null;
    }
  }
}
