const STORAGE_KEY = "novaplay-state";

const defaultState = {
  username: "Joueur Nova",
  coins: 0,
  launches: 0,
  achievements: [],
  darkMode: true,
  animations: true,
  gameTimes: { itrixi: 0, collectrix: 0 },
  gameLaunches: { itrixi: 0, collectrix: 0 },
  lastGame: null,
  lastGameKey: null,
  lastGameUrl: null,
  lastDailyReward: null,
  joinedAt: new Date().toISOString()
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      ...defaultState,
      ...saved,
      gameTimes: { ...defaultState.gameTimes, ...(saved.gameTimes || {}) },
      gameLaunches: { ...defaultState.gameLaunches, ...(saved.gameLaunches || {}) },
      achievements: Array.isArray(saved.achievements) ? saved.achievements : []
    };
  } catch {
    return structuredClone(defaultState);
  }
}

const state = loadState();

const elements = {
  coinCount: document.querySelector("#coinCount"),
  username: document.querySelector("#username"),
  saveUsername: document.querySelector("#saveUsername"),
  gamesLaunched: document.querySelector("#gamesLaunched"),
  achievementCount: document.querySelector("#achievementCount"),
  levelValue: document.querySelector("#levelValue"),
  totalPlayTime: document.querySelector("#totalPlayTime"),
  favoriteGame: document.querySelector("#favoriteGame"),
  lastGame: document.querySelector("#lastGame"),
  itrixiTime: document.querySelector("#itrixiTime"),
  collectrixTime: document.querySelector("#collectrixTime"),
  itrixiLaunches: document.querySelector("#itrixiLaunches"),
  collectrixLaunches: document.querySelector("#collectrixLaunches"),
  continueButton: document.querySelector("#continueButton"),
  dailyRewardButton: document.querySelector("#dailyRewardButton"),
  dailyStatus: document.querySelector("#dailyStatus"),
  darkModeToggle: document.querySelector("#darkModeToggle"),
  animationsToggle: document.querySelector("#animationsToggle"),
  resetProgress: document.querySelector("#resetProgress"),
  toast: document.querySelector("#toast")
};

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => elements.toast.classList.remove("show"), 2600);
}

function formatTime(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours} h ${minutes} min`;
  if (minutes > 0) return `${minutes} min`;
  return `${seconds} s`;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function unlockAchievement(id, silent = false) {
  if (!state.achievements.includes(id)) {
    state.achievements.push(id);
    state.coins += 25;
    if (!silent) showToast("🏆 Succès débloqué : +25 Nova Coins");
  }
}

function checkAchievements() {
  if (state.launches >= 1) unlockAchievement("first-launch", true);
  if (state.gameLaunches.itrixi >= 1) unlockAchievement("itrixi-launch", true);
  if (state.gameLaunches.collectrix >= 1) unlockAchievement("collectrix-launch", true);
  if (state.gameLaunches.itrixi >= 1 && state.gameLaunches.collectrix >= 1) unlockAchievement("both-games", true);
  if (state.launches >= 5) unlockAchievement("five-launches", true);
  if ((state.gameTimes.itrixi + state.gameTimes.collectrix) >= 3600) unlockAchievement("one-hour", true);
  if (state.lastDailyReward) unlockAchievement("daily-reward", true);
}

function importSessionTime() {
  const pending = JSON.parse(localStorage.getItem("novaplay-pending-session") || "null");
  if (!pending || !pending.gameKey || !pending.startedAt) return;

  const elapsed = Math.max(0, Math.min(24 * 3600, Math.floor((Date.now() - pending.startedAt) / 1000)));
  if (elapsed > 0 && state.gameTimes[pending.gameKey] !== undefined) {
    state.gameTimes[pending.gameKey] += elapsed;
  }
  localStorage.removeItem("novaplay-pending-session");
}

function render() {
  importSessionTime();
  checkAchievements();

  const totalSeconds = state.gameTimes.itrixi + state.gameTimes.collectrix;
  const favorite =
    state.gameTimes.itrixi === 0 && state.gameTimes.collectrix === 0
      ? "Aucun"
      : state.gameTimes.itrixi >= state.gameTimes.collectrix
        ? "Itrixi"
        : "Collectrix";

  elements.coinCount.textContent = state.coins;
  elements.username.value = state.username;
  elements.gamesLaunched.textContent = state.launches;
  elements.achievementCount.textContent = state.achievements.length;
  elements.levelValue.textContent = Math.max(1, Math.floor((state.launches + totalSeconds / 600) / 3) + 1);
  elements.totalPlayTime.textContent = formatTime(totalSeconds);
  elements.favoriteGame.textContent = favorite;
  elements.lastGame.textContent = state.lastGame || "Aucun";
  elements.itrixiTime.textContent = formatTime(state.gameTimes.itrixi);
  elements.collectrixTime.textContent = formatTime(state.gameTimes.collectrix);
  elements.itrixiLaunches.textContent = state.gameLaunches.itrixi;
  elements.collectrixLaunches.textContent = state.gameLaunches.collectrix;
  elements.darkModeToggle.checked = state.darkMode;
  elements.animationsToggle.checked = state.animations;

  if (state.lastGameUrl) {
    elements.continueButton.hidden = false;
    elements.continueButton.textContent = `Continuer : ${state.lastGame}`;
  } else {
    elements.continueButton.hidden = true;
  }

  const dailyAvailable = state.lastDailyReward !== todayKey();
  elements.dailyRewardButton.disabled = !dailyAvailable;
  elements.dailyRewardButton.textContent = dailyAvailable ? "Récupérer +50" : "Déjà récupérée";
  elements.dailyStatus.textContent = dailyAvailable
    ? "Récompense disponible."
    : "Reviens demain pour un nouveau cadeau.";

  document.body.classList.toggle("light", !state.darkMode);
  document.body.classList.toggle("no-animations", !state.animations);

  document.querySelectorAll(".achievement").forEach(card => {
    const unlocked = state.achievements.includes(card.dataset.achievement);
    card.classList.toggle("unlocked", unlocked);
    card.querySelector(".lock").textContent = unlocked ? "✅" : "🔒";
  });

  saveState();
}

function launchGame(game, gameKey, url) {
  state.launches += 1;
  state.gameLaunches[gameKey] += 1;
  state.lastGame = game;
  state.lastGameKey = gameKey;
  state.lastGameUrl = url;
  state.coins += 10;

  unlockAchievement("first-launch");
  if (gameKey === "itrixi") unlockAchievement("itrixi-launch");
  if (gameKey === "collectrix") unlockAchievement("collectrix-launch");

  localStorage.setItem("novaplay-pending-session", JSON.stringify({
    gameKey,
    startedAt: Date.now()
  }));

  saveState();
  window.location.href = url;
}

document.querySelectorAll(".play-button").forEach(button => {
  button.addEventListener("click", () => {
    launchGame(button.dataset.game, button.dataset.key, button.dataset.url);
  });
});

elements.continueButton.addEventListener("click", () => {
  if (state.lastGameUrl && state.lastGameKey) {
    launchGame(state.lastGame, state.lastGameKey, state.lastGameUrl);
  }
});

elements.dailyRewardButton.addEventListener("click", () => {
  if (state.lastDailyReward === todayKey()) return;
  state.lastDailyReward = todayKey();
  state.coins += 50;
  unlockAchievement("daily-reward");
  render();
  showToast("🎁 Récompense récupérée : +50 Nova Coins");
});

elements.saveUsername.addEventListener("click", () => {
  state.username = elements.username.value.trim() || "Joueur Nova";
  render();
  showToast("Pseudo enregistré.");
});

elements.darkModeToggle.addEventListener("change", event => {
  state.darkMode = event.target.checked;
  render();
});

elements.animationsToggle.addEventListener("change", event => {
  state.animations = event.target.checked;
  render();
});

elements.resetProgress.addEventListener("click", () => {
  if (!confirm("Réinitialiser le profil, le temps de jeu, les Nova Coins et les succès ?")) return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem("novaplay-pending-session");
  location.reload();
});

window.addEventListener("pageshow", render);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) render();
});

render();
