const FALLBACK_PORTFOLIO = [
  {
    title: "Hiwa Group",
    category: "commercial",
    meta: "Commercial",
    tags: ["Fit-out", "Woodwork", "Finishing"],
    description: "Commercial woodworking and interior carpentry delivered with premium finishing and durable materials.",
  },
  {
    title: "Apartment Park View",
    category: "commercial",
    meta: "Residential / Apartment",
    tags: ["Built-ins", "Cabinetry"],
    description: "Interior carpentry solutions designed to maximize space and maintain a clean modern look.",
  },
  {
    title: "MOIT Hospital Center",
    category: "commercial",
    meta: "Healthcare",
    tags: ["Paneling", "Durability"],
    description: "High-quality woodwork with materials selected for long-term performance.",
  },
  {
    title: "Villa in New Azadi",
    category: "villa",
    meta: "Villa",
    tags: ["Custom", "Interiors"],
    description: "Residential carpentry tailored to the client’s layout and preferred aesthetics.",
  },
  {
    title: "Villa in Dream City",
    category: "villa",
    meta: "Villa",
    tags: ["Feature door", "Lighting"],
    description: "A unique bedroom feature with a custom balloon door made from MDF with integrated lighting.",
  },
  {
    title: "Villa in Ankawa",
    category: "villa",
    meta: "Villa",
    tags: ["Dressing room", "Wardrobes"],
    description: "Custom dressing room featuring built-in wardrobes and space-optimized storage solutions.",
  },
  {
    title: "Empire Wings Duplex",
    category: "villa",
    meta: "Duplex",
    tags: ["Modern lines", "Built-ins"],
    description: "High-end interior woodwork with clean lines and refined details.",
  },
  {
    title: "Villa in Masife Salahaddin",
    category: "villa",
    meta: "Villa",
    tags: ["Cabinetry", "Paneling"],
    description: "Bespoke carpentry solutions crafted to complement the home’s interior design.",
  },
  {
    title: "La Corsica Café (Empire Diamond)",
    category: "hospitality",
    meta: "Cafe",
    tags: ["Counter", "Wall cladding"],
    description: "Hospitality woodwork that supports both brand experience and daily durability.",
  },
  {
    title: "Rekar Real Estate",
    category: "commercial",
    meta: "Office",
    tags: ["Reception", "Partitions"],
    description: "Office carpentry with a professional finish and practical layout solutions.",
  },
  {
    title: "+20 Booths (International Fair)",
    category: "booths",
    meta: "Exhibition",
    tags: ["Fast build", "Consistency"],
    description: "Multiple exhibition booths delivered with consistent quality and on-time execution.",
  },
  {
    title: "Nay Restaurant (Park View)",
    category: "hospitality",
    meta: "Restaurant",
    tags: ["Seating", "Paneling"],
    description: "Custom restaurant woodwork balancing aesthetics, comfort, and durability.",
  },
  {
    title: "Gree Showroom",
    category: "commercial",
    meta: "Showroom",
    tags: ["Display", "Lighting"],
    description: "Showroom woodwork designed for product visibility and a high-end customer experience.",
  },
  {
    title: "Zogor Iraq (Duhok, Erbil)",
    category: "commercial",
    meta: "Retail / Commercial",
    tags: ["Cabinetry", "Wall panels"],
    description: "Regional commercial carpentry projects delivered with premium MDF and precision installation.",
  },
  {
    title: "Office in Kartal Company",
    category: "commercial",
    meta: "Office",
    tags: ["Workstations", "Storage"],
    description: "Functional office carpentry including storage, partitions, and built-in solutions.",
  },
  {
    title: "Pro Electronic",
    category: "commercial",
    meta: "Retail",
    tags: ["Displays", "Branding"],
    description: "Retail interior carpentry built to highlight products and support day-to-day use.",
  },
  {
    title: "Baydakh Electronics",
    category: "commercial",
    meta: "Retail",
    tags: ["Shelving", "Cabinetry"],
    description: "Retail woodwork including custom shelving and cabinetry with a clean finish.",
  },
  {
    title: "CaffItaly",
    category: "hospitality",
    meta: "Cafe",
    tags: ["Bar", "Feature wall"],
    description: "Cafe carpentry featuring refined wood details designed for ambience and durability.",
  },
];

const portfolioState = {
  filter: "all",
};

const contentState = {
  portfolio: null,
  detailedProjects: null,
};

function getPortfolioItems() {
  return Array.isArray(contentState.portfolio) ? contentState.portfolio : FALLBACK_PORTFOLIO;
}

function getDetailedProjects() {
  return Array.isArray(contentState.detailedProjects) ? contentState.detailedProjects : [];
}

function qs(sel, root = document) {
  return root.querySelector(sel);
}

function qsa(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

function setYear() {
  const yearEl = qs("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
}

function initHeaderElevate() {
  const header = qs("[data-elevate]");
  if (!header) return;

  const onScroll = () => {
    header.classList.toggle("is-elevated", window.scrollY > 6);
  };

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

function initMobileNav() {
  const toggle = qs(".nav-toggle");
  const nav = qs("#site-nav");
  if (!toggle || !nav) return;

  const setOpen = (isOpen) => {
    nav.classList.toggle("is-open", isOpen);
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    toggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
  };

  toggle.addEventListener("click", () => {
    setOpen(!nav.classList.contains("is-open"));
  });

  nav.addEventListener("click", (e) => {
    const target = e.target;
    if (target instanceof HTMLAnchorElement) setOpen(false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });

  // close when clicking outside
  document.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    if (nav.classList.contains("is-open") && !nav.contains(target) && !toggle.contains(target)) {
      setOpen(false);
    }
  });
}

function initActiveNav() {
  const links = qsa('.site-nav a[href^="#"]');
  const sections = links
    .map((a) => qs(a.getAttribute("href")))
    .filter((el) => el instanceof HTMLElement);

  if (!links.length || !sections.length) return;

  const setActive = (id) => {
    for (const a of links) {
      const href = a.getAttribute("href") || "";
      const match = href === `#${id}`;
      a.classList.toggle("is-active", match);
    }
  };

  const getOffsetY = () => {
    const header = qs(".site-header");
    const h = header ? header.getBoundingClientRect().height : 0;
    return Math.round(h + 18);
  };

  const pickActiveByScroll = () => {
    const offsetY = getOffsetY();
    let best = null;
    let bestScore = Number.POSITIVE_INFINITY;

    for (const s of sections) {
      const r = s.getBoundingClientRect();
      // Score: distance from offset line to section top (prefer sections that are above/near the top)
      const score = Math.abs(r.top - offsetY);

      const isInViewBand = r.top <= offsetY && r.bottom > offsetY;
      if (isInViewBand) {
        best = s;
        bestScore = -1;
        break;
      }

      if (score < bestScore) {
        best = s;
        bestScore = score;
      }
    }

    if (best) setActive(best.id);
  };

  // Prefer IntersectionObserver, but keep a scroll-spy fallback for reliability.
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio || 0) - (a.intersectionRatio || 0))[0];
        if (!visible) return;
        setActive(visible.target.id);
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: [0.08, 0.12, 0.18] }
    );

    for (const s of sections) observer.observe(s);
  }

  let raf = 0;
  const onScroll = () => {
    if (raf) return;
    raf = window.requestAnimationFrame(() => {
      raf = 0;
      pickActiveByScroll();
    });
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  pickActiveByScroll();
}

function renderPortfolio(items) {
  const grid = qs("#portfolioGrid");
  if (!grid) return;

  grid.innerHTML = "";

  const frag = document.createDocumentFragment();
  for (const item of items) {
    const card = document.createElement("article");
    card.className = "portfolio-item";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `Open ${item.title} details`);
    card.dataset.title = item.title;

    const thumbHtml = item.thumb
      ? `<div class="portfolio-thumb"><img src="${escapeHtml(item.thumb)}" alt="" loading="lazy" decoding="async" /></div>`
      : "";

    card.innerHTML = `
      <div class="portfolio-item-top">
        <div>
          <h3 class="portfolio-title">${escapeHtml(item.title)}</h3>
          <p class="portfolio-meta">${escapeHtml(item.meta)}</p>
        </div>
        <span class="badge ${escapeHtml(item.category)}">${escapeHtml(item.category)}</span>
      </div>
      ${thumbHtml}
      <div class="portfolio-item-bottom">
        ${item.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}
      </div>
    `;

    frag.appendChild(card);
  }

  grid.appendChild(frag);
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function initPortfolioFilters() {
  const chips = qsa(".chip[data-filter]");
  if (!chips.length) return;

  let current = portfolioState.filter;

  const apply = (filter) => {
    current = filter;
    portfolioState.filter = filter;

    for (const chip of chips) {
      chip.classList.toggle("is-active", chip.dataset.filter === filter);
    }

    const portfolioItems = getPortfolioItems();
    const filtered = filter === "all" ? portfolioItems : portfolioItems.filter((p) => p.category === filter);
    renderPortfolio(filtered);
  };

  for (const chip of chips) {
    chip.addEventListener("click", () => apply(chip.dataset.filter || "all"));
  }

  window.__oryxApplyPortfolioFilter = apply;
  apply(current);
}

function initPortfolioModal() {
  const modal = qs("#projectModal");
  const grid = qs("#portfolioGrid");
  if (!(modal instanceof HTMLDialogElement) || !grid) return;

  const titleEl = qs("#modalTitle");
  const metaEl = qs("#modalMeta");
  const descEl = qs("#modalDesc");
  const tagsEl = qs("#modalTags");
  const imgEl = qs("#modalImg");

  const openForTitle = (title) => {
    const item = getPortfolioItems().find((p) => p.title === title);
    if (!item) return;

    if (titleEl) titleEl.textContent = item.title;
    if (metaEl) metaEl.textContent = item.meta;
    if (descEl) descEl.textContent = item.description;

    if (imgEl instanceof HTMLImageElement) {
      if (item.thumb) {
        imgEl.src = item.thumb;
        imgEl.classList.add("has-src");
        imgEl.alt = `${item.title} preview`;
      } else {
        imgEl.removeAttribute("src");
        imgEl.classList.remove("has-src");
        imgEl.alt = "";
      }
    }

    if (tagsEl) {
      tagsEl.innerHTML = item.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("");
    }

    modal.showModal();
  };

  const close = () => {
    if (modal.open) modal.close();
  };

  grid.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    const card = target.closest(".portfolio-item");
    if (!(card instanceof HTMLElement)) return;
    openForTitle(card.dataset.title || "");
  });

  grid.addEventListener("keydown", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (e.key !== "Enter" && e.key !== " ") return;
    const card = target.closest(".portfolio-item");
    if (!(card instanceof HTMLElement)) return;
    e.preventDefault();
    openForTitle(card.dataset.title || "");
  });

  modal.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    if (target === modal) close();
  });

  for (const el of qsa("[data-close-modal]", modal)) {
    el.addEventListener("click", () => close());
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
}

function renderDetailedProjects(projects) {
  const root = qs("#detailedProjects");
  if (!root) return;

  const list = Array.isArray(projects) ? projects : [];
  if (!list.length) {
    root.innerHTML = "";
    return;
  }

  const frag = document.createDocumentFragment();
  for (const project of list) {
    const article = document.createElement("article");
    article.className = "project";

    const title = project?.title ? String(project.title) : "";
    const badge = project?.badge ? String(project.badge) : "";
    const paragraphs = Array.isArray(project?.paragraphs) ? project.paragraphs.map((p) => String(p || "").trim()).filter(Boolean) : [];
    const images = Array.isArray(project?.images) ? project.images.filter(Boolean) : [];

    const imgHtml = images
      .map((src) => `<img src="${escapeHtml(src)}" alt="" loading="lazy" decoding="async" />`)
      .join("");

    article.innerHTML = `
      <div class="project-top">
        <h3>${escapeHtml(title)}</h3>
        ${badge ? `<span class="project-badge">${escapeHtml(badge)}</span>` : ""}
      </div>
      <div class="project-media">
        <div class="project-gallery" aria-label="${escapeHtml(title)} images">${imgHtml}</div>
      </div>
      ${paragraphs.map((p, idx) => `<p${idx > 0 ? ' class="muted"' : ""}>${escapeHtml(p)}</p>`).join("")}
    `;

    // Remove broken images to avoid empty tiles.
    for (const img of qsa("img", article)) {
      img.addEventListener("error", () => img.remove());
    }

    frag.appendChild(article);
  }

  root.innerHTML = "";
  root.appendChild(frag);
}

async function loadEditableContent() {
  const urls = ["/api/content", "data/content.json"];
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      const json = await res.json();
      if (json && typeof json === "object") {
        if (Array.isArray(json.portfolio)) contentState.portfolio = json.portfolio;
        if (Array.isArray(json.detailedProjects)) contentState.detailedProjects = json.detailedProjects;
      }
      return;
    } catch {
      // ignore
    }
  }
}

function isLikelyPhoto(img) {
  if (!img || typeof img.width !== "number" || typeof img.height !== "number") return false;
  const area = img.width * img.height;
  if (area < 120_000) return false;

  const aspect = img.width / img.height;
  // Filter out extremely wide banners and very tall slivers
  if (aspect > 2.6 || aspect < 0.35) return false;
  return true;
}

function pickBest(images, predicate = () => true) {
  const candidates = images.filter((i) => predicate(i) && isLikelyPhoto(i));
  if (!candidates.length) return null;
  return candidates.sort((a, b) => b.width * b.height - a.width * a.height)[0];
}

function setImg(selectorOrEl, src, alt) {
  const el = typeof selectorOrEl === "string" ? qs(selectorOrEl) : selectorOrEl;
  if (!(el instanceof HTMLImageElement)) return;
  if (!src) return;
  el.src = src;
  if (alt) el.alt = alt;
  el.classList.add("has-src");
}


function renderGallery(containerSelectorOrEl, files, altPrefix) {
  const el = typeof containerSelectorOrEl === "string" ? qs(containerSelectorOrEl) : containerSelectorOrEl;
  if (!(el instanceof HTMLElement)) return;

  const list = Array.isArray(files) ? files.filter(Boolean) : [];
  if (!list.length) {
    el.innerHTML = "";
    return;
  }

  const frag = document.createDocumentFragment();
  for (let i = 0; i < list.length; i++) {
    const wrap = document.createElement("div");
    wrap.className = "gallery-item";
    const img = document.createElement("img");
    img.loading = "lazy";
    img.decoding = "async";
    img.src = list[i];
    img.alt = altPrefix ? `${altPrefix} ${i + 1}` : "";
    img.addEventListener("error", () => {
      wrap.remove();
    });
    wrap.appendChild(img);
    frag.appendChild(wrap);
  }

  el.innerHTML = "";
  el.appendChild(frag);
}

async function urlExists(url) {
  try {
    const res = await fetch(url, { method: "HEAD", cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

async function firstExisting(urls) {
  const list = Array.isArray(urls) ? urls.filter(Boolean) : [];
  for (const u of list) {
    // HEAD can be blocked on some hosts; fall back to GET.
    if (await urlExists(u)) return u;
    try {
      const res = await fetch(u, { method: "GET", cache: "no-store" });
      if (res.ok) return u;
    } catch {
      // ignore
    }
  }
  return null;
}

function titleToProjectKey(title) {
  const t = String(title).toLowerCase();
  if (t.includes("zogor")) return "zogor-place";
  if (t.includes("dream city")) return "villa-dream-city";
  if (t.includes("ankawa") || t.includes("a inkawa") || t.includes("ainkawa")) return "villa-ankawa";
  if (t.includes("empire square")) return "empire-square";
  return null;
}

async function initProfileImages() {
  // Prefer explicit placements for accuracy.
  let placements;
  try {
    const pres = await fetch("assets/profile/placements.json", { cache: "no-store" });
    if (pres.ok) placements = await pres.json();
  } catch {
    placements = null;
  }

  // Fall back to manifest-driven heuristics if placements are missing.
  if (!placements) {
    // Keep previous behavior by loading manifest and deriving placements on the fly.
    let manifest;
    try {
      const res = await fetch("assets/profile/manifest.json", { cache: "no-store" });
      if (!res.ok) return;
      manifest = await res.json();
    } catch {
      return;
    }

    const images = Array.isArray(manifest?.images) ? manifest.images : [];
    const byKey = new Map();
    const bySection = new Map();
    for (const img of images) {
      const section = img.section || "general";
      if (!bySection.has(section)) bySection.set(section, []);
      bySection.get(section).push(img);

      if (img.key) {
        if (!byKey.has(img.key)) byKey.set(img.key, []);
        byKey.get(img.key).push(img);
      }
    }

    placements = {
      hero: pickBest(images.filter((i) => i.page === 1))?.file || null,
      about: (bySection.get("about") || []).filter(isLikelyPhoto).map((i) => i.file),
      services: (bySection.get("services") || []).filter(isLikelyPhoto).map((i) => i.file),
      portfolio: (bySection.get("portfolio") || []).filter(isLikelyPhoto).map((i) => i.file),
      otherWorks: (bySection.get("other-works") || []).filter(isLikelyPhoto).map((i) => i.file),
      contact: (bySection.get("contact") || []).filter(isLikelyPhoto).map((i) => i.file),
      projects: {
        "zogor-place": (byKey.get("zogor-place") || []).filter(isLikelyPhoto).map((i) => i.file),
        "villa-dream-city": (byKey.get("villa-dream-city") || []).filter(isLikelyPhoto).map((i) => i.file),
        "villa-ankawa": (byKey.get("villa-ankawa") || []).filter(isLikelyPhoto).map((i) => i.file),
        "empire-square": (byKey.get("empire-square") || []).filter(isLikelyPhoto).map((i) => i.file),
      },
    };
  }

  const heroPlacement = placements?.hero;
  const heroSrc = Array.isArray(heroPlacement) ? heroPlacement[0] : heroPlacement;
  if (heroSrc) setImg("#heroProfileImg", heroSrc, "ORYX logo");

  const about = Array.isArray(placements?.about) ? placements.about : [];
  if (about[0]) setImg("#aboutImg", about[0], "About Oryx Carpentry");
  renderGallery("#aboutGallery", about.slice(1), "About image");

  const services = Array.isArray(placements?.services) ? placements.services : [];
  if (services[0]) setImg("#servicesImg1", services[0], "Custom carpentry");
  if (services[1]) setImg("#servicesImg2", services[1], "Interior woodwork");
  if (services[2]) setImg("#servicesImg3", services[2], "Cabinetry and finishing");
  renderGallery("#servicesGallery", services.slice(3), "Service image");

  const portfolio = Array.isArray(placements?.portfolio) ? placements.portfolio : [];
  renderGallery("#portfolioGallery", portfolio, "Portfolio image");

  const otherWorks = Array.isArray(placements?.otherWorks) ? placements.otherWorks : [];
  renderGallery("#otherWorksGallery", otherWorks, "Other work");

  const contact = Array.isArray(placements?.contact) ? placements.contact : [];
  renderGallery("#contactGallery", contact, "Contact image");

  // Detailed projects: fill each project gallery with its images.
  const projectGalleries = qsa(".project-gallery[data-project-key]");
  for (const g of projectGalleries) {
    const key = g.getAttribute("data-project-key");
    const files = Array.isArray(placements?.projects?.[key]) ? placements.projects[key] : [];
    g.innerHTML = "";
    for (const f of files) {
      const img = document.createElement("img");
      img.loading = "lazy";
      img.decoding = "async";
      img.src = f;
      img.alt = "";
      img.addEventListener("error", () => {
        img.remove();
      });
      g.appendChild(img);
    }
  }

  // Portfolio thumbs: pick best matching project image when possible.
  const proj = placements?.projects || {};
  const fallbackVilla = (await firstExisting(proj["villa-dream-city"])) || (await firstExisting(proj["villa-ankawa"])) || about[0] || services[0] || null;
  const fallbackCommercial = (await firstExisting(proj["zogor-place"])) || portfolio[0] || null;
  const fallbackHospitality = bestThumb(proj["empire-square"]) || portfolio[0] || null;

  for (const item of getPortfolioItems()) {
    const key = titleToProjectKey(item.title);
    const preferred = key && Array.isArray(proj[key]) ? await firstExisting(proj[key]) : null;
    if (preferred) item.thumb = preferred;
    if (item.thumb) continue;
    if (item.category === "villa") item.thumb = fallbackVilla;
    else if (item.category === "commercial") item.thumb = fallbackCommercial;
    else if (item.category === "hospitality") item.thumb = fallbackHospitality;
    else item.thumb = portfolio[0] || null;
  }

  if (typeof window.__oryxApplyPortfolioFilter === "function") window.__oryxApplyPortfolioFilter(portfolioState.filter);
}

function initQuoteForm() {
  const form = qs("#quoteForm");
  const statusEl = qs("#formStatus");
  if (!(form instanceof HTMLFormElement)) return;

  const submitBtn = form.querySelector('button[type="submit"]');

  const setStatus = (msg, kind) => {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.classList.remove("is-error", "is-ok");
    if (kind) statusEl.classList.add(kind);
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const phone = String(data.get("phone") || "").trim();
    const type = String(data.get("type") || "").trim();
    const message = String(data.get("message") || "").trim();

    if (!name || !phone || !type || !message) {
      setStatus("Please fill in all fields.", "is-error");
      return;
    }

    setStatus("Sending…");
    if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = true;

    try {
      const res = await fetch(form.action, {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" },
      });

      if (res.ok) {
        form.reset();
        setStatus("Request sent. We’ll contact you soon.", "is-ok");
        return;
      }

      let details = "";
      try {
        const json = await res.json();
        if (json && typeof json.error === "string" && json.error.trim()) details = json.error.trim();
      } catch {
        // ignore JSON parse errors
      }

      setStatus(details ? `Could not send. ${details}` : "Could not send. Please try again.", "is-error");
    } catch {
      setStatus("Network error. Please try again.", "is-error");
    } finally {
      if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = false;
    }
  });
}

setYear();
initHeaderElevate();
initMobileNav();
initActiveNav();
initPortfolioFilters();
initPortfolioModal();
initQuoteForm();

// Load editable content (if present) then re-render the editable sections.
loadEditableContent().then(() => {
  if (typeof window.__oryxApplyPortfolioFilter === "function") window.__oryxApplyPortfolioFilter(portfolioState.filter);
  renderDetailedProjects(getDetailedProjects());
});

initProfileImages();
