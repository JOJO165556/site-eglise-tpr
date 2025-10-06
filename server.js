// Charge les variables d'environnement du fichier .env
require('dotenv').config();
// --- MODULES ET INITIALISATION ---
const express = require("express");
const path = require("path");
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const { createClient } = require("@supabase/supabase-js");
const fetch = require('node-fetch');
const cron = require('node-cron');
const { google } = require('googleapis');
const { Pool } = require('pg');
const fs = require('fs');
const { Client } = require('pg'); // Nécessite d'importer la classe Client

// Initialisation du serveur Express
const app = express();
const PORT = process.env.PORT || 5000;

// --- VARIABLES GLOBALES POUR LA PENSÉE DU JOUR (FICHIER LOCAL) ---
// Le cache mémorise la citation choisie pour le jour en cours.
let dailyQuoteCache = {
    date: null, // Date à laquelle la citation a été sélectionnée (YYYY-MM-DD)
    index: -1,   // Index actuel dans le tableau des citations (pour la rotation)
    quote: null // La citation sélectionnée
};

// Le chemin du fichier de citations
const QUOTES_FILE_PATH = path.join(__dirname, 'static', 'quotes.json');

// Fonction utilitaire pour lire le fichier de citations
const readQuotesFile = () => {
    try {
        const data = fs.readFileSync(QUOTES_FILE_PATH, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        // En mode développement ou Vercel, ceci est un avertissement, pas fatal.
        console.error("Erreur de lecture du fichier de citations. Assurez-vous que 'conf/quotes.json' existe.", e);
        return [];
    }
};

// Initialisation du client Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Lisez le contenu du certificat CA si le fichier existe
const caCertPath = path.join(__dirname, 'conf', 'prod-ca-2021.crt');
const caCert = fs.existsSync(caCertPath) ? fs.readFileSync(caCertPath).toString() : null;

// Déterminez si vous êtes en environnement Vercel ou en local
const isVercel = process.env.VERCEL_ENV === 'production';

const poolConfig = {
    connectionString: isVercel ? process.env.DATABASE_URL_VERCEL : process.env.DATABASE_URL,

    // Essentiel quand on utilise une IP IPv4 brute ou si la résolution DNS échoue.
    family: 4,

    ssl: isVercel ? {
        ca: caCert,
        rejectUnauthorized: true
    } : {
        rejectUnauthorized: false
    }
};

const pool = new Pool(poolConfig);

// Gestion des erreurs du pool (très important pour le diagnostic)
pool.on('error', (err) => {
    console.error('❌ Erreur critique sur le pool de connexion PostgreSQL:', err);
    // En cas d'erreur de connexion non rattrapable, le serveur peut s'arrêter.
    // process.exit(-1); 
});

console.log('Pool de connexion PostgreSQL (pg) configuré.');

// Variables d'authentification
const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;
const JWT_SECRET = process.env.JWT_SECRET;

// --- VARIABLES POUR L'API YOUTUBE ---
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;
// Crée l'objet 'youtube' pour les appels d'API
const youtube = google.youtube({
    version: 'v3',
    auth: YOUTUBE_API_KEY
});

// Définit le répertoire des pages HTML
const templatesPath = path.join(__dirname, 'templates');

// --- SCRIPT DE SYNCHRONISATION YOUTUBE ---
/**
 * Synchronise les vidéos de l'API YouTube vers la base de données Supabase.
 * Ce script s'exécute sur le serveur.
 */
async function syncAllYouTubeVideos() {
    console.log('🔄 Démarrage de la synchronisation complète des vidéos YouTube...');
    let pageToken = null;

    try {
        do {
            const searchResponse = await youtube.search.list({
                key: YOUTUBE_API_KEY,
                channelId: YOUTUBE_CHANNEL_ID,
                part: 'snippet',
                type: 'video',
                order: 'date',
                maxResults: 50,
                pageToken: pageToken
            });

            if (searchResponse.data.error) {
                console.error('❌ Erreur de l\'API YouTube lors de la synchronisation:', searchResponse.data.error);
                break;
            }

            const videoIds = searchResponse.data.items.map(item => item.id.videoId).join(',');

            // Récupère les statistiques des vidéos (nombre de vues)
            const statsResponse = await youtube.videos.list({
                key: YOUTUBE_API_KEY,
                part: 'statistics',
                id: videoIds,
            });

            const statsMap = new Map();
            statsResponse.data.items.forEach(item => {
                statsMap.set(item.id, item.statistics.viewCount);
            });

            const videosToUpsert = searchResponse.data.items.map(item => ({
                video_id: item.id.videoId,
                title: item.snippet.title,
                description: item.snippet.description,
                thumbnail_url: item.snippet.thumbnails.high.url,
                published_at: item.snippet.publishedAt,
                view_count: statsMap.get(item.id.videoId) || 0
            }));

            const { error: upsertError } = await supabase.from('youtube_videos').upsert(videosToUpsert, { onConflict: 'video_id' });

            if (upsertError) {
                console.error('❌ Erreur Supabase lors de l\'upsert des vidéos:', upsertError);
                throw upsertError;
            }

            console.log(`✅ ${videosToUpsert.length} vidéos traitées.`);

            pageToken = searchResponse.data.nextPageToken;

        } while (pageToken);

        console.log('✅ Synchronisation complète terminée.');

    } catch (error) {
        console.error('❌ Erreur générale lors de la synchronisation des vidéos:', error.message);
    }
}

// Planifie la synchronisation pour s'exécuter toutes les 6 heures
cron.schedule('0 */6 * * *', () => {
    syncAllYouTubeVideos();
});

// Exécute la synchronisation une fois au démarrage du serveur
syncAllYouTubeVideos();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Sert les fichiers statiques (CSS, JS, images, etc.) du répertoire 'static'
app.use(express.static(path.join(__dirname, "static")));

// --- MIDDLEWARE D'AUTHENTIFICATION ---
const authenticateToken = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).json({ error: "Accès non autorisé. Jeton manquant." });
    }
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: "Jeton invalide ou expiré." });
        }
        req.user = user;
        next();
    });
};

// Mise en cache pour éviter les dépassements de quota !
let liveCache = { isLive: false, timestamp: 0 };
const CACHE_DURATION_MS = 5 * 60 * 1000; // Mettre en cache pendant 5 minutes


// --- ROUTE API DE LA PENSÉE DU JOUR (VERSION FICHIER LOCAL & CACHE EN MÉMOIRE) ---
// Cette route NE dépend plus de PostgreSQL (Pool ou Client).
app.get('/api/daily-quote', (req, res) => {
    try {
        const quotes = readQuotesFile();
        const today = new Date().toISOString().split('T')[0];

        if (quotes.length === 0) {
            return res.status(404).json({ error: "Aucune citation trouvée dans le fichier local." });
        }

        // 1. VÉRIFICATION DU CACHE QUOTIDIEN
        if (dailyQuoteCache.date === today && dailyQuoteCache.quote !== null) {
            // C'est toujours le même jour, on renvoie la citation mise en cache
            return res.status(200).json(dailyQuoteCache.quote);
        }

        // 2. NOUVEAU JOUR : CALCULER LA NOUVELLE ROTATION

        // Incrémenter l'index et boucler si on arrive à la fin du tableau
        const nextIndex = (dailyQuoteCache.index + 1) % quotes.length;

        // Sélectionner la nouvelle citation
        const newQuote = quotes[nextIndex];

        // Mettre à jour le cache
        dailyQuoteCache = {
            date: today,
            index: nextIndex,
            // S'assurer que le format de la réponse est toujours le même
            quote: {
                quote: newQuote.quote_text,
                reference: newQuote.reference
            }
        };

        // 3. Renvoyer la nouvelle citation
        res.status(200).json(dailyQuoteCache.quote);

    } catch (error) {
        console.error('❌ Erreur lors de la récupération de la pensée du jour (Fichier):', error);
        res.status(500).json({ error: "Erreur serveur lors de la récupération de la pensée du jour." });
    }
});
// ATTENTION : L'ancienne route `/api/daily-quote` qui générait l'erreur
// a été remplacée par le bloc ci-dessus.

// --- ROUTES API PUBLIQUES ---

// Route de connexion pour le panneau d'administration
app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        const token = jwt.sign({ username: ADMIN_USER }, JWT_SECRET, { expiresIn: '1h' });
        res.cookie('token', token, { httpOnly: true, maxAge: 3600000, secure: process.env.NODE_ENV === 'production' });
        return res.json({ success: true, message: "Connexion réussie." });
    } else {
        return res.status(401).json({ success: false, message: "Nom d'utilisateur ou mot de passe incorrect." });
    }
});

// Route proxy pour le formulaire de contact (Formspree)
app.post('/api/contact-form', async (req, res) => {
    const formData = req.body;
    const formspreeUrl = process.env.FORMSPREE_URL; // Votre URL Formspree
    try {
        const response = await fetch(formspreeUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            res.status(200).json({ success: true, message: 'Message envoyé avec succès.' });
        } else {
            const result = await response.json();
            console.error('Erreur de l\'API Formspree:', result);
            res.status(response.status).json({ success: false, message: result.errors[0]?.message || 'Erreur Formspree' });
        }
    } catch (error) {
        console.error('Erreur réseau ou serveur lors de l\'envoi du formulaire:', error);
        res.status(500).json({ success: false, message: 'Erreur interne du serveur.' });
    }
});

// --- ROUTE API DES VIDÉOS YOUTUBE (MISE À JOUR) ---
app.get('/api/videos', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 9;
        const offset = (page - 1) * limit;
        const searchQuery = req.query.search || null;
        const sortOrder = req.query.sort || 'relevance';

        let query = supabase.from('youtube_videos').select('*', { count: 'exact' });

        // LOGIQUE DE RECHERCHE (Correction : Utilise ilike pour une recherche simple et fiable)
        if (searchQuery) {
            // Utilise une condition OR pour rechercher dans le titre OU la description
            query = query.or(
                `title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`
            );
        }

        // LOGIQUE DE TRI
        if (sortOrder === 'viewCount') {
            query = query.order('view_count', { ascending: false });
        } else if (sortOrder === 'date') {
            query = query.order('published_at', { ascending: false });
        } else { // 'relevance' (ou toute autre valeur)
            if (!searchQuery) { // Si pas de recherche, on trie par date
                query = query.order('published_at', { ascending: false });
            }
        }

        // LOGIQUE DE PAGINATION
        query = query.range(offset, offset + limit - 1);

        const { data: videos, error, count } = await query;

        if (error) throw error;

        const hasMore = (offset + limit) < count;

        res.status(200).json({
            items: videos,
            nextPage: hasMore ? page + 1 : null,
            prevPage: page > 1 ? page - 1 : null,
            totalCount: count
        });

    } catch (error) {
        console.error("Erreur lors de la récupération des vidéos:", error);
        res.status(500).json({ error: "Erreur serveur lors de la récupération des vidéos." });
    }
});

// Route pour obtenir les événements de la JEUNESSE
app.get("/api/jeunesse-events", async (req, res) => {

    // N'oubliez pas les renommages pour que le client reçoive des noms en français
    const { data, error } = await supabase
        .from('jeunesse_events')
        .select('title, description, date, link')
        .order('date', { ascending: true }); // Tri par date

    if (error) {
        console.error('❌ Erreur Supabase lors de la récupération des événements jeunesse:', error);
        return res.status(500).json({ error: error.message });
    }
    res.json(data);
});

// Route pour obtenir les questions du quiz
app.get("/api/quiz-questions", async (req, res) => {
    const { data, error } = await supabase.from('quiz_questions').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.get('/api/youtube-status', async (req, res) => {
    // Récupération des variables d'environnement
    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
    const YOUTUBE_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;

    // Vérification de sécurité
    if (!YOUTUBE_API_KEY || !YOUTUBE_CHANNEL_ID) {
        console.error("Erreur: Clés API/Channel ID YouTube manquantes dans les variables d'environnement.");
        return res.status(500).json({ error: "Erreur de configuration du serveur. Clés manquantes." });
    }

    // 1. URL de l'API de recherche YouTube pour les flux 'live'
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${YOUTUBE_CHANNEL_ID}&type=video&eventType=live&key=${YOUTUBE_API_KEY}`;

    try {
        // 2. Appel à l'API YouTube
        const response = await fetch(searchUrl);
        const data = await response.json();

        // Gestion des erreurs de l'API Google (e.g., clé invalide, quota dépassé)
        if (data.error) {
            console.error("Erreur de l'API Google:", data.error.message);
            // Utilise le code d'erreur Google s'il existe (e.g., 400 ou 403)
            return res.status(data.error.code || 500).json({
                error: `Erreur de l'API YouTube: ${data.error.message}`
            });
        }

        // 3. Trouver le premier item en direct ('live')
        const liveItem = data.items.find(item => item.snippet.liveBroadcastContent === 'live');

        if (liveItem) {
            // Statut: EN DIRECT
            const videoId = liveItem.id.videoId;
            const videoTitle = liveItem.snippet.title;

            return res.status(200).json({
                isLive: true,
                videoId: videoId,
                videoTitle: videoTitle
            });
        } else {
            // Statut: HORS LIGNE
            return res.status(200).json({
                isLive: false,
                videoId: null,
                videoTitle: null
            });
        }
    } catch (error) {
        console.error("Erreur lors de l'appel HTTP ou de la connexion:", error);
        return res.status(500).json({ error: "Échec de la vérification du statut de diffusion." });
    }
});

// --- ROUTES ADMIN PROTÉGÉES ---

// Route de déconnexion
app.post('/api/logout', (req, res) => {
    res.clearCookie('token');
    res.status(200).json({ message: 'Déconnexion réussie.' });
});

// Route pour obtenir les membres (nécessite une authentification)
app.get('/api/admin/members', authenticateToken, async (req, res) => {
    try {
        const sortColumn = req.query.sortColumn || 'name';
        const sortDirection = req.query.sortDirection || 'asc';
        const searchQuery = req.query.searchQuery || '';

        let query = supabase.from('members').select('*');

        // Applique la logique de tri de Supabase
        const ascending = sortDirection === 'asc';
        query = query.order(sortColumn, { ascending });

        // Applique la logique de recherche sur plusieurs colonnes
        if (searchQuery) {
            query = query.or(`name.ilike.%${searchQuery}%,first_names.ilike.%${searchQuery}%`);
        }

        const { data: members, error } = await query;

        if (error) {
            console.error('❌ Erreur Supabase lors de la récupération des membres:', error);
            throw error;
        }

        res.status(200).json(members);
    } catch (error) {
        console.error('❌ Erreur lors de la récupération des membres:', error);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

// Route pour ajouter un membre (nécessite une authentification)
app.post("/api/admin/members", authenticateToken, async (req, res) => {
    const { data, error } = await supabase.from('members').insert([req.body]).select();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, member: data[0] });
});

// Route pour mettre à jour un membre (nécessite une authentification)
app.put("/api/admin/members/:id", authenticateToken, async (req, res) => {
    const { data, error } = await supabase.from('members').update(req.body).eq('id', req.params.id).select();
    if (error) {
        console.error('❌ Erreur Supabase lors de la mise à jour:', error);
        return res.status(500).json({ error: error.message });
    }
    res.json({ success: true, member: data[0] });
});

// Route pour supprimer un membre (nécessite une authentification)
app.delete("/api/admin/members/:id", authenticateToken, async (req, res) => {
    const { error } = await supabase.from('members').delete().eq('id', req.params.id);
    if (error) {
        console.error('❌ Erreur Supabase lors de la suppression:', error);
        return res.status(500).json({ error: error.message });
    }
    res.json({ success: true });
});

// Route publique pour récupérer les brochures (pas de token requis)
app.get("/api/brochures", async (req, res) => {
    // CAS D'ERREUR (à utiliser pour les tests uniquement) :

    return res.status(404).json({
        error: "Aucun Contenu",
        message: "Les ressources en ligne ne sont temporairement pas disponibles."
    });
});

// --- ROUTES DES PAGES HTML ---

app.get('/', (req, res) => res.sendFile(path.join(templatesPath, 'index.html')));
app.get('/don', (req, res) => res.sendFile(path.join(templatesPath, 'don.html')));
app.get('/entretien', (req, res) => res.sendFile(path.join(templatesPath, 'entretien.html')));
app.get('/enfants', (req, res) => res.sendFile(path.join(templatesPath, 'enfants.html')));
app.get('/jeunesse', (req, res) => res.sendFile(path.join(templatesPath, 'jeunesse.html')));
app.get('/jeunesse_don', (req, res) => res.sendFile(path.join(templatesPath, 'jeunesse_don.html')));
app.get('/telecommunication', (req, res) => res.sendFile(path.join(templatesPath, 'telecommunication.html')));
app.get('/bibliotheque', (req, res) => res.sendFile(path.join(templatesPath, 'bibliotheque.html')));
app.get('/login', (req, res) => res.sendFile(path.join(templatesPath, 'login.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(templatesPath, 'dashboard.html')));

// Route de rattrapage pour les erreurs 404
app.use((req, res) => res.status(404).sendFile(path.join(templatesPath, '404.html')));

// --- DÉMARRAGE DU SERVEUR ---
app.listen(PORT, () => console.log(`🚀 Le serveur a démarré sur http://localhost:${PORT}`));