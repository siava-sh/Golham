document.addEventListener("DOMContentLoaded", () => {
  // ── Selectors & elements ───────────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const els = {
    list: $("#programs-list"),
    search: $("#search-input"),
    audio: $("#audio-player"),
    playPause: $("#play-pause-btn"),
    prev: $("#prev-btn"),
    next: $("#next-btn"),
    nowPlaying: $(".now-playing"),
    progressFill: $("#progress-fill"),
    currentTime: $("#current-time"),
    duration: $("#duration"),
    showMore: $("#show-more-btn"),
    progressBar: $(".progress-bar")
  };

  // ── State ──────────────────────────────────────────────────────────
  let allPrograms = [];
  let currentBatchIndex = 0;
  let currentPlayingIndex = -1;
  let isPlaying = false;
  const BATCH_SIZE = 13;

  // ── Helpers ────────────────────────────────────────────────────────
  const pad = (n) => n.toString().padStart(2, "0");
  const formatTime = (s) => {
    if (!s || isNaN(s)) return "00:00";
    return `${pad(Math.floor(s / 60))}:${pad(Math.floor(s % 60))}`;
  };

  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const toEnDigits = (str) =>
    str.replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));

  // ── Player ─────────────────────────────────────────────────────────
  const setupPlayer = () => {
    els.audio.addEventListener("timeupdate", () => {
      if (!els.audio.duration) return;
      const pct = (els.audio.currentTime / els.audio.duration) * 100;
      els.progressFill.style.width = pct + "%";
      els.currentTime.textContent = formatTime(els.audio.currentTime);
      els.duration.textContent = formatTime(els.audio.duration);
    });

    els.audio.addEventListener("loadedmetadata", () => {
      els.duration.textContent = formatTime(els.audio.duration);
    });

    els.audio.addEventListener("play", () => {
      els.playPause.innerHTML = '<i class="fas fa-pause"></i>';
      isPlaying = true;
    });

    els.audio.addEventListener("pause", () => {
      els.playPause.innerHTML = '<i class="fas fa-play"></i>';
      isPlaying = false;
    });

    els.audio.addEventListener("ended", playRandomNext);

    els.progressBar.addEventListener("click", (e) => {
      if (!els.audio.duration) return;
      const rect = els.progressBar.getBoundingClientRect();
      const x = e.clientX - rect.left;
      els.audio.currentTime = (x / rect.width) * els.audio.duration;
    });
  };

  const play = (program, index, auto = true) => {
    els.audio.src = program["MP3 URL"];
    els.audio.load();

    els.nowPlaying.textContent = `در حال پخش: ${program["Program Name"] || "بدون نام"}`;

    $$(".program-item").forEach((el, i) => el.classList.toggle("playing", i === index));

    currentPlayingIndex = index;

    if (auto) {
      els.audio.play().catch((e) => {
        console.warn("Play prevented:", e);
        els.nowPlaying.textContent += " (خطا)";
      });
    }
  };

  const togglePlay = () => {
    if (currentPlayingIndex === -1) {
      play(shuffledPrograms[0], 0);
      return;
    }
    if (els.audio.paused || els.audio.ended) {
      els.audio.play();
    } else {
      els.audio.pause();
    }
  };

  const playRandomNext = () => {
    if (shuffledPrograms.length < 2) return;
    let idx = Math.floor(Math.random() * shuffledPrograms.length);
    while (idx === currentPlayingIndex) {
      idx = Math.floor(Math.random() * shuffledPrograms.length);
    }
    play(shuffledPrograms[idx], idx);
  };

  // ── List ───────────────────────────────────────────────────────────
  let shuffledPrograms = [];

  const loadInitial = (programs) => {
    allPrograms = programs;
    shuffledPrograms = shuffle(allPrograms);
    visibleCount = 0;
    els.programsList.innerHTML = "";
    appendBatch();
  };

  const appendBatch = () => {
    const start = visibleCount;
    const end = Math.min(start + BATCH_SIZE, shuffledPrograms.length);
    const batch = shuffledPrograms.slice(start, end);

    const fragment = document.createDocumentFragment();

    batch.forEach((p, batchIdx) => {
      const globalIdx = visibleCount + batchIdx;
      const item = document.createElement("div");
      item.className = "program-item";
      item.dataset.index = globalIdx;
      item.innerHTML = `
        <div class="program-name">${p["Program Name"] || "بدون نام"}</div>
        <div class="action-buttons">
          <button class="minimal-btn play-this" data-index="${globalIdx}" title="پخش">
            <i class="fas fa-play"></i>
          </button>
          <a href="${p["MP3 URL"]}" download class="minimal-btn" title="دانلود">
            <i class="fas fa-download"></i>
          </a>
          <a href="${p["Source"]}" target="_blank" class="minimal-btn" title="منبع">
            <i class="fas fa-external-link-alt"></i>
          </a>
        </div>
      `;
      fragment.appendChild(item);
    });

    els.programsList.appendChild(fragment);
    visibleCount = end;

    if (el.showMoreBtn) {
      el.showMoreBtn.style.display =
        visibleCount < shuffledPrograms.length ? "block" : "none";
    }
  };

  // ── Search ─────────────────────────────────────────────────────────
  let searchTimeout;
  const handleSearch = (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const term = normalizeNumber(e.target.value.trim().toLowerCase());
      if (!term) {
        loadInitial(allPrograms);
        return;
      }

      const filtered = allPrograms.filter((p) => {
        let name = (p["Program Name"] || "").toLowerCase();
        name = normalizeNumber(name.replace(/ي/g, "ی").replace(/ك/g, "ک"));
        return name.includes(term);
      });

      shuffledPrograms = shuffle(filtered);
      visibleCount = 0;
      els.programsList.innerHTML = "";
      appendBatch();

      if (el.showMoreBtn) el.showMoreBtn.style.display = "none";
    }, 280);
  };

  // ── Events ─────────────────────────────────────────────────────────
  const bindEvents = () => {
    el.playPause?.addEventListener("click", togglePlay);
    el.next?.addEventListener("click", playRandomNext);
    el.prev?.addEventListener("click", () => {
      const len = shuffledPrograms.length;
      if (len === 0) return;
      const idx = currentPlayingIndex > 0 ? currentPlayingIndex - 1 : len - 1;
      play(shuffledPrograms[idx], idx);
    });

    el.programsList?.addEventListener("click", (e) => {
      const btn = e.target.closest(".play-this");
      if (btn) {
        const i = parseInt(btn.dataset.index, 10);
        if (!isNaN(i)) play(shuffledPrograms[i], i);
        return;
      }
      const item = e.target.closest(".program-item");
      if (item) {
        const i = parseInt(item.dataset.index, 10);
        if (!isNaN(i)) play(shuffledPrograms[i], i);
      }
    });

    el.showMoreBtn?.addEventListener("click", appendBatch);
    el.searchInput?.addEventListener("input", handleSearch);
  };

  // ── Start ──────────────────────────────────────────────────────────
  fetch("programs.json")
    .then((r) => (r.ok ? r.json() : Promise.reject("Load failed")))
    .then((programs) => {
      loadInitial(programs);
      bindEvents();
      setupPlayer();
    })
    .catch((err) => {
      els.programsList.innerHTML = `<p style="color:#ff4444; text-align:center; padding:60px 0;">
        خطا در بارگذاری: ${err}
      </p>`;
    });
});
