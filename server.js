// --- RATE LIMIT ---
const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");

// --- ENV ---
require("dotenv").config();

// --- MODULES ---
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const fetch = require("node-fetch");
const { createClient } = require("@supabase/supabase-js");
const fetchForm = require("node-fetch");
const cron = require("node-cron");
const { google } = require("googleapis");
const { Pool } = require("pg");
const fs = require("fs");

// --- INIT ---
const app = express();
const PORT = process.env.PORT || 5000;

// --- MIDDLEWARES ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Proxy (Vercel)
app.set("trust proxy", 1);

// --- RATE LIMITERS ---
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKeyGenerator,
});
app.use(globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: ipKeyGenerator,
});

// --- VARIABLES ---
const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;
const JWT_SECRET = process.env.JWT_SECRET;

// --- SUPABASE ---
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
  {
    global: {
      fetch: fetch,
    },
  }
);


// --- YOUTUBE ---
const youtube = google.youtube({
  version: "v3",
  auth: process.env.YOUTUBE_API_KEY,
});

const templatesPath = path.join(__dirname, "templates");
const QUOTES_FILE_PATH = path.join(__dirname, "static", "quotes.json");

// --- QUOTES ---
let dailyQuoteCache = { date: null, index: -1, quote: null };

function readQuotesFile() {
  try {
    return JSON.parse(fs.readFileSync(QUOTES_FILE_PATH, "utf8"));
  } catch (e) {
    console.error("Erreur quotes.json:", e);
    return [];
  }
}

// --- AUTH JWT ---
function authenticateToken(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "Non autorisé" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Token invalide" });
    req.user = user;
    next();
  });
}

// --- POSTGRES ---
const isVercel = process.env.VERCEL_ENV === "production";
const pool = new Pool({
  connectionString: isVercel
    ? process.env.DATABASE_URL_VERCEL
    : process.env.DATABASE_URL,
  ssl: isVercel ? { rejectUnauthorized: true } : false,
});

pool.on("error", err => console.error("PG error:", err));

// --- YOUTUBE SYNC ---
async function syncAllYouTubeVideos() {
  console.log("🔄 Sync YouTube...");
  let pageToken = null;

  try {
    do {
      const search = await youtube.search.list({
        part: "snippet",
        channelId: process.env.YOUTUBE_CHANNEL_ID,
        type: "video",
        order: "date",
        maxResults: 50,
        pageToken,
      });

      const ids = search.data.items.map(v => v.id.videoId).join(",");
      if (!ids) break;

      const stats = await youtube.videos.list({
        part: "statistics",
        id: ids,
      });

      const map = new Map();
      stats.data.items.forEach(v =>
        map.set(v.id, v.statistics.viewCount)
      );

      const videos = search.data.items.map(v => ({
        video_id: v.id.videoId,
        title: v.snippet.title,
        description: v.snippet.description,
        thumbnail_url: v.snippet.thumbnails.high.url,
        published_at: v.snippet.publishedAt,
        view_count: map.get(v.id.videoId) || 0,
      }));

      const { error } = await supabase
        .from("youtube_videos")
        .upsert(videos, { onConflict: "video_id" });

      if (error) console.error("Supabase:", error);

      pageToken = search.data.nextPageToken;
    } while (pageToken);

    console.log("✅ YouTube OK");
  } catch (err) {
    console.error("YouTube sync error:", err);
  }
}

cron.schedule("0 */6 * * *", syncAllYouTubeVideos);
syncAllYouTubeVideos();

// --- API ---

app.get("/api/daily-quote", (req, res) => {
  const quotes = readQuotesFile();
  if (!quotes.length) return res.status(404).json({ error: "Aucune citation" });

  const today = new Date().toISOString().split("T")[0];
  if (dailyQuoteCache.date === today) return res.json(dailyQuoteCache.quote);

  const index = (dailyQuoteCache.index + 1) % quotes.length;
  const q = quotes[index];

  dailyQuoteCache = {
    date: today,
    index,
    quote: { quote: q.quote_text, reference: q.reference },
  };

  res.json(dailyQuoteCache.quote);
});

app.post("/api/login", authLimiter, (req, res) => {
  const { username, password } = req.body;

  if (username !== ADMIN_USER || password !== ADMIN_PASS)
    return res.status(401).json({ success: false });

  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "1h" });

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 3600000,
  });

  res.json({ success: true });
});

app.post("/api/contact-form", authLimiter, async (req, res) => {
  try {
    const r = await fetchForm(process.env.FORMSPREE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    if (!r.ok) throw new Error("Formspree error");
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false });
  }
});

app.get("/api/videos", async (req, res) => {
  const page = Number(req.query.page || 1);
  const limit = 9;
  const from = (page - 1) * limit;

  let q = supabase
    .from("youtube_videos")
    .select("*", { count: "exact" })
    .order("published_at", { ascending: false })
    .range(from, from + limit - 1);

  const { data, error, count } = await q;
  if (error) return res.status(500).json({ error });

  res.json({
    items: data,
    nextPage: from + limit < count ? page + 1 : null,
  });
});

// --- ROUTES HTML ---
app.use(express.static(path.join(__dirname, 'static')));

app.get('/', (req, res) => res.sendFile(path.join(templatesPath, 'index.html')));
app.get('/telecommunication', (req, res) => res.sendFile(path.join(templatesPath, 'telecommunication.html')));
app.get('/don', (req, res) => res.sendFile(path.join(templatesPath, 'don.html')));
app.get('/entretien', (req, res) => res.sendFile(path.join(templatesPath, 'entretien.html')));
app.get('/enfants', (req, res) => res.sendFile(path.join(templatesPath, 'enfants.html')));
app.get('/jeunesse', (req, res) => res.sendFile(path.join(templatesPath, 'jeunesse.html')));
app.get('/bibliotheque', (req, res) => res.sendFile(path.join(templatesPath, 'bibliotheque.html')));
app.get('/login', (req, res) => res.sendFile(path.join(templatesPath, 'login.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(templatesPath, 'dashboard.html')));

// --- 404 ---
app.use((req, res) => res.status(404).sendFile(path.join(templatesPath, '404.html')));

// --- START ---
app.listen(PORT, () =>
  console.log(`🚀 Serveur démarré http://localhost:${PORT}`)
);