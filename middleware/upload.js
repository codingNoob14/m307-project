import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import multer from "multer";
import { rootDir } from "../config/paths.js";

const uploadDir = path.join(rootDir, "public", "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const allowed = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
    const safeExt = allowed.includes(ext) ? ext : ".bin";
    const name = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${safeExt}`;
    cb(null, name);
  }
});

function fileFilter(req, file, cb) {
  const ok = ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
    file.mimetype
  );
  cb(ok ? null : new Error("Nur Bilddateien (jpg, png, webp, gif) erlaubt."), ok);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

export { upload, uploadDir };
