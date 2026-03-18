window.DRAGPLAY_CONFIG = {
  DATA_PATH: "./data/",
  AUTO_START: true,

  SYSTEMS: {
    psx: {
      label: "PlayStation",
      core: "psx",
      biosUrl: "",
      extensions: [
        "cue", "chd", "pbp", "m3u", "ccd", "bin", "img", "mdf", "toc", "cbn"
      ],
      archiveHints: [
        ".ps1.zip", ".psx.zip", ".cue.zip", ".bin.zip", ".chd.zip", ".pbp.zip",
        ".m3u.zip", ".ccd.zip", ".img.zip", ".mdf.zip", ".toc.zip", ".cbn.zip",
        ".ps1.7z", ".psx.7z", ".cue.7z", ".bin.7z", ".chd.7z", ".pbp.7z",
        ".m3u.7z", ".ccd.7z", ".img.7z", ".mdf.7z", ".toc.7z", ".cbn.7z"
      ]
    },

    n64: {
      label: "Nintendo 64",
      core: "n64",
      biosUrl: "",
      extensions: [
        "z64", "n64", "v64"
      ],
      archiveHints: [
        ".n64.zip", ".z64.zip", ".v64.zip",
        ".n64.7z", ".z64.7z", ".v64.7z"
      ]
    }
  }
};
