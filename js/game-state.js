/**
 * Spellogik för Säg det bara!: lag, poäng, turordning och Sudden Death.
 * Ren logik – inga DOM-beroenden, fullt testbar.
 * @license MIT
 */
import { CONFIG, WORD_STATUS } from './config.js';

/**
 * Poäng för en ordstatus.
 * @param {string} status
 * @param {boolean} passPenalty
 */
export function pointsFor(status, passPenalty) {
  if (status === WORD_STATUS.CORRECT) return 1;
  if (status === WORD_STATUS.PASS) return passPenalty ? -1 : 0;
  return 0;
}

/**
 * Summerar en rundas ord.
 * @param {Array<{status:string}>} words
 * @param {boolean} passPenalty
 */
export function summarizeRound(words, passPenalty) {
  let correct = 0;
  let pass = 0;
  let skipped = 0;
  for (const w of words) {
    if (w.status === WORD_STATUS.CORRECT) correct++;
    else if (w.status === WORD_STATUS.PASS) pass++;
    else skipped++;
  }
  const net = words.reduce((sum, w) => sum + pointsFor(w.status, passPenalty), 0);
  return { correct, pass, skipped, net };
}

function createTeam(id, { name, color, players = [] }) {
  return {
    id,
    name,
    color,
    players: Array.isArray(players) ? [...players] : [],
    explainingIndex: 0,
    score: 0,
    totalCorrect: 0,
    totalPass: 0,
    bestRound: 0
  };
}

/**
 * @typedef {{type:'scoreboard'} | {type:'ready'} | {type:'victory', winner:object} | {type:'suddenDeath', teams:object[]}} RoundOutcome
 */

export class GameState {
  /**
   * @param {{teams: Array<{name:string,color:string}>, targetScore:number, roundTime:number, passPenalty:boolean}} settings
   */
  constructor({ teams, targetScore, roundTime, passPenalty }) {
    if (!Array.isArray(teams) || teams.length < CONFIG.MIN_TEAMS) {
      throw new Error(`Minst ${CONFIG.MIN_TEAMS} lag krävs`);
    }
    this.teams = teams.map((t, i) => createTeam(i + 1, t));
    this.targetScore = targetScore;
    this.roundTime = roundTime;
    this.passPenalty = passPenalty;

    this.currentTeamIndex = 0;
    this.roundNumber = 1;
    this.roundWords = [];

    this.isSuddenDeath = false;
    this.suddenDeathTeamIds = [];
    this.suddenDeathIndex = 0;
    this.suddenDeathScores = {};
  }

  // ---------------------------------------------------------------------------
  // Turordning
  // ---------------------------------------------------------------------------
  get activeTeam() {
    if (this.isSuddenDeath) {
      return this.teamById(this.suddenDeathTeamIds[this.suddenDeathIndex]);
    }
    return this.teams[this.currentTeamIndex];
  }

  get currentExplainer() {
    const team = this.activeTeam;
    if (!team || !team.players || team.players.length === 0) return null;
    return team.players[team.explainingIndex % team.players.length];
  }

  get currentGuessers() {
    const team = this.activeTeam;
    if (!team || !team.players || team.players.length <= 1) return [];
    const explainerIdx = team.explainingIndex % team.players.length;
    return team.players.filter((_, idx) => idx !== explainerIdx);
  }

  get suddenDeathTeams() {
    return this.suddenDeathTeamIds.map((id) => this.teamById(id));
  }

  teamById(id) {
    return this.teams.find((t) => t.id === id);
  }

  /** Rundans längd i sekunder */
  get roundDuration() {
    return this.isSuddenDeath ? CONFIG.SUDDEN_DEATH_SECONDS : this.roundTime;
  }

  // ---------------------------------------------------------------------------
  // Runda
  // ---------------------------------------------------------------------------
  beginRound() {
    this.roundWords = [];
  }

  /**
   * Registrerar ett ord i rundan.
   * @param {{id:any, word:string, category?:string}} word
   * @param {string} status
   */
  record(word, status) {
    if (!word) return;
    this.roundWords.push({ id: word.id, word: word.word, category: word.category, status });
  }

  /**
   * Avslutar rundan. Ordet som visades när tiden tog slut räknas inte
   * (status SKIPPED), men kan ändras i granskningen.
   * @param {object|null} lastWord
   */
  endRound(lastWord) {
    if (lastWord) this.record(lastWord, WORD_STATUS.SKIPPED);
  }

  /**
   * Växlar status för ett ord i granskningen.
   * Vanliga ord: rätt ↔ pass. Sista ordet: räknas inte → rätt → pass → räknas inte.
   * @param {number} index
   */
  toggleWordStatus(index) {
    const item = this.roundWords[index];
    if (!item) return;
    const { CORRECT, PASS, SKIPPED } = WORD_STATUS;
    if (item.wasSkipped || item.status === SKIPPED) {
      item.wasSkipped = true;
      item.status = { [SKIPPED]: CORRECT, [CORRECT]: PASS, [PASS]: SKIPPED }[item.status];
    } else {
      item.status = item.status === CORRECT ? PASS : CORRECT;
    }
  }

  get roundSummary() {
    return summarizeRound(this.roundWords, this.passPenalty);
  }

  discardRound() {
    this.roundWords = [];
  }

  /**
   * Bokför rundans poäng och går vidare.
   * @returns {RoundOutcome}
   */
  confirmRound() {
    const team = this.activeTeam;
    const { correct, pass, net } = this.roundSummary;

    team.score += net;
    team.totalCorrect += correct;
    team.totalPass += pass;
    team.bestRound = Math.max(team.bestRound, net);
    if (team.players && team.players.length > 0) {
      team.explainingIndex = (team.explainingIndex + 1) % team.players.length;
    }
    this.roundWords = [];

    return this.isSuddenDeath ? this.#advanceSuddenDeath(team, net) : this.#advanceNormal();
  }

  #advanceNormal() {
    this.currentTeamIndex = (this.currentTeamIndex + 1) % this.teams.length;

    // Vinst avgörs bara när alla lag har spelat lika många rundor
    if (this.currentTeamIndex === 0) {
      this.roundNumber++;
      const maxScore = Math.max(...this.teams.map((t) => t.score));
      if (maxScore >= this.targetScore) {
        const top = this.teams.filter((t) => t.score === maxScore);
        if (top.length === 1) return { type: 'victory', winner: top[0] };
        this.#startSuddenDeath(top);
        return { type: 'suddenDeath', teams: top };
      }
    }
    return { type: 'scoreboard' };
  }

  #advanceSuddenDeath(team, net) {
    this.suddenDeathScores[team.id] = net;
    this.suddenDeathIndex++;

    if (this.suddenDeathIndex < this.suddenDeathTeamIds.length) {
      return { type: 'ready' };
    }

    const teams = this.suddenDeathTeams;
    const best = Math.max(...teams.map((t) => this.suddenDeathScores[t.id]));
    const winners = teams.filter((t) => this.suddenDeathScores[t.id] === best);
    if (winners.length === 1) return { type: 'victory', winner: winners[0] };

    this.#startSuddenDeath(winners);
    return { type: 'suddenDeath', teams: winners };
  }

  #startSuddenDeath(teams) {
    this.isSuddenDeath = true;
    this.suddenDeathTeamIds = teams.map((t) => t.id);
    this.suddenDeathIndex = 0;
    this.suddenDeathScores = {};
  }

  // ---------------------------------------------------------------------------
  // Serialisering (för att kunna återuppta en match)
  // ---------------------------------------------------------------------------
  toJSON() {
    return {
      teams: this.teams.map((t) => ({ ...t, players: [...t.players] })),
      targetScore: this.targetScore,
      roundTime: this.roundTime,
      passPenalty: this.passPenalty,
      currentTeamIndex: this.currentTeamIndex,
      roundNumber: this.roundNumber,
      isSuddenDeath: this.isSuddenDeath,
      suddenDeathTeamIds: [...this.suddenDeathTeamIds],
      suddenDeathIndex: this.suddenDeathIndex,
      suddenDeathScores: { ...this.suddenDeathScores }
    };
  }

  /**
   * Återskapar ett spel från sparad data. Kastar fel om datan är ogiltig.
   * @param {any} data
   */
  static fromJSON(data) {
    const isInt = (n) => Number.isInteger(n);
    if (!data || !Array.isArray(data.teams) || data.teams.length < CONFIG.MIN_TEAMS) {
      throw new Error('Ogiltig sparad match');
    }
    const game = new GameState({
      teams: data.teams,
      targetScore: data.targetScore,
      roundTime: data.roundTime,
      passPenalty: Boolean(data.passPenalty)
    });
    game.teams = data.teams.map((t) => {
      if (!isInt(t.id) || !isInt(t.score)) throw new Error('Ogiltigt lag i sparad match');
      return {
        id: t.id,
        name: String(t.name),
        color: String(t.color),
        players: Array.isArray(t.players) ? t.players.map(String) : [],
        explainingIndex: (t.explainingIndex | 0) >= 0 ? (t.explainingIndex | 0) : 0,
        score: t.score,
        totalCorrect: t.totalCorrect | 0,
        totalPass: t.totalPass | 0,
        bestRound: t.bestRound | 0
      };
    });
    if (!isInt(data.currentTeamIndex) || data.currentTeamIndex < 0 || data.currentTeamIndex >= game.teams.length) {
      throw new Error('Ogiltig tur i sparad match');
    }
    game.currentTeamIndex = data.currentTeamIndex;
    game.roundNumber = isInt(data.roundNumber) ? data.roundNumber : 1;
    game.isSuddenDeath = Boolean(data.isSuddenDeath);
    if (game.isSuddenDeath) {
      const ids = (data.suddenDeathTeamIds || []).filter((id) => game.teamById(id));
      if (ids.length < 2) throw new Error('Ogiltig Sudden Death i sparad match');
      game.suddenDeathTeamIds = ids;
      game.suddenDeathIndex = Math.min(Math.max(0, data.suddenDeathIndex | 0), ids.length - 1);
      game.suddenDeathScores = { ...(data.suddenDeathScores || {}) };
    }
    return game;
  }
}
