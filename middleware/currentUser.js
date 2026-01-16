function currentUser(req, res, next) {
  res.locals.currentUser = req.session.user || null;
  next();
}

export { currentUser };
