document.addEventListener("DOMContentLoaded", () => {

  /* ───────────────────────── CONFIG ───────────────────────── */

  const CONFIG = {
    BATCH_SIZE: 13,
    JSON_URL: "programs.json",
    STORAGE_KEY: "golha_player_state"
  };

  /* ───────────────────────── DOM CACHE ───────────────────────── */

  const $ = {
    programsList: document.querySelector("#programs-list"),
    searchInput: document.querySelector("#search-input"),
    audio: document.querySelector("#audio-player"),
    playPauseBtn: document.querySelector("#play-pause-btn"),
    prevBtn: document.querySelector("#prev-btn"),
    nextBtn: document.querySelector("#next-btn"),
    nowPlaying: document.querySelector(".now-playing"),
    progressFill: document.querySelector("#progress-fill"),
    currentTime: document.querySelector("#current-time"),
    duration: document.querySelector("#duration"),
    showMoreBtn: document.querySelector("#show-more-btn"),
    progressBar: document.querySelector(".progress-bar"),
    loadingMessage: document.querySelector("#loading-message")
  };

  /* ───────────────────────── STATE ───────────────────────── */

  const State = {
    allPrograms: [],
    currentDataset: [],
    visibleCount: 0,
    currentIndex: -1,
    currentTrackUrl: null,
    isPlaying: false
  };

  /* ───────────────────────── UTILS ───────────────────────── */

  const Utils = {

    normalize(text = "") {
      const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
      const englishDigits = "0123456789";

      return text
        .replace(/ي/g, "ی")
        .replace(/ك/g, "ک")
        .replace(/[۰-۹]/g, d => englishDigits[persianDigits.indexOf(d)])
        .replace(/\u200c/g, " ")           // remove zero-width
        .replace(/\s+/g, " ")              // collapse spaces
        .toLowerCase()
        .trim();
    },

    formatTime(seconds) {
      if (!seconds || isNaN(seconds)) return "00:00";
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }

  };

  /* ───────────────────────── LOADING ANIMATION ───────────────────────── */

  const Loader = {

    start(totalCount) {
      let counter = 0;
      let dots = 0;

      this.interval = setInterval(() => {
        counter += Math.ceil(totalCount / 50); // fast visual progress
        if (counter > totalCount) counter = totalCount;

        dots = (dots + 1) % 4;
        const dotStr = ".".repeat(dots);

        $.loadingMessage.textContent =
          `در حال بارگذاری ${counter} برنامه${dotStr}`;

        if (counter >= totalCount) {
          clearInterval(this.interval);
        }
      }, 30);
    },

    stop() {
      clearInterval(this.interval);
      $.loadingMessage.style.display = "none";
    }

  };

  /* ───────────────────────── DATA ───────────────────────── */

  const Data = {

    async load() {
      const res = await fetch(CONFIG.JSON_URL);
      if (!res.ok) throw new Error("JSON load failed");

      const programs = await res.json();

      Loader.start(programs.length);

      // Precompute searchable field
      programs.forEach(p => {
        p._search = Utils.normalize(
          `${p["Program Name"] || ""} ${p["Source"] || ""}`
        );
      });

      State.allPrograms = programs;
      State.currentDataset = programs;

      Loader.stop();
    },

    search(term) {
      const normalized = Utils.normalize(term);
      const tokens = normalized.split(" ").filter(Boolean);

      if (!tokens.length) {
        State.currentDataset = State.allPrograms;
      } else {
        State.currentDataset = State.allPrograms.filter(p =>
          tokens.every(token => p._search.includes(token))
        );
      }

      State.visibleCount = 0;
      Render.reset();
      Render.appendBatch();
    }

  };

  /* ───────────────────────── RENDER ───────────────────────── */

  const Render = {

    reset() {
      $.programsList.innerHTML = "";
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

      if ($.showMoreBtn) {
        $.showMoreBtn.style.display =
          State.visibleCount >= State.currentDataset.length
            ? "none"
            : "block";
      }
    }

  };

  /* ───────────────────────── PLAYER ───────────────────────── */

  const Player = {

    play(index, auto = true) {
      const program = State.currentDataset[index];
      if (!program) return;

      $.audio.src = program["MP3 URL"];
      $.audio.load();

      $.nowPlaying.textContent =
        `در حال پخش : ${program["Program Name"] || "بدون نام"}`;

      document.querySelectorAll(".program-item").forEach(el =>
        el.classList.remove("playing")
      );

      const currentItem = document.querySelector(
        `.program-item[data-index="${index}"]`
      );

      if (currentItem) currentItem.classList.add("playing");

      State.currentIndex = index;
      State.currentTrackUrl = program["MP3 URL"];

      if (auto) $.audio.play().catch(() => {});
    },

    toggle() {
      if (State.currentIndex === -1) {
        this.play(0);
        return;
      }
      $.audio.paused ? $.audio.play() : $.audio.pause();
    },

    next() {
      const next =
        State.currentIndex < State.currentDataset.length - 1
          ? State.currentIndex + 1
          : 0;
      this.play(next);
    },

    prev() {
      const prev =
        State.currentIndex > 0
          ? State.currentIndex - 1
          : State.currentDataset.length - 1;
      this.play(prev);
    }

  };

  /* ───────────────────────── PERSISTENCE ───────────────────────── */

  const Persistence = {

    save() {
      if (!State.currentTrackUrl) return;

      localStorage.setItem(
        CONFIG.STORAGE_KEY,
        JSON.stringify({
          trackUrl: State.currentTrackUrl,
          time: $.audio.currentTime,
          playing: State.isPlaying
        })
      );
    },

    restore() {
      const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
      if (!raw) return;

      const saved = JSON.parse(raw);

      const index = State.currentDataset.findIndex(
        p => p["MP3 URL"] === saved.trackUrl
      );

      if (index === -1) return;

      while (State.visibleCount <= index) {
        Render.appendBatch();
      }

      Player.play(index, false);

      $.audio.addEventListener("loadedmetadata", () => {
        $.audio.currentTime = saved.time || 0;
        if (saved.playing) $.audio.play().catch(() => {});
      }, { once: true });
    }

  };

  /* ───────────────────────── EVENTS ───────────────────────── */

  function setupEvents() {

    $.searchInput.addEventListener("input", e =>
      Data.search(e.target.value)
    );

    $.showMoreBtn?.addEventListener("click", () =>
      Render.appendBatch()
    );

    $.programsList.addEventListener("click", e => {
      const btn = e.target.closest(".play-this");
      if (!btn) return;
      const index = parseInt(btn.dataset.index, 10);
      if (!isNaN(index)) Player.play(index);
    });

    $.playPauseBtn.addEventListener("click", () => Player.toggle());
    $.nextBtn.addEventListener("click", () => Player.next());
    $.prevBtn.addEventListener("click", () => Player.prev());

    $.audio.addEventListener("play", () => {
      State.isPlaying = true;
      $.playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    });

    $.audio.addEventListener("pause", () => {
      State.isPlaying = false;
      $.playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
      Persistence.save();
    });

    $.audio.addEventListener("timeupdate", () => {
      if (!$.audio.duration) return;
      const progress =
        ($.audio.currentTime / $.audio.duration) * 100;
      $.progressFill.style.width = `${progress}%`;
      $.currentTime.textContent = Utils.formatTime($.audio.currentTime);
      $.duration.textContent = Utils.formatTime($.audio.duration);
    });

    $.progressBar.addEventListener("click", e => {
      if (!$.audio.duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      $.audio.currentTime = pos * $.audio.duration;
    });

    window.addEventListener("beforeunload", () =>
      Persistence.save()
    );
  }

  /* ───────────────────────── INIT ───────────────────────── */

  async function init() {
    try {
      await Data.load();
      Render.appendBatch();
      setupEvents();
      Persistence.restore();
    } catch (err) {
      $.programsList.innerHTML =
        `<p style="color:red;">خطا: ${err.message}</p>`;
    }
  }

  init();

});
