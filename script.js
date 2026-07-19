(function () {
  var STORAGE_KEY = "suriani-lang";
  var toggleBtn = document.getElementById("lang-toggle");
  var translatable = document.querySelectorAll("[data-en][data-ms]");
  var currentLang = "ms";

  function applyLanguage(lang) {
    currentLang = lang;
    translatable.forEach(function (el) {
      el.innerHTML = el.getAttribute("data-" + lang);
    });
    document.documentElement.lang = lang;
    toggleBtn.textContent = lang === "ms" ? "EN" : "BM";
    toggleBtn.setAttribute(
      "aria-label",
      lang === "ms" ? "Switch to English" : "Tukar ke Bahasa Melayu"
    );
    localStorage.setItem(STORAGE_KEY, lang);
    renderActiveMenuCategory();
  }

  function currentLanguage() {
    return localStorage.getItem(STORAGE_KEY) || "ms";
  }

  toggleBtn.addEventListener("click", function () {
    var next = currentLanguage() === "ms" ? "en" : "ms";
    applyLanguage(next);
  });

  document.getElementById("year").textContent = new Date().getFullYear();

  /* ---- Digital menu ---- */
  var tabsEl = document.getElementById("menu-tabs");
  var panelsEl = document.getElementById("menu-panels");
  var categoryNoteEl = document.getElementById("menu-category-note");
  var modalEl = document.getElementById("menu-modal");
  var activeCategory = (typeof MENU_CATEGORIES !== "undefined" && MENU_CATEGORIES[0]) ? MENU_CATEGORIES[0].id : null;

  function formatPrice(item, lang) {
    if (typeof item.price === "number") {
      return "RM " + item.price.toFixed(2);
    }
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

  function iconMarkup(item) {
    var type = pickMenuIcon(item);
    return (typeof MENU_ICONS !== "undefined" && MENU_ICONS[type]) ? MENU_ICONS[type] : "";
  }

  function renderMedia(container, item) {
    container.innerHTML = "";
    if (item.photo) {
      var img = document.createElement("img");
      img.src = item.photo;
      img.alt = item[currentLang] || "";
      container.appendChild(img);
    } else {
      container.innerHTML = iconMarkup(item);
    }
  }

  function renderMenuTabs() {
    if (!tabsEl || typeof MENU_CATEGORIES === "undefined") return;
    tabsEl.innerHTML = "";
    MENU_CATEGORIES.forEach(function (cat) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "menu-tab" + (cat.id === activeCategory ? " active" : "");
      btn.textContent = cat.icon + " " + cat[currentLang];
      btn.addEventListener("click", function () {
        activeCategory = cat.id;
        renderActiveMenuCategory();
      });
      tabsEl.appendChild(btn);
    });
  }

  function renderActiveMenuCategory() {
    if (!panelsEl || typeof MENU_CATEGORIES === "undefined" || typeof MENU_ITEMS === "undefined") return;
    renderMenuTabs();

    var cat = MENU_CATEGORIES.filter(function (c) { return c.id === activeCategory; })[0];
    categoryNoteEl.textContent = cat && cat.note ? cat.note[currentLang] : "";

    var items = MENU_ITEMS.filter(function (item) { return item.category === activeCategory; });
    var grid = document.createElement("div");
    grid.className = "menu-items-grid";

    items.forEach(function (item) {
      var card = document.createElement("button");
      card.type = "button";
      card.className = "menu-card";

      var icon = document.createElement("div");
      icon.className = "menu-card-icon";
      renderMedia(icon, item);

      var body = document.createElement("div");
      body.className = "menu-card-body";
      var name = document.createElement("h3");
      name.textContent = item[currentLang];
      var desc = document.createElement("p");
      desc.className = "menu-card-desc";
      desc.textContent = item["desc" + (currentLang === "ms" ? "Ms" : "En")];
      var price = document.createElement("div");
      price.className = "menu-card-price" + (typeof item.price === "number" ? "" : " price-unknown");
      price.textContent = formatPrice(item, currentLang);
      body.appendChild(name);
      body.appendChild(desc);
      body.appendChild(price);

      card.appendChild(icon);
      card.appendChild(body);
      card.addEventListener("click", function () {
        openMenuModal(item);
      });

      grid.appendChild(card);
    });

    panelsEl.innerHTML = "";
    panelsEl.appendChild(grid);
  }

  function openMenuModal(item) {
    renderMedia(document.getElementById("modal-icon"), item);
    document.getElementById("modal-illustration-tag").style.display = item.photo ? "none" : "";
    document.getElementById("modal-name").textContent = item[currentLang];
    document.getElementById("modal-desc").textContent = item["desc" + (currentLang === "ms" ? "Ms" : "En")];

    var priceEl = document.getElementById("modal-price");
    priceEl.textContent = formatPrice(item, currentLang);
    priceEl.className = "menu-modal-price" + (typeof item.price === "number" ? "" : " price-unknown");

    var noteEl = document.getElementById("modal-note");
    noteEl.textContent = item.priceNote ? item.priceNote[currentLang] : "";

    modalEl.hidden = false;
  }

  function closeMenuModal() {
    modalEl.hidden = true;
  }

  modalEl.addEventListener("click", function (e) {
    if (e.target.hasAttribute("data-close-modal")) closeMenuModal();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeMenuModal();
  });

  /* ---- Catering enquiry form ---- */
  var CATERING_WHATSAPP = "60192103630";
  var cateringForm = document.getElementById("catering-form");

  if (cateringForm) {
    cateringForm.addEventListener("submit", function (e) {
      e.preventDefault();

      var name = document.getElementById("catering-name").value.trim();
      var date = document.getElementById("catering-date").value;
      var pax = document.getElementById("catering-pax").value.trim();
      var eventTypeSelect = document.getElementById("catering-event-type");
      var eventType = eventTypeSelect.options[eventTypeSelect.selectedIndex].textContent;
      var notes = document.getElementById("catering-notes").value.trim();

      var lines = currentLang === "ms"
        ? [
            "Salam, saya ingin bertanya tentang khidmat katering untuk acara saya.",
            "Nama: " + name,
            "Tarikh Acara: " + date,
            "Bilangan Tetamu: " + pax,
            "Jenis Acara: " + eventType,
            notes ? "Catatan: " + notes : null
          ]
        : [
            "Hi, I would like to enquire about catering for my event.",
            "Name: " + name,
            "Event Date: " + date,
            "Number of Guests: " + pax,
            "Event Type: " + eventType,
            notes ? "Notes: " + notes : null
          ];

      var message = lines.filter(Boolean).join("\n");
      var url = "https://wa.me/" + CATERING_WHATSAPP + "?text=" + encodeURIComponent(message);
      window.open(url, "_blank", "noopener");
    });
  }

  applyLanguage(currentLanguage());
})();
