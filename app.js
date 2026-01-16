import express from "express";
import session from "express-session";
import path from "node:path";
import configureHandlebars from "./config/handlebars.js";
import { sessionConfig } from "./config/session.js";
import { rootDir } from "./config/paths.js";
import { currentUser } from "./middleware/currentUser.js";
import contentRoutes from "./routes/content.js";
import authRoutes from "./routes/auth.js";
import pageRoutes from "./routes/pages.js";
import userRoutes from "./routes/users.js";
import notFound from "./routes/notFound.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(session(sessionConfig));

// currentUser for Header/Views
app.use(currentUser);

// Static files
app.use(express.static(path.join(rootDir, "public")));

// form data parsen
app.use(express.urlencoded({ extended: false }));

/* ----------------------------- Handlebars ----------------------------- */
configureHandlebars(app);

app.use(contentRoutes);
app.use(pageRoutes);
app.use(userRoutes);
app.use(authRoutes);

// 404
app.use(notFound);

app.listen(PORT, () => {
  console.log(`Server läuft: http://localhost:${PORT}`);
});
