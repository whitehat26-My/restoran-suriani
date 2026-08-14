/* Restoran Suriani — site behaviour.
   No build step: this is plain ES5-compatible script loaded after
   menu-icons.js and menu-data.js, both of which declare globals. */

(function () {
  "use strict";

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
    { id: "foodpanda", label: "foodpanda", url: "" },
    { id: "grabfood", label: "GrabFood", url: "" }
  ];

  var STORAGE_KEY = "suriani-lang";
  var currentLang = "ms";

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
    try { return localStorage.getItem(STORAGE_KEY) || "ms"; }
    catch (e) { return "ms"; }
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

    var name = document.createElement("span");
    name.className = "dish-name";
    name.textContent = item[currentLang];

    var leader = document.createElement("span");
    leader.className = "dish-leader";
    leader.setAttribute("aria-hidden", "true");

    var price = document.createElement("span");
    price.className = "dish-price" + (typeof item.price === "number" ? "" : " price-unknown");
    price.textContent = formatPrice(item, currentLang);

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

  var copyBtn = $("copy-address");

  on(copyBtn, "click", function () {
    var text = "Restoran Suriani, 28, Lorong 1/77a, Pudu, 55100 Kuala Lumpur, Wilayah Persekutuan Kuala Lumpur";
    var done = function () {
      var original = copyBtn.getAttribute("data-" + currentLang);
      copyBtn.textContent = copyBtn.getAttribute("data-copied-" + currentLang) || "Copied";
      setTimeout(function () { copyBtn.textContent = original; }, 2000);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () {});
    }
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
     it only on click keeps the default page load entirely first-party. */
  var mapFacade = $("map-facade");

  on(mapFacade, "click", function () {
    var frame = document.createElement("iframe");
    frame.src = "https://www.google.com/maps?q=" +
      encodeURIComponent("28, Lorong 1/77a, Pudu, 55100 Kuala Lumpur, Wilayah Persekutuan Kuala Lumpur") +
      "&output=embed";
    frame.title = "Restoran Suriani location";
    frame.loading = "lazy";
    frame.referrerPolicy = "no-referrer-when-downgrade";
    frame.setAttribute("allowfullscreen", "");
    mapFacade.parentNode.replaceChild(frame, mapFacade);
  });

  /* ------------------------------------------------------------------ */
  /* Boot                                                                */
  /* ------------------------------------------------------------------ */

  var yearEl = $("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  measureHeader();
  onScroll();
  applyLanguage(storedLanguage());
})();
