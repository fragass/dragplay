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
    objectUrls: [],
    loaderScript: null,
    gamesCatalog: []
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

  function stripKnownExtensions(name) {
    return String(name || "")
      .replace(/\.(zip|7z|cue|bin|chd|pbp|m3u|ccd|img|mdf|toc|cbn|z64|n64|v64)$/gi, "")
      .trim();
  }

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/g, "")
      .replace(/[_\-:.,()[\]{}]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function tokenize(value) {
    return normalizeText(value)
      .split(" ")
      .map(part => part.trim())
      .filter(part => part && part.length > 1);
  }

  function normalizeStoredPlatform(value) {
    const clean = String(value || "").trim().toLowerCase();

    if (clean === "n64" || clean === "nintendo 64") return "n64";
    if (clean === "psx" || clean === "ps1" || clean === "playstation") return "psx";

    return null;
  }

  function clearFlowSelection() {
    sessionStorage.removeItem("dragplay_last_platform");
    sessionStorage.removeItem("dragplay_last_title");
    sessionStorage.removeItem("dragplay_flow_source");
  }

  function getLastFlowSelection() {
    const source = sessionStorage.getItem("dragplay_flow_source");
    const platform = normalizeStoredPlatform(sessionStorage.getItem("dragplay_last_platform"));
    const title = String(sessionStorage.getItem("dragplay_last_title") || "").trim();

    if (source !== "downloads" || !platform) return null;

    return {
      source,
      platform,
      title
    };
  }

  function getSystemLabel(systemKey) {
    return config.SYSTEMS?.[systemKey]?.label || systemKey || "Sistema";
  }

  function getGameTitle(fileName) {
    const clean = stripKnownExtensions(fileName || "Jogo");
    return clean || "Jogo";
  }

  function setNotice(text) {
    if (noticeBox) noticeBox.textContent = text;
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

  async function loadGamesCatalog() {
    try {
      const res = await fetch("/api/games");
      if (!res.ok) return;

      const data = await res.json();
      if (!Array.isArray(data)) return;

      state.gamesCatalog = data.map(game => ({
        title: String(game?.title || "").trim(),
        platform: normalizeStoredPlatform(game?.platform) || "psx"
      }));
    } catch {}
  }

  function detectSystemByCatalog(fileName) {
    const normalizedFile = normalizeText(stripKnownExtensions(fileName));
    if (!normalizedFile || !state.gamesCatalog.length) return null;

    const fileTokens = tokenize(normalizedFile);
    let bestMatch = null;
    let bestScore = 0;

    for (const game of state.gamesCatalog) {
      const normalizedTitle = normalizeText(game.title);
      if (!normalizedTitle) continue;

      let score = 0;
      const titleTokens = tokenize(normalizedTitle);

      if (normalizedFile === normalizedTitle) score += 100;
      if (normalizedFile.includes(normalizedTitle)) score += 50;
      if (normalizedTitle.includes(normalizedFile)) score += 40;

      let overlap = 0;
      for (const token of titleTokens) {
        if (fileTokens.includes(token)) overlap += 1;
      }
      score += overlap * 10;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = game;
      }
    }

    if (bestMatch && bestScore >= 20) {
      return bestMatch.platform;
    }

    return null;
  }

  function detectSystemFromFileName(fileName) {
    const name = String(fileName || "").toLowerCase();
    const ext = getExtensionFromName(name);
    const systems = config.SYSTEMS || {};

    for (const [systemKey, systemData] of Object.entries(systems)) {
      const archiveHints = Array.isArray(systemData.archiveHints) ? systemData.archiveHints : [];
      for (const hint of archiveHints) {
        if (name.endsWith(hint)) {
          return systemKey;
        }
      }
    }

    for (const [systemKey, systemData] of Object.entries(systems)) {
      const exts = Array.isArray(systemData.extensions) ? systemData.extensions : [];
      if (exts.includes(ext)) {
        return systemKey;
      }
    }

    const catalogMatch = detectSystemByCatalog(fileName);
    if (catalogMatch) {
      return catalogMatch;
    }

    if (ext === "zip" || ext === "7z") {
      const flowSelection = getLastFlowSelection();
      if (flowSelection) {
        const normalizedFlowTitle = normalizeText(flowSelection.title);
        const normalizedFile = normalizeText(stripKnownExtensions(fileName));

        if (
          normalizedFlowTitle &&
          normalizedFile &&
          (normalizedFile.includes(normalizedFlowTitle) || normalizedFlowTitle.includes(normalizedFile))
        ) {
          return flowSelection.platform;
        }
      }

      return "psx";
    }

    return null;
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
      "Para o sistema reconhecer o core correto, baixe a ROM pela página Downloads. Arquivos externos podem não funcionar adequadamente. Se o .zip não funcionar, teste o .cue ou .z64."
    );
  }

  function handleRomSelection(file) {
    if (!file) return;

    state.romFile = file;

    const detectedSystem = detectSystemFromFileName(file.name);
    if (!detectedSystem) {
      setNotice("Formato não reconhecido. Use jogos .zip/.cue/.z64 do fluxo do site ou formatos compatíveis de PS1 e Nintendo 64.");
      return;
    }

    launchGame({
      romFile: state.romFile,
      systemKey: detectedSystem
    });
  }

  function hardResetPage() {
    clearFlowSelection();
    window.location.reload();
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

  loadGamesCatalog();
})();
