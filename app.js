(() => {
  const config = window.SITE_CONFIG || {};

  const elements = {
    dropZone: document.getElementById("dropZone"),
    romFileInput: document.getElementById("romFileInput"),
    biosFileInput: document.getElementById("biosFileInput"),
    romUrlInput: document.getElementById("romUrlInput"),
    biosUrlInput: document.getElementById("biosUrlInput"),
    autostartToggle: document.getElementById("autostartToggle"),
    loadRemoteBtn: document.getElementById("loadRemoteBtn"),
    startBtn: document.getElementById("startBtn"),
    resetBtn: document.getElementById("resetBtn"),
    backBtn: document.getElementById("backBtn"),
    currentSelection: document.getElementById("currentSelection"),
    heroSection: document.getElementById("heroSection"),
    playerShell: document.getElementById("playerShell"),
    gameTitle: document.getElementById("gameTitle"),
    noticeBox: document.getElementById("noticeBox"),
    playerHelperText: document.getElementById("playerHelperText")
  };

  const state = {
    romSource: null,
    romObjectUrl: null,
    biosSource: null,
    biosObjectUrl: null,
    started: false,
    loaderScript: null
  };

  const stepCards = {
    drag: document.querySelector('[data-step-card="drag"]'),
    wait: document.querySelector('[data-step-card="wait"]'),
    play: document.querySelector('[data-step-card="play"]')
  };

  function setStep(step) {
    const order = ["drag", "wait", "play"];
    order.forEach((name, index) => {
      const card = stepCards[name];
      if (!card) return;
      card.classList.remove("is-active", "is-done");
      if (name === step) card.classList.add("is-active");
      if (index < order.indexOf(step)) card.classList.add("is-done");
    });
  }

  function getExtension(name = "") {
    const normalized = String(name).toLowerCase().split("?")[0].split("#")[0];
    const index = normalized.lastIndexOf(".");
    return index >= 0 ? normalized.slice(index) : "";
  }

  function isArchiveExtension(ext) {
    return ext === ".zip" || ext === ".7z";
  }

  function isPreferredPsxExtension(ext) {
    return ext === ".cue" || ext === ".chd" || ext === ".pbp" || ext === ".m3u";
  }

  function setSelectionText(text, isError = false) {
    elements.currentSelection.innerHTML = `<span>${text}</span>`;
    elements.currentSelection.style.borderColor = isError
      ? "rgba(239,68,68,.5)"
      : "rgba(255,255,255,.08)";
  }

  function updateButtons() {
    elements.startBtn.disabled = !state.romSource;
  }

  function clearObjectUrl(key) {
    if (state[key]) {
      URL.revokeObjectURL(state[key]);
      state[key] = null;
    }
  }

  function normalizeName(source) {
    if (!source) return "Arquivo desconhecido";
    if (source instanceof File) return source.name;
    try {
      const url = new URL(source, window.location.href);
      const parts = url.pathname.split("/").filter(Boolean);
      return decodeURIComponent(parts[parts.length - 1] || "arquivo-remoto");
    } catch {
      return String(source);
    }
  }

  function updateHelperBySource(source) {
    const name = normalizeName(source);
    const ext = getExtension(name);

    if (ext === ".cue") {
      elements.playerHelperText.innerHTML = "Arquivo ideal detectado: <code>.cue</code>. Esse é o melhor caminho para PS1.";
      elements.noticeBox.innerHTML = "Boa. Você está usando <code>.cue</code>, que é a forma mais confiável para montar o disco do PS1.";
      return;
    }

    if (isArchiveExtension(ext)) {
      elements.playerHelperText.innerHTML = "Você está usando um pacote compactado. Se sair som e não aparecer imagem, teste pelo <code>.cue</code>.";
      elements.noticeBox.innerHTML = "Arquivo compactado detectado. Pode funcionar, mas para PS1 é mais seguro extrair o jogo e arrastar o <code>.cue</code>.";
      return;
    }

    if (ext === ".bin") {
      elements.playerHelperText.innerHTML = "<code>.bin</code> detectado. Para PS1, prefira arrastar o <code>.cue</code> da mesma pasta.";
      elements.noticeBox.innerHTML = "<code>.bin</code> selecionado. Isso pode abrir, mas o recomendado é usar o <code>.cue</code>.";
      return;
    }

    if (isPreferredPsxExtension(ext)) {
      elements.playerHelperText.textContent = "Formato favorável para PS1 detectado.";
      elements.noticeBox.textContent = "Formato compatível detectado. Se necessário, adicione BIOS para melhorar a compatibilidade.";
      return;
    }

    elements.playerHelperText.textContent = "Preferência: extraia o jogo e use o arquivo .cue.";
    elements.noticeBox.textContent = "Se tiver qualquer tela preta ou comportamento estranho, teste com o arquivo .cue e uma BIOS de PS1.";
  }

  function setRomSource(source) {
    clearObjectUrl("romObjectUrl");
    state.romSource = source;

    const name = normalizeName(source);
    const ext = getExtension(name);

    if (source instanceof File) {
      state.romObjectUrl = URL.createObjectURL(source);
      setSelectionText(`Jogo selecionado: <strong>${source.name}</strong>`);
    } else {
      setSelectionText(`Jogo remoto: <strong>${normalizeName(source)}</strong>`);
    }

    updateHelperBySource(source);

    if (isArchiveExtension(ext)) {
      setSelectionText(`Jogo selecionado: <strong>${name}</strong> <br><small>Melhor prática para PS1: extraia o pacote e use o <code>.cue</code>.</small>`);
    }

    if (ext === ".bin") {
      setSelectionText(`Jogo selecionado: <strong>${name}</strong> <br><small>Recomendado: arraste o <code>.cue</code> da mesma pasta.</small>`);
    }

    updateButtons();
    setStep("wait");
  }

  function setBiosSource(source) {
    clearObjectUrl("biosObjectUrl");
    state.biosSource = source;

    if (source instanceof File) {
      state.biosObjectUrl = URL.createObjectURL(source);
    }
  }

  function getRomUrl() {
    if (!state.romSource) return "";
    return state.romSource instanceof File ? state.romObjectUrl : state.romSource;
  }

  function getBiosUrl() {
    if (!state.biosSource) return "";
    return state.biosSource instanceof File ? state.biosObjectUrl : state.biosSource;
  }

  function cleanupExistingEmulator() {
    if (window.EJS_emulator && typeof window.EJS_emulator.exit === "function") {
      try {
        window.EJS_emulator.exit();
      } catch (_) {}
    }

    const gameContainer = document.getElementById("game");
    if (gameContainer) gameContainer.innerHTML = "";

    if (state.loaderScript) {
      state.loaderScript.remove();
      state.loaderScript = null;
    }

    delete window.EJS_emulator;
    delete window.EJS_player;
    delete window.EJS_core;
    delete window.EJS_gameUrl;
    delete window.EJS_biosUrl;
    delete window.EJS_gameName;
    delete window.EJS_pathtodata;
    delete window.EJS_startOnLoaded;
    delete window.EJS_backgroundColor;
    delete window.EJS_disableDatabases;
    delete window.EJS_disableLocalStorage;
    delete window.EJS_onGameStart;
    delete window.EJS_onLoad;
  }

  function launchGame() {
    const romUrl = getRomUrl();
    if (!romUrl) {
      setSelectionText("Você precisa definir um arquivo ou URL do jogo antes de iniciar.", true);
      return;
    }

    cleanupExistingEmulator();
    setStep("play");

    const gameTitle = config.GAME_TITLE || normalizeName(state.romSource);
    elements.gameTitle.textContent = gameTitle;
    elements.heroSection.classList.add("hidden");
    elements.playerShell.classList.remove("hidden");

    window.EJS_player = "#game";
    window.EJS_core = config.CORE || "psx";
    window.EJS_gameUrl = romUrl;
    window.EJS_biosUrl = getBiosUrl() || "";
    window.EJS_gameName = gameTitle;
    window.EJS_pathtodata = config.DATA_PATH || "https://cdn.emulatorjs.org/stable/data/";
    window.EJS_startOnLoaded = Boolean(elements.autostartToggle.checked);
    window.EJS_backgroundColor = "#000000";
    window.EJS_disableDatabases = false;
    window.EJS_disableLocalStorage = false;

    window.EJS_onGameStart = function () {
      elements.noticeBox.innerHTML = "Emulador carregado. Se houver som sem imagem, volte e teste com o <code>.cue</code> extraído e BIOS de PS1.";
    };

    const script = document.createElement("script");
    script.src = `${window.EJS_pathtodata}loader.js`;
    script.async = true;
    script.onerror = () => {
      setSelectionText("Falha ao carregar o EmulatorJS. Confira a CDN ou sua conexão.", true);
      elements.heroSection.classList.remove("hidden");
      elements.playerShell.classList.add("hidden");
    };
    document.body.appendChild(script);
    state.loaderScript = script;
    state.started = true;
  }

  function resetAll() {
    cleanupExistingEmulator();
    clearObjectUrl("romObjectUrl");
    clearObjectUrl("biosObjectUrl");

    state.romSource = null;
    state.biosSource = null;
    state.started = false;

    elements.romFileInput.value = "";
    elements.biosFileInput.value = "";
    elements.romUrlInput.value = config.ROM_URL || "";
    elements.biosUrlInput.value = config.BIOS_URL || "";
    elements.autostartToggle.checked = config.AUTO_START !== false;

    elements.heroSection.classList.remove("hidden");
    elements.playerShell.classList.add("hidden");

    setSelectionText("Nenhum jogo selecionado.");
    elements.playerHelperText.textContent = "Preferência: extraia o jogo e use o arquivo .cue.";
    elements.noticeBox.innerHTML = "Se o .zip não funcionar vá até a página de downloads e baixe o outro arquivo .cue";
    setStep("drag");
    updateButtons();
  }

  function wireDropzone() {
    const preventDefaults = (event) => {
      event.preventDefault();
      event.stopPropagation();
    };

    ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
      elements.dropZone.addEventListener(eventName, preventDefaults);
    });

    ["dragenter", "dragover"].forEach((eventName) => {
      elements.dropZone.addEventListener(eventName, () => {
        elements.dropZone.classList.add("is-dragover");
      });
    });

    ["dragleave", "drop"].forEach((eventName) => {
      elements.dropZone.addEventListener(eventName, () => {
        elements.dropZone.classList.remove("is-dragover");
      });
    });

    elements.dropZone.addEventListener("drop", (event) => {
      const file = event.dataTransfer?.files?.[0];
      if (!file) return;
      setRomSource(file);
      if (elements.autostartToggle.checked) launchGame();
    });
  }

  function init() {
    elements.romUrlInput.value = config.ROM_URL || "";
    elements.biosUrlInput.value = config.BIOS_URL || "";
    elements.autostartToggle.checked = config.AUTO_START !== false;
    elements.gameTitle.textContent = config.GAME_TITLE || "Resident Evil 2 — Dual Shock Ver.";

    wireDropzone();
    updateButtons();

    elements.romFileInput.addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      setRomSource(file);
      if (elements.autostartToggle.checked) launchGame();
    });

    elements.biosFileInput.addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      setBiosSource(file);
    });

    elements.loadRemoteBtn.addEventListener("click", () => {
      const url = elements.romUrlInput.value.trim();
      const biosUrl = elements.biosUrlInput.value.trim();

      if (!url) {
        setSelectionText("Cole uma URL do jogo antes de clicar em carregar.", true);
        return;
      }

      setRomSource(url);
      if (biosUrl) setBiosSource(biosUrl);
      if (elements.autostartToggle.checked) launchGame();
    });

    elements.startBtn.addEventListener("click", () => {
      const biosUrl = elements.biosUrlInput.value.trim();
      if (!state.biosSource && biosUrl) setBiosSource(biosUrl);
      launchGame();
    });

    elements.resetBtn.addEventListener("click", resetAll);
    elements.backBtn.addEventListener("click", resetAll);

    if (config.ROM_URL) {
      setRomSource(config.ROM_URL);
      if (config.BIOS_URL) setBiosSource(config.BIOS_URL);
      if (config.AUTO_START !== false) {
        launchGame();
      }
    }
  }

  init();
})();
