/**
 * Säg det bara! – Huvudapplikation (ES-moduler)
 * @license MIT
 */
import {
  CONFIG,
  PRESET_COLORS,
  PRESET_TEAM_NAMES,
  WORD_STATUS,
  DIFFICULTY_MODES
} from './config.js';
import { normalizeText, svGenitive } from './text.js';
import { WordPool, buildPool } from './word-pool.js';
import { GameState } from './game-state.js';
import { RoundTimer } from './timer.js';
import { createStorage } from './storage.js';
import { WakeLockManager } from './wake-lock.js';
import { soundEffects } from './audio.js';
import { ALIAS_WORDS } from '../words.js';

export class AliasApp {
  constructor() {
    this.storage = createStorage();
    this.wakeLock = new WakeLockManager();
    this.timer = null;

    this.settings = this.storage.loadSettings();
    this.customWords = this.storage.loadCustomWords();

    this.game = null;
    this.pool = null;
    this.currentWord = null;
    this.isTransitioning = false;
    this.currentView = 'settings';
    this.isPaused = false;

    // Touch & Swipe
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.cardCurrentX = 0;
    this.cardCurrentY = 0;
    this.isDraggingCard = false;

    this.confettiAnimationFrame = null;
    this.dom = {};
  }

  init() {
    this.cacheDom();
    this.setupTimer();
    this.bindEvents();
    this.registerPWA();
    this.checkSavedGame();
    this.renderSettings();
    this.showView('settings');
  }

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
      resumeBanner: document.getElementById('resume-banner'),
      btnResumeSaved: document.getElementById('btn-resume-saved'),
      btnDismissSaved: document.getElementById('btn-dismiss-saved'),
      teamList: document.getElementById('team-list'),
      btnAddTeam: document.getElementById('btn-add-team'),
      packageCards: document.querySelectorAll('.package-card'),
      btnOpenCustomWords: document.getElementById('btn-open-custom-words'),
      customWordsCount: document.getElementById('custom-words-count'),
      difficultyChips: document.querySelectorAll('[data-difficulty]'),
      targetChips: document.querySelectorAll('[data-target-score]'),
      timeChips: document.querySelectorAll('[data-round-time]'),
      togglePenalty: document.getElementById('toggle-penalty'),
      toggleSound: document.getElementById('toggle-sound'),
      rowVibrate: document.getElementById('row-vibrate'),
      toggleVibrate: document.getElementById('toggle-vibrate'),
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

      // Header controls & Toast container
      headerSoundToggle: document.getElementById('header-sound-toggle'),
      confettiCanvas: document.getElementById('confetti-canvas'),
      toastContainer: document.getElementById('toast-container')
    };
  }

  showToast(message, duration = 3000) {
    if (!this.dom.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    this.dom.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  setupTimer() {
    this.timer = new RoundTimer({
      onSecond: (sec) => {
        this.updateTimerDisplay(sec);
        if (sec <= 5 && sec > 0) {
          soundEffects.playTick(1 + (5 - sec) * 0.12);
          this.vibrate(50);
        }
      },
      onExpire: () => {
        this.endRound();
      }
    });
  }

  registerPWA() {
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('./sw.js').then((reg) => {
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this.showToast('Ny version tillgänglig! Laddar om...', 4000);
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      }).catch(() => {});

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }
  }

  checkSavedGame() {
    const saved = this.storage.loadGame();
    if (saved && this.dom.resumeBanner) {
      this.dom.resumeBanner.style.display = 'flex';
    }
  }

  // =========================================================================
  // Vy-hantering
  // =========================================================================
  showView(viewName) {
    this.currentView = viewName;
    this.stopConfetti();

    Object.keys(this.dom.views).forEach((key) => {
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
  // Inställningar
  // =========================================================================
  renderSettings() {
    this.dom.teamList.innerHTML = '';
    this.settings.teams.forEach((team, index) => {
      const item = document.createElement('div');
      item.className = 'team-item';

      const colorBox = document.createElement('button');
      colorBox.type = 'button';
      colorBox.className = 'team-color-picker';
      colorBox.style.backgroundColor = team.color;
      colorBox.title = 'Klicka för att ändra färg';
      colorBox.setAttribute('aria-label', `Ändra färg för ${team.name}`);
      colorBox.addEventListener('click', () => {
        const nextColorIdx = (PRESET_COLORS.indexOf(team.color) + 1) % PRESET_COLORS.length;
        team.color = PRESET_COLORS[nextColorIdx];
        colorBox.style.backgroundColor = team.color;
        this.saveSettings();
      });

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'team-name-input';
      input.value = team.name;
      input.maxLength = CONFIG.MAX_TEAM_NAME_LENGTH;
      input.setAttribute('aria-label', `Lagnamn ${index + 1}`);
      input.addEventListener('input', (e) => {
        team.name = normalizeText(e.target.value, CONFIG.MAX_TEAM_NAME_LENGTH) || `Lag ${index + 1}`;
        this.saveSettings();
      });

      item.appendChild(colorBox);
      item.appendChild(input);

      if (this.settings.teams.length > CONFIG.MIN_TEAMS) {
        const btnRemove = document.createElement('button');
        btnRemove.type = 'button';
        btnRemove.className = 'btn-remove-team';
        btnRemove.textContent = '✕';
        btnRemove.title = 'Ta bort lag';
        btnRemove.setAttribute('aria-label', `Ta bort ${team.name}`);
        btnRemove.addEventListener('click', () => {
          this.settings.teams.splice(index, 1);
          this.saveSettings();
          this.renderSettings();
        });
        item.appendChild(btnRemove);
      }

      this.dom.teamList.appendChild(item);
    });

    // Ordpaket
    this.dom.packageCards.forEach((card) => {
      const pkg = card.dataset.package;
      const isActive = this.settings.packages.includes(pkg);
      card.classList.toggle('active', isActive);
      card.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    // Svårighetsgrad
    this.dom.difficultyChips.forEach((chip) => {
      const diff = chip.dataset.difficulty;
      chip.classList.toggle('active', this.settings.difficulty === diff);
    });

    // Målställning
    this.dom.targetChips.forEach((chip) => {
      const score = parseInt(chip.dataset.targetScore, 10);
      chip.classList.toggle('active', this.settings.targetScore === score);
    });

    // Rundtid
    this.dom.timeChips.forEach((chip) => {
      const time = parseInt(chip.dataset.roundTime, 10);
      chip.classList.toggle('active', this.settings.roundTime === time);
    });

    // Reglage
    this.dom.togglePenalty.classList.toggle('active', this.settings.passPenalty);
    this.dom.togglePenalty.setAttribute('aria-checked', this.settings.passPenalty ? 'true' : 'false');

    this.dom.toggleSound.classList.toggle('active', this.settings.sound);
    this.dom.toggleSound.setAttribute('aria-checked', this.settings.sound ? 'true' : 'false');
    soundEffects.toggle(this.settings.sound);
    if (this.dom.headerSoundToggle) {
      this.dom.headerSoundToggle.textContent = this.settings.sound ? '🔊' : '🔇';
    }

    // Vibration (dölj rad om enheten saknar stöd)
    if ('vibrate' in navigator && this.dom.rowVibrate) {
      this.dom.rowVibrate.style.display = 'flex';
      this.dom.toggleVibrate.classList.toggle('active', this.settings.vibrate);
      this.dom.toggleVibrate.setAttribute('aria-checked', this.settings.vibrate ? 'true' : 'false');
    } else if (this.dom.rowVibrate) {
      this.dom.rowVibrate.style.display = 'none';
    }

    this.updateCustomWordsCountUI();
  }

  saveSettings() {
    this.storage.saveSettings(this.settings);
  }

  addTeam() {
    if (this.settings.teams.length >= CONFIG.MAX_TEAMS) {
      this.showToast(`Max ${CONFIG.MAX_TEAMS} lag stöds.`);
      return;
    }
    const idx = this.settings.teams.length;
    const usedColors = new Set(this.settings.teams.map((t) => t.color));
    const availableColor = PRESET_COLORS.find((c) => !usedColors.has(c)) || PRESET_COLORS[idx % PRESET_COLORS.length];
    const defaultName = PRESET_TEAM_NAMES[idx % PRESET_TEAM_NAMES.length];

    this.settings.teams.push({
      name: defaultName,
      color: availableColor
    });
    this.saveSettings();
    this.renderSettings();
  }

  // =========================================================================
  // Egna ord (localStorage)
  // =========================================================================
  updateCustomWordsCountUI() {
    if (this.dom.customWordsCount) {
      this.dom.customWordsCount.textContent = this.customWords.length;
    }
  }

  renderCustomWordsModal() {
    this.dom.customWordsList.innerHTML = '';
    if (this.customWords.length === 0) {
      const emptyNote = document.createElement('span');
      emptyNote.className = 'empty-custom-note';
      emptyNote.textContent = 'Inga egna ord än. Skriv ett ord ovan!';
      emptyNote.style.color = 'var(--text-muted)';
      emptyNote.style.fontStyle = 'italic';
      this.dom.customWordsList.appendChild(emptyNote);
      return;
    }

    this.customWords.forEach((word, idx) => {
      const tag = document.createElement('div');
      tag.className = 'custom-word-tag';

      const textSpan = document.createElement('span');
      textSpan.textContent = word;

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'custom-word-tag-remove';
      removeBtn.textContent = '✕';
      removeBtn.title = 'Ta bort ord';
      removeBtn.setAttribute('aria-label', `Ta bort eget ord ${word}`);
      removeBtn.addEventListener('click', () => {
        this.customWords.splice(idx, 1);
        this.storage.saveCustomWords(this.customWords);
        this.updateCustomWordsCountUI();
        this.renderCustomWordsModal();
      });

      tag.appendChild(textSpan);
      tag.appendChild(removeBtn);
      this.dom.customWordsList.appendChild(tag);
    });
  }

  addCustomWord(rawWord) {
    const clean = normalizeText(rawWord, CONFIG.MAX_WORD_LENGTH);
    if (!clean) return;

    if (this.customWords.length >= CONFIG.MAX_CUSTOM_WORDS) {
      this.showToast(`Max ${CONFIG.MAX_CUSTOM_WORDS} egna ord tillåtna.`);
      return;
    }

    const key = clean.toLocaleLowerCase('sv');
    if (this.customWords.some((w) => w.toLocaleLowerCase('sv') === key)) {
      this.showToast('Ordet finns redan!');
      return;
    }

    this.customWords.push(clean);
    this.storage.saveCustomWords(this.customWords);
    this.updateCustomWordsCountUI();
    this.renderCustomWordsModal();
    if (this.dom.inputCustomWord) {
      this.dom.inputCustomWord.value = '';
    }
  }

  // =========================================================================
  // Spelinitiering
  // =========================================================================
  initPool() {
    const { words } = buildPool(ALIAS_WORDS, {
      packages: this.settings.packages,
      difficulty: this.settings.difficulty,
      customWords: this.customWords
    });
    this.pool = new WordPool(words);
  }

  startGame() {
    this.storage.clearGame();
    if (this.dom.resumeBanner) this.dom.resumeBanner.style.display = 'none';

    this.initPool();
    this.game = new GameState({
      teams: this.settings.teams,
      targetScore: this.settings.targetScore,
      roundTime: this.settings.roundTime,
      passPenalty: this.settings.passPenalty
    });

    this.showReadyView();
  }

  resumeSavedGame() {
    const saved = this.storage.loadGame();
    if (!saved) return;
    try {
      this.initPool();
      this.game = GameState.fromJSON(saved);
      if (this.dom.resumeBanner) this.dom.resumeBanner.style.display = 'none';

      if (this.game.isSuddenDeath) {
        this.showSuddenDeathIntro();
      } else {
        this.showScoreboardView();
      }
      this.showToast('Match återupptagen!');
    } catch (e) {
      console.warn('Kunde inte läsa sparad match', e);
      this.storage.clearGame();
      if (this.dom.resumeBanner) this.dom.resumeBanner.style.display = 'none';
      this.startGame();
    }
  }

  showReadyView() {
    this.timer.stop();
    this.wakeLock.release();

    const activeTeam = this.game.activeTeam;
    this.dom.readyTeamBadge.style.color = activeTeam.color;
    this.dom.readyTeamBadge.querySelector('.team-dot').style.backgroundColor = activeTeam.color;
    this.dom.readyTeamBadge.querySelector('span:last-child').textContent = activeTeam.name;

    this.dom.readyTeamName.textContent = svGenitive(activeTeam.name);
    this.dom.readyTeamName.style.color = activeTeam.color;
    this.dom.readyRoundNum.textContent = this.game.isSuddenDeath ? '⚡ Sudden Death' : `Omgång ${this.game.roundNumber}`;
    this.dom.readyTeamScore.textContent = activeTeam.score;

    this.showView('ready');
  }

  // =========================================================================
  // Rundstart & Spel
  // =========================================================================
  startRound() {
    const activeTeam = this.game.activeTeam;
    this.game.beginRound();
    this.isPaused = false;
    this.isTransitioning = false;
    this.dom.pauseOverlay.classList.remove('active');

    this.dom.gameTeamDot.style.backgroundColor = activeTeam.color;
    this.dom.gameTeamName.textContent = `${activeTeam.name}${this.game.isSuddenDeath ? ' ⚡' : ''}`;
    this.dom.gameTeamName.style.color = activeTeam.color;

    this.dom.btnPass.textContent = `✕ Pass (${this.game.passPenalty ? '-1' : '0'})`;

    this.updateLiveScoreDisplay();
    this.showNextCard();
    this.showView('game');

    soundEffects.init();
    this.wakeLock.request();
    this.timer.start(this.game.roundDuration);
  }

  updateTimerDisplay(secondsLeft = this.timer.secondsLeft) {
    this.dom.timerNumber.textContent = secondsLeft;
    const total = this.game.roundDuration;
    const percent = Math.max(0, Math.min(100, (secondsLeft / total) * 100));
    this.dom.timerBarFill.style.width = `${percent}%`;

    if (secondsLeft <= 5) {
      this.dom.timerNumber.classList.add('timer-warning');
      this.dom.timerBarFill.style.backgroundColor = 'var(--color-red)';
    } else if (secondsLeft <= 15) {
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
    if (this.isPaused) {
      this.timer.pause();
      this.wakeLock.release();
    } else {
      this.timer.resume();
      this.wakeLock.request();
    }
  }

  finishRoundEarly() {
    this.isPaused = false;
    this.dom.pauseOverlay.classList.remove('active');
    this.endRound();
  }

  discardRound() {
    this.timer.stop();
    this.wakeLock.release();
    this.isPaused = false;
    this.dom.pauseOverlay.classList.remove('active');
    this.game.discardRound();
    this.showReadyView();
  }

  showNextCard() {
    this.currentWord = this.pool.next();
    this.dom.wordText.textContent = this.currentWord.word;
    this.dom.wordCategory.textContent = this.currentWord.category || 'Ord';

    this.resetCardTransform();
    this.dom.wordCard.classList.remove('anim-fly-right', 'anim-fly-left', 'anim-fly-up', 'anim-fly-down');
    this.dom.wordCard.classList.add('anim-enter');
    setTimeout(() => {
      this.dom.wordCard.classList.remove('anim-enter');
      this.isTransitioning = false;
    }, 200);
  }

  handleWordAction(status) {
    // B2 fix: förhindra dubbeltryck under kortbyte
    if (this.isTransitioning || !this.currentWord || this.timer.secondsLeft <= 0 || this.isPaused) {
      return;
    }
    this.isTransitioning = true;

    this.game.record(this.currentWord, status);
    this.currentWord = null;

    if (status === WORD_STATUS.CORRECT) {
      soundEffects.playCorrect();
      this.vibrate(60);
      this.animateCardExit('right');
    } else {
      soundEffects.playPass();
      this.vibrate([40, 30, 40]);
      this.animateCardExit('left');
    }

    this.updateLiveScoreDisplay();

    setTimeout(() => {
      this.showNextCard();
    }, CONFIG.CARD_TRANSITION_MS);
  }

  animateCardExit(direction) {
    const card = this.dom.wordCard;
    if (direction === 'right') card.classList.add('anim-fly-right');
    else if (direction === 'left') card.classList.add('anim-fly-left');
    else if (direction === 'up') card.classList.add('anim-fly-up');
    else if (direction === 'down') card.classList.add('anim-fly-down');
  }

  updateLiveScoreDisplay() {
    const { correct, pass } = this.game.roundSummary;
    this.dom.liveCorrectCount.textContent = `✓ ${correct}`;
    this.dom.livePassCount.textContent = `✕ ${pass}`;
  }

  endRound() {
    this.timer.stop();
    this.wakeLock.release();
    soundEffects.playBuzzer();
    this.vibrate([250, 100, 250]);

    // R1 fix: sista ordet som visades när tiden tog slut räknas inte (status: SKIPPED)
    this.game.endRound(this.currentWord);
    this.currentWord = null;

    this.showReviewView();
  }

  // =========================================================================
  // Granskning efter runda (Review)
  // =========================================================================
  showReviewView() {
    const activeTeam = this.game.activeTeam;
    this.dom.reviewTeamName.textContent = `${activeTeam.name} - Granska runda`;
    this.dom.reviewTeamName.style.color = activeTeam.color;

    this.renderReviewList();
    this.showView('review');
  }

  renderReviewList() {
    this.dom.reviewList.innerHTML = '';
    const { correct, pass, net } = this.game.roundSummary;

    this.game.roundWords.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'review-item';

      const wordSpan = document.createElement('span');
      wordSpan.className = 'review-item-word';
      wordSpan.textContent = item.word;

      const btnToggle = document.createElement('button');
      btnToggle.type = 'button';
      btnToggle.className = 'review-toggle-btn';

      if (item.status === WORD_STATUS.CORRECT) {
        btnToggle.classList.add('review-toggle-correct');
        btnToggle.textContent = '✓ Rätt (+1)';
      } else if (item.status === WORD_STATUS.PASS) {
        btnToggle.classList.add('review-toggle-pass');
        btnToggle.textContent = `✕ Pass (${this.game.passPenalty ? '-1' : '0'})`;
      } else {
        btnToggle.classList.add('review-toggle-skipped');
        btnToggle.textContent = '⏱ Räknas ej (0)';
      }

      btnToggle.addEventListener('click', () => {
        this.game.toggleWordStatus(index);
        this.renderReviewList();
      });

      row.appendChild(wordSpan);
      row.appendChild(btnToggle);
      this.dom.reviewList.appendChild(row);
    });

    this.dom.reviewCorrectCount.textContent = correct;
    this.dom.reviewPassCount.textContent = pass;
    this.dom.reviewPointsSummary.textContent = `${net >= 0 ? '+' : ''}${net} p`;
    this.dom.reviewPointsSummary.className = `review-stat-val ${net >= 0 ? 'review-stat-correct' : 'review-stat-pass'}`;
  }

  confirmRoundScore() {
    const outcome = this.game.confirmRound();
    // Spara matchläge efter varje genomförd runda
    this.storage.saveGame(this.game.toJSON());

    if (outcome.type === 'victory') {
      this.storage.clearGame();
      this.showVictoryView(outcome.winner);
    } else if (outcome.type === 'suddenDeath') {
      this.showSuddenDeathIntro();
    } else if (outcome.type === 'ready') {
      this.showReadyView();
    } else {
      this.showScoreboardView();
    }
  }

  // =========================================================================
  // Sudden Death & Scoreboard
  // =========================================================================
  showSuddenDeathIntro() {
    this.dom.suddenDeathTeams.innerHTML = '';
    this.game.suddenDeathTeams.forEach((team) => {
      const row = document.createElement('div');
      row.className = 'sudden-death-team-row';

      const left = document.createElement('div');
      left.className = 'sudden-death-team-left';

      const dot = document.createElement('span');
      dot.className = 'team-dot';
      dot.style.backgroundColor = team.color;

      const nameSpan = document.createElement('span');
      nameSpan.className = 'sudden-death-team-name';
      nameSpan.textContent = team.name;

      left.appendChild(dot);
      left.appendChild(nameSpan);

      const scoreSpan = document.createElement('span');
      scoreSpan.className = 'sudden-death-team-score';
      scoreSpan.style.color = team.color;
      scoreSpan.textContent = `${team.score} p`;

      row.appendChild(left);
      row.appendChild(scoreSpan);
      this.dom.suddenDeathTeams.appendChild(row);
    });

    this.showView('suddenDeath');
  }

  showScoreboardView() {
    this.dom.scoreboardTargetHint.textContent = `Mål: ${this.game.targetScore} poäng`;
    this.dom.scoreboardList.innerHTML = '';

    this.game.teams.forEach((team, idx) => {
      const card = document.createElement('div');
      card.className = `team-score-card ${idx === this.game.currentTeamIndex ? 'is-active' : ''}`;

      const top = document.createElement('div');
      top.className = 'team-score-top';

      const nameWrap = document.createElement('div');
      nameWrap.className = 'team-score-name';

      const dot = document.createElement('span');
      dot.className = 'team-dot';
      dot.style.backgroundColor = team.color;

      const nameSpan = document.createElement('span');
      nameSpan.textContent = team.name;

      nameWrap.appendChild(dot);
      nameWrap.appendChild(nameSpan);

      if (idx === this.game.currentTeamIndex) {
        const badge = document.createElement('span');
        badge.className = 'team-turn-badge';
        badge.textContent = 'Nästa tur';
        nameWrap.appendChild(badge);
      }

      const points = document.createElement('div');
      points.className = 'team-score-points';
      points.style.color = team.color;
      points.textContent = `${team.score} p`;

      top.appendChild(nameWrap);
      top.appendChild(points);

      const progressWrap = document.createElement('div');
      progressWrap.className = 'team-progress-bar';

      const percent = Math.min(100, Math.max(0, (team.score / this.game.targetScore) * 100));
      const fill = document.createElement('div');
      fill.className = 'team-progress-fill';
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

    soundEffects.playVictory();
    this.vibrate([100, 50, 100, 50, 200]);
    this.startConfetti();

    this.showView('victory');
  }

  // =========================================================================
  // Touch & Pointer på spelkort
  // =========================================================================
  resetCardTransform() {
    this.cardCurrentX = 0;
    this.cardCurrentY = 0;
    this.dom.wordCard.style.transform = '';
    this.dom.stampCorrect.style.opacity = 0;
    this.dom.stampPass.style.opacity = 0;
  }

  onCardPointerDown(e) {
    if (this.currentView !== 'game' || this.isPaused || this.timer.secondsLeft <= 0 || this.isTransitioning) return;
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
      this.handleWordAction(WORD_STATUS.CORRECT);
    } else if (dx < -threshold || dy > threshold) {
      this.handleWordAction(WORD_STATUS.PASS);
    } else {
      this.dom.wordCard.style.transition = 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
      this.resetCardTransform();
    }
  }

  // =========================================================================
  // Hjälpmetoder: Haptik & Konfetti
  // =========================================================================
  vibrate(pattern) {
    if (this.settings.vibrate && 'vibrate' in navigator) {
      try { navigator.vibrate(pattern); } catch {}
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
      particles.forEach((p) => {
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

      if (particles.some((p) => p.y < canvas.height)) {
        this.confettiAnimationFrame = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        this.confettiAnimationFrame = null;
      }
    };
    this.confettiAnimationFrame = requestAnimationFrame(render);
  }

  // =========================================================================
  // Händelsekopplingar (Event Bindings)
  // =========================================================================
  bindEvents() {
    this.dom.btnAddTeam.addEventListener('click', () => this.addTeam());

    // Återuppta sparad match
    if (this.dom.btnResumeSaved) {
      this.dom.btnResumeSaved.addEventListener('click', () => this.resumeSavedGame());
    }
    if (this.dom.btnDismissSaved) {
      this.dom.btnDismissSaved.addEventListener('click', () => {
        this.storage.clearGame();
        if (this.dom.resumeBanner) this.dom.resumeBanner.style.display = 'none';
      });
    }

    // Ordpaket
    this.dom.packageCards.forEach((card) => {
      card.addEventListener('click', () => {
        const pkg = card.dataset.package;
        const index = this.settings.packages.indexOf(pkg);
        if (index !== -1) {
          if (this.settings.packages.length > 1) {
            this.settings.packages.splice(index, 1);
          } else {
            this.showToast('Minst ett ordpaket måste vara aktivt!');
            return;
          }
        } else {
          this.settings.packages.push(pkg);
        }
        this.saveSettings();
        this.renderSettings();
      });
    });

    // Svårighetsgrad
    this.dom.difficultyChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const diff = chip.dataset.difficulty;
        if (Object.hasOwn(DIFFICULTY_MODES, diff)) {
          this.settings.difficulty = diff;
          this.saveSettings();
          this.renderSettings();
        }
      });
    });

    // Målpoäng
    this.dom.targetChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        this.settings.targetScore = parseInt(chip.dataset.targetScore, 10);
        this.saveSettings();
        this.renderSettings();
      });
    });

    // Rundtid
    this.dom.timeChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        this.settings.roundTime = parseInt(chip.dataset.roundTime, 10);
        this.saveSettings();
        this.renderSettings();
      });
    });

    // Reglage: Pass-minus
    this.dom.togglePenalty.addEventListener('click', () => {
      this.settings.passPenalty = !this.settings.passPenalty;
      this.saveSettings();
      this.renderSettings();
    });

    // Reglage: Ljud
    const toggleAudio = () => {
      this.settings.sound = !this.settings.sound;
      this.saveSettings();
      this.renderSettings();
    };
    this.dom.toggleSound.addEventListener('click', toggleAudio);
    if (this.dom.headerSoundToggle) {
      this.dom.headerSoundToggle.addEventListener('click', toggleAudio);
    }

    // Reglage: Vibration
    if (this.dom.toggleVibrate) {
      this.dom.toggleVibrate.addEventListener('click', () => {
        this.settings.vibrate = !this.settings.vibrate;
        this.saveSettings();
        this.renderSettings();
      });
    }

    // Egna ord modal
    this.dom.btnOpenCustomWords.addEventListener('click', () => {
      this.renderCustomWordsModal();
      this.dom.customWordsModal.classList.add('active');
      this.dom.inputCustomWord.focus();
    });

    const closeCustomModal = () => {
      this.dom.customWordsModal.classList.remove('active');
    };
    this.dom.btnCloseCustomModal.addEventListener('click', closeCustomModal);
    this.dom.btnSaveCustomModal.addEventListener('click', closeCustomModal);

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
        this.storage.saveCustomWords(this.customWords);
        this.updateCustomWordsCountUI();
        this.renderCustomWordsModal();
      }
    });

    // Navigering
    this.dom.btnStartGame.addEventListener('click', () => this.startGame());
    this.dom.btnBeginRound.addEventListener('click', () => this.startRound());
    this.dom.btnCorrect.addEventListener('click', () => this.handleWordAction(WORD_STATUS.CORRECT));
    this.dom.btnPass.addEventListener('click', () => this.handleWordAction(WORD_STATUS.PASS));

    // Paus
    this.dom.btnPause.addEventListener('click', () => this.togglePause());
    this.dom.btnResume.addEventListener('click', () => this.togglePause());
    this.dom.btnFinishEarly.addEventListener('click', () => this.finishRoundEarly());
    this.dom.btnDiscardRound.addEventListener('click', () => this.discardRound());

    // Review & Scoreboard
    this.dom.btnConfirmRound.addEventListener('click', () => this.confirmRoundScore());
    this.dom.btnNextRound.addEventListener('click', () => this.showReadyView());

    // Sudden Death
    this.dom.btnStartSuddenDeath.addEventListener('click', () => this.showReadyView());

    // Vinst
    this.dom.btnPlayAgainSame.addEventListener('click', () => this.startGame());
    this.dom.btnPlayNewGame.addEventListener('click', () => this.showView('settings'));

    // Touch & Pointer på spelkort
    const card = this.dom.wordCard;
    card.addEventListener('pointerdown', (e) => this.onCardPointerDown(e));
    window.addEventListener('pointermove', (e) => this.onCardPointerMove(e));
    window.addEventListener('pointerup', () => this.onCardPointerUp());
    window.addEventListener('pointercancel', () => this.onCardPointerUp());

    // M3 fix: Auto-paus vid visibilitychange om spelet döljs mitt i en runda
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this.currentView === 'game' && !this.isPaused && this.timer.secondsLeft > 0) {
          this.togglePause();
        }
      } else {
        if (this.currentView === 'game' && !this.isPaused) {
          this.wakeLock.reacquireIfWanted();
          this.timer.tick();
        }
      }
    });

    // B3 fix: Tangentbord lyssnar endast när rundan är aktiv och INTE pausad
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.dom.customWordsModal.classList.contains('active')) {
          closeCustomModal();
          return;
        }
        if (this.currentView === 'game') {
          this.togglePause();
          return;
        }
      }

      if (this.currentView !== 'game' || this.timer.secondsLeft <= 0 || this.isPaused) return;

      if (e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === ' ') {
        e.preventDefault();
        this.handleWordAction(WORD_STATUS.CORRECT);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        this.handleWordAction(WORD_STATUS.PASS);
      } else if (e.key === 'p' || e.key === 'P') {
        this.togglePause();
      }
    });
  }
}

// Starta appen
document.addEventListener('DOMContentLoaded', () => {
  window.aliasApp = new AliasApp();
  window.aliasApp.init();
});
