document.addEventListener("DOMContentLoaded", () => {
  // ── Constants ──────────────────────────────────────────────────────
  const BATCH_SIZE = 13;
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

  // ── DOM Elements ───────────────────────────────────────────────────
  const elements = {
    programsList: document.querySelector(SELECTORS.programsList),
    searchInput: document.querySelector(SELECTORS.searchInput),
    audio: document.querySelector(SELECTORS.audio),
    playPauseBtn: document.querySelector(SELECTORS.playPauseBtn),
    prevBtn: document.querySelector(SELECTORS.prevBtn),
    nextBtn: document.querySelector(SELECTORS.nextBtn),
    nowPlaying: document.querySelector(SELECTORS.nowPlaying),
    progressFill: document.querySelector(SELECTORS.progressFill),
    currentTime: document.querySelector(SELECTORS.currentTime),
    duration: document.querySelector(SELECTORS.duration),
    showMoreBtn: document.querySelector(SELECTORS.showMoreBtn),
    progressBar: document.querySelector(SELECTORS.progressBar)
  };

  // ── State ──────────────────────────────────────────────────────────
  let allPrograms = [];
  let shuffledPrograms = [];
  let visibleCount = 0;
  let currentIndex = -1;
  let isPlaying = false;

  // ── Helpers ────────────────────────────────────────────────────────
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "00:00";
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const shuffle = (array) => {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  // ── Player Logic ───────────────────────────────────────────────────
  const setupPlayer = () => {
    elements.audio.addEventListener("timeupdate", () => {
      if (!elements.audio.duration) return;
      const progress = (elements.audio.currentTime / elements.audio.duration) * 100;
      elements.progressFill.style.width = `${progress}%`;
      elements.currentTime.textContent = formatTime(elements.audio.currentTime);
      elements.duration.textContent = formatTime(elements.audio.duration);
    });

    elements.audio.addEventListener("loadedmetadata", () => {
      elements.duration.textContent = formatTime(elements.audio.duration);
    });

    elements.audio.addEventListener("play", () => {
      elements.playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
      isPlaying = true;
    });

    elements.audio.addEventListener("pause", () => {
      elements.playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
      isPlaying = false;
    });

    elements.audio.addEventListener("ended", () => {
      playRandomNext();
    });

    elements.progressBar.addEventListener("click", (e) => {
      if (!elements.audio.duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      elements.audio.currentTime = pos * elements.audio.duration;
    });
  };

  const playTrack = (program, index, autoPlay = true) => {
    elements.audio.src = program["MP3 URL"];
    elements.audio.load();

    elements.nowPlaying.textContent = ` در حال پخش  :  ${program["Program Name"] || "بدون نام"}`;

    document.querySelectorAll(".program-item").forEach((el, i) => {
      el.classList.toggle("playing", i === index);
    });

    currentIndex = index;

    if (autoPlay) {
      elements.audio.play().catch(err => {
        console.error("Playback error:", err);
        elements.nowPlaying.textContent += " (خطا)";
      });
    }
  };

  const togglePlayPause = () => {
    if (currentIndex === -1) {
      playTrack(shuffledPrograms[0], 0);
      return;
    }
    if (elements.audio.paused || elements.audio.ended) {
      elements.audio.play();
    } else {
      elements.audio.pause();
    }
  };

  const playRandomNext = () => {
    if (shuffledPrograms.length === 0) return;
    let randomIndex = Math.floor(Math.random() * shuffledPrograms.length);
    while (randomIndex === currentIndex && shuffledPrograms.length > 1) {
      randomIndex = Math.floor(Math.random() * shuffledPrograms.length);
    }
    const program = shuffledPrograms[randomIndex];
    playTrack(program, randomIndex);
  };

  // ── List & Pagination ──────────────────────────────────────────────
  const loadInitialBatch = () => {
    shuffledPrograms = shuffle(allPrograms);
    visibleCount = 0;
    elements.programsList.innerHTML = "";
    appendBatch();
  };

  const appendBatch = () => {
    const start = visibleCount;
    const end = Math.min(start + BATCH_SIZE, shuffledPrograms.length);
    const batch = shuffledPrograms.slice(start, end);

    let html = "";
    batch.forEach((program, batchIndex) => {
      const index = visibleCount + batchIndex;
      html += `
        <div class="program-item" data-index="${index}">
          <div class="program-name">${program["Program Name"] || "بدون نام"}</div>
          <div class="action-buttons">
            <button class="minimal-btn play-this" data-index="${index}" title="پخش">
              <i class="fas fa-play"></i>
            </button>
            <a href="${program["MP3 URL"]}" download class="minimal-btn" title="دانلود">
              <i class="fas fa-download"></i>
            </a>
            <a href="${program["Source"]}" target="_blank" class="minimal-btn" title="منبع">
              <i class="fas fa-external-link-alt"></i>
            </a>
          </div>
        </div>
      `;
    });

    elements.programsList.insertAdjacentHTML("beforeend", html);
    visibleCount = end;

    if (elements.showMoreBtn) {
      elements.showMoreBtn.style.display = visibleCount >= shuffledPrograms.length ? "none" : "block";
    }
  };

  // ── Search ─────────────────────────────────────────────────────────
  const handleSearch = (e) => {
    const term = e.target.value.trim().toLowerCase();

    if (!term) {
      loadInitialBatch();
      return;
    }

    const filtered = allPrograms.filter(p => {
      const name = (p["Program Name"] || "").toLowerCase();
      return name.replace(/ي/g, 'ی').replace(/ك/g, 'ک').includes(term);
    });

    shuffledPrograms = shuffle(filtered);
    visibleCount = 0;
    elements.programsList.innerHTML = "";
    appendBatch();

    if (elements.showMoreBtn) {
      elements.showMoreBtn.style.display = "none";
    }
  };

  // ── Persistence ────────────────────────────────────────────────────
  const saveState = () => {
    if (currentIndex < 0) return;
    localStorage.setItem("lastIndex", currentIndex);
    localStorage.setItem("lastTime", elements.audio.currentTime);
    localStorage.setItem("lastPlaying", isPlaying ? "1" : "0");
  };

  const restoreState = () => {
    const idx = localStorage.getItem("lastIndex");
    const time = localStorage.getItem("lastTime");
    const playing = localStorage.getItem("lastPlaying") === "1";

    if (idx !== null) {
      const index = parseInt(idx, 10);
      if (index >= 0 && index < shuffledPrograms.length) {
        const program = shuffledPrograms[index];
        playTrack(program, index, false);

        if (time) {
          elements.audio.addEventListener("loadedmetadata", () => {
            elements.audio.currentTime = parseFloat(time);
          }, { once: true });
        }

        if (playing) {
          elements.audio.play().catch(() => {});
        }
      }
    }
  };

  // ── Event Listeners ────────────────────────────────────────────────
  const setupEvents = () => {
    elements.playPauseBtn.addEventListener("click", togglePlayPause);
    elements.nextBtn.addEventListener("click", playRandomNext);
    elements.prevBtn.addEventListener("click", () => {
      if (currentIndex > 0) {
        playTrack(shuffledPrograms[currentIndex - 1], currentIndex - 1);
      } else if (shuffledPrograms.length > 0) {
        playTrack(shuffledPrograms[shuffledPrograms.length - 1], shuffledPrograms.length - 1);
      }
    });

    elements.programsList.addEventListener("click", (e) => {
      const btn = e.target.closest(".play-this");
      if (btn) {
        const index = parseInt(btn.dataset.index, 10);
        if (!isNaN(index)) {
          playTrack(shuffledPrograms[index], index);
        }
        return;
      }

      const item = e.target.closest(".program-item");
      if (item) {
        const index = parseInt(item.dataset.index, 10);
        if (!isNaN(index)) {
          playTrack(shuffledPrograms[index], index);
        }
      }
    });

    if (elements.showMoreBtn) {
      elements.showMoreBtn.addEventListener("click", appendBatch);
    }

    elements.searchInput.addEventListener("input", handleSearch);

    elements.audio.addEventListener("pause", saveState);
    window.addEventListener("beforeunload", saveState);
  };

  // ── Start the app ──────────────────────────────────────────────────
  const start = () => {
    setupPlayer();
    setupEvents();

    fetch("programs.json")
      .then(res => res.ok ? res.json() : Promise.reject("Failed to load JSON"))
      .then(programs => {
        allPrograms = programs;
        loadInitialBatch();
        restoreState();
      })
      .catch(err => {
        elements.programsList.innerHTML = `<p style="color:#ff4444;">خطا: ${err}</p>`;
      });
  };

  start();
})();
