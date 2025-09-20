const http = require("http");
const fs = require("fs").promises;
const path = require("path");
const serveStatic = require("serve-static");
const mime = require("mime");
const { createClient } = require("@supabase/supabase-js");
const { URL } = require("url");
require("dotenv").config();

// Initialisation du client Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Définition des variables pour l'API YouTube, lues depuis .env
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;

const servePublic = serveStatic(path.join(__dirname, "static"), {
    setHeaders: (res, path) => {
        const mime = require("mime");
        if (
            mime.getType(path) === "text/css" ||
            mime.getType(path) === "application/javascript"
        ) {
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
            res.setHeader("X-Content-Type-Options", "nosniff");
        }
    },
});

function toTitleCase(str) {
    if (!str) return "";
    return str.replace(/\w\S*/g, function (txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}

function renderNotFoundPage(res) {
    res.writeHead(404, {
        "Content-Type": "text/html",
        "X-Content-Type-Options": "nosniff",
    });
    res.end(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Page Indisponible</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding-top: 50px; }
            h1 { font-size: 2em; color: #333; }
            p { font-size: 1.2em; color: #666; }
          </style>
        </head>
        <body>
          <h1>Oups ! Cette page n'est pas encore disponible.</h1>
          <p>Nous travaillons sur son contenu. Revenez plus tard !</p>
          <p><a href="/">Retour à la page d'accueil</a></p>
        </body>
        </html>
    `);
}

async function renderHtml(res, file) {
    const filePath = path.join(__dirname, "templates", file);
    try {
        const data = await fs.readFile(filePath);
        res.writeHead(200, {
            "Content-Type": "text/html",
            "X-Content-Type-Options": "nosniff",
        });
        res.end(data);
    } catch (err) {
        renderNotFoundPage(res);
    }
}

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }
    
    try {
        const { pathname } = new URL(req.url, `http://${req.headers.host}`);

        // 1. GESTION DES REQUÊTES API
        if (pathname.startsWith("/api/")) {
            if (req.method === "GET") {
                switch (pathname) {
                    case "/api/members":
                        // Code pour l'API des membres
                        const { data: members, error: membersError } = await supabase.from('members').select('*').order('name');
                        if (membersError) {
                            console.error("❌ Erreur Supabase:", membersError);
                            res.writeHead(500, { "Content-Type": "application/json" });
                            res.end(JSON.stringify({ error: membersError.message }));
                            return;
                        }
                        res.writeHead(200, { "Content-Type": "application/json" });
                        res.end(JSON.stringify(members));
                        break;
                    case "/api/youtube-videos":
                        // Code pour l'API YouTube
                        if (!YOUTUBE_API_KEY || !YOUTUBE_CHANNEL_ID) {
                            console.error("❌ Erreur: Clé API YouTube ou ID de chaîne manquant dans le fichier .env");
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: "Erreur de configuration." }));
                            return;
                        }
                        
                        const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${YOUTUBE_CHANNEL_ID}&key=${YOUTUBE_API_KEY}`;
                        const channelResponse = await fetch(channelUrl);
                        if (!channelResponse.ok) {
                            const errorText = await channelResponse.text();
                            console.error(`❌ Erreur API YouTube (canal): ${channelResponse.status} - ${errorText}`);
                            res.writeHead(channelResponse.status, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: `Erreur API YouTube: ${channelResponse.status}` }));
                            return;
                        }
                        
                        const channelData = await channelResponse.json();
                        const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;

                        const videosUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=10&playlistId=${uploadsPlaylistId}&key=${YOUTUBE_API_KEY}`;
                        const videosResponse = await fetch(videosUrl);
                        if (!videosResponse.ok) {
                            const errorText = await videosResponse.text();
                            console.error(`❌ Erreur API YouTube (vidéos): ${videosResponse.status} - ${errorText}`);
                            res.writeHead(videosResponse.status, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: `Erreur API YouTube: ${videosResponse.status}` }));
                            return;
                        }
                        
                        const videosData = await videosResponse.json();
                        res.writeHead(200, { "Content-Type": "application/json" });
                        res.end(JSON.stringify(videosData));
                        break;
                    default:
                        renderNotFoundPage(res);
                        break;
                }
            } else if (req.method === "POST") {
                // ... (votre code pour le POST)
            } else {
                renderNotFoundPage(res);
            }
        // 2. GESTION DES FICHIERS STATIQUES & PAGES HTML
        } else {
            switch (pathname) {
                case "/":
                    await renderHtml(res, "index.html");
                    break;
                case "/don":
                    await renderHtml(res, "don.html");
                    break;
                case "/entretien":
                    await renderHtml(res, "entretien.html");
                    break;
                case "/enfants":
                    await renderHtml(res, "enfants.html");
                    break;
                case "/jeunesse":
                    await renderHtml(res, "jeunesse.html");
                    break;
                case "/jeunesse_don":
                    await renderHtml(res, "jeunesse_don.html");
                    break;
                case "/telecommunication":
                    await renderHtml(res, "telecommunication.html");
                    break;
                case "/members":
                    await renderHtml(res, "members.html");
                    break;
                default:
                    servePublic(req, res, () => {
                        renderNotFoundPage(res);
                    });
                    break;
            }
        }
    } catch (err) {
        console.error("Erreur interne du serveur:", err);
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Erreur interne du serveur");
    }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
    console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`)
);
