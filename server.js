// --- MODULES & INITIALIZATION ---
const express = require("express");
const path = require("path");
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const { createClient } = require("@supabase/supabase-js");
const fetch = require('node-fetch'); // Requis pour le proxy de Formspree

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

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Sert les fichiers statiques (CSS, JS, images, etc.) du répertoire 'static'
app.use(express.static(path.join(__dirname, "static")));

// --- MIDDLEWARE D'AUTHENTIFICATION ---
const authenticateToken = (req, res, next) => {
    const token = req.cookies.token; // Le nom du cookie est 'token'
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

// Route de proxy pour le formulaire de contact (Formspree)
app.post('/api/contact-form', async (req, res) => {
    const formData = req.body;
    const formspreeUrl = 'https://formspree.io/f/xpwjgaow'; // Your Formspree URL
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
            res.status(200).json({ success: true, message: 'Message sent successfully.' });
        } else {
            // Log the error from Formspree for debugging on the server
            const result = await response.json();
            console.error('Formspree API Error:', result);
            res.status(response.status).json({ success: false, message: result.errors[0]?.message || 'Formspree error' });
        }
    } catch (error) {
        console.error('Network or server error during form submission:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});

// Route pour récupérer les vidéos YouTube depuis Supabase
app.get("/api/youtube-videos", async (req, res) => {
    const { data, error } = await supabase.from('youtube_videos').select('*').order('date', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Route pour récupérer les événements du calendrier
app.get("/api/events", async (req, res) => {
    const { data, error } = await supabase.from('events').select('*').order('date', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Route pour récupérer les questions du quiz
app.get("/api/quiz-questions", async (req, res) => {
    const { data, error } = await supabase.from('quiz_questions').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// --- ROUTES API PROTÉGÉES (ADMIN) ---

// Route de déconnexion
app.post('/api/logout', (req, res) => {
    // Clear the cookie named 'token' that was set during login
    res.clearCookie('token');

    // Respond with a success message in JSON format
    res.status(200).json({ message: 'Déconnexion réussie' });
});

// Route pour récupérer les membres (requiert une authentification)
app.get("/api/admin/members", authenticateToken, async (req, res) => {
    // Récupère les paramètres de tri depuis l'URL
    const { sortColumn = 'name', sortDirection = 'asc' } = req.query;

    const { data: members, error: membersError } = await supabase
        .from('members')
        .select('*')
        .order(sortColumn, { ascending: sortDirection === 'asc' });

    if (membersError) return res.status(500).json({ error: membersError.message });
    res.json(members);
});

// Route pour ajouter un membre (requiert une authentification)
app.post("/api/admin/members", authenticateToken, async (req, res) => {
    const { data, error } = await supabase.from('members').insert([req.body]).select();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, member: data[0] });
});

// Route pour supprimer un membre (requiert une authentification)
app.delete("/api/admin/members/:id", authenticateToken, async (req, res) => {
    const { error } = await supabase.from('members').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, message: 'Membre supprimé.' });
});

// --- ROUTES POUR LES PAGES HTML ---

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "static", "templates", "index.html")));
app.get("/don", (req, res) => res.sendFile(path.join(__dirname, "static", "templates", "don.html")));
app.get("/entretien", (req, res) => res.sendFile(path.join(__dirname, "static", "templates", "entretien.html")));
app.get("/enfants", (req, res) => res.sendFile(path.join(__dirname, "static", "templates", "enfants.html")));
app.get("/jeunesse", (req, res) => res.sendFile(path.join(__dirname, "static", "templates", "jeunesse.html")));
app.get("/jeunesse_don", (req, res) => res.sendFile(path.join(__dirname, "static", "templates", "jeunesse_don.html")));
app.get("/telecommunication", (req, res) => res.sendFile(path.join(__dirname, "static", "templates", "telecommunication.html")));
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "static", "templates", "login.html")));
app.get("/dashboard", authenticateToken, (req, res) => res.sendFile(path.join(__dirname, "static", "templates", "dashboard.html")));

// Route attrape-tout pour les erreurs 404
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'static', 'templates', '404.html'));
});

// --- DÉMARRAGE DU SERVEUR ---
app.listen(PORT, () => console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`));