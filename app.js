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

  function getExtensionFromName(name) {
    const clean = String(name || "").toLowerCase();
    const parts = clean.split(".");
    return parts.length > 1 ? parts.pop() : "";
  }

  function getLastPlatformFromFlow() {
    const source = sessionStorage.getItem("dragplay_flow_source");
    const platform = sessionStorage.getItem("dragplay_last_platform");

    if (source === "downloads" && platform && config.SYSTEMS?.[platform]) {
      return platform;
    }

    return null;
  }

  function detectSystemFromFileName(fileName) {
    const name = String(fileName || "").toLowerCase();

    const systems = config.SYSTEMS || {};
    for (const [systemKey, systemData] of Object.entries(systems)) {
      const archiveHints = Array.isArray(systemData.archiveHints) ? systemData.archiveHints : [];
      for (const hint of archiveHints) {
        if (name.endsWith(hint)) {
          return { system: systemKey };
        }
      }
    }

    const ext = getExtensionFromName(name);
    for (const [systemKey, systemData] of Object.entries(systems)) {
      const exts = Array.isArray(systemData.extensions) ? systemData.extensions : [];
      if (exts.includes(ext)) {
        return { system: systemKey };
      }
    }

    if (ext === "zip" || ext === "7z") {
      const flowPlatform = getLastPlatformFromFlow();
      if (flowPlatform) {
        return { system: flowPlatform };
      }

      return { system: "psx" };
    }

    return { system: null };
  }

  function setNotice(text) {
    if (noticeBox) noticeBox.textContent = text;
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
      "O emulador foi ajustado para funcionar com jogos em .zip testados dentro do fluxo do site. Arquivos externos ou fora desse fluxo podem não funcionar corretamente."
    );
  }

  function handleRomSelection(file) {
    if (!file) return;

    state.romFile = file;

    const detection = detectSystemFromFileName(file.name);
    if (!detection.system) {
      setNotice("Formato não reconhecido. Use jogos .zip/.cue do fluxo do site ou formatos compatíveis de PS1 e Nintendo 64.");
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

  if (backBtn) {
    backBtn.addEventListener("click", hardResetPage);
  }

  window.addEventListener("beforeunload", () => {
    cleanupObjectUrls();
  });
})();
