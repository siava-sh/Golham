document.addEventListener("DOMContentLoaded", () => {
  // ── DOM elements ───────────────────────────────────────────────────
  const els = {
    list: document.querySelector("#programs-list"),
    search: document.querySelector("#search-input"),
    audio: document.querySelector("#audio-player"),
    playPause: document.querySelector("#play-pause-btn"),
    prev: document.querySelector("#prev-btn"),
    next: document.querySelector("#next-btn"),
    nowPlaying: document.querySelector(".now-playing"),
    progressFill: document.querySelector("#progress-fill"),
    currentTime: document.querySelector("#current-time"),
    duration: document.querySelector("#duration"),
    progressBar: document.querySelector(".progress-bar")
  };

  // Guard: critical elements missing?
  if (!els.list || !els.audio) {
    if (els.list) {
      els.list.innerHTML = '<p style="color:#ff4444; padding:100px 0; text-align:center;">خطا: عناصر اصلی پیدا نشدند</p>';
    }
    return;
  }

  // ── State ──────────────────────────────────────────────────────────
  let allPrograms = [];
  let filteredPrograms = [];
  let currentIndex = -1;
  let isPlaying = false;

  // ── Helpers ────────────────────────────────────────────────────────
  const formatTime = (s) => {
    if (!s || isNaN(s)) return "00:00";
    return `${Math.floor(s / 60).toString().padStart(2, "0")}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
  };

  const shuffle = (arr) => {
    const a = arr.slice();
    let i = a.length;
    while (i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // Normalize Persian/Arabic → English digits
  const normalizeDigits = (str) =>
    str
      .replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
      .replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));

  // ── Player ─────────────────────────────────────────────────────────
  const initPlayer = () => {
    els.audio.addEventListener("timeupdate", () => {
      if (!els.audio.duration) return;
      const pct = (els.audio.currentTime / els.audio.duration) * 100;
      if (els.progressFill) els.progressFill.style.width = pct + "%";
      if (els.currentTime) els.currentTime.textContent = formatTime(els.audio.currentTime);
      if (els.duration) els.duration.textContent = formatTime(els.audio.duration);
    });

    els.audio.addEventListener("loadedmetadata", () => {
      if (els.duration) els.duration.textContent = formatTime(els.audio.duration);
    });

    els.audio.addEventListener("play", () => {
      if (els.playPause) els.playPause.innerHTML = '<i class="fas fa-pause"></i>';
      isPlaying = true;
    });

    els.audio.addEventListener("pause", () => {
      if (els.playPause) els.playPause.innerHTML = '<i class="fas fa-play"></i>';
      isPlaying = false;
    });

    els.audio.addEventListener("ended", playRandomNext);

    if (els.progressBar) {
      els.progressBar.addEventListener("click", (e) => {
        if (!els.audio.duration) return;
        const rect = els.progressBar.getBoundingClientRect();
        const x = e.clientX - rect.left;
        els.audio.currentTime = (x / rect.width) * els.audio.duration;
      });
    }
  };

  const play = (program, idx, auto = true) => {
    if (!program || !els.audio) return;

    els.audio.src = program["MP3 URL"];
    els.audio.load();

    if (els.nowPlaying) {
      els.nowPlaying.textContent = `در حال پخش: ${program["Program Name"] || "بدون نام"}`;
    }

    $$(".program-item").forEach((el, i) => el.classList.toggle("playing", i === idx));

    currentIndex = idx;

    if (auto) {
      els.audio.play().catch(e => {
        console.warn("Play blocked:", e);
        if (els.nowPlaying) els.nowPlaying.textContent += " (خطا)";
      });
    }
  };

  const togglePlay = () => {
    if (currentIndex === -1 && filteredPrograms.length > 0) {
      play(filteredPrograms[0], 0);
      return;
    }
    if (els.audio.paused || els.audio.ended) {
      els.audio.play();
    } else {
      els.audio.pause();
    }
  };

  const playRandomNext = () => {
    if (filteredPrograms.length < 2) return;
    let idx = Math.floor(Math.random() * filteredPrograms.length);
    while (idx === currentIndex) {
      idx = Math.floor(Math.random() * filteredPrograms.length);
    }
    play(filteredPrograms[idx], idx);
  };

  // ── List rendering ─────────────────────────────────────────────────
  const renderAll = () => {
    if (!els.list) return;

    els.list.innerHTML = ""; // clear

    filteredPrograms.forEach((p, idx) => {
      const item = document.createElement("div");
      item.className = "program-item";
      item.dataset.index = idx;
      item.innerHTML = `
        <div class="program-name">${p["Program Name"] || "بدون نام"}</div>
        <div class="action-buttons">
          <button class="minimal-btn play-this" data-index="${idx}" title="پخش">
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
      els.list.appendChild(item);
    });
  };

  // ── Search ─────────────────────────────────────────────────────────
  let searchTimer;
  const onSearch = (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const term = normalizeDigits(e.target.value.trim().toLowerCase());
      if (!term) {
        filteredPrograms = shuffle(allPrograms);
        renderAll();
        return;
      }

      filteredPrograms = allPrograms.filter(p => {
        let n = (p["Program Name"] || "").toLowerCase();
        n = normalizeDigits(n.replace(/ي/g, 'ی').replace(/ك/g, 'ک'));
        return n.includes(term);
      });

      filteredPrograms = shuffle(filteredPrograms);
      renderAll();
    }, 280);
  };

  // ── Events ─────────────────────────────────────────────────────────
  const bind = () => {
    if (els.playPause) els.playPause.onclick = togglePlay;
    if (els.next) els.next.onclick = playRandomNext;
    if (els.prev) els.prev.onclick = () => {
      const len = filteredPrograms.length;
      if (len === 0) return;
      const i = currentIndex > 0 ? currentIndex - 1 : len - 1;
      play(filteredPrograms[i], i);
    };

    if (els.list) {
      els.list.onclick = (e) => {
        const btn = e.target.closest(".play-this");
        if (btn) {
          const i = parseInt(btn.dataset.index, 10);
          if (!isNaN(i)) play(filteredPrograms[i], i);
          return;
        }
        const row = e.target.closest(".program-item");
        if (row) {
          const i = parseInt(row.dataset.index, 10);
          if (!isNaN(i)) play(filteredPrograms[i], i);
        }
      };
    }

    if (els.search) els.search.oninput = onSearch;
  };

  // ── Start ──────────────────────────────────────────────────────────
  fetch("./programs.json")
    .then(r => r.ok ? r.json() : Promise.reject("بارگذاری ناموفق"))
    .then(data => {
      allPrograms = Array.isArray(data) ? data : [];
      filteredPrograms = shuffle(allPrograms);
      bind();
      setupPlayer();
      renderAll();
    })
    .catch(e => {
      if (els.list) {
        els.list.innerHTML = `
          <p style="color:#ff5555; text-align:center; padding:100px 20px;">
            مشکل در بارگذاری داده‌ها<br>${e.message}
          </p>
        `;
      }
      console.error("Fetch error:", e);
    });
});
