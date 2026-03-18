(() => {
  const config = window.DRAGPLAY_CONFIG || {};

  const heroSection = document.getElementById("heroSection");
  const playerShell = document.getElementById("playerShell");
  const dropZone = document.getElementById("dropZone");
  const romFileInput = document.getElementById("romFileInput");
  const biosFileInput = document.getElementById("biosFileInput");
  const biosUrlInput = document.getElementById("biosUrlInput");
  const autostartToggle = document.getElementById("autostartToggle");
  const backBtn = document.getElementById("backBtn");
  const gameEl = document.getElementById("game");
  const gameTitleEl = document.getElementById("gameTitle");
  const runningSystemEl = document.getElementById("runningSystem");
  const playerHelperText = document.getElementById("playerHelperText");
  const noticeBox = document.getElementById("noticeBox");

  const systemRow = document.getElementById("systemRow");
  const systemSelect = document.getElementById("systemSelect");
  const systemStartBtn = document.getElementById("systemStartBtn");

  const state = {
    romFile: null,
    biosFile: null,
    selectedSystem: null,
    objectUrls: [],
    loaderScript: null
  };

  function addObjectUrl(url) {
    state.objectUrls.push(url);
    return url;
  }

  function cleanupObjectUrls() {
    for (const url of state.objectUrls) {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    }
    state.objectUrls = [];
  }

  function getLowerFileName(file) {
    return String(file?.name || "").trim().toLowerCase();
  }

  function getExtensionFromName(name) {
    const clean = String(name || "").toLowerCase();
    const parts = clean.split(".");
    return parts.length > 1 ? parts.pop() : "";
  }

  function detectSystemFromFileName(fileName) {
    const name = String(fileName || "").toLowerCase();

    const systems = config.SYSTEMS || {};
    for (const [systemKey, systemData] of Object.entries(systems)) {
      const archiveHints = Array.isArray(systemData.archiveHints) ? systemData.archiveHints : [];
      for (const hint of archiveHints) {
        if (name.endsWith(hint)) {
          return { system: systemKey, ambiguous: false };
        }
      }
    }

    const ext = getExtensionFromName(name);
    for (const [systemKey, systemData] of Object.entries(systems)) {
      const exts = Array.isArray(systemData.extensions) ? systemData.extensions : [];
      if (exts.includes(ext)) {
        return { system: systemKey, ambiguous: false };
      }
    }

    if (ext === "zip" || ext === "7z") {
      return { system: null, ambiguous: true };
    }

    return { system: null, ambiguous: false };
  }

  function setNotice(text) {
    if (noticeBox) noticeBox.textContent = text;
  }

  function showSystemChooser(show) {
    if (!systemRow) return;
    systemRow.classList.toggle("is-visible", !!show);
  }

  function getSystemLabel(systemKey) {
    return config.SYSTEMS?.[systemKey]?.label || systemKey || "Sistema";
  }

  function getGameTitle(fileName) {
    const clean = String(fileName || "Jogo").replace(/\.(zip|7z|cue|bin|chd|pbp|m3u|ccd|img|mdf|toc|cbn|z64|n64|v64)$/i, "");
    return clean || "Jogo";
  }

  function resetEmbeddedGame() {
    if (state.loaderScript) {
      try {
        state.loaderScript.remove();
      } catch {}
      state.loaderScript = null;
    }

    if (gameEl) {
      gameEl.innerHTML = "";
    }

    delete window.EJS_player;
    delete window.EJS_core;
    delete window.EJS_pathtodata;
    delete window.EJS_gameUrl;
    delete window.EJS_biosUrl;
    delete window.EJS_startOnLoaded;
  }

  function hardResetPage() {
    window.location.reload();
  }

  function launchGame({ romFile, systemKey }) {
    if (!romFile || !systemKey) return;

    const systemConfig = config.SYSTEMS?.[systemKey];
    if (!systemConfig) {
      setNotice("Sistema não suportado.");
      return;
    }

    cleanupObjectUrls();
    resetEmbeddedGame();

    const romUrl = addObjectUrl(URL.createObjectURL(romFile));
    let biosUrl = systemConfig.biosUrl || "";

    if (systemKey === "psx" && biosFileInput?.files?.[0]) {
      biosUrl = addObjectUrl(URL.createObjectURL(biosFileInput.files[0]));
    } else if (systemKey === "psx" && biosUrlInput?.value?.trim()) {
      biosUrl = biosUrlInput.value.trim();
    }

    window.EJS_player = "#game";
    window.EJS_core = systemConfig.core;
    window.EJS_pathtodata = config.DATA_PATH || "./data/";
    window.EJS_gameUrl = romUrl;
    window.EJS_startOnLoaded = !!(autostartToggle?.checked ?? config.AUTO_START ?? true);

    if (biosUrl) {
      window.EJS_biosUrl = biosUrl;
    }

    const script = document.createElement("script");
    script.src = `${window.EJS_pathtodata.replace(/\/+$/, "")}/loader.js`;
    script.async = true;
    document.body.appendChild(script);
    state.loaderScript = script;

    heroSection.classList.add("hidden");
    playerShell.classList.remove("hidden");

    gameTitleEl.textContent = getGameTitle(romFile.name);
    runningSystemEl.textContent = getSystemLabel(systemKey);
    playerHelperText.textContent = `Core carregado: ${getSystemLabel(systemKey)}.`;

    setNotice(
      systemKey === "psx"
        ? "PS1 iniciado. Se um .zip falhar, tente o arquivo .cue."
        : "Nintendo 64 iniciado."
    );
  }

  function handleRomSelection(file) {
    if (!file) return;

    state.romFile = file;

    const detection = detectSystemFromFileName(file.name);
    if (detection.ambiguous) {
      state.selectedSystem = systemSelect?.value || "psx";
      showSystemChooser(true);
      setNotice("Arquivo compactado ambíguo. Escolha PlayStation ou Nintendo 64 e clique em Iniciar.");
      return;
    }

    showSystemChooser(false);

    if (!detection.system) {
      setNotice("Formato não reconhecido. Use PS1 (.cue, .bin, .chd...) ou N64 (.z64, .n64, .v64).");
      return;
    }

    state.selectedSystem = detection.system;

    if (autostartToggle?.checked ?? config.AUTO_START ?? true) {
      launchGame({
        romFile: state.romFile,
        systemKey: state.selectedSystem
      });
    }
  }

  if (dropZone && romFileInput) {
    dropZone.addEventListener("dragover", (event) => {
      event.preventDefault();
    });

    dropZone.addEventListener("drop", (event) => {
      event.preventDefault();
      const file = event.dataTransfer?.files?.[0];
      if (file) {
        romFileInput.files = event.dataTransfer.files;
        handleRomSelection(file);
      }
    });

    romFileInput.addEventListener("change", () => {
      const file = romFileInput.files?.[0];
      handleRomSelection(file);
    });
  }

  if (systemSelect) {
    systemSelect.addEventListener("change", () => {
      state.selectedSystem = systemSelect.value;
    });
  }

  if (systemStartBtn) {
    systemStartBtn.addEventListener("click", () => {
      if (!state.romFile) {
        setNotice("Selecione um arquivo primeiro.");
        return;
      }

      const selected = systemSelect?.value || "psx";
      state.selectedSystem = selected;

      launchGame({
        romFile: state.romFile,
        systemKey: state.selectedSystem
      });
    });
  }

  if (backBtn) {
    backBtn.addEventListener("click", hardResetPage);
  }

  window.addEventListener("beforeunload", () => {
    cleanupObjectUrls();
  });
})();
