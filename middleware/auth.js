
//function that checks if a user is authenticated and if hes not then hes redirected to the login page

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect(
      "/login?next=" + encodeURIComponent(req.originalUrl || "/")
    );
  }
  next();
}

//function that checks if the user is the owner of the resource or an admin

function requireOwnerOrAdmin(req, res, next) {
  const { item } = res.locals;
  const user = req.session.user;
  if (!user) {
    return res.redirect("/login?next=" + encodeURIComponent(req.originalUrl));
  }
  if (user.role === "admin" || (item && item.ownerId === user.id)) return next();
  return res.status(403).render("about", { title: "403 – Kein Zugriff" });
}

//function that checks if the user is an admin and if hes not then hes redirected to a 403 page

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
