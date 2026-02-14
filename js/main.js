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
  const el = {
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

  // Persian ↔ English numbers
  const normalizeNumber = (str) => {
    return str
      .replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
      .replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
  };

  // ── Player ─────────────────────────────────────────────────────────
  const setupPlayer = () => {
    el.audio.addEventListener("timeupdate", () => {
      if (!el.audio.duration) return;
      const progress = (el.audio.currentTime / el.audio.duration) * 100;
      el.progressFill.style.width = `${progress}%`;
      el.currentTime.textContent = formatTime(el.audio.currentTime);
      el.duration.textContent = formatTime(el.audio.duration);
    });

    el.audio.addEventListener("loadedmetadata", () => {
      el.duration.textContent = formatTime(el.audio.duration);
    });

    el.audio.addEventListener("play", () => {
      el.playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
      isPlaying = true;
    });

    el.audio.addEventListener("pause", () => {
      el.playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
      isPlaying = false;
    });

    el.audio.addEventListener("ended", playRandomNext);

    el.progressBar.addEventListener("click", (e) => {
      if (!el.audio.duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      el.audio.currentTime = pos * el.audio.duration;
    });
  };

  const playTrack = (program, index, autoPlay = true) => {
    el.audio.src = program["MP3 URL"];
    el.audio.load();

    el.nowPlaying.textContent = `در حال پخش: ${program["Program Name"] || "بدون نام"}`;

    document.querySelectorAll(".program-item").forEach((item, i) => {
      item.classList.toggle("playing", i === index);
    });

    currentIndex = index;

    if (autoPlay) {
      el.audio.play().catch(err => {
        console.error("Playback failed:", err);
        el.nowPlaying.textContent += " (خطا)";
      });
    }
  };

  const togglePlayPause = () => {
    if (currentIndex === -1) {
      playTrack(shuffledPrograms[0], 0);
      return;
    }
    if (el.audio.paused || el.audio.ended) {
      el.audio.play();
    } else {
      el.audio.pause();
    }
  };

  const playRandomNext = () => {
    if (shuffledPrograms.length <= 1) return;
    let rnd = Math.floor(Math.random() * shuffledPrograms.length);
    while (rnd === currentIndex) rnd = Math.floor(Math.random() * shuffledPrograms.length);
    playTrack(shuffledPrograms[rnd], rnd);
  };

  // ── List & Show More ───────────────────────────────────────────────
  const loadInitialBatch = () => {
    shuffledPrograms = shuffle(allPrograms);
    visibleCount = 0;
    el.programsList.innerHTML = "";
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

    el.programsList.insertAdjacentHTML("beforeend", html);
    visibleCount = end;

    // Show More button logic - very explicit
    if (el.showMoreBtn) {
      const hasMore = visibleCount < shuffledPrograms.length;
      el.showMoreBtn.style.display = hasMore ? "block" : "none";
      console.log(`Show More → ${hasMore ? "visible" : "hidden"} | visible: ${visibleCount} / total: ${shuffledPrograms.length}`);
    }
  };

  // ── Search ─────────────────────────────────────────────────────────
  const handleSearch = (e) => {
    let term = e.target.value.trim().toLowerCase();
    if (!term) {
      loadInitialBatch();
      return;
    }

    // Normalize Persian/Arabic digits → English
    term = normalizeNumber(term);

    const filtered = allPrograms.filter(p => {
      let name = (p["Program Name"] || "").toLowerCase();
      name = normalizeNumber(name.replace(/ي/g, 'ی').replace(/ك/g, 'ک'));
      return name.includes(term);
    });

    shuffledPrograms = shuffle(filtered);
    visibleCount = 0;
    el.programsList.innerHTML = "";
    appendBatch();

    if (el.showMoreBtn) el.showMoreBtn.style.display = "none";
  };

  // ── Events ─────────────────────────────────────────────────────────
  const setupEvents = () => {
    el.playPauseBtn?.addEventListener("click", togglePlayPause);
    el.nextBtn?.addEventListener("click", playRandomNext);
    el.prevBtn?.addEventListener("click", () => {
      const len = shuffledPrograms.length;
      if (len === 0) return;
      const newIdx = currentIndex > 0 ? currentIndex - 1 : len - 1;
      playTrack(shuffledPrograms[newIdx], newIdx);
    });

    el.programsList?.addEventListener("click", (e) => {
      const btn = e.target.closest(".play-this");
      if (btn) {
        const idx = parseInt(btn.dataset.index, 10);
        if (!isNaN(idx)) playTrack(shuffledPrograms[idx], idx);
        return;
      }
      const item = e.target.closest(".program-item");
      if (item) {
        const idx = parseInt(item.dataset.index, 10);
        if (!isNaN(idx)) playTrack(shuffledPrograms[idx], idx);
      }
    });

    el.showMoreBtn?.addEventListener("click", appendBatch);
    el.searchInput?.addEventListener("input", handleSearch);
  };

  // ── Start ──────────────────────────────────────────────────────────
  fetch("programs.json")
    .then(res => res.ok ? res.json() : Promise.reject("JSON load failed"))
    .then(programs => {
      allPrograms = programs;
      setupPlayer();
      setupEvents();
      loadInitialBatch();
    })
    .catch(err => {
      el.programsList.innerHTML = `<p style="color:#ff4444;">خطا: ${err}</p>`;
      console.error(err);
    });
});
