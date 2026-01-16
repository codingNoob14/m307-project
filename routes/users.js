import express from "express";
import { getAllUsers } from "../db/index.js";
import { requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// added protection so only admins and owners can see user list
router.get("/users", requireAdmin, (req, res) => {
  try {
    const users = getAllUsers();
    res.render("users", { title: "Benutzer", users });
  } catch (err) {
    console.error("[/users] Fehler:", err);
    res.status(500).render("about", { title: "Fehler beim Laden der Benutzer" });
  }
});

export default router;
