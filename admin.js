const qs = (sel, root = document) => root.querySelector(sel);
const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const state = {
  content: null,
};

function ensureRecentlyDeleted() {
  if (!state.content || typeof state.content !== "object") return;
  if (!state.content.recentlyDeleted || typeof state.content.recentlyDeleted !== "object") {
    state.content.recentlyDeleted = { portfolio: [], detailedProjects: [] };
  }
  if (!Array.isArray(state.content.recentlyDeleted.portfolio)) state.content.recentlyDeleted.portfolio = [];
  if (!Array.isArray(state.content.recentlyDeleted.detailedProjects)) state.content.recentlyDeleted.detailedProjects = [];
}

function uniqueId(base, taken) {
  const b = String(base || "").trim() || "restored";
  if (!taken.has(b)) return b;
  for (let i = 2; i < 200; i += 1) {
    const id = `${b}-${i}`;
    if (!taken.has(id)) return id;
  }
  return `${b}-${Date.now()}`;
}

function setStatus(el, msg) {
  if (!el) return;
  el.textContent = msg || "";
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    cache: "no-store",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  return res;
}

async function login(password) {
  const res = await api("/api/login", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    if (res.status === 404) throw new Error("api_not_found");
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error || `login_failed_${res.status}`);
  }
}

async function adminStatus() {
  const res = await api("/api/admin/status", { method: "GET" });
  if (!res.ok) {
    if (res.status === 404) throw new Error("api_not_found");
    if (res.status === 401) throw new Error("unauthorized");
    throw new Error(`status_failed_${res.status}`);
  }
  return true;
}

async function logout() {
  await api("/api/logout", { method: "POST", body: "{}" }).catch(() => {});
}

async function loadContent() {
  const res = await fetch("/api/content", { cache: "no-store", credentials: "same-origin" });
  if (res.status === 404) throw new Error("api_not_found");
  if (!res.ok) throw new Error("failed_to_load");
  const json = await res.json();
  if (!json || typeof json !== "object") throw new Error("invalid_content");
  if (!Array.isArray(json.portfolio)) json.portfolio = [];
  if (!Array.isArray(json.detailedProjects)) json.detailedProjects = [];
  state.content = json;
  ensureRecentlyDeleted();
}

function movePortfolioToDeleted(item) {
  ensureRecentlyDeleted();
  const list = state.content?.portfolio;
  if (!Array.isArray(list)) return;
  const idx = list.indexOf(item);
  if (idx < 0) return;

  const snapshot = JSON.parse(JSON.stringify(item || {}));
  state.content.recentlyDeleted.portfolio.unshift(snapshot);
  list.splice(idx, 1);
}

function moveProjectToDeleted(project) {
  ensureRecentlyDeleted();
  const list = state.content?.detailedProjects;
  if (!Array.isArray(list)) return;
  const idx = list.indexOf(project);
  if (idx < 0) return;

  const snapshot = JSON.parse(JSON.stringify(project || {}));
  state.content.recentlyDeleted.detailedProjects.unshift(snapshot);
  list.splice(idx, 1);
}

function renderDeleted() {
  ensureRecentlyDeleted();
  const rootPortfolio = qs("#deletedPortfolio");
  const rootProjects = qs("#deletedProjects");
  if (!rootPortfolio || !rootProjects) return;

  rootPortfolio.innerHTML = "";
  rootProjects.innerHTML = "";

  const deletedPortfolio = state.content.recentlyDeleted.portfolio;
  const deletedProjects = state.content.recentlyDeleted.detailedProjects;

  if (!deletedPortfolio.length) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "No recently deleted portfolio items.";
    rootPortfolio.appendChild(p);
  } else {
    for (const item of deletedPortfolio) {
      const card = document.createElement("div");
      card.className = "admin-card";

      const title = document.createElement("h3");
      title.textContent = item?.title ? String(item.title) : "(Untitled)";

      const meta = document.createElement("p");
      meta.className = "muted";
      meta.style.margin = "0 0 12px";
      meta.textContent = `ID: ${item?.id || ""}`;

      const actions = document.createElement("div");
      actions.className = "admin-actions";

      const restore = document.createElement("button");
      restore.className = "button primary";
      restore.type = "button";
      restore.textContent = "Restore";
      restore.addEventListener("click", () => {
        const portfolio = state.content?.portfolio;
        if (!Array.isArray(portfolio)) return;
        const taken = new Set(portfolio.map((p) => p?.id).filter(Boolean));
        const restored = JSON.parse(JSON.stringify(item || {}));
        restored.id = uniqueId(restored.id || "restored-portfolio", taken);
        portfolio.unshift(restored);
        const idx = deletedPortfolio.indexOf(item);
        if (idx >= 0) deletedPortfolio.splice(idx, 1);
        renderPortfolioEditor();
        renderDeleted();
      });

      const del = document.createElement("button");
      del.className = "button secondary";
      del.type = "button";
      del.textContent = "Delete permanently";
      del.addEventListener("click", () => {
        const idx = deletedPortfolio.indexOf(item);
        if (idx >= 0) deletedPortfolio.splice(idx, 1);
        renderDeleted();
      });

      actions.appendChild(restore);
      actions.appendChild(del);

      card.appendChild(title);
      card.appendChild(meta);
      card.appendChild(actions);
      rootPortfolio.appendChild(card);
    }
  }

  if (!deletedProjects.length) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "No recently deleted projects.";
    rootProjects.appendChild(p);
  } else {
    for (const proj of deletedProjects) {
      const card = document.createElement("div");
      card.className = "admin-card";

      const title = document.createElement("h3");
      title.textContent = proj?.title ? String(proj.title) : "(Untitled)";

      const meta = document.createElement("p");
      meta.className = "muted";
      meta.style.margin = "0 0 12px";
      meta.textContent = `ID: ${proj?.id || ""}`;

      const actions = document.createElement("div");
      actions.className = "admin-actions";

      const restore = document.createElement("button");
      restore.className = "button primary";
      restore.type = "button";
      restore.textContent = "Restore";
      restore.addEventListener("click", () => {
        const projects = state.content?.detailedProjects;
        if (!Array.isArray(projects)) return;
        const taken = new Set(projects.map((p) => p?.id).filter(Boolean));
        const restored = JSON.parse(JSON.stringify(proj || {}));
        restored.id = uniqueId(restored.id || "restored-project", taken);
        projects.unshift(restored);
        const idx = deletedProjects.indexOf(proj);
        if (idx >= 0) deletedProjects.splice(idx, 1);
        renderProjectsEditor();
        renderDeleted();
      });

      const del = document.createElement("button");
      del.className = "button secondary";
      del.type = "button";
      del.textContent = "Delete permanently";
      del.addEventListener("click", () => {
        const idx = deletedProjects.indexOf(proj);
        if (idx >= 0) deletedProjects.splice(idx, 1);
        renderDeleted();
      });

      actions.appendChild(restore);
      actions.appendChild(del);

      card.appendChild(title);
      card.appendChild(meta);
      card.appendChild(actions);
      rootProjects.appendChild(card);
    }
  }
}

function setTab(which) {
  const tabEditor = qs("#tabEditor");
  const tabDeleted = qs("#tabDeleted");
  const editorTab = qs("#editorTab");
  const deletedTab = qs("#deletedTab");
  const isDeleted = which === "deleted";

  if (tabEditor) tabEditor.setAttribute("aria-pressed", isDeleted ? "false" : "true");
  if (tabDeleted) tabDeleted.setAttribute("aria-pressed", isDeleted ? "true" : "false");
  if (editorTab) editorTab.style.display = isDeleted ? "none" : "block";
  if (deletedTab) deletedTab.style.display = isDeleted ? "block" : "none";

  if (isDeleted) renderDeleted();
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function inputField(label, value, onInput, { multiline = false } = {}) {
  const wrap = document.createElement("label");
  wrap.className = "admin-label";

  const span = document.createElement("span");
  span.textContent = label;

  const input = multiline ? document.createElement("textarea") : document.createElement("input");
  input.className = multiline ? "admin-textarea" : "admin-input";
  if (!multiline) input.type = "text";
  input.value = value ?? "";
  input.addEventListener("input", () => onInput(input.value));

  wrap.appendChild(span);
  wrap.appendChild(input);
  return wrap;
}

function fileField(label, onPick) {
  const wrap = document.createElement("label");
  wrap.className = "admin-label";

  const span = document.createElement("span");
  span.textContent = label;

  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.addEventListener("change", () => {
    const file = input.files && input.files[0];
    if (file) onPick(file);
    input.value = "";
  });

  wrap.appendChild(span);
  wrap.appendChild(input);
  return wrap;
}

async function uploadImage(file, { scope, projectId } = {}) {
  const form = new FormData();
  form.append("file", file);
  const url = new URL("/api/upload", window.location.origin);
  if (scope) url.searchParams.set("scope", scope);
  if (projectId) url.searchParams.set("projectId", projectId);

  const res = await fetch(url.toString(), { method: "POST", body: form, cache: "no-store", credentials: "same-origin" });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error || "upload_failed");
  }
  const j = await res.json();
  if (!j || !j.url) throw new Error("upload_failed");
  return j.url;
}

function friendlyLoginError(err) {
  const msg = String(err?.message || err || "");
  if (msg === "api_not_found") {
    return "Admin API not running. Stop `npm run serve` and use `npm run dev`, then open /admin.html.";
  }
  if (msg === "invalid_password") {
    return "Wrong password. Default is 'admin' unless ORYX_ADMIN_PASSWORD was set.";
  }
  if (msg === "missing_admin_password") {
    return "Admin login is not configured on the server (missing ORYX_ADMIN_PASSWORD).";
  }
  if (msg === "missing_token_secret") {
    return "Admin login is not configured on the server (missing ORYX_ADMIN_TOKEN_SECRET).";
  }
  if (msg === "unauthorized") {
    return "Session expired. Please login again.";
  }
  return "Login failed.";
}

function renderPortfolioEditor() {
  const root = qs("#portfolioEditor");
  if (!root) return;
  root.innerHTML = "";

  const list = state.content?.portfolio || [];
  for (const item of list) {
    const card = document.createElement("div");
    card.className = "admin-card";

    const title = document.createElement("h3");
    title.textContent = item.title || "(Untitled)";

    const row = document.createElement("div");
    row.className = "admin-row3";

    row.appendChild(
      inputField("ID", item.id || "", (v) => {
        item.id = slugify(v);
        title.textContent = item.title || "(Untitled)";
      })
    );

    row.appendChild(
      inputField("Title", item.title || "", (v) => {
        item.title = v;
        title.textContent = item.title || "(Untitled)";
      })
    );

    row.appendChild(
      inputField("Category (villa/commercial/hospitality/booths)", item.category || "", (v) => {
        item.category = slugify(v);
      })
    );

    const row2 = document.createElement("div");
    row2.className = "admin-row";

    row2.appendChild(inputField("Meta", item.meta || "", (v) => (item.meta = v)));
    row2.appendChild(inputField("Tags (comma separated)", (item.tags || []).join(", "), (v) => {
      item.tags = String(v)
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }));

    const desc = inputField("Description", item.description || "", (v) => (item.description = v), { multiline: true });

    const thumbWrap = document.createElement("div");
    thumbWrap.className = "admin-thumb";

    const img = document.createElement("img");
    img.alt = "";
    img.src = item.thumb || "";

    const thumbUrl = inputField("Thumb URL", item.thumb || "", (v) => {
      item.thumb = v.trim() || null;
      img.src = item.thumb || "";
    });

    const thumbUpload = fileField("Replace thumb image", async (file) => {
      try {
        const url = await uploadImage(file, { scope: "uploads" });
        item.thumb = url;
        img.src = url;
        const input = qs("input", thumbUrl);
        if (input) input.value = url;
      } catch (e) {
        alert(String(e.message || e));
      }
    });

    const removeBtn = document.createElement("button");
    removeBtn.className = "button secondary";
    removeBtn.type = "button";
    removeBtn.textContent = "Remove card";
    removeBtn.addEventListener("click", () => {
      movePortfolioToDeleted(item);
      renderPortfolioEditor();
      renderDeleted();
    });

    thumbWrap.appendChild(img);
    thumbWrap.appendChild(thumbUrl);
    thumbWrap.appendChild(thumbUpload);

    card.appendChild(title);
    card.appendChild(row);
    card.appendChild(row2);
    card.appendChild(desc);
    card.appendChild(thumbWrap);
    card.appendChild(removeBtn);

    root.appendChild(card);
  }
}

function renderProjectsEditor() {
  const root = qs("#projectsEditor");
  if (!root) return;
  root.innerHTML = "";

  const list = state.content?.detailedProjects || [];
  for (const proj of list) {
    const card = document.createElement("div");
    card.className = "admin-card";

    const title = document.createElement("h3");
    title.textContent = proj.title || "(Untitled)";

    const row = document.createElement("div");
    row.className = "admin-row3";

    row.appendChild(
      inputField("Project ID (key)", proj.id || "", (v) => {
        proj.id = slugify(v);
      })
    );

    row.appendChild(
      inputField("Title", proj.title || "", (v) => {
        proj.title = v;
        title.textContent = proj.title || "(Untitled)";
      })
    );

    row.appendChild(inputField("Badge", proj.badge || "", (v) => (proj.badge = v)));

    const paragraphs = inputField(
      "Paragraphs (one per line)",
      Array.isArray(proj.paragraphs) ? proj.paragraphs.join("\n") : "",
      (v) => {
        proj.paragraphs = String(v)
          .split("\n")
          .map((p) => p.trim())
          .filter(Boolean);
      },
      { multiline: true }
    );

    if (!Array.isArray(proj.images)) proj.images = [];

    const imagesWrap = document.createElement("div");
    imagesWrap.className = "admin-images";

    const imagesTitle = document.createElement("div");
    imagesTitle.className = "muted";
    imagesTitle.style.fontWeight = "800";
    imagesTitle.textContent = "Images";

    imagesWrap.appendChild(imagesTitle);

    for (const src of proj.images) {
      const row = document.createElement("div");
      row.className = "admin-img-row";

      const img = document.createElement("img");
      img.alt = "";
      img.src = src;

      const actions = document.createElement("div");
      actions.className = "admin-img-actions";

      const urlInput = inputField("URL", src, (v) => {
        const i = proj.images.indexOf(src);
        if (i >= 0) proj.images[i] = v;
        img.src = v;
      });

      const replace = fileField("Replace image", async (file) => {
        try {
          const url = await uploadImage(file, { scope: "project", projectId: proj.id || "project" });
          const i = proj.images.indexOf(src);
          if (i >= 0) proj.images[i] = url;
          renderProjectsEditor();
        } catch (e) {
          alert(String(e.message || e));
        }
      });

      const removeBtn = document.createElement("button");
      removeBtn.className = "button secondary";
      removeBtn.type = "button";
      removeBtn.textContent = "Remove";
      removeBtn.addEventListener("click", () => {
        const i = proj.images.indexOf(src);
        if (i >= 0) proj.images.splice(i, 1);
        renderProjectsEditor();
      });

      actions.appendChild(urlInput);
      actions.appendChild(replace);
      actions.appendChild(removeBtn);

      row.appendChild(img);
      row.appendChild(actions);
      imagesWrap.appendChild(row);
    }

    const addImage = fileField("Add new image", async (file) => {
      try {
        const url = await uploadImage(file, { scope: "project", projectId: proj.id || "project" });
        proj.images.push(url);
        renderProjectsEditor();
      } catch (e) {
        alert(String(e.message || e));
      }
    });

    const removeProject = document.createElement("button");
    removeProject.className = "button secondary";
    removeProject.type = "button";
    removeProject.textContent = "Remove project";
    removeProject.addEventListener("click", () => {
      moveProjectToDeleted(proj);
      renderProjectsEditor();
      renderDeleted();
    });

    card.appendChild(title);
    card.appendChild(row);
    card.appendChild(paragraphs);
    card.appendChild(imagesWrap);
    card.appendChild(addImage);
    card.appendChild(removeProject);

    root.appendChild(card);
  }
}

function addPortfolioCard() {
  if (!state.content || typeof state.content !== "object") {
    state.content = { portfolio: [], detailedProjects: [], recentlyDeleted: { portfolio: [], detailedProjects: [] } };
  }
  ensureRecentlyDeleted();
  const list = state.content.portfolio;
  if (!Array.isArray(list)) return;
  const n = list.length + 1;
  list.unshift({
    id: `new-portfolio-${n}`,
    title: "New Portfolio Card",
    category: "commercial",
    meta: "",
    tags: [],
    description: "",
    thumb: null,
  });
  setTab("editor");
  renderPortfolioEditor();
}

function addDetailedProject() {
  if (!state.content || typeof state.content !== "object") {
    state.content = { portfolio: [], detailedProjects: [], recentlyDeleted: { portfolio: [], detailedProjects: [] } };
  }
  ensureRecentlyDeleted();
  const list = state.content.detailedProjects;
  if (!Array.isArray(list)) return;
  const n = list.length + 1;
  list.unshift({
    id: `new-project-${n}`,
    title: "New Project",
    badge: "",
    paragraphs: [""],
    images: [],
  });
  setTab("editor");
  renderProjectsEditor();
}

async function saveChanges() {
  const statusEl = qs("#saveStatus");
  setStatus(statusEl, "Saving…");

  const content = state.content;
  const res = await api("/api/content", {
    method: "PUT",
    body: JSON.stringify(content),
  });

  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    if (res.status === 401) {
      setStatus(statusEl, "Save failed: not logged in. Please login again.");
    } else {
      setStatus(statusEl, `Save failed: ${j.error || res.status}`);
    }
    return;
  }

  setStatus(statusEl, "Saved.");
}

function showEditor() {
  const loginCard = qs("#loginCard");
  const editor = qs("#editor");
  if (loginCard) loginCard.style.display = "none";
  if (editor) editor.style.display = "block";
  setTab("editor");
}

function showLogin() {
  const loginCard = qs("#loginCard");
  const editor = qs("#editor");
  if (loginCard) loginCard.style.display = "block";
  if (editor) editor.style.display = "none";
}

async function boot() {
  const btnLogin = qs("#btnLogin");
  const btnLogout = qs("#btnLogout");
  const btnReload = qs("#btnReload");
  const btnSave = qs("#btnSave");
  const btnAddPortfolio = qs("#btnAddPortfolio");
  const btnAddProject = qs("#btnAddProject");
  const pw = qs("#adminPassword");
  const loginStatus = qs("#loginStatus");
  const tabEditor = qs("#tabEditor");
  const tabDeleted = qs("#tabDeleted");

  tabEditor?.addEventListener("click", () => setTab("editor"));
  tabDeleted?.addEventListener("click", () => setTab("deleted"));

  btnReload?.addEventListener("click", async () => {
    try {
      await loadContent();
      renderPortfolioEditor();
      renderProjectsEditor();
      renderDeleted();
    } catch (e) {
      alert(String(e.message || e));
    }
  });

  btnLogout?.addEventListener("click", async () => {
    await logout();
    showLogin();
  });

  btnSave?.addEventListener("click", () => saveChanges());
  btnAddPortfolio?.addEventListener("click", () => {
    setTab("editor");
    addPortfolioCard();
  });
  btnAddProject?.addEventListener("click", () => {
    setTab("editor");
    addDetailedProject();
  });

  btnLogin?.addEventListener("click", async () => {
    const password = String(pw?.value || "");
    if (!password) {
      setStatus(loginStatus, "Enter password.");
      return;
    }

    setStatus(loginStatus, "Logging in…");
    try {
      await login(password);
      await adminStatus();
      await loadContent();
      showEditor();
      renderPortfolioEditor();
      renderProjectsEditor();
      renderDeleted();
      setStatus(loginStatus, "");
    } catch (e) {
      setStatus(loginStatus, friendlyLoginError(e));
    }
  });

  // If already logged in, load directly.
  try {
    await adminStatus();
    await loadContent();
    showEditor();
    renderPortfolioEditor();
    renderProjectsEditor();
    renderDeleted();
  } catch {
    showLogin();
    setStatus(loginStatus, "");
  }
}

boot();
