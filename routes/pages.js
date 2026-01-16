import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
  res.render("home", {
    title: "Startseite",
    name: "Handlebars",
    today: new Date()
  });
});

router.get("/about", (req, res) => {
  res.render("about", {
    title: "Über dieses Projekt"
  });
});

export default router;
