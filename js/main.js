document.addEventListener("DOMContentLoaded", () => {
  // ── Constants ──────────────────────────────────────────────────────
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
    progressBar: document.querySelector(SELECTORS.progressBar)
  };

  // ── State ──────────────────────────────────────────────────────────
  let allPrograms = [];
  let shuffledPrograms = [];
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

  // Normalize Persian/Arabic digits to English
  const normalizeDigits = (str) => {
    return str
      .replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
      .replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
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

    elements.nowPlaying.textContent = `در حال پخش: ${program["Program Name"] || "بدون نام"}`;

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

  // ── List rendering ─────────────────────────────────────────────────
  const loadAllPrograms = () => {
    shuffledPrograms = shuffle(allPrograms);
    elements.programsList.innerHTML = "";

    let html = "";
    shuffledPrograms.forEach((program, index) => {
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

    elements.programsList.innerHTML = html;
  };

  // ── Search ─────────────────────────────────────────────────────────
  const handleSearch = (e) => {
    const termRaw = e.target.value.trim().toLowerCase();
    if (!termRaw) {
      loadAllPrograms();
      return;
    }

    // Normalize numbers in search term
    const term = normalizeDigits(termRaw);

    const filtered = allPrograms.filter(p => {
      let name = (p["Program Name"] || "").toLowerCase();
      // Normalize name too
      name = normalizeDigits(name.replace(/ي/g, 'ی').replace(/ك/g, 'ک'));
      return name.includes(term);
    });

    shuffledPrograms = shuffle(filtered);
    loadAllPrograms();
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

    elements.searchInput.addEventListener("input", handleSearch);
  };

  // ── Start ──────────────────────────────────────────────────────────
  const start = () => {
    if (els.list) {
      els.list.innerHTML = '<p style="text-align:center; padding:60px 0;">در حال بارگذاری...</p>';
    }

    fetch("./programs.json")
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load: ${res.status} ${res.statusText}`);
        return res.json();
      })
      .then(programs => {
        allPrograms = programs;
        setupPlayer();
        setupEvents();
        loadAllPrograms();
      })
      .catch(err => {
        if (els.list) {
          els.list.innerHTML = `<p style="color:#ff4444; text-align:center; padding:80px 0;">
            خطا در بارگذاری برنامه‌ها<br>${err.message}
          </p>`;
        }
        console.error("Fetch error:", err);
      });
  };

  start();
})();
