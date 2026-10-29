/**
 * Säg det bara! – Webbapplikation för sällskapsspel
 * Clean Code & Säkerhetsoptimerad implementation
 * @license MIT
 */

/**
 * Konfigurationskonstanter för spelet
 */
const CONFIG = Object.freeze({
  MIN_TEAMS: 2,
  MAX_TEAMS: 6,
  MAX_CUSTOM_WORDS: 150,
  MAX_WORD_LENGTH: 35,
  MAX_TEAM_NAME_LENGTH: 20,
  SUDDEN_DEATH_SECONDS: 25,
  DEFAULT_ROUND_TIME: 60,
  DEFAULT_TARGET_SCORE: 50,
  SWIPE_THRESHOLD: 85,
  TILT_THRESHOLD: 100,
  STORAGE_KEY: 'sag_det_bara_custom_words_v1'
});

const PRESET_COLORS = Object.freeze([
  '#3b82f6', // Blå
  '#ef4444', // Röd
  '#10b981', // Grön
  '#f59e0b', // Gul
  '#8b5cf6', // Lila
  '#ec4899', // Rosa
]);

const PRESET_TEAM_NAMES = Object.freeze([
  'Lag Blixten',
  'Lag Snillena',
  'Lag Raketen',
  'Lag Stjärnorna',
  'Lag Tigrarna',
  'Lag Mästarna'
]);

/**
 * Säkerhetsfunktion: Sanerar text för att förhindra XSS
 * @param {string} str 
 * @returns {string}
 */
function sanitizeText(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>&"'/]/g, (char) => {
    switch (char) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      case '/': return '&#x2F;';
      default: return char;
    }
  }).trim();
}

/**
 * Hjälpfunktion för att säkert skapa DOM-element med attribut och text
 * @param {string} tag 
 * @param {Object} options 
 * @returns {HTMLElement}
 */
function createElement(tag, options = {}) {
  const el = document.createElement(tag);
  if (options.className) el.className = options.className;
  if (options.textContent !== undefined) el.textContent = options.textContent;
  if (options.title) el.title = options.title;
  if (options.style) {
    Object.assign(el.style, options.style);
  }
  if (options.dataset) {
    Object.entries(options.dataset).forEach(([k, v]) => {
      el.dataset[k] = v;
    });
  }
  return el;
}

/**
 * Huvudklass för spellogik och gränssnitt
 */
class SagDetBaraGame {
  constructor() {
    // Ordbas
    this.allWords = [];
    this.availableWords = [];
    this.usedWords = [];
    this.customWords = [];

    // Paket
    this.selectedPackages = new Set(['standard', 'party']);

    // Inställningar
    this.targetScore = CONFIG.DEFAULT_TARGET_SCORE;
    this.roundTime = CONFIG.DEFAULT_ROUND_TIME;
    this.baseRoundTime = CONFIG.DEFAULT_ROUND_TIME;
    this.passPenalty = true;
    this.soundEnabled = true;
    this.vibrateEnabled = true;

    // Lag
    this.teams = [
      { id: 1, name: 'Lag Blå', color: '#3b82f6', score: 0, totalCorrect: 0, totalPass: 0, bestRound: 0 },
      { id: 2, name: 'Lag Röd', color: '#ef4444', score: 0, totalCorrect: 0, totalPass: 0, bestRound: 0 }
    ];

    // Status
    this.currentTeamIndex = 0;
    this.roundNumber = 1;
    this.currentWord = null;
    this.roundWords = [];
    this.timeLeft = CONFIG.DEFAULT_ROUND_TIME;
    this.timerInterval = null;
    this.isPaused = false;
    this.currentView = 'settings';

    // Sudden Death
    this.isSuddenDeath = false;
    this.suddenDeathTeams = [];
    this.suddenDeathCurrentIdx = 0;
    this.suddenDeathScores = {};

    // Touch & Swipe
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.cardCurrentX = 0;
    this.cardCurrentY = 0;
    this.isDraggingCard = false;

    // Resursrensning
    this.confettiAnimationFrame = null;

    // DOM-cache
    this.dom = {};
  }

  /**
   * Startar och initierar applikationen
   */
  async init() {
    this.cacheDom();
    this.loadCustomWords();
    this.bindEvents();
    this.registerPWA();
    await this.loadWords();
    this.renderSettings();
    this.showView('settings');
  }

  /**
   * Registrerar Progressive Web App (PWA) Service Worker
   */
  registerPWA() {
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('./sw.js').catch((err) => {
        // Tyst felhantering om offline eller i sandlåda
      });
    }
  }

  /**
   * Cachlagrar ofta använda DOM-element
   */
  cacheDom() {
    this.dom = {
      views: {
        settings: document.getElementById('view-settings'),
        ready: document.getElementById('view-ready'),
        game: document.getElementById('view-game'),
        review: document.getElementById('view-review'),
        scoreboard: document.getElementById('view-scoreboard'),
        suddenDeath: document.getElementById('view-sudden-death'),
        victory: document.getElementById('view-victory')
      },
      teamList: document.getElementById('team-list'),
      btnAddTeam: document.getElementById('btn-add-team'),
      packageCards: document.querySelectorAll('.package-card'),
      btnOpenCustomWords: document.getElementById('btn-open-custom-words'),
      customWordsCount: document.getElementById('custom-words-count'),
      targetChips: document.querySelectorAll('[data-target-score]'),
      timeChips: document.querySelectorAll('[data-round-time]'),
      togglePenalty: document.getElementById('toggle-penalty'),
      toggleSound: document.getElementById('toggle-sound'),
      btnStartGame: document.getElementById('btn-start-game'),

      // Modal Egna Ord
      customWordsModal: document.getElementById('custom-words-modal'),
      btnCloseCustomModal: document.getElementById('btn-close-custom-modal'),
      btnSaveCustomModal: document.getElementById('btn-save-custom-modal'),
      inputCustomWord: document.getElementById('input-custom-word'),
      btnAddCustomWord: document.getElementById('btn-add-custom-word'),
      customWordsList: document.getElementById('custom-words-list'),
      btnClearAllCustom: document.getElementById('btn-clear-all-custom'),

      // Ready View
      readyTeamBadge: document.getElementById('ready-team-badge'),
      readyTeamName: document.getElementById('ready-team-name'),
      readyRoundNum: document.getElementById('ready-round-num'),
      readyTeamScore: document.getElementById('ready-team-score'),
      btnBeginRound: document.getElementById('btn-begin-round'),

      // Game View
      gameTeamDot: document.getElementById('game-team-dot'),
      gameTeamName: document.getElementById('game-team-name'),
      timerNumber: document.getElementById('timer-number'),
      timerBarFill: document.getElementById('timer-bar-fill'),
      liveCorrectCount: document.getElementById('live-correct-count'),
      livePassCount: document.getElementById('live-pass-count'),
      wordCard: document.getElementById('word-card'),
      wordCategory: document.getElementById('word-category'),
      wordText: document.getElementById('word-text'),
      stampCorrect: document.getElementById('stamp-correct'),
      stampPass: document.getElementById('stamp-pass'),
      btnPass: document.getElementById('btn-action-pass'),
      btnCorrect: document.getElementById('btn-action-correct'),
      btnPause: document.getElementById('btn-pause-game'),
      pauseOverlay: document.getElementById('pause-overlay'),
      btnResume: document.getElementById('btn-resume-game'),
      btnFinishEarly: document.getElementById('btn-finish-early'),
      btnDiscardRound: document.getElementById('btn-discard-round'),

      // Review View
      reviewTeamName: document.getElementById('review-team-name'),
      reviewPointsSummary: document.getElementById('review-points-summary'),
      reviewCorrectCount: document.getElementById('review-correct-count'),
      reviewPassCount: document.getElementById('review-pass-count'),
      reviewList: document.getElementById('review-list'),
      btnConfirmRound: document.getElementById('btn-confirm-round'),

      // Scoreboard View
      scoreboardList: document.getElementById('scoreboard-list'),
      scoreboardTargetHint: document.getElementById('scoreboard-target-hint'),
      btnNextRound: document.getElementById('btn-next-round'),

      // Sudden Death View
      suddenDeathTeams: document.getElementById('sudden-death-teams'),
      btnStartSuddenDeath: document.getElementById('btn-start-sudden-death'),

      // Victory View
      victoryTeamName: document.getElementById('victory-team-name'),
      statWinnerPoints: document.getElementById('stat-winner-points'),
      statTotalCorrect: document.getElementById('stat-total-correct'),
      statTotalPass: document.getElementById('stat-total-pass'),
      statAccuracy: document.getElementById('stat-accuracy'),
      btnPlayAgainSame: document.getElementById('btn-play-again-same'),
      btnPlayNewGame: document.getElementById('btn-play-new-game'),

      // Header controls
      headerSoundToggle: document.getElementById('header-sound-toggle'),
      confettiCanvas: document.getElementById('confetti-canvas')
    };
  }

  // =========================================================================
  // Egna ord (localStorage & Säkerhet)
  // =========================================================================
  loadCustomWords() {
    try {
      const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          this.customWords = parsed
            .map(w => sanitizeText(String(w)))
            .filter(w => w.length > 0 && w.length <= CONFIG.MAX_WORD_LENGTH)
            .slice(0, CONFIG.MAX_CUSTOM_WORDS);
        }
      }
    } catch (e) {
      this.customWords = [];
    }
    this.updateCustomWordsCountUI();
  }

  saveCustomWords() {
    try {
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(this.customWords));
    } catch (e) {
      console.warn('Kunde inte spara till localStorage', e);
    }
    this.updateCustomWordsCountUI();
  }

  updateCustomWordsCountUI() {
    if (this.dom.customWordsCount) {
      this.dom.customWordsCount.textContent = this.customWords.length;
    }
  }

  renderCustomWordsModal() {
    this.dom.customWordsList.innerHTML = '';
    if (this.customWords.length === 0) {
      const emptyNote = createElement('span', {
        className: 'empty-custom-note',
        textContent: 'Inga egna ord än. Skriv ett ord ovan!'
      });
      emptyNote.style.color = 'var(--text-muted)';
      emptyNote.style.fontSize = '0.9rem';
      emptyNote.style.fontStyle = 'italic';
      this.dom.customWordsList.appendChild(emptyNote);
      return;
    }

    this.customWords.forEach((word, idx) => {
      const tag = createElement('div', { className: 'custom-word-tag' });
      const textSpan = createElement('span', { textContent: word });
      const removeBtn = createElement('span', {
        className: 'custom-word-tag-remove',
        textContent: '✕',
        title: 'Ta bort ord'
      });

      removeBtn.addEventListener('click', () => {
        this.customWords.splice(idx, 1);
        this.saveCustomWords();
        this.renderCustomWordsModal();
      });

      tag.appendChild(textSpan);
      tag.appendChild(removeBtn);
      this.dom.customWordsList.appendChild(tag);
    });
  }

  addCustomWord(rawWord) {
    const clean = sanitizeText(rawWord);
    if (!clean) return;

    if (this.customWords.length >= CONFIG.MAX_CUSTOM_WORDS) {
      alert(`Max ${CONFIG.MAX_CUSTOM_WORDS} egna ord tillåtna.`);
      return;
    }

    if (!this.customWords.includes(clean)) {
      this.customWords.push(clean.slice(0, CONFIG.MAX_WORD_LENGTH));
      this.saveCustomWords();
      this.renderCustomWordsModal();
      if (this.dom.inputCustomWord) {
        this.dom.inputCustomWord.value = '';
      }
    }
  }

  // =========================================================================
  // Ordbashantering & Ordpaket
  // =========================================================================
  async loadWords() {
    if (window.ALIAS_WORDS && Array.isArray(window.ALIAS_WORDS) && window.ALIAS_WORDS.length > 0) {
      this.allWords = [...window.ALIAS_WORDS];
    } else {
      try {
        const response = await fetch('words.json');
        if (!response.ok) throw new Error('Kunde inte läsa words.json');
        this.allWords = await response.json();
      } catch (e) {
        this.allWords = this.getFallbackWords();
      }
    }
    this.resetWordPool();
  }

  getFallbackWords() {
    return [
      { id: 1, word: "Dammsugare", category: "Föremål", package: "standard" },
      { id: 2, word: "Kaffekopp", category: "Föremål", package: "standard" },
      { id: 3, word: "Förfest", category: "Party", package: "party" },
      { id: 4, word: "Karaoke", category: "Party", package: "party" },
      { id: 5, word: "Gosedjur", category: "Familj", package: "familj" },
      { id: 6, word: "Paradox", category: "Klurigt", package: "klurigt" }
    ];
  }

  resetWordPool() {
    let pool = this.allWords.filter(w => {
      const pkg = w.package || 'standard';
      return this.selectedPackages.has(pkg);
    });

    if (pool.length === 0) {
      pool = [...this.allWords];
    }

    if (this.customWords.length > 0) {
      const customObjects = this.customWords.map((w, i) => ({
        id: `custom_${i}_${Date.now()}`,
        word: w,
        category: 'Eget ord ⭐',
        difficulty: 'blandad',
        package: 'custom'
      }));
      pool = [...pool, ...customObjects];
    }

    this.availableWords = [...pool];
    this.usedWords = [];
    this.shuffle(this.availableWords);
  }

  /**
   * Fisher-Yates algoritm för opartisk blandning
   */
  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  getNextWord() {
    if (this.availableWords.length === 0) {
      this.availableWords = [...this.usedWords];
      this.usedWords = [];
      this.shuffle(this.availableWords);
    }
    const wordObj = this.availableWords.pop();
    this.usedWords.push(wordObj);
    return wordObj;
  }

  // =========================================================================
  // Vy-hantering
  // =========================================================================
  showView(viewName) {
    this.currentView = viewName;
    this.stopConfetti();

    Object.keys(this.dom.views).forEach(key => {
      const viewEl = this.dom.views[key];
      if (viewEl) {
        if (key === viewName) {
          viewEl.classList.add('active');
        } else {
          viewEl.classList.remove('active');
        }
      }
    });

    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  // =========================================================================
  // Inställningar & Laghantering
  // =========================================================================
  renderSettings() {
    this.dom.teamList.innerHTML = '';
    this.teams.forEach((team, index) => {
      const item = createElement('div', { className: 'team-item' });

      const colorBox = createElement('div', {
        className: 'team-color-picker',
        title: 'Klicka för att ändra färg'
      });
      colorBox.style.backgroundColor = team.color;
      colorBox.addEventListener('click', () => {
        const nextColorIdx = (PRESET_COLORS.indexOf(team.color) + 1) % PRESET_COLORS.length;
        team.color = PRESET_COLORS[nextColorIdx];
        colorBox.style.backgroundColor = team.color;
      });

      const input = createElement('input', { className: 'team-name-input' });
      input.type = 'text';
      input.value = team.name;
      input.maxLength = CONFIG.MAX_TEAM_NAME_LENGTH;
      input.addEventListener('input', (e) => {
        team.name = sanitizeText(e.target.value) || `Lag ${index + 1}`;
      });

      item.appendChild(colorBox);
      item.appendChild(input);

      if (this.teams.length > CONFIG.MIN_TEAMS) {
        const btnRemove = createElement('button', {
          className: 'btn-remove-team',
          textContent: '✕',
          title: 'Ta bort lag'
        });
        btnRemove.type = 'button';
        btnRemove.addEventListener('click', () => {
          this.teams.splice(index, 1);
          this.renderSettings();
        });
        item.appendChild(btnRemove);
      }

      this.dom.teamList.appendChild(item);
    });

    // Ordpaket-kort
    this.dom.packageCards.forEach(card => {
      const pkg = card.dataset.package;
      card.classList.toggle('active', this.selectedPackages.has(pkg));
    });

    const penaltyLabel = this.dom.togglePenalty?.closest('.toggle-row')?.querySelector('.desc');
    if (penaltyLabel) {
      penaltyLabel.textContent = this.passPenalty ? '-1 poäng vid pass' : '0 poäng vid pass (inga minus)';
    }

    this.updateCustomWordsCountUI();
  }

  addTeam() {
    if (this.teams.length >= CONFIG.MAX_TEAMS) {
      alert(`Max ${CONFIG.MAX_TEAMS} lag stöds.`);
      return;
    }
    const id = Date.now();
    const color = PRESET_COLORS[this.teams.length % PRESET_COLORS.length];
    const defaultName = PRESET_TEAM_NAMES[this.teams.length % PRESET_TEAM_NAMES.length];
    this.teams.push({
      id,
      name: defaultName,
      color,
      score: 0,
      totalCorrect: 0,
      totalPass: 0,
      bestRound: 0
    });
    this.renderSettings();
  }

  // =========================================================================
  // Start av match & Runda
  // =========================================================================
  startGame() {
    this.teams.forEach(t => {
      t.score = 0;
      t.totalCorrect = 0;
      t.totalPass = 0;
      t.bestRound = 0;
    });

    this.currentTeamIndex = 0;
    this.roundNumber = 1;
    this.isSuddenDeath = false;
    this.roundTime = this.baseRoundTime;
    this.resetWordPool();

    this.showReadyView();
  }

  showReadyView() {
    this.clearTimer();
    const activeTeam = this.isSuddenDeath
      ? this.suddenDeathTeams[this.suddenDeathCurrentIdx]
      : this.teams[this.currentTeamIndex];

    this.dom.readyTeamBadge.style.color = activeTeam.color;
    this.dom.readyTeamBadge.querySelector('.team-dot').style.backgroundColor = activeTeam.color;
    this.dom.readyTeamBadge.querySelector('span:last-child').textContent = activeTeam.name;

    this.dom.readyTeamName.textContent = activeTeam.name;
    this.dom.readyTeamName.style.color = activeTeam.color;
    this.dom.readyRoundNum.textContent = this.isSuddenDeath ? '⚡ Sudden Death' : `Omgång ${this.roundNumber}`;
    this.dom.readyTeamScore.textContent = activeTeam.score;

    this.showView('ready');
  }

  startRound() {
    const activeTeam = this.isSuddenDeath
      ? this.suddenDeathTeams[this.suddenDeathCurrentIdx]
      : this.teams[this.currentTeamIndex];

    this.roundWords = [];
    this.timeLeft = this.isSuddenDeath ? CONFIG.SUDDEN_DEATH_SECONDS : this.roundTime;
    this.isPaused = false;
    this.dom.pauseOverlay.classList.remove('active');

    this.dom.gameTeamDot.style.backgroundColor = activeTeam.color;
    this.dom.gameTeamName.textContent = `${activeTeam.name}${this.isSuddenDeath ? ' ⚡' : ''}`;
    this.dom.gameTeamName.style.color = activeTeam.color;

    this.dom.btnPass.textContent = `✕ Pass (${this.passPenalty ? '-1' : '0'})`;

    this.updateLiveScoreDisplay();
    this.updateTimerDisplay();

    this.showNextCard();
    this.showView('game');

    window.soundEffects.init();
    this.startTimer();
  }

  clearTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  startTimer() {
    this.clearTimer();
    const totalTime = this.isSuddenDeath ? CONFIG.SUDDEN_DEATH_SECONDS : this.roundTime;

    this.timerInterval = setInterval(() => {
      if (this.isPaused) return;

      this.timeLeft--;
      this.updateTimerDisplay(totalTime);

      if (this.timeLeft <= 5 && this.timeLeft > 0) {
        window.soundEffects.playTick(1 + (5 - this.timeLeft) * 0.12);
        this.vibrate(50);
      }

      if (this.timeLeft <= 0) {
        this.endRound();
      }
    }, 1000);
  }

  updateTimerDisplay(total = (this.isSuddenDeath ? CONFIG.SUDDEN_DEATH_SECONDS : this.roundTime)) {
    this.dom.timerNumber.textContent = this.timeLeft;

    const percent = Math.max(0, Math.min(100, (this.timeLeft / total) * 100));
    this.dom.timerBarFill.style.width = `${percent}%`;

    if (this.timeLeft <= 5) {
      this.dom.timerNumber.classList.add('timer-warning');
      this.dom.timerBarFill.style.backgroundColor = 'var(--color-red)';
    } else if (this.timeLeft <= 15) {
      this.dom.timerNumber.classList.remove('timer-warning');
      this.dom.timerBarFill.style.backgroundColor = 'var(--color-gold)';
    } else {
      this.dom.timerNumber.classList.remove('timer-warning');
      this.dom.timerBarFill.style.backgroundColor = 'var(--color-green)';
    }
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    this.dom.pauseOverlay.classList.toggle('active', this.isPaused);
  }

  finishRoundEarly() {
    this.isPaused = false;
    this.dom.pauseOverlay.classList.remove('active');
    this.endRound();
  }

  discardRound() {
    this.clearTimer();
    this.isPaused = false;
    this.dom.pauseOverlay.classList.remove('active');
    this.roundWords = [];
    this.showReadyView();
  }

  showNextCard() {
    this.currentWord = this.getNextWord();
    this.dom.wordText.textContent = this.currentWord.word;
    this.dom.wordCategory.textContent = this.currentWord.category || 'Ord';

    this.resetCardTransform();
    this.dom.wordCard.classList.remove('anim-fly-right', 'anim-fly-left', 'anim-fly-up', 'anim-fly-down');
    this.dom.wordCard.classList.add('anim-enter');
    setTimeout(() => {
      this.dom.wordCard.classList.remove('anim-enter');
    }, 250);
  }

  handleWordAction(status) {
    if (!this.currentWord || this.timeLeft <= 0) return;

    this.roundWords.push({
      ...this.currentWord,
      status: status
    });

    if (status === 'correct') {
      window.soundEffects.playCorrect();
      this.vibrate(60);
      this.animateCardExit('right');
    } else {
      window.soundEffects.playPass();
      this.vibrate([40, 30, 40]);
      this.animateCardExit('left');
    }

    this.updateLiveScoreDisplay();

    setTimeout(() => {
      this.showNextCard();
    }, 180);
  }

  animateCardExit(direction) {
    const card = this.dom.wordCard;
    if (direction === 'right') card.classList.add('anim-fly-right');
    else if (direction === 'left') card.classList.add('anim-fly-left');
    else if (direction === 'up') card.classList.add('anim-fly-up');
    else if (direction === 'down') card.classList.add('anim-fly-down');
  }

  updateLiveScoreDisplay() {
    const correctCount = this.roundWords.filter(w => w.status === 'correct').length;
    const passCount = this.roundWords.filter(w => w.status === 'pass').length;
    this.dom.liveCorrectCount.textContent = `✓ ${correctCount}`;
    this.dom.livePassCount.textContent = `✕ ${passCount}`;
  }

  endRound() {
    this.clearTimer();
    window.soundEffects.playBuzzer();
    this.vibrate([250, 100, 250]);

    if (this.currentWord) {
      const alreadyLogged = this.roundWords.some(w => w.id === this.currentWord.id);
      if (!alreadyLogged) {
        this.roundWords.push({
          ...this.currentWord,
          status: 'pass'
        });
      }
    }

    this.showReviewView();
  }

  // =========================================================================
  // Sammanfattning efter runda (Review)
  // =========================================================================
  showReviewView() {
    const activeTeam = this.isSuddenDeath
      ? this.suddenDeathTeams[this.suddenDeathCurrentIdx]
      : this.teams[this.currentTeamIndex];

    this.dom.reviewTeamName.textContent = `${activeTeam.name} - Granska runda`;
    this.dom.reviewTeamName.style.color = activeTeam.color;

    this.renderReviewList();
    this.showView('review');
  }

  renderReviewList() {
    this.dom.reviewList.innerHTML = '';

    let correctCount = 0;
    let passCount = 0;

    this.roundWords.forEach((item) => {
      if (item.status === 'correct') correctCount++;
      if (item.status === 'pass') passCount++;

      const row = createElement('div', { className: 'review-item' });
      const wordSpan = createElement('span', {
        className: 'review-item-word',
        textContent: item.word
      });

      const isCorrect = item.status === 'correct';
      const btnToggle = createElement('button', {
        className: `review-toggle-btn ${isCorrect ? 'review-toggle-correct' : 'review-toggle-pass'}`,
        textContent: isCorrect ? '✓ Rätt (+1)' : `✕ Pass (${this.passPenalty ? '-1' : '0'})`
      });
      btnToggle.type = 'button';

      btnToggle.addEventListener('click', () => {
        item.status = item.status === 'correct' ? 'pass' : 'correct';
        this.renderReviewList();
      });

      row.appendChild(wordSpan);
      row.appendChild(btnToggle);
      this.dom.reviewList.appendChild(row);
    });

    const passModifier = this.passPenalty ? -1 : 0;
    const netRoundPoints = (correctCount * 1) + (passCount * passModifier);

    this.dom.reviewCorrectCount.textContent = correctCount;
    this.dom.reviewPassCount.textContent = passCount;
    this.dom.reviewPointsSummary.textContent = `${netRoundPoints >= 0 ? '+' : ''}${netRoundPoints} p`;
    this.dom.reviewPointsSummary.style.color = netRoundPoints >= 0 ? 'var(--color-green-light)' : 'var(--color-red-light)';
  }

  confirmRoundScore() {
    const activeTeam = this.isSuddenDeath
      ? this.suddenDeathTeams[this.suddenDeathCurrentIdx]
      : this.teams[this.currentTeamIndex];

    const correctCount = this.roundWords.filter(w => w.status === 'correct').length;
    const passCount = this.roundWords.filter(w => w.status === 'pass').length;
    const passModifier = this.passPenalty ? -1 : 0;
    const roundNet = (correctCount * 1) + (passCount * passModifier);

    activeTeam.score += roundNet;
    activeTeam.totalCorrect += correctCount;
    activeTeam.totalPass += passCount;
    if (roundNet > activeTeam.bestRound) {
      activeTeam.bestRound = roundNet;
    }

    // Sudden Death-logik
    if (this.isSuddenDeath) {
      this.suddenDeathScores[activeTeam.id] = roundNet;
      this.suddenDeathCurrentIdx++;

      if (this.suddenDeathCurrentIdx >= this.suddenDeathTeams.length) {
        const maxScore = Math.max(...this.suddenDeathTeams.map(t => this.suddenDeathScores[t.id] ?? -999));
        const winners = this.suddenDeathTeams.filter(t => this.suddenDeathScores[t.id] === maxScore);

        if (winners.length === 1) {
          this.showVictoryView(winners[0]);
          return;
        } else {
          // Vid förnyat oavgjort
          this.suddenDeathTeams = winners;
          this.suddenDeathCurrentIdx = 0;
          this.suddenDeathScores = {};
          this.showSuddenDeathIntro();
          return;
        }
      } else {
        this.showReadyView();
        return;
      }
    }

    // Normal omgång
    this.currentTeamIndex = (this.currentTeamIndex + 1) % this.teams.length;

    if (this.currentTeamIndex === 0) {
      this.roundNumber++;

      const maxScore = Math.max(...this.teams.map(t => t.score));
      if (maxScore >= this.targetScore) {
        const topTeams = this.teams.filter(t => t.score === maxScore);

        if (topTeams.length === 1) {
          this.showVictoryView(topTeams[0]);
          return;
        } else {
          this.isSuddenDeath = true;
          this.suddenDeathTeams = topTeams;
          this.suddenDeathCurrentIdx = 0;
          this.suddenDeathScores = {};
          this.showSuddenDeathIntro();
          return;
        }
      }
    }

    this.showScoreboardView();
  }

  // =========================================================================
  // Sudden Death Intro-vy (XSS-säker DOM-konstruktion)
  // =========================================================================
  showSuddenDeathIntro() {
    this.dom.suddenDeathTeams.innerHTML = '';
    this.suddenDeathTeams.forEach(team => {
      const row = createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.justifyContent = 'space-between';

      const left = createElement('div');
      left.style.display = 'flex';
      left.style.alignItems = 'center';
      left.style.gap = '8px';

      const dot = createElement('span', { className: 'team-dot' });
      dot.style.backgroundColor = team.color;

      const nameSpan = createElement('span', { textContent: team.name });
      nameSpan.style.fontWeight = '700';
      nameSpan.style.fontSize = '1.1rem';
      nameSpan.style.color = '#fff';

      left.appendChild(dot);
      left.appendChild(nameSpan);

      const scoreSpan = createElement('span', { textContent: `${team.score} p` });
      scoreSpan.style.fontWeight = '900';
      scoreSpan.style.fontSize = '1.2rem';
      scoreSpan.style.color = team.color;

      row.appendChild(left);
      row.appendChild(scoreSpan);
      this.dom.suddenDeathTeams.appendChild(row);
    });

    this.showView('suddenDeath');
  }

  // =========================================================================
  // Poängställning (XSS-säker DOM-konstruktion)
  // =========================================================================
  showScoreboardView() {
    this.dom.scoreboardTargetHint.textContent = `Mål: ${this.targetScore} poäng`;
    this.dom.scoreboardList.innerHTML = '';

    this.teams.forEach((team, idx) => {
      const card = createElement('div', {
        className: `team-score-card ${idx === this.currentTeamIndex ? 'is-active' : ''}`
      });

      const top = createElement('div', { className: 'team-score-top' });
      const nameWrap = createElement('div', { className: 'team-score-name' });

      const dot = createElement('span', { className: 'team-dot' });
      dot.style.backgroundColor = team.color;

      const nameSpan = createElement('span', { textContent: team.name });
      nameWrap.appendChild(dot);
      nameWrap.appendChild(nameSpan);

      if (idx === this.currentTeamIndex) {
        const badge = createElement('span', { textContent: 'Nästa tur' });
        badge.style.fontSize = '0.75rem';
        badge.style.background = 'var(--color-accent)';
        badge.style.padding = '2px 8px';
        badge.style.borderRadius = '10px';
        nameWrap.appendChild(badge);
      }

      const points = createElement('div', {
        className: 'team-score-points',
        textContent: `${team.score} p`
      });
      points.style.color = team.color;

      top.appendChild(nameWrap);
      top.appendChild(points);

      const progressWrap = createElement('div', { className: 'team-progress-bar' });
      const percent = Math.min(100, Math.max(0, (team.score / this.targetScore) * 100));
      const fill = createElement('div', { className: 'team-progress-fill' });
      fill.style.width = `${percent}%`;
      fill.style.backgroundColor = team.color;
      progressWrap.appendChild(fill);

      card.appendChild(top);
      card.appendChild(progressWrap);
      this.dom.scoreboardList.appendChild(card);
    });

    this.showView('scoreboard');
  }

  // =========================================================================
  // Vinstskärm
  // =========================================================================
  showVictoryView(winnerTeam) {
    this.dom.victoryTeamName.textContent = `${winnerTeam.name} vinner!`;
    this.dom.victoryTeamName.style.color = winnerTeam.color;

    this.dom.statWinnerPoints.textContent = winnerTeam.score;
    this.dom.statTotalCorrect.textContent = winnerTeam.totalCorrect;
    this.dom.statTotalPass.textContent = winnerTeam.totalPass;

    const totalGuesses = winnerTeam.totalCorrect + winnerTeam.totalPass;
    const accuracy = totalGuesses > 0 ? Math.round((winnerTeam.totalCorrect / totalGuesses) * 100) : 0;
    this.dom.statAccuracy.textContent = `${accuracy}%`;

    window.soundEffects.playVictory();
    this.vibrate([100, 50, 100, 50, 200]);
    this.startConfetti();

    this.showView('victory');
  }

  // =========================================================================
  // Touch & Swipe Event-hantering för Spelkort
  // =========================================================================
  resetCardTransform() {
    this.cardCurrentX = 0;
    this.cardCurrentY = 0;
    this.dom.wordCard.style.transform = '';
    this.dom.stampCorrect.style.opacity = 0;
    this.dom.stampPass.style.opacity = 0;
  }

  onCardPointerDown(e) {
    if (this.currentView !== 'game' || this.isPaused || this.timeLeft <= 0) return;
    this.isDraggingCard = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    this.touchStartX = clientX;
    this.touchStartY = clientY;
    this.dom.wordCard.style.transition = 'none';
  }

  onCardPointerMove(e) {
    if (!this.isDraggingCard) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const dx = clientX - this.touchStartX;
    const dy = clientY - this.touchStartY;
    this.cardCurrentX = dx;
    this.cardCurrentY = dy;

    const rotation = dx * 0.08;
    this.dom.wordCard.style.transform = `translate3d(${dx}px, ${dy}px, 0) rotate(${rotation}deg)`;

    const threshold = CONFIG.TILT_THRESHOLD;
    if (dx > 25 || dy < -25) {
      const intensity = Math.min(1, Math.max(0, Math.max(dx, -dy) / threshold));
      this.dom.stampCorrect.style.opacity = intensity;
      this.dom.stampPass.style.opacity = 0;
    } else if (dx < -25 || dy > 25) {
      const intensity = Math.min(1, Math.max(0, Math.max(-dx, dy) / threshold));
      this.dom.stampPass.style.opacity = intensity;
      this.dom.stampCorrect.style.opacity = 0;
    } else {
      this.dom.stampCorrect.style.opacity = 0;
      this.dom.stampPass.style.opacity = 0;
    }
  }

  onCardPointerUp() {
    if (!this.isDraggingCard) return;
    this.isDraggingCard = false;

    const dx = this.cardCurrentX;
    const dy = this.cardCurrentY;
    const threshold = CONFIG.SWIPE_THRESHOLD;

    if (dx > threshold || dy < -threshold) {
      this.handleWordAction('correct');
    } else if (dx < -threshold || dy > threshold) {
      this.handleWordAction('pass');
    } else {
      this.dom.wordCard.style.transition = 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
      this.resetCardTransform();
    }
  }

  // =========================================================================
  // Hjälpmetoder: Haptik & Konfetti
  // =========================================================================
  vibrate(pattern) {
    if (this.vibrateEnabled && 'vibrate' in navigator) {
      try { navigator.vibrate(pattern); } catch (e) {}
    }
  }

  stopConfetti() {
    if (this.confettiAnimationFrame) {
      cancelAnimationFrame(this.confettiAnimationFrame);
      this.confettiAnimationFrame = null;
    }
    const canvas = this.dom.confettiCanvas;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  startConfetti() {
    this.stopConfetti();
    const canvas = this.dom.confettiCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#f59e0b', '#3b82f6', '#ef4444', '#10b981', '#8b5cf6', '#ec4899', '#ffffff'];

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height * 0.4 - 50,
        size: Math.random() * 8 + 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 3 + 2,
        rot: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 8
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.rotSpeed;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });

      if (particles.some(p => p.y < canvas.height)) {
        this.confettiAnimationFrame = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        this.confettiAnimationFrame = null;
      }
    };
    this.confettiAnimationFrame = requestAnimationFrame(render);
  }

  // =========================================================================
  // Event Bindings
  // =========================================================================
  bindEvents() {
    this.dom.btnAddTeam.addEventListener('click', () => this.addTeam());

    // Ordpaket
    this.dom.packageCards.forEach(card => {
      card.addEventListener('click', () => {
        const pkg = card.dataset.package;
        if (this.selectedPackages.has(pkg)) {
          if (this.selectedPackages.size > 1) {
            this.selectedPackages.delete(pkg);
            card.classList.remove('active');
          } else {
            alert('Minst ett ordpaket måste vara aktivt!');
          }
        } else {
          this.selectedPackages.add(pkg);
          card.classList.add('active');
        }
      });
    });

    // Egna ord modal
    this.dom.btnOpenCustomWords.addEventListener('click', () => {
      this.renderCustomWordsModal();
      this.dom.customWordsModal.classList.add('active');
      this.dom.inputCustomWord.focus();
    });

    this.dom.btnCloseCustomModal.addEventListener('click', () => {
      this.dom.customWordsModal.classList.remove('active');
    });

    this.dom.btnSaveCustomModal.addEventListener('click', () => {
      this.dom.customWordsModal.classList.remove('active');
    });

    this.dom.btnAddCustomWord.addEventListener('click', () => {
      this.addCustomWord(this.dom.inputCustomWord.value);
    });

    this.dom.inputCustomWord.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.addCustomWord(this.dom.inputCustomWord.value);
      }
    });

    this.dom.btnClearAllCustom.addEventListener('click', () => {
      if (confirm('Vill du ta bort alla egna ord?')) {
        this.customWords = [];
        this.saveCustomWords();
        this.renderCustomWordsModal();
      }
    });

    // Målpoäng
    this.dom.targetChips.forEach(chip => {
      chip.addEventListener('click', () => {
        this.dom.targetChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.targetScore = parseInt(chip.dataset.targetScore, 10);
      });
    });

    // Rundtid
    this.dom.timeChips.forEach(chip => {
      chip.addEventListener('click', () => {
        this.dom.timeChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.baseRoundTime = parseInt(chip.dataset.roundTime, 10);
        this.roundTime = this.baseRoundTime;
      });
    });

    // Pass-minus
    this.dom.togglePenalty.addEventListener('click', () => {
      this.passPenalty = !this.passPenalty;
      this.dom.togglePenalty.classList.toggle('active', this.passPenalty);
      this.renderSettings();
    });

    // Ljud
    const toggleAudio = () => {
      this.soundEnabled = !this.soundEnabled;
      this.dom.toggleSound.classList.toggle('active', this.soundEnabled);
      window.soundEffects.toggle(this.soundEnabled);
      this.dom.headerSoundToggle.textContent = this.soundEnabled ? '🔊' : '🔇';
    };
    this.dom.toggleSound.addEventListener('click', toggleAudio);
    this.dom.headerSoundToggle.addEventListener('click', toggleAudio);

    // Navigering
    this.dom.btnStartGame.addEventListener('click', () => this.startGame());
    this.dom.btnBeginRound.addEventListener('click', () => this.startRound());
    this.dom.btnCorrect.addEventListener('click', () => this.handleWordAction('correct'));
    this.dom.btnPass.addEventListener('click', () => this.handleWordAction('pass'));

    // Paus & Avbryt runda
    this.dom.btnPause.addEventListener('click', () => this.togglePause());
    this.dom.btnResume.addEventListener('click', () => this.togglePause());
    this.dom.btnFinishEarly.addEventListener('click', () => this.finishRoundEarly());
    this.dom.btnDiscardRound.addEventListener('click', () => this.discardRound());

    // Review & Scoreboard
    this.dom.btnConfirmRound.addEventListener('click', () => this.confirmRoundScore());
    this.dom.btnNextRound.addEventListener('click', () => this.showReadyView());

    // Sudden Death
    this.dom.btnStartSuddenDeath.addEventListener('click', () => {
      this.showReadyView();
    });

    // Vinst
    this.dom.btnPlayAgainSame.addEventListener('click', () => this.startGame());
    this.dom.btnPlayNewGame.addEventListener('click', () => this.showView('settings'));

    // Touch & Pointer på spelkort
    const card = this.dom.wordCard;
    card.addEventListener('pointerdown', (e) => this.onCardPointerDown(e));
    window.addEventListener('pointermove', (e) => this.onCardPointerMove(e));
    window.addEventListener('pointerup', () => this.onCardPointerUp());
    window.addEventListener('pointercancel', () => this.onCardPointerUp());

    // Tangentbord
    window.addEventListener('keydown', (e) => {
      if (this.currentView !== 'game' || this.timeLeft <= 0) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === ' ') {
        e.preventDefault();
        this.handleWordAction('correct');
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        this.handleWordAction('pass');
      } else if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        this.togglePause();
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.aliasApp = new SagDetBaraGame();
  window.aliasApp.init();
});
