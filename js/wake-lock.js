/**
 * Håller skärmen tänd under en runda (Screen Wake Lock API).
 * Tyst no-op där API:et saknas.
 * @license MIT
 */
export class WakeLockManager {
  constructor(nav = typeof navigator !== 'undefined' ? navigator : undefined) {
    this.nav = nav;
    this.sentinel = null;
    this.wanted = false;
  }

  get supported() {
    return Boolean(this.nav && 'wakeLock' in this.nav);
  }

  async request() {
    this.wanted = true;
    if (!this.supported || this.sentinel) return;
    try {
      this.sentinel = await this.nav.wakeLock.request('screen');
      this.sentinel.addEventListener?.('release', () => {
        this.sentinel = null;
      });
    } catch {
      this.sentinel = null; // T.ex. lågt batteri eller sidan inte synlig
    }
  }

  async release() {
    this.wanted = false;
    const s = this.sentinel;
    this.sentinel = null;
    if (s) {
      try {
        await s.release();
      } catch {
        /* ignorera */
      }
    }
  }

  /** Låset släpps automatiskt när sidan döljs – begär igen om det behövs */
  async reacquireIfWanted() {
    if (this.wanted && !this.sentinel) await this.request();
  }
}
