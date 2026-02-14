document.addEventListener("DOMContentLoaded", () => {

  /* ──────────────────────────────
     CONFIG
  ────────────────────────────── */

  const CONFIG = {
    BATCH_SIZE: 13,
    JSON_URL: "programs.json"
  };

  const SELECTORS = {
    programsList: "#programs-list",
    searchInput: "#search-input",
    audio: "#audio-player",
    playPauseBtn: "#play-pause-btn",
    prevBtn: "#prev-btn",
    nextBtn: "#next-btn",
    nowPlaying: ".now-playing",
    progressFill: "#progress-fill",
    currentTime: "#current-time",
    duration: "#duration",
    showMoreBtn: "#show-more-btn",
    progressBar: ".progress-bar"
  };

  /* ──────────────────────────────
     DOM CACHE
  ────────────────────────────── */

  const $ = {};
  Object.keys(SELECTORS).forEach(key => {
    $[key] = document.querySelector(SELECTORS[key]);
  });

  /* ──────────────────────────────
     STATE
  ────────────────────────────── */

  const State = {
    allPrograms: [],
    currentDataset: [],
    visibleCount: 0,
    currentIndex: -1,
    isPlaying: false
  };

  /* ──────────────────────────────
     UTILS
  ────────────────────────────── */

  const Utils = {

    shuffle(array) {
      const copy = [...array];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },

    formatTime(seconds) {
      if (!seconds || isNaN(seconds)) return "00:00";
      const min = Math.floor(seconds / 60);
      const sec = Math.floor(seconds % 60);
      return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
    },

    normalize(text) {
      if (!text) return "";

      const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
      const englishDigits = "0123456789";

      let normalized = text
        .replace(/ي/g, "ی")
        .replace(/ك/g, "ک");

      // convert persian digits → english
      normalized = normalized.replace(/[۰-۹]/g, d =>
        englishDigits[persianDigits.indexOf(d)]
      );

      return normalized.toLowerCase().trim();
    }

  };

  /* ──────────────────────────────
     DATA MODULE
  ────────────────────────────── */

  const Data = {

    async load() {
      const res = await fetch(CONFIG.JSON_URL);
      if (!res.ok) throw new Error("JSON load failed");
      const programs = await res.json();

      // Precompute normalized search string (performance optimization)
      programs.forEach(p => {
        p._search = Utils.normalize(
          `${p["Program Name"] || ""} ${p["Source"] || ""}`
        );
      });

      State.allPrograms = programs;
      State.currentDataset = Utils.shuffle(programs);
    },

    search(term) {
      const normalizedTerm = Utils.normalize(term);

      if (!normalizedTerm) {
        State.currentDataset = Utils.shuffle(State.allPrograms);
      } else {
        State.currentDataset = State.allPrograms.filter(p =>
          p._search.includes(normalizedTerm)
        );
      }

      State.visibleCount = 0;
    }

  };

  /* ──────────────────────────────
     RENDER MODULE
  ────────────────────────────── */

  const Render = {

    resetList() {
      $.programsList.innerHTML = "";
      State.visibleCount = 0;
    },

    appendBatch() {
      const start = State.visibleCount;
      const end = Math.min(
        start + CONFIG.BATCH_SIZE,
        State.currentDataset.length
      );

      const fragment = document.createDocumentFragment();

      for (let i = start; i < end; i++) {
        const program = State.currentDataset[i];

        const item = document.createElement("div");
        item.className = "program-item";
        item.dataset.index = i;

        item.innerHTML = `
          <div class="program-name">${program["Program Name"] || "بدون نام"}</div>
          <div class="action-buttons">
            <button class="minimal-btn play-this" data-index="${i}">
              <i class="fas fa-play"></i>
            </button>
            <a href="${program["MP3 URL"]}" download class="minimal-btn">
              <i class="fas fa-download"></i>
            </a>
            <a href="${program["Source"]}" target="_blank" class="minimal-btn">
              <i class="fas fa-external-link-alt"></i>
            </a>
          </div>
        `;

        fragment.appendChild(item);
      }

      $.programsList.appendChild(fragment);
      State.visibleCount = end;

      // show more visibility
      if ($.showMoreBtn) {
        $.showMoreBtn.style.display =
          State.visibleCount >= State.currentDataset.length
            ? "none"
            : "block";
      }
    }

  };

  /* ──────────────────────────────
     PLAYER MODULE
  ────────────────────────────── */

  const Player = {

    play(index, auto = true) {
      const program = State.currentDataset[index];
      if (!program) return;

      $.audio.src = program["MP3 URL"];
      $.audio.load();

      $.nowPlaying.textContent =
        `در حال پخش : ${program["Program Name"] || "بدون نام"}`;

      document.querySelectorAll(".program-item").forEach((el, i) => {
        el.classList.toggle("playing", i === index);
      });

      State.currentIndex = index;

      if (auto) {
        $.audio.play().catch(() => {});
      }
    },

    toggle() {
      if (State.currentIndex === -1) {
        this.play(0);
        return;
      }

      $.audio.paused ? $.audio.play() : $.audio.pause();
    }

  };

  /* ──────────────────────────────
     EVENTS
  ────────────────────────────── */

  function setupEvents() {

    $.searchInput.addEventListener("input", e => {
      Data.search(e.target.value);
      Render.resetList();
      Render.appendBatch();
    });

    $.showMoreBtn?.addEventListener("click", () => {
      Render.appendBatch();
    });

    $.programsList.addEventListener("click", e => {
      const btn = e.target.closest(".play-this");
      if (!btn) return;

      const index = parseInt(btn.dataset.index, 10);
      if (!isNaN(index)) Player.play(index);
    });

    $.playPauseBtn.addEventListener("click", () => Player.toggle());

    $.audio.addEventListener("timeupdate", () => {
      if (!$.audio.duration) return;

      const progress =
        ($.audio.currentTime / $.audio.duration) * 100;

      $.progressFill.style.width = `${progress}%`;
      $.currentTime.textContent =
        Utils.formatTime($.audio.currentTime);
      $.duration.textContent =
        Utils.formatTime($.audio.duration);
    });

    $.progressBar.addEventListener("click", e => {
      if (!$.audio.duration) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      $.audio.currentTime = pos * $.audio.duration;
    });

  }

  /* ──────────────────────────────
     INIT
  ────────────────────────────── */

  async function init() {
    try {
      await Data.load();
      Render.appendBatch();   // ⚡ Only first 13 render
      setupEvents();
    } catch (err) {
      $.programsList.innerHTML =
        `<p style="color:red;">خطا: ${err.message}</p>`;
    }
  }

  init();

});
