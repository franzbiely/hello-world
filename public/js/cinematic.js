/**
 * ==========================================================================
 * Cinematic Portfolio — Video Timeline & Click-to-Advance Controller
 * ==========================================================================
 */

(function () {
  "use strict";

  const video = document.getElementById("bg-video");
  const bgAudio = document.getElementById("bg-audio");
  const overlay = document.getElementById("overlay");
  const btnNext = document.getElementById("btn-next");
  const btnRestart = document.getElementById("btn-restart");
  const btnAudio = document.getElementById("btn-audio");

  const iconAudioOn = btnAudio?.querySelector(".icon-audio-on");
  const iconAudioOff = btnAudio?.querySelector(".icon-audio-off");

  let soundMuted = false;

  const sectionHero = document.getElementById("section-hero");
  const sectionSkillset = document.getElementById("section-skillset");
  const sectionClients = document.getElementById("section-clients");
  const sectionIndustries = document.getElementById("section-industries");
  const sectionOutro = document.getElementById("section-outro");

  const advanceButtons = document.querySelectorAll(".btn-advance");

  const ANIMATABLE_SELECTOR = [
    ".hero-greeting",
    ".hero-name",
    ".hero-tagline",
    ".section-title",
    ".skill-line",
    ".tech-logo",
    ".country-pill",
    ".portfolio-card",
    ".outro-cta",
    ".outro-link",
    "#btn-next",
    "#btn-restart",
  ].join(", ");

  const SEGMENTS = {
    HERO: { start: 0, end: 7 },
    SKILLSET: { start: 7, end: 19 },
    CLIENTS: { start: 42, end: 46 },
    INDUSTRIES: { start: 46, end: 48 },
  };

  const sectionsById = {
    "section-clients": sectionClients,
    "section-industries": sectionIndustries,
    "section-outro": sectionOutro,
  };

  let currentPhase = "INITIAL";
  let activeSegment = null;
  let rafId = null;
  let overlayOpacity = 1;
  let activeInTimeline = null;
  let heroIntroTimeline = null;

  /* --------------------------------------------------------------------------
     Scroll lock — navigation only via buttons
     -------------------------------------------------------------------------- */
  function enableScrollLock() {
    document.body.classList.add("scroll-locked");
    window.addEventListener("wheel", blockScroll, { passive: false });
    window.addEventListener("touchmove", blockScroll, { passive: false });
    window.addEventListener("keydown", blockScrollKeys);
  }

  function blockScroll(e) {
    e.preventDefault();
  }

  function blockScrollKeys(e) {
    if (e.target.closest("button, a, input, textarea")) return;
    const keys = ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "];
    if (keys.includes(e.key)) e.preventDefault();
  }

  /* --------------------------------------------------------------------------
     Overlay
     -------------------------------------------------------------------------- */
  function setOverlayOpacity(value, durationMs = 1200) {
    overlayOpacity = value;
    overlay.style.transition = `opacity ${durationMs}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    overlay.style.opacity = String(value);
    document.documentElement.style.setProperty("--overlay-opacity", String(value));
  }

  /* --------------------------------------------------------------------------
     Hero — HW / FA capitals, lowercase inserts push W / A aside
     -------------------------------------------------------------------------- */
  function createPushWrap(text) {
    const wrap = document.createElement("span");
    wrap.className = "insert-push";
    const inner = document.createElement("span");
    inner.className = "insert-inner";
    inner.textContent = text === " " ? "\u00a0" : text;
    wrap.appendChild(inner);
    return wrap;
  }

  function measurePush(wrap) {
    return wrap.querySelector(".insert-inner").scrollWidth;
  }

  /** H + ello + ␠ + W + orld  →  starts as HW, expands to Hello World */
  function buildHeroPhrase(el) {
    const text = el.dataset.text || "";
    const words = text.trim().split(/\s+/);
    el.textContent = "";

    words.forEach((word, wordIndex) => {
      const initial = document.createElement("span");
      initial.className = "letter letter--initial";
      initial.textContent = word[0];
      el.appendChild(initial);

      const rest = word.slice(1).toLowerCase();
      if (rest) el.appendChild(createPushWrap(rest));

      if (wordIndex < words.length - 1) {
        el.appendChild(createPushWrap(" "));
      }
    });
  }

  function playHeroIntro() {
    document.querySelectorAll(".hero-phrase").forEach(buildHeroPhrase);

    const tagline = sectionHero.querySelector(".hero-tagline");
    tagline.classList.add("is-awaiting");
    btnNext.classList.add("is-awaiting");

    if (typeof gsap === "undefined") {
      tagline.classList.remove("is-awaiting");
      btnNext.classList.remove("is-awaiting");
      return;
    }

    if (heroIntroTimeline) heroIntroTimeline.kill();

    const pushes = sectionHero.querySelectorAll(".insert-push");
    pushes.forEach((wrap) => {
      wrap._targetWidth = measurePush(wrap);
    });

    gsap.set(tagline, { opacity: 0, y: 23 });
    gsap.set(btnNext, { opacity: 0, y: 14 });

    heroIntroTimeline = gsap.timeline();

    heroIntroTimeline.to(
      pushes,
      {
        width: (i, el) => el._targetWidth,
        duration: 0.42,
        stagger: 0.09,
        ease: "power2.out",
      },
      0.3
    );

    heroIntroTimeline.to(
      tagline,
      {
        opacity: 0.8,
        y: 0,
        duration: 0.85,
        ease: "power2.out",
        onStart: () => tagline.classList.remove("is-awaiting"),
      },
      "+=0.15"
    );

    heroIntroTimeline.to(
      btnNext,
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: "power2.out",
        onComplete: () => btnNext.classList.remove("is-awaiting"),
      },
      "-=0.35"
    );
  }

  /* --------------------------------------------------------------------------
     Section content helpers
     -------------------------------------------------------------------------- */
  function getAnimatableItems(sectionEl) {
    if (!sectionEl) return [];
    return Array.from(sectionEl.querySelectorAll(ANIMATABLE_SELECTOR));
  }

  function getVisibleAnimatableItems(sectionEl) {
    const items = getAnimatableItems(sectionEl);
    const advanceBtn = sectionEl.querySelector(".btn-advance");
    if (
      advanceBtn &&
      !advanceBtn.classList.contains("is-hidden") &&
      !items.includes(advanceBtn)
    ) {
      items.push(advanceBtn);
    }
    return items.filter((el) => {
      if (el.id === "btn-restart" && el.classList.contains("is-hidden")) return false;
      const opacity = parseFloat(getComputedStyle(el).opacity);
      return opacity > 0.05 || el === advanceBtn;
    });
  }

  function animateSectionOut(sectionEl) {
    if (!sectionEl || typeof gsap === "undefined") return;

    const advanceBtn = sectionEl.querySelector(".btn-advance");
    if (advanceBtn) hideAdvanceButton(advanceBtn);

    const items = getVisibleAnimatableItems(sectionEl);
    if (!items.length) return;

    gsap.killTweensOf(items);
    if (activeInTimeline) activeInTimeline.kill();

    gsap.to(items, {
      opacity: 0,
      x: 0,
      y: 0,
      rotation: 0,
      scale: 1,
      duration: 0.55,
      stagger: 0.04,
      ease: "power2.out",
    });
  }

  function animateSectionIn(sectionEl, onComplete) {
    if (!sectionEl) {
      if (onComplete) onComplete();
      return;
    }

    if (typeof gsap === "undefined") {
      getAnimatableItems(sectionEl).forEach((el) => {
        el.style.opacity = "1";
        el.style.transform = "none";
      });
      if (onComplete) onComplete();
      return;
    }

    const items = getAnimatableItems(sectionEl).filter(
      (el) => !(el.id === "btn-restart" && el.classList.contains("is-hidden"))
    );

    if (!items.length) {
      if (onComplete) onComplete();
      return;
    }

    if (activeInTimeline) activeInTimeline.kill();
    gsap.killTweensOf(items);

    activeInTimeline = gsap.timeline({
      onComplete: () => {
        activeInTimeline = null;
        if (onComplete) onComplete();
      },
    });

    items.forEach((el, i) => {
      activeInTimeline.fromTo(
        el,
        { opacity: 0, x: 0, y: 36, rotation: 0, scale: 0.9 },
        {
          opacity: 1,
          y: 0,
          rotation: 0,
          scale: 1,
          duration: 0.55,
          ease: "back.out(1.35)",
        },
        i * 0.11
      );
    });
  }

  /* --------------------------------------------------------------------------
     Advance / restart buttons
     -------------------------------------------------------------------------- */
  function showAdvanceButton(btn) {
    if (!btn) return;
    btn.classList.remove("is-hidden", "is-playing");
    btn.disabled = false;

    if (typeof gsap !== "undefined") {
      gsap.fromTo(
        btn,
        { opacity: 0, scale: 0.6, x: 0, y: 20, rotation: 0 },
        { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: "back.out(1.6)" }
      );
    }
  }

  function hideAdvanceButton(btn) {
    if (!btn) return;
    btn.classList.add("is-hidden");
    btn.classList.remove("is-playing");
    if (typeof gsap !== "undefined") gsap.killTweensOf(btn);
  }

  function setAdvancePlaying(btn) {
    if (!btn) return;
    btn.classList.add("is-playing");
    btn.disabled = true;
    if (typeof gsap !== "undefined") {
      gsap.to(btn, { opacity: 0, scale: 0.5, duration: 0.3, ease: "power2.in" });
    }
  }

  function getAdvanceButtonForSection(sectionEl) {
    return sectionEl?.querySelector(".btn-advance") ?? null;
  }

  function showRestartButton() {
    if (!btnRestart) return;
    btnRestart.classList.remove("is-hidden");
    if (typeof gsap !== "undefined") {
      gsap.fromTo(
        btnRestart,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.65, ease: "back.out(1.4)" }
      );
    }
  }

  function hideRestartButton() {
    if (!btnRestart) return;
    btnRestart.classList.add("is-hidden");
    if (typeof gsap !== "undefined") gsap.killTweensOf(btnRestart);
  }

  /* --------------------------------------------------------------------------
     Video playback
     -------------------------------------------------------------------------- */
  function playSegment(segmentKey, { sourceSection = null, onComplete } = {}) {
    const seg = SEGMENTS[segmentKey];
    if (!seg) return;

    if (sourceSection) animateSectionOut(sourceSection);

    activeSegment = segmentKey;
    currentPhase = "PLAYING";

    video.currentTime = seg.start;
    const playPromise = video.play();
    if (playPromise) playPromise.catch(() => {});

    function tick() {
      if (currentPhase !== "PLAYING" || activeSegment !== segmentKey) return;

      const t = video.currentTime;

      if (segmentKey === "INDUSTRIES" && t >= 46) {
        const progress = Math.min((t - 46) / 2, 1);
        setOverlayOpacity(0.75 * progress, 400);
      }

      if (t >= seg.end - 0.05) {
        video.pause();
        video.currentTime = seg.end;
        currentPhase = "PAUSED";
        activeSegment = null;
        cancelAnimationFrame(rafId);
        rafId = null;

        if (segmentKey === "INDUSTRIES") setOverlayOpacity(0.75, 800);
        if (onComplete) onComplete();
        return;
      }

      rafId = requestAnimationFrame(tick);
    }

    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(tick);
  }

  video.addEventListener("timeupdate", () => {
    if (currentPhase !== "PLAYING" || !activeSegment) return;
    const seg = SEGMENTS[activeSegment];
    if (video.currentTime >= seg.end - 0.04) {
      video.pause();
      video.currentTime = seg.end;
    }
  });

  /* --------------------------------------------------------------------------
     Section reveal
     -------------------------------------------------------------------------- */
  function revealSection(targetId, onRevealed) {
    const targetSection = sectionsById[targetId];
    if (!targetSection) return;

    targetSection.scrollIntoView({ behavior: "smooth" });

    setTimeout(() => {
      animateSectionIn(targetSection, () => {
        if (targetId === "section-outro") {
          showRestartButton();
        } else {
          showAdvanceButton(getAdvanceButtonForSection(targetSection));
        }
        if (onRevealed) onRevealed();
      });
    }, 450);
  }

  /* --------------------------------------------------------------------------
     Event listeners
     -------------------------------------------------------------------------- */
  btnNext.addEventListener("click", () => {
    if (btnNext.classList.contains("is-awaiting")) return;

    setOverlayOpacity(0, 1400);

    playSegment("HERO", {
      sourceSection: sectionHero,
      onComplete: () => {
        sectionSkillset.scrollIntoView({ behavior: "smooth" });
        setTimeout(() => {
          animateSectionIn(sectionSkillset, () => {
            showAdvanceButton(getAdvanceButtonForSection(sectionSkillset));
          });
        }, 450);
      },
    });
  });

  advanceButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.disabled || currentPhase === "PLAYING") return;

      setAdvancePlaying(btn);

      playSegment(btn.dataset.segment, {
        sourceSection: btn.closest(".section"),
        onComplete: () => {
          hideAdvanceButton(btn);
          revealSection(btn.dataset.target);
        },
      });
    });
  });

  /* --------------------------------------------------------------------------
     Audio mute toggle — controls video + looping bg music
     Bg music starts immediately on load (independent of video timeline).
     -------------------------------------------------------------------------- */
  let audioUnlockBound = false;

  function syncAudioButton() {
    if (!btnAudio) return;
    btnAudio.setAttribute("aria-pressed", String(soundMuted));
    btnAudio.setAttribute("aria-label", soundMuted ? "Unmute sound" : "Mute sound");
    btnAudio.title = soundMuted ? "Unmute" : "Mute";
    if (iconAudioOn) iconAudioOn.hidden = soundMuted;
    if (iconAudioOff) iconAudioOff.hidden = !soundMuted;
  }

  function setAudioMuted(muted) {
    soundMuted = muted;
    video.muted = muted;
    if (bgAudio) bgAudio.muted = muted;
    syncAudioButton();
  }

  function ensureBgAudioPlaying() {
    if (!bgAudio) return Promise.resolve();
    bgAudio.loop = true;
    if (!bgAudio.paused) return Promise.resolve();
    return bgAudio.play().catch(() => {});
  }

  function bindAudioUnlock() {
    if (audioUnlockBound) return;
    audioUnlockBound = true;

    const unlock = () => {
      if (!bgAudio) return;
      bgAudio.muted = soundMuted;
      bgAudio.play().catch(() => {});
      // After a user gesture, restore intended default: sound ON unless user muted
      if (!soundMuted) {
        video.muted = false;
        bgAudio.muted = false;
      }
    };

    document.addEventListener("pointerdown", unlock, { once: true, capture: true });
    document.addEventListener("keydown", unlock, { once: true, capture: true });
    document.addEventListener("touchstart", unlock, { once: true, capture: true });
  }

  function startBackgroundAudio() {
    if (!bgAudio) return;

    bgAudio.loop = true;
    bgAudio.volume = 1;
    soundMuted = false;
    video.muted = false;
    bgAudio.muted = false;
    syncAudioButton();

    const tryPlayUnmuted = () => {
      bgAudio.muted = false;
      return bgAudio.play();
    };

    // 1) Prefer unmuted playback immediately
    tryPlayUnmuted()
      .then(() => {
        soundMuted = false;
        syncAudioButton();
      })
      .catch(() => {
        // 2) Browser blocked unmuted autoplay — start muted so track runs NOW
        bgAudio.muted = true;
        bgAudio
          .play()
          .then(() => {
            bindAudioUnlock(); // unmute on first gesture (keeps default = sound on)
          })
          .catch(() => {
            bindAudioUnlock();
          });
      });

    // Retry as soon as the file is ready
    const retry = () => {
      if (soundMuted) return;
      if (bgAudio.paused) ensureBgAudioPlaying();
      else if (bgAudio.muted) {
        // Still waiting for gesture to unmute — keep track playing
        ensureBgAudioPlaying();
      }
    };

    bgAudio.addEventListener("canplay", retry);
    bgAudio.addEventListener("loadeddata", retry);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) retry();
    });
  }

  btnAudio?.addEventListener("click", () => {
    setAudioMuted(!soundMuted);
    ensureBgAudioPlaying();
  });

  /* --------------------------------------------------------------------------
     Init
     -------------------------------------------------------------------------- */
  function init() {
    video.pause();
    video.currentTime = 0;
    video.volume = 0.4;
    startBackgroundAudio(); // first thing — before hero / video interaction
    setOverlayOpacity(1, 0);
    enableScrollLock();

    advanceButtons.forEach((btn) => hideAdvanceButton(btn));
    hideRestartButton();

    if (btnRestart) {
      btnRestart.href = window.location.href;
    }

    video.addEventListener("loadedmetadata", () => {
      video.currentTime = 0;
    });

    playHeroIntro();
  }

  // Kick audio as early as the element exists (don't wait for full init path)
  if (bgAudio) {
    bgAudio.loop = true;
    bgAudio.autoplay = true;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
