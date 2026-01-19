function notFound(req, res) {
  res.status(404).render("404", {
    title: "404 – Nicht gefunden"
  });
}



export default notFound;
