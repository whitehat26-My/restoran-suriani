/* Restoran Suriani — site behaviour.
   No build step: this is plain ES5-compatible script loaded after
   menu-icons.js and menu-data.js, both of which declare globals. */

(function () {
  "use strict";

  /* The brush rules under section headings draw in on scroll, but only
     when the observer that triggers them exists — so the no-JS and
     no-IntersectionObserver page shows the rules already drawn, never
     hidden. Content is never gated on animation anywhere on this site. */
  if ("IntersectionObserver" in window) {
    document.documentElement.classList.add("draw");
  }

  /* ------------------------------------------------------------------ */
  /* Configuration                                                       */
  /* ------------------------------------------------------------------ */

  var WHATSAPP = "60192103630";

  /* Delivery platform store pages. Leave a value empty and its button is
     simply not rendered — no broken links ship. Paste the store URLs from
     the foodpanda / GrabFood merchant dashboards to switch them on, and
     add the same URLs to the "sameAs" array in the JSON-LD block in
     index.html so Google associates them with the restaurant. */
  var DELIVERY = [
    { id: "foodpanda", label: "foodpanda", url: "https://www.foodpanda.my/ms/restaurant/r2qc/restoran-suriani-jalan-imbi" },
    { id: "grabfood", label: "GrabFood", url: "" }
  ];

  var STORAGE_KEY = "suriani-lang";
  var currentLang = "ms";

  /* Trading hours, in minutes past midnight. 6:30am to 10:00pm, every day.
     Everything on the page that claims the restaurant is open reads from
     here — the hero indicator, the board and the Location panel — so the
     hours are stated in exactly one place and cannot drift apart.
     Changing these two numbers changes the whole site, EXCEPT the
     openingHoursSpecification in the JSON-LD block in index.html, which
     Google reads and must be edited to match by hand. */
  var OPENS_AT = 6 * 60 + 30;   /* 06:30 */
  var CLOSES_AT = 22 * 60;      /* 22:00 */

  function minutesNow() {
    var d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }

  function isOpenNow() {
    var m = minutesNow();
    return m >= OPENS_AT && m < CLOSES_AT;
  }

  /* ------------------------------------------------------------------ */
  /* Helpers                                                             */
  /* ------------------------------------------------------------------ */

  function $(id) { return document.getElementById(id); }

  function on(el, evt, fn) { if (el) el.addEventListener(evt, fn); }

  /* Parse the icon strings from menu-icons.js into real nodes rather than
     assigning innerHTML. The strings are ours, but this keeps the codebase
     free of HTML-injection sinks entirely, which is what lets the
     Content-Security-Policy in _headers stay strict. */
  function svgFromString(str) {
    if (!str) return null;
    var doc = new DOMParser().parseFromString(str, "image/svg+xml");
    if (doc.getElementsByTagName("parsererror").length) return null;
    var node = doc.documentElement;
    return node ? document.importNode(node, true) : null;
  }

  function clear(el) {
    while (el && el.firstChild) el.removeChild(el.firstChild);
  }

  /* ------------------------------------------------------------------ */
  /* Language                                                            */
  /* ------------------------------------------------------------------ */

  var translatable = document.querySelectorAll("[data-en][data-ms]");
  var langToggle = $("lang-toggle");

  function storedLanguage() {
    /* Whitelist the value rather than trusting it. localStorage is only
       ever written by this script, so a poisoned value implies the browser
       is already compromised — but validating here means a garbage value
       can never flow into getAttribute("data-" + lang) or the lang
       attribute even so. Defence in depth, not a live vector. */
    try {
      var v = localStorage.getItem(STORAGE_KEY);
      return (v === "ms" || v === "en") ? v : "ms";
    } catch (e) { return "ms"; }
  }

  function applyLanguage(lang) {
    currentLang = lang;

    for (var i = 0; i < translatable.length; i++) {
      var el = translatable[i];
      /* textContent, not innerHTML: getAttribute already returns the
         decoded string, so entities like &amp; render correctly and there
         is no markup parsing step to abuse. */
      el.textContent = el.getAttribute("data-" + lang);
    }

    var search = $("menu-search");
    if (search) search.placeholder = search.getAttribute("data-placeholder-" + lang) || "";

    document.documentElement.lang = lang;

    if (langToggle) {
      langToggle.textContent = lang === "ms" ? "EN" : "BM";
      langToggle.setAttribute("aria-label", lang === "ms" ? "Switch to English" : "Tukar ke Bahasa Melayu");
    }

    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}

    renderMenu();
    renderDelivery();
    renderBoard();
    renderOpenState();
  }

  on(langToggle, "click", function () {
    applyLanguage(currentLang === "ms" ? "en" : "ms");
  });

  /* ------------------------------------------------------------------ */
  /* Header: sticky state, height measurement, mobile drawer             */
  /* ------------------------------------------------------------------ */

  var header = $("site-header");
  var navToggle = $("nav-toggle");
  var siteNav = $("site-nav");

  function measureHeader() {
    if (!header) return;
    document.documentElement.style.setProperty("--header-h", header.offsetHeight + "px");
  }

  function onScroll() {
    if (header) header.classList.toggle("is-stuck", window.scrollY > 8);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", measureHeader);

  function setNavOpen(open) {
    if (!siteNav || !navToggle) return;
    siteNav.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  }

  on(navToggle, "click", function () {
    setNavOpen(navToggle.getAttribute("aria-expanded") !== "true");
  });

  if (siteNav) {
    var navLinks = siteNav.querySelectorAll("a");
    for (var n = 0; n < navLinks.length; n++) {
      on(navLinks[n], "click", function () { setNavOpen(false); });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Menu                                                                */
  /* ------------------------------------------------------------------ */

  var tabsEl = $("menu-tabs");
  var panelsEl = $("menu-panels");
  var noteEl = $("menu-category-note");
  var emptyEl = $("menu-empty");
  var searchEl = $("menu-search");
  var searchClear = $("menu-search-clear");

  var hasMenuData = typeof MENU_CATEGORIES !== "undefined" && typeof MENU_ITEMS !== "undefined";
  var activeCategory = hasMenuData && MENU_CATEGORIES[0] ? MENU_CATEGORIES[0].id : null;
  var query = "";

  function formatPrice(item, lang) {
    if (typeof item.price === "number") return "RM " + item.price.toFixed(2);
    return lang === "ms" ? "Sila tanya" : "Ask staff";
  }

  function pickMenuIcon(item) {
    var name = ((item.en || "") + " " + (item.ms || "")).toLowerCase();
    if (item.category === "nasi-lemak") return "nasiLemak";
    if (item.category === "hainan") return /taugeh|sprout/.test(name) ? "vegetable" : "chickenRice";
    if (item.category === "western") return "steak";
    if (item.category === "pasta") return "pasta";
    if (/penyet/.test(name)) return "penyet";
    if (/bakso|meatball|bebola/.test(name)) return "meatball";
    if (/telur|egg/.test(name)) return "egg";
    if (/\bsup\b|soup|tomyam|tom yam/.test(name)) return "soup";
    if (/kangkung|kailan|sayur|vegetable/.test(name)) return "vegetable";
    if (/roti|toast|bread/.test(name)) return "toast";
    if (/lontong|impit/.test(name)) return "riceGravy";
    if (item.category === "fried-rice") return "friedRice";
    if (item.category === "noodles") return "noodle";
    if (item.category === "side-dish") return "fries";
    if (item.category === "breakfast") return "friedRice";
    return "riceGravy";
  }

  function renderMedia(container, item) {
    clear(container);
    if (item.photo) {
      var img = document.createElement("img");
      img.src = item.photo;
      img.alt = item[currentLang] || "";
      img.loading = "lazy";
      container.appendChild(img);
      return;
    }
    var type = pickMenuIcon(item);
    var markup = (typeof MENU_ICONS !== "undefined" && MENU_ICONS[type]) ? MENU_ICONS[type] : "";
    var svg = svgFromString(markup);
    if (svg) container.appendChild(svg);
  }

  function renderTabs() {
    if (!tabsEl || !hasMenuData) return;
    clear(tabsEl);

    MENU_CATEGORIES.forEach(function (cat) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "menu-tab" + (!query && cat.id === activeCategory ? " active" : "");
      /* The emoji in cat.icon is deliberately not rendered — the rail reads
         as a menu index, not a picker. The data is left untouched. */
      btn.textContent = cat[currentLang];
      btn.setAttribute("aria-pressed", !query && cat.id === activeCategory ? "true" : "false");
      on(btn, "click", function () {
        activeCategory = cat.id;
        query = "";
        if (searchEl) searchEl.value = "";
        if (searchClear) searchClear.hidden = true;
        renderMenu();
      });
      tabsEl.appendChild(btn);
    });
  }

  function matchingItems() {
    if (!hasMenuData) return [];

    if (query) {
      var q = query.toLowerCase();
      return MENU_ITEMS.filter(function (item) {
        return ((item.ms || "") + " " + (item.en || "") + " " +
                (item.descMs || "") + " " + (item.descEn || "") + " " +
                (item.code || "")).toLowerCase().indexOf(q) !== -1;
      });
    }

    return MENU_ITEMS.filter(function (item) { return item.category === activeCategory; });
  }

  function buildDish(item) {
    var row = document.createElement("button");
    row.type = "button";
    row.className = "dish";

    var thumb = document.createElement("span");
    thumb.className = "dish-thumb";
    renderMedia(thumb, item);

    var head = document.createElement("span");
    head.className = "dish-head";

    /* The kitchen's own dish number, shown the way the printed menu shows
       it. It is also how staff recognise an order, so it earns its place. */
    var code = document.createElement("span");
    code.className = "dish-code";
    code.textContent = item.code || "";

    var name = document.createElement("span");
    name.className = "dish-name";
    name.textContent = item[currentLang];

    var leader = document.createElement("span");
    leader.className = "dish-leader";
    leader.setAttribute("aria-hidden", "true");

    var price = document.createElement("span");
    price.className = "dish-price" + (typeof item.price === "number" ? "" : " price-unknown");
    price.textContent = formatPrice(item, currentLang);

    head.appendChild(code);
    head.appendChild(name);
    head.appendChild(leader);
    head.appendChild(price);

    var desc = document.createElement("span");
    desc.className = "dish-desc";
    desc.textContent = item["desc" + (currentLang === "ms" ? "Ms" : "En")] || "";

    row.appendChild(thumb);
    row.appendChild(head);
    row.appendChild(desc);

    on(row, "click", function () { openModal(item); });
    return row;
  }

  function renderMenu() {
    if (!panelsEl || !hasMenuData) return;

    renderTabs();

    var cat = MENU_CATEGORIES.filter(function (c) { return c.id === activeCategory; })[0];
    if (noteEl) noteEl.textContent = (!query && cat && cat.note) ? cat.note[currentLang] : "";

    var items = matchingItems();
    clear(panelsEl);

    if (emptyEl) emptyEl.hidden = items.length > 0;
    if (!items.length) return;

    var list = document.createElement("div");
    list.className = "dish-list";
    items.forEach(function (item) { list.appendChild(buildDish(item)); });
    panelsEl.appendChild(list);
  }

  on(searchEl, "input", function () {
    query = searchEl.value.trim();
    if (searchClear) searchClear.hidden = !query;
    renderMenu();
  });

  on(searchClear, "click", function () {
    if (searchEl) { searchEl.value = ""; searchEl.focus(); }
    query = "";
    searchClear.hidden = true;
    renderMenu();
  });

  /* ------------------------------------------------------------------ */
  /* Modal — with focus trap and focus restore                           */
  /* ------------------------------------------------------------------ */

  var modal = $("menu-modal");
  var modalOrder = $("modal-order");
  var lastFocused = null;

  function focusableInModal() {
    if (!modal) return [];
    return Array.prototype.filter.call(
      modal.querySelectorAll("a[href], button:not([disabled])"),
      function (el) { return el.getClientRects().length > 0; }
    );
  }

  function openModal(item) {
    if (!modal) return;
    lastFocused = document.activeElement;

    var codeEl = $("modal-code");
    if (codeEl) {
      codeEl.textContent = item.code || "";
      codeEl.hidden = !item.code;
    }

    renderMedia($("modal-icon"), item);

    var tag = $("modal-illustration-tag");
    if (tag) tag.hidden = !!item.photo;

    $("modal-name").textContent = item[currentLang];
    $("modal-desc").textContent = item["desc" + (currentLang === "ms" ? "Ms" : "En")] || "";

    var priceEl = $("modal-price");
    priceEl.textContent = formatPrice(item, currentLang);
    priceEl.className = "modal-price" + (typeof item.price === "number" ? "" : " price-unknown");

    $("modal-note").textContent = item.priceNote ? item.priceNote[currentLang] : "";

    if (modalOrder) {
      var msg = currentLang === "ms"
        ? "Salam, saya ingin memesan: " + item.ms
        : "Hi, I would like to order: " + item.en;
      modalOrder.href = "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(msg);
    }

    modal.hidden = false;
    document.body.style.overflow = "hidden";

    var f = focusableInModal();
    if (f.length) f[0].focus();
  }

  function closeModal() {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.body.style.overflow = "";
    if (lastFocused && lastFocused.focus) lastFocused.focus();
    lastFocused = null;
  }

  on(modal, "click", function (e) {
    if (e.target.hasAttribute && e.target.hasAttribute("data-close-modal")) closeModal();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeModal();
      setNavOpen(false);
      return;
    }

    if (e.key !== "Tab" || !modal || modal.hidden) return;

    var f = focusableInModal();
    if (!f.length) return;

    var first = f[0];
    var last = f[f.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  /* ------------------------------------------------------------------ */
  /* Catering enquiry — validated, then handed to WhatsApp               */
  /* ------------------------------------------------------------------ */

  var form = $("catering-form");

  function setFieldError(input, errorEl, show) {
    if (input) input.setAttribute("aria-invalid", show ? "true" : "false");
    if (errorEl) errorEl.hidden = !show;
  }

  if (form) {
    /* An event cannot be catered for a date already past. */
    var dateInput = $("catering-date");
    if (dateInput) {
      var today = new Date();
      var iso = today.getFullYear() + "-" +
        String(today.getMonth() + 1).padStart(2, "0") + "-" +
        String(today.getDate()).padStart(2, "0");
      dateInput.min = iso;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var nameEl = $("catering-name");
      var paxEl = $("catering-pax");
      var typeEl = $("catering-event-type");
      var notesEl = $("catering-notes");

      var name = nameEl.value.trim();
      var date = dateInput ? dateInput.value : "";
      var pax = paxEl.value.trim();

      var bad = false;
      if (!name) { setFieldError(nameEl, $("err-name"), true); bad = true; } else setFieldError(nameEl, $("err-name"), false);
      if (!date) { setFieldError(dateInput, $("err-date"), true); bad = true; } else setFieldError(dateInput, $("err-date"), false);
      if (!pax || Number(pax) < 1) { setFieldError(paxEl, $("err-pax"), true); bad = true; } else setFieldError(paxEl, $("err-pax"), false);

      if (bad) {
        var firstBad = form.querySelector('[aria-invalid="true"]');
        if (firstBad) firstBad.focus();
        return;
      }

      var eventType = typeEl.options[typeEl.selectedIndex].textContent;
      var notes = notesEl.value.trim();

      var lines = currentLang === "ms"
        ? ["Salam, saya ingin bertanya tentang khidmat katering untuk acara saya.",
           "Nama: " + name,
           "Tarikh Acara: " + date,
           "Bilangan Tetamu: " + pax,
           "Jenis Acara: " + eventType,
           notes ? "Catatan: " + notes : null]
        : ["Hi, I would like to enquire about catering for my event.",
           "Name: " + name,
           "Event Date: " + date,
           "Number of Guests: " + pax,
           "Event Type: " + eventType,
           notes ? "Notes: " + notes : null];

      var message = lines.filter(Boolean).join("\n");
      window.open("https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(message), "_blank", "noopener");
    });
  }

  /* ------------------------------------------------------------------ */
  /* Location: copy address, delivery links, click-to-load map           */
  /* ------------------------------------------------------------------ */

  /* One handler per branch. Each button carries its own address in
     data-copy, so adding a third branch needs no JavaScript change. */
  var copyButtons = document.querySelectorAll(".copy-address");

  Array.prototype.forEach.call(copyButtons, function (btn) {
    on(btn, "click", function () {
      var text = btn.getAttribute("data-copy") || "";
      if (!text) return;
      var done = function () {
        var original = btn.getAttribute("data-" + currentLang);
        btn.textContent = btn.getAttribute("data-copied-" + currentLang) || "Copied";
        setTimeout(function () { btn.textContent = original; }, 2000);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () {});
      }
    });
  });

  function renderDelivery() {
    var row = $("delivery-row");
    var box = $("delivery-links");
    if (!row || !box) return;

    var active = DELIVERY.filter(function (d) { return d.url; });
    row.hidden = active.length === 0;
    clear(box);

    active.forEach(function (d) {
      var a = document.createElement("a");
      a.className = "btn btn-outline btn-sm";
      a.href = d.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = d.label;
      box.appendChild(a);
    });
  }

  /* The Google Maps embed is the page's only third-party request. Loading
     it only on click keeps the default page load entirely first-party —
     and with a branch each, a visitor loads only the map they asked for.
     Each facade carries its own address in data-map-query. */
  var mapFacades = document.querySelectorAll(".map-facade");

  Array.prototype.forEach.call(mapFacades, function (facade) {
    on(facade, "click", function () {
      var query = facade.getAttribute("data-map-query");
      if (!query) return;
      var frame = document.createElement("iframe");
      frame.src = "https://www.google.com/maps?q=" + encodeURIComponent(query) + "&output=embed";
      frame.title = facade.getAttribute("data-map-title") || "Restoran Suriani";
      frame.loading = "lazy";
      /* Match the page's own Referrer-Policy rather than weakening it.
         "no-referrer-when-downgrade" sends the full URL to Google on an
         https->https load; the page header is stricter, so align to it and
         hand Google only the origin. */
      frame.referrerPolicy = "strict-origin-when-cross-origin";
      frame.setAttribute("allowfullscreen", "");
      facade.parentNode.replaceChild(frame, facade);
    });
  });

  /* ------------------------------------------------------------------ */
  /* The board: menu highlights that follow the clock                    */
  /* ------------------------------------------------------------------ */

  /* Four dishes pinned to the maroon board, chosen by the hour. A 24-hour
     kitchen is the one fact competitors cannot copy, so the homepage
     quietly demonstrates it instead of claiming it. Codes reference real
     entries in menu-data.js; a code that stops existing is skipped, so a
     menu edit can never break the board. */
  /* Nasi ayam Hainan is the dish on the signboard, so NA01 is pinned to
     every set and always carries the "paling laku" stamp. The other three
     rotate with the hour. */
  var BEST_SELLER = "NA01";

  var BOARD_SETS = {
    sarapan: {
      ms: "Untuk sarapan pagi ini",
      en: "For breakfast this morning",
      codes: [BEST_SELLER, "NL01", "B02", "B01"]
    },
    tengahari: {
      ms: "Untuk makan tengah hari",
      en: "For lunch today",
      codes: [BEST_SELLER, "SNP01", "ST01", "MD03"]
    },
    malam: {
      ms: "Untuk makan malam",
      en: "For dinner tonight",
      codes: [BEST_SELLER, "WF01", "WF03", "P01"]
    },
    /* Outside trading hours the board must not imply the kitchen is
       cooking. It says when we open and shows what will be waiting. */
    tutup: {
      ms: "Kami buka jam 6:30 pagi",
      en: "We open at 6:30 am",
      codes: [BEST_SELLER, "NL01", "B02", "B03"]
    }
  };

  function boardWindow() {
    var m = minutesNow();
    if (m < OPENS_AT || m >= CLOSES_AT) return "tutup";
    if (m < 11 * 60) return "sarapan";
    if (m < 17 * 60) return "tengahari";
    return "malam";
  }

  function findByCode(code) {
    if (!hasMenuData) return null;
    for (var i = 0; i < MENU_ITEMS.length; i++) {
      if (MENU_ITEMS[i].code === code) return MENU_ITEMS[i];
    }
    return null;
  }

  function renderBoard() {
    var grid = $("board-grid");
    var title = $("board-title");
    if (!grid || !hasMenuData) return;

    var set = BOARD_SETS[boardWindow()];
    if (title) title.textContent = set[currentLang];

    clear(grid);

    set.codes.forEach(function (code) {
      var item = findByCode(code);
      if (!item) return;

      var card = document.createElement("button");
      card.type = "button";
      card.className = "board-card";

      if (code === BEST_SELLER) {
        var star = document.createElement("span");
        star.className = "stamp";
        star.textContent = currentLang === "ms" ? "Paling laku" : "Best seller";
        card.appendChild(star);
      }

      var codeEl = document.createElement("span");
      codeEl.className = "board-card-code";
      codeEl.textContent = item.code;

      /* Menu names are category-relative — "Biasa" under Nasi Lemak, "Sup"
         under Mee & Bihun. Alone on a chit they read as nonsense, so every
         chit names its category. It also teaches the code system. */
      var cat = MENU_CATEGORIES.filter(function (c) { return c.id === item.category; })[0];
      var catEl = document.createElement("span");
      catEl.className = "board-card-cat";
      catEl.textContent = cat ? cat[currentLang] : "";

      var nameEl = document.createElement("span");
      nameEl.className = "board-card-name";
      nameEl.textContent = item[currentLang];

      var descEl = document.createElement("span");
      descEl.className = "board-card-desc";
      descEl.textContent = item["desc" + (currentLang === "ms" ? "Ms" : "En")] || "";

      var priceEl = document.createElement("span");
      priceEl.className = "board-card-price" + (typeof item.price === "number" ? "" : " price-unknown");
      priceEl.textContent = formatPrice(item, currentLang);

      card.appendChild(codeEl);
      card.appendChild(catEl);
      card.appendChild(nameEl);
      card.appendChild(descEl);
      card.appendChild(priceEl);

      on(card, "click", function () { openModal(item); });
      grid.appendChild(card);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Open / closed, decided by the clock                                 */
  /* ------------------------------------------------------------------ */

  /* The pulsing indicator used to read "we never close", which was true
     when the kitchen ran 24 hours. With fixed hours a hardcoded "open now"
     becomes a lie every night, so it is computed. The markup ships in the
     closed state and JS turns it on, because a visitor with no JS is
     better served by "6:30 pagi - 10 malam" than by a false "open now". */
  var openStatus = $("open-status");
  var openDot = $("open-dot");

  function renderOpenState() {
    if (!openStatus) return;

    var open = isOpenNow();
    var key = open ? "open" : "closed";

    openStatus.textContent = openStatus.getAttribute("data-" + key + "-" + currentLang) || "";
    if (openDot) openDot.classList.toggle("is-closed", !open);

    var wrap = openStatus.parentNode;
    if (wrap && wrap.classList) wrap.classList.toggle("is-closed", !open);
  }

  /* Re-check every minute so a page left open across 10pm updates itself
     rather than sitting on a stale claim. */
  setInterval(function () {
    renderOpenState();
    renderBoard();
  }, 60000);

  /* ------------------------------------------------------------------ */
  /* Brush rules draw in as their headings enter the viewport            */
  /* ------------------------------------------------------------------ */

  /* Decoration only — the heading text is always visible; only the gold
     stroke beneath it animates. The html.draw gate at the top of this file
     guarantees the rules render fully drawn wherever this cannot run. */
  if ("IntersectionObserver" in window) {
    var drawObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("drawn");
          drawObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    var heads = document.querySelectorAll(".section h2");
    for (var h = 0; h < heads.length; h++) drawObserver.observe(heads[h]);
  }

  /* ------------------------------------------------------------------ */
  /* Boot                                                                */
  /* ------------------------------------------------------------------ */

  var yearEl = $("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  measureHeader();
  onScroll();
  applyLanguage(storedLanguage());
})();
