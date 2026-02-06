export function validateAndNormalizeContent(body) {
  if (!body || typeof body !== "object") {
    return { ok: false, status: 400, error: "invalid_json" };
  }

  const portfolio = Array.isArray(body.portfolio) ? body.portfolio : [];
  const detailedProjects = Array.isArray(body.detailedProjects) ? body.detailedProjects : [];

  const recentlyDeletedRaw = body.recentlyDeleted && typeof body.recentlyDeleted === "object" ? body.recentlyDeleted : null;
  const recentlyDeleted = {
    portfolio: Array.isArray(recentlyDeletedRaw?.portfolio) ? recentlyDeletedRaw.portfolio : [],
    detailedProjects: Array.isArray(recentlyDeletedRaw?.detailedProjects) ? recentlyDeletedRaw.detailedProjects : [],
  };

  const ids = new Set();
  for (const p of portfolio) {
    if (!p || typeof p !== "object") return { ok: false, status: 400, error: "invalid_portfolio" };
    if (!p.id || !p.title || !p.category) return { ok: false, status: 400, error: "portfolio_missing_fields" };
    if (ids.has(p.id)) return { ok: false, status: 400, error: "duplicate_id" };
    ids.add(p.id);
  }

  for (const p of recentlyDeleted.portfolio) {
    if (!p || typeof p !== "object") return { ok: false, status: 400, error: "invalid_deleted_portfolio" };
    if (!p.id || !p.title || !p.category) return { ok: false, status: 400, error: "deleted_portfolio_missing_fields" };
  }

  const projIds = new Set();
  for (const pr of detailedProjects) {
    if (!pr || typeof pr !== "object") return { ok: false, status: 400, error: "invalid_projects" };
    if (!pr.id || !pr.title) return { ok: false, status: 400, error: "projects_missing_fields" };
    if (projIds.has(pr.id)) return { ok: false, status: 400, error: "duplicate_project_id" };
    projIds.add(pr.id);
  }

  for (const pr of recentlyDeleted.detailedProjects) {
    if (!pr || typeof pr !== "object") return { ok: false, status: 400, error: "invalid_deleted_projects" };
    if (!pr.id || !pr.title) return { ok: false, status: 400, error: "deleted_projects_missing_fields" };
  }

  return {
    ok: true,
    status: 200,
    value: { portfolio, detailedProjects, recentlyDeleted },
  };
}
