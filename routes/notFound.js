function notFound(req, res) {
  res.status(404).render("about", {
    title: "404 – Nicht gefunden"
  });
}

export default notFound;
