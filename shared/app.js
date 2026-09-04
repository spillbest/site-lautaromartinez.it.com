/* Winita — vanilla JS for static HTML pages.
   No dependencies. ES2020+. Drop-in via <script src="shared/app.js" defer>.

   Modules:
     1. Lobby tabs        — .lobby-tabs button[data-tab] + [data-tab-panel]
     2. Search filter     — input.lobby-search-input → filter .game-tile by data-title
     3. Category chips    — .chip-row button[data-cat] + grid containing .game-tile w/ data-cats
     4. Scrollspy         — IntersectionObserver on sections with id → .scrollspy-bar a
     5. Mobile menu       — [data-menu-toggle] → toggle .is-open on .mh-cats
     6. Hash-scroll fix   — re-scroll on hashchange / late content shifts
     7. Active nav        — set .is-active on header nav link matching body[data-page]
*/

(function () {
  "use strict";

  /* ── 1. Lobby tabs — ARIA tabs pattern ───────────────────── */
  function initLobbyTabs() {
    const groups = document.querySelectorAll(".lobby-tabs");
    groups.forEach((group) => {
      // Mark container as tablist if not already
      if (!group.getAttribute("role")) group.setAttribute("role", "tablist");
      const buttons = group.querySelectorAll("button[data-tab]");
      const root = group.closest("[data-tabs-root]") || document;
      const setActive = (active) => {
        buttons.forEach((b) => {
          const isActive = b === active;
          b.classList.toggle("is-active", isActive);
          b.setAttribute("role", "tab");
          b.setAttribute("aria-selected", isActive ? "true" : "false");
          b.setAttribute("tabindex", isActive ? "0" : "-1");
          const target = b.getAttribute("data-tab");
          if (target) b.setAttribute("aria-controls", `tab-panel-${target}`);
        });
        const target = active.getAttribute("data-tab");
        root.querySelectorAll("[data-tab-panel]").forEach((p) => {
          const matches = p.getAttribute("data-tab-panel") === target;
          p.classList.toggle("is-active", matches);
          p.setAttribute("role", "tabpanel");
          p.id = `tab-panel-${p.getAttribute("data-tab-panel")}`;
          if (matches) p.removeAttribute("hidden"); else p.setAttribute("hidden", "");
        });
      };
      // Initial sync from .is-active or first button
      const initial = group.querySelector("button.is-active") || buttons[0];
      if (initial) setActive(initial);
      buttons.forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          setActive(btn);
        });
        btn.addEventListener("keydown", (e) => {
          if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
          e.preventDefault();
          const list = Array.from(buttons);
          const i = list.indexOf(btn);
          const next = list[(i + (e.key === "ArrowRight" ? 1 : -1) + list.length) % list.length];
          next.focus();
          setActive(next);
        });
      });
    });
  }

  /* ── 2. Search filter (lobby) ────────────────────────────── */
  function initLobbySearch() {
    const inputs = document.querySelectorAll(".lobby-search-input");
    inputs.forEach((input) => {
      const scopeSel = input.getAttribute("data-search-scope");
      const scope = scopeSel ? document.querySelector(scopeSel) : input.closest(".lobby, .card, section, main") || document;
      const empty = scope.querySelector("[data-empty-state]");
      input.addEventListener("input", () => {
        const q = input.value.trim().toLowerCase();
        const tiles = scope.querySelectorAll(".game-tile");
        let visible = 0;
        tiles.forEach((tile) => {
          const title = (tile.getAttribute("data-title") || "").toLowerCase();
          const provider = (tile.getAttribute("data-provider") || "").toLowerCase();
          const match = !q || title.includes(q) || provider.includes(q);
          tile.style.display = match ? "" : "none";
          if (match) visible++;
        });
        if (empty) {
          empty.style.display = visible === 0 ? "" : "none";
          const qNode = empty.querySelector("[data-empty-query]");
          if (qNode) qNode.textContent = input.value;
        }
      });
    });
  }

  /* ── 3. Category chips (games.html) ──────────────────────── */
  function initCategoryChips() {
    const rows = document.querySelectorAll(".chip-row[data-cats]");
    rows.forEach((row) => {
      const buttons = row.querySelectorAll("button[data-cat]");
      const scopeSel = row.getAttribute("data-cats-scope");
      const scope = scopeSel ? document.querySelector(scopeSel) : row.closest("section, .card, main") || document;
      const input = scope.querySelector(".lobby-search-input");
      const empty = scope.querySelector("[data-empty-state]");

      function apply() {
        const activeBtn = row.querySelector("button.is-active") || buttons[0];
        const cat = activeBtn ? activeBtn.getAttribute("data-cat") : "Tutti";
        const q = input ? input.value.trim().toLowerCase() : "";
        const tiles = scope.querySelectorAll(".game-tile");
        let visible = 0;
        tiles.forEach((tile) => {
          const cats = (tile.getAttribute("data-cats") || "").split(",").map((s) => s.trim());
          const title = (tile.getAttribute("data-title") || "").toLowerCase();
          const provider = (tile.getAttribute("data-provider") || "").toLowerCase();
          const matchCat = cat === "Tutti" || cats.includes(cat);
          const matchQuery = !q || title.includes(q) || provider.includes(q);
          const show = matchCat && matchQuery;
          tile.style.display = show ? "" : "none";
          if (show) visible++;
        });
        if (empty) {
          empty.style.display = visible === 0 ? "" : "none";
          const qNode = empty.querySelector("[data-empty-query]");
          const cNode = empty.querySelector("[data-empty-cat]");
          if (qNode) qNode.textContent = input ? input.value : "";
          if (cNode) cNode.textContent = cat;
        }
      }

      buttons.forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          buttons.forEach((b) => b.classList.toggle("is-active", b === btn));
          apply();
        });
      });
      if (input) input.addEventListener("input", apply);
    });
  }

  /* ── 4. Scrollspy ────────────────────────────────────────── */
  function initScrollspy() {
    const bars = document.querySelectorAll(".scrollspy-bar");
    bars.forEach((bar) => {
      const links = Array.from(bar.querySelectorAll('a[href^="#"]'));
      if (!links.length) return;
      const sections = links
        .map((a) => document.getElementById(a.getAttribute("href").slice(1)))
        .filter(Boolean);
      if (!sections.length) return;

      const setActive = (id) => {
        links.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === "#" + id));
      };
      setActive(sections[0].id);

      const obs = new IntersectionObserver(
        (entries) => {
          const vis = entries
            .filter((e) => e.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
          if (vis[0]) setActive(vis[0].target.id);
        },
        { rootMargin: "-25% 0px -55% 0px", threshold: [0, 0.25, 0.5, 1] }
      );
      sections.forEach((s) => obs.observe(s));
    });
  }

  /* ── 5. Mobile menu toggle — aria-expanded sync + Esc + click-outside ── */
  function initMobileMenu() {
    const toggles = document.querySelectorAll("[data-menu-toggle]");
    toggles.forEach((btn) => {
      const sel = btn.getAttribute("data-menu-toggle") || ".mh-cats";
      const menu = document.querySelector(sel);
      if (!menu) return;
      const close = () => {
        menu.classList.remove("is-open");
        btn.classList.remove("is-open");
        btn.setAttribute("aria-expanded", "false");
      };
      const toggle = () => {
        const isOpen = menu.classList.toggle("is-open");
        btn.classList.toggle("is-open", isOpen);
        btn.setAttribute("aria-expanded", String(isOpen));
      };
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        toggle();
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && menu.classList.contains("is-open")) {
          close();
          btn.focus();
        }
      });
      document.addEventListener("click", (e) => {
        if (!menu.classList.contains("is-open")) return;
        if (e.target.closest(".mh-cats, [data-menu-toggle]")) return;
        close();
      });
    });
  }

  /* ── 6. Hash-scroll fix (kept for safety) ────────────────── */
  function initHashScroll() {
    const scrollToHash = () => {
      if (!window.location.hash) return;
      const id = decodeURIComponent(window.location.hash.slice(1));
      const target = document.getElementById(id);
      if (target) target.scrollIntoView({ block: "start" });
    };
    scrollToHash();
    window.requestAnimationFrame(scrollToHash);
    const timers = [250, 800].map((d) => window.setTimeout(scrollToHash, d));
    window.addEventListener("hashchange", scrollToHash);
    window.addEventListener("beforeunload", () => timers.forEach(window.clearTimeout));
  }

  /* ── 7. Active nav (matches body[data-page]) ─────────────── */
  function initActiveNav() {
    const page = document.body && document.body.dataset.page;
    if (!page) return;
    document.querySelectorAll(`.mh-cats-inner a[data-nav="${page}"]`).forEach((a) => {
      a.classList.add("is-active");
      a.setAttribute("aria-current", "page");
    });
  }

  function initLautaroChrome() {
    const header = document.querySelector(".mh");
    if (header && !document.querySelector(".odds-ticker")) {
      const ticker = document.createElement("div");
      ticker.className = "odds-ticker";
      ticker.setAttribute("aria-label", "Quote Lautaro Mondiale 2026");
      ticker.innerHTML = '<div class="odds-track"><span>CAPOCANNONIERE <b>+4900</b></span><span>MARCATORE IN PARTITA <b>+150</b></span><span>ARGENTINA VINCITRICE <b>+450</b></span><span>LAUTARO 2+ GOL <b>+700</b></span><span>GOLDEN BOOT <b>2 cent</b></span><span>CAPOCANNONIERE <b>+4900</b></span><span>MARCATORE IN PARTITA <b>+150</b></span><span>ARGENTINA VINCITRICE <b>+450</b></span><span>LAUTARO 2+ GOL <b>+700</b></span><span>GOLDEN BOOT <b>2 cent</b></span></div>';
      header.insertAdjacentElement("afterend", ticker);
    }

    const missionPopup = document.querySelector(".mission-popup");
    if (missionPopup) {
      let isDismissed = false;
      let isShown = false;
      const showPopup = () => {
        if (isDismissed || isShown || window.scrollY < 120) return;
        isShown = true;
        missionPopup.classList.add("is-visible");
        missionPopup.setAttribute("aria-hidden", "false");
        window.removeEventListener("scroll", showPopup);
      };
      const closePopup = () => {
        isDismissed = true;
        missionPopup.classList.remove("is-visible");
        missionPopup.setAttribute("aria-hidden", "true");
        window.removeEventListener("scroll", showPopup);
      };
      const closeButton = missionPopup.querySelector(".mission-popup-close");
      if (closeButton) closeButton.addEventListener("click", closePopup);
      window.addEventListener("scroll", showPopup, { passive: true });
      const watchScroll = () => {
        showPopup();
        if (!isDismissed && !isShown) window.requestAnimationFrame(watchScroll);
      };
      watchScroll();
    }

  }

  /* ── Bootstrap ───────────────────────────────────────────── */
  function boot() {
    initLobbyTabs();
    initLobbySearch();
    initCategoryChips();
    initScrollspy();
    initMobileMenu();
    initHashScroll();
    initActiveNav();
    initLautaroChrome();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
