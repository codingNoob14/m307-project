function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect(
      "/login?next=" + encodeURIComponent(req.originalUrl || "/")
    );
  }
  next();
}

function requireOwnerOrAdmin(req, res, next) {
  const { item } = res.locals;
  const user = req.session.user;
  if (!user) {
    return res.redirect("/login?next=" + encodeURIComponent(req.originalUrl));
  }
  if (user.role === "admin" || (item && item.ownerId === user.id)) return next();
  return res.status(403).render("about", { title: "403 – Kein Zugriff" });
}

function requireAdmin(req, res, next) {
  const user = req.session.user;
  if (!user) {
    return res.redirect(
      "/login?next=" + encodeURIComponent(req.originalUrl || "/")
    );
  }
  if (user.role !== "admin") {
    return res.status(403).render("about", { title: "403 – Kein Zugriff" });
  }
  next();
}

export { requireAuth, requireOwnerOrAdmin, requireAdmin };
