document.addEventListener("DOMContentLoaded", () => {
  // ── Safe DOM query helper ─────────────────────────────────────────
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

  // Guard: if critical elements missing → show error early
  if (!els.list || !els.audio) {
    if (els.list) {
      els.list.innerHTML = '<p style="color:#ff4444; padding:60px 0; text-align:center;">خطا: عناصر اصلی صفحه پیدا نشدند</p>';
    }
    console.error("Critical DOM elements missing");
    return;
  }

  // ── State ──────────────────────────────────────────────────────────
  let allPrograms = [];
  let shuffledPrograms = [];
  let visibleCount = 0;
  let currentIndex = -1;
  let isPlaying = false;

  const BATCH_SIZE = 13;

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

  const normalizeNumber = (str) =>
    str.replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
       .replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));

  // ── Player ─────────────────────────────────────────────────────────
  const initPlayer = () => {
    if (!els.audio) return;

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
    if (!els.audio || !program) return;

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
    if (currentIndex === -1 && shuffledPrograms.length > 0) {
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
    while (idx === currentIndex) {
      idx = Math.floor(Math.random() * shuffledPrograms.length);
    }
    play(shuffledPrograms[idx], idx);
  };

  // ── List & Show More ───────────────────────────────────────────────
  let loadStarted = false;

  const loadFirstBatch = () => {
    if (loadStarted) return;
    loadStarted = true;

    if (!els.list) return;

    // Immediate feedback
    els.list.innerHTML = `
      <div style="text-align:center; padding:80px 0; color:#00f0ff;">
        <i class="fas fa-spinner fa-spin fa-2x"></i><br><br>
        بارگذاری برنامه‌ها...
      </div>
    `;

    fetch("./programs.json")
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(data => {
        allPrograms = Array.isArray(data) ? data : [];
        if (allPrograms.length === 0) {
          els.list.innerHTML = '<p style="color:#ff9999; text-align:center; padding:60px 0;">هیچ برنامه‌ای یافت نشد</p>';
          return;
        }

        shuffledPrograms = shuffle(allPrograms);
        visibleCount = 0;
        els.list.innerHTML = "";
        appendBatch();
      })
      .catch(err => {
        els.list.innerHTML = `
          <p style="color:#ff4444; text-align:center; padding:60px 0;">
            خطا در بارگذاری: ${err.message || "فایل پیدا نشد"}<br>
            لطفاً صفحه را رفرش کنید یا بعداً امتحان کنید.
          </p>
        `;
        console.error("Load error:", err);
      });
  };

  const appendBatch = () => {
    if (!els.list || visibleCount >= shuffledPrograms.length) return;

    const start = visibleCount;
    const end = Math.min(start + BATCH_SIZE, shuffledPrograms.length);
    const batch = shuffledPrograms.slice(start, end);

    const frag = document.createDocumentFragment();

    batch.forEach((p, i) => {
      const idx = visibleCount + i;
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
      frag.appendChild(item);
    });

    els.list.appendChild(frag);
    visibleCount = end;

    if (els.showMore) {
      els.showMore.style.display = visibleCount < shuffledPrograms.length ? "block" : "none";
    }
  };

  // ── Search ─────────────────────────────────────────────────────────
  let searchTimer;
  const onSearch = (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const term = normalizeNumber(e.target.value.trim().toLowerCase());
      if (!term) {
        loadFirstBatch();
        return;
      }

      const filtered = allPrograms.filter(p => {
        let n = (p["Program Name"] || "").toLowerCase();
        n = normalizeNumber(n.replace(/ي/g, 'ی').replace(/ك/g, 'ک'));
        return n.includes(term);
      });

      shuffledPrograms = shuffle(filtered);
      visibleCount = 0;
      els.list.innerHTML = "";
      appendBatch();

      if (els.showMore) els.showMore.style.display = "none";
    }, 250);
  };

  // ── Events ─────────────────────────────────────────────────────────
  const bind = () => {
    if (els.playPause) els.playPause.onclick = togglePlay;
    if (els.next) els.next.onclick = playRandomNext;
    if (els.prev) els.prev.onclick = () => {
      const len = shuffledPrograms.length;
      if (len === 0) return;
      const i = currentIndex > 0 ? currentIndex - 1 : len - 1;
      play(shuffledPrograms[i], i);
    };

    if (els.list) {
      els.list.onclick = (e) => {
        const b = e.target.closest(".play-this");
        if (b) {
          const i = parseInt(b.dataset.index, 10);
          if (!isNaN(i)) play(shuffledPrograms[i], i);
          return;
        }
        const row = e.target.closest(".program-item");
        if (row) {
          const i = parseInt(row.dataset.index, 10);
          if (!isNaN(i)) play(shuffledPrograms[i], i);
        }
      };
    }

    if (els.showMore) els.showMore.onclick = appendBatch;
    if (els.search) els.search.oninput = onSearch;
  };

  // ── Go ─────────────────────────────────────────────────────────────
  if (els.list) {
    els.list.innerHTML = `
      <div style="text-align:center; padding:100px 0; color:#00aaff;">
        <i class="fas fa-spinner fa-spin fa-2x"></i><br><br>
        بارگذاری آرشیو گلها...
      </div>
    `;
  }

  fetch("./programs.json")
    .then(r => r.ok ? r.json() : Promise.reject(r.status + " " + r.statusText))
    .then(data => {
      allPrograms = Array.isArray(data) ? data : [];
      bind();
      setupPlayer();
      loadFirstBatch();
    })
    .catch(e => {
      if (els.list) {
        els.list.innerHTML = `
          <p style="color:#ff5555; text-align:center; padding:100px 20px; font-size:1.2rem;">
            مشکل در بارگذاری داده‌ها<br>${e.message}
          </p>
        `;
      }
      console.error("Startup error:", e);
    });
});
