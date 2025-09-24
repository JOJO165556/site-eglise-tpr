// --- MODULES ET INITIALISATION ---
const express = require("express");
const path = require("path");
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const { createClient } = require("@supabase/supabase-js");
const fetch = require('node-fetch');
const cron = require('node-cron');
const { google } = require('googleapis');

// Charge les variables d'environnement du fichier .env
require('dotenv').config();

// Initialisation du serveur Express
const app = express();
const PORT = process.env.PORT || 5000;

// Initialisation du client Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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

        // LOGIQUE DE RECHERCHE
        if (searchQuery) {
            query = query.textSearch('fts', searchQuery, {
                type: 'plain',
                config: 'french'
            });
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

// Route pour obtenir les événements du calendrier
app.get("/api/events", async (req, res) => {
    const { data, error } = await supabase.from('events').select('*').order('date', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Route pour obtenir les questions du quiz
app.get("/api/quiz-questions", async (req, res) => {
    const { data, error } = await supabase.from('quiz_questions').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
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

// --- ROUTES DE GESTION DES CANTIQUES (songs) ---

// Récupérer la liste des cantiques
app.get("/api/admin/songs", authenticateToken, async (req, res) => {
    const { data, error } = await supabase.from('songs').select('*');
    if (error) {
        console.error("❌ Erreur Supabase lors de la récupération des cantiques:", error);
        return res.status(500).json({ error: error.message });
    }
    res.json(data);
});

// Ajouter un nouveau cantique
app.post("/api/admin/songs", authenticateToken, async (req, res) => {
    const { title, lyrics, author, genre } = req.body;
    const { data, error } = await supabase.from('songs').insert([{ title, lyrics, author, genre }]);
    if (error) {
        console.error("❌ Erreur Supabase lors de l'ajout d'un cantique:", error);
        return res.status(500).json({ error: error.message });
    }
    res.status(201).json(data);
});

// Mettre à jour un cantique existant
app.put("/api/admin/songs/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { title, lyrics, author, genre } = req.body;
    const { data, error } = await supabase.from('songs').update({ title, lyrics, author, genre }).eq('id', id);
    if (error) {
        console.error("❌ Erreur Supabase lors de la mise à jour d'un cantique:", error);
        return res.status(500).json({ error: error.message });
    }
    res.json(data);
});

// Supprimer un cantique
app.delete("/api/admin/songs/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('songs').delete().eq('id', id);
    if (error) {
        console.error("❌ Erreur Supabase lors de la suppression d'un cantique:", error);
        return res.status(500).json({ error: error.message });
    }
    res.json({ success: true });
});

// --- ROUTES DE GESTION DE LA BIBLIOTHÈQUE (books) ---

// Récupérer la liste des livres
app.get("/api/admin/books", authenticateToken, async (req, res) => {
    const { data, error } = await supabase.from('books').select('*');
    if (error) {
        console.error("❌ Erreur Supabase lors de la récupération des livres:", error);
        return res.status(500).json({ error: error.message });
    }
    res.json(data);
});

// Ajouter un nouveau livre
app.post("/api/admin/books", authenticateToken, async (req, res) => {
    const { title, author, description, genre } = req.body;
    const { data, error } = await supabase.from('books').insert([{ title, author, description, genre }]);
    if (error) {
        console.error("❌ Erreur Supabase lors de l'ajout d'un livre:", error);
        return res.status(500).json({ error: error.message });
    }
    res.status(201).json(data);
});

// Mettre à jour un livre existant
app.put("/api/admin/books/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { title, author, description, genre } = req.body;
    const { data, error } = await supabase.from('books').update({ title, author, description, genre }).eq('id', id);
    if (error) {
        console.error("❌ Erreur Supabase lors de la mise à jour d'un livre:", error);
        return res.status(500).json({ error: error.message });
    }
    res.json(data);
});

// Supprimer un livre
app.delete("/api/admin/books/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('books').delete().eq('id', id);
    if (error) {
        console.error("❌ Erreur Supabase lors de la suppression d'un livre:", error);
        return res.status(500).json({ error: error.message });
    }
    res.json({ success: true });
});

// --- ROUTES DES PAGES HTML ---

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "static", "templates", "index.html")));
app.get("/don", (req, res) => res.sendFile(path.join(__dirname, "static", "templates", "don.html")));
app.get("/entretien", (req, res) => res.sendFile(path.join(__dirname, "static", "templates", "entretien.html")));
app.get("/enfants", (req, res) => res.sendFile(path.join(__dirname, "static", "templates", "enfants.html")));
app.get("/jeunesse", (req, res) => res.sendFile(path.join(__dirname, "static", "templates", "jeunesse.html")));
app.get("/jeunesse_don", (req, res) => res.sendFile(path.join(__dirname, "static", "templates", "jeunesse_don.html")));
app.get("/telecommunication", (req, res) => res.sendFile(path.join(__dirname, "static", "templates", "telecommunication.html")));
app.get("/cantiques", (req, res) => res.sendFile(path.join(__dirname, "static", "templates", "cantiques.html")));
app.get("/bibliotheque", (req, res) => res.sendFile(path.join(__dirname, "static", "templates", "bibliotheque.html")));
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "static", "templates", "login.html")));
app.get("/dashboard", authenticateToken, (req, res) => res.sendFile(path.join(__dirname, "static", "templates", "dashboard.html")));

// Route de rattrapage pour les erreurs 404
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'static', 'templates', '404.html'));
});

// --- DÉMARRAGE DU SERVEUR ---
app.listen(PORT, () => console.log(`🚀 Le serveur a démarré sur http://localhost:${PORT}`));