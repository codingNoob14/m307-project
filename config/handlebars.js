import { engine } from "express-handlebars";
import path from "node:path";
import formatDate from "../helpers/formatDate.js";
import { rootDir } from "./paths.js";

function configureHandlebars(app) {
  app.engine(
    "hbs",
    engine({
      extname: ".hbs",
      defaultLayout: "main",
      layoutsDir: path.join(rootDir, "views", "layouts"),
      partialsDir: path.join(rootDir, "views", "partials"),
      helpers: {
        /* Text & Format */
        upper: (s) => String(s ?? "").toUpperCase(),
        lower: (s) => String(s ?? "").toLowerCase(),
        formatDate,
        encodeURIComponent: (v) => encodeURIComponent(String(v ?? "")),

        /* comparison logic */
        eq: (a, b) => a === b,
        ne: (a, b) => a !== b,
        gt: (a, b) => Number(a) > Number(b),
        gte: (a, b) => Number(a) >= Number(b),
        lt: (a, b) => Number(a) < Number(b),
        lte: (a, b) => Number(a) <= Number(b),
        and: (...xs) => xs.slice(0, -1).every(Boolean),
        or: (...xs) => xs.slice(0, -1).some(Boolean),
        not: (v) => !v,

        /* numbers */
        add: (a, b) => Number(a) + Number(b),
        subtract: (a, b) => Number(a) - Number(b),
        increment: (n) => Number(n) + 1,
        decrement: (n) => Number(n) - 1,
        length: (v) =>
          Array.isArray(v) || typeof v === "string" ? v.length : 0,

        /* permissions */
        canEdit(item, currentUser) {
          if (!currentUser || !item) return false;
          return currentUser.role === "admin" || item.ownerId === currentUser.id;
        }
      }
    })
  );
  app.set("view engine", "hbs");
  app.set("views", path.join(rootDir, "views"));
}

export default configureHandlebars;
