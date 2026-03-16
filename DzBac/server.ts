import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  const db = new Database("dzbac.db");

  // Initialize DB
  db.exec(`
    CREATE TABLE IF NOT EXISTS progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_email TEXT,
      subject_id TEXT,
      lesson_id TEXT,
      completed BOOLEAN,
      score INTEGER,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS study_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_email TEXT,
      duration INTEGER,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/progress/:email", (req, res) => {
    const rows = db.prepare("SELECT * FROM progress WHERE user_email = ?").all(req.params.email);
    res.json(rows);
  });

  app.post("/api/progress", (req, res) => {
    const { email, subjectId, lessonId, completed, score } = req.body;
    const stmt = db.prepare(`
      INSERT INTO progress (user_email, subject_id, lesson_id, completed, score)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(email, subjectId, lessonId, completed ? 1 : 0, score);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
