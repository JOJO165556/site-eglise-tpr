const http = require("http");
const fs = require("fs").promises;
const path = require("path");
const serveStatic = require("serve-static");
const mime = require("mime"); // Importation du module 'mime'
const { createClient } = require('@supabase/supabase-js');
const { URL } = require("url");
require("dotenv").config();

// Initialisation du client Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const servePublic = serveStatic(path.join(__dirname, "static"), {
    setHeaders: (res, path) => {
        // Use mime.getType() instead of mime.lookup()
        const mime = require("mime");

        if (mime.getType(path) === 'text/css' || mime.getType(path) === 'application/javascript') {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            res.setHeader('X-Content-Type-Options', 'nosniff');
        }

    }
});

function toTitleCase(str) {
    if (!str) return '';
    return str.replace(/\w\S*/g, function(txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}

function renderNotFoundPage(res) {
    res.writeHead(404, { "Content-Type": "text/html", 'X-Content-Type-Options': 'nosniff' });
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
        res.writeHead(200, { "Content-Type": "text/html", 'X-Content-Type-Options': 'nosniff' });
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
    
    servePublic(req, res, async () => {
        try {
            const { pathname } = new URL(req.url, `http://${req.headers.host}`);
            if (req.method === "GET") {
                switch (pathname) {
                    case "/":
                        await renderHtml(res, "index.html");
                        break;
                    case "/members":
                        await renderHtml(res, "members.html");
                        break;
                    case "/api/members":
                        const { data, error } = await supabase
                            .from('members')
                            .select('*')
                            .order('name');
                        
                        if (error) {
                            console.error("❌ Erreur Supabase:", error);
                            res.writeHead(500, { "Content-Type": "application/json", 'X-Content-Type-Options': 'nosniff' });
                            res.end(JSON.stringify({ error: error.message }));
                            return;
                        }
                        
                        res.writeHead(200, { "Content-Type": "application/json", 'X-Content-Type-Options': 'nosniff' });
                        res.end(JSON.stringify(data));
                        break;
                    default:
                        renderNotFoundPage(res);
                        break;
                }
            } else if (req.method === "POST") {
                let body = "";
                req.on('data', (chunk) => {
                    body += chunk.toString();
                });
                req.on('end', async () => {
                    const { pathname } = new URL(req.url, `http://${req.headers.host}`);
                    if (pathname === "/api/members") {
                        try {
                            const params = JSON.parse(body);
                            
                            // Récupération de tous les champs, y compris 'email'
                            const { statut, name, first_names, neighborhood, age_group, profession, phone, email } = params;
                            const formattedNeighborhood = toTitleCase(neighborhood);
                            
                            const { data, error } = await supabase
                                .from('members')
                                .insert([{ 
                                    statut: statut, 
                                    name: name, 
                                    first_names: first_names, 
                                    neighborhood: formattedNeighborhood, 
                                    age_group: age_group, 
                                    profession: profession, 
                                    email: email, 
                                    phone: phone 
                                }]);
                            
                            if (error) {
                                console.error('❌ Erreur Supabase lors de l\'ajout du membre :', error);
                                res.writeHead(500, { "Content-Type": "application/json", 'X-Content-Type-Options': 'nosniff' });
                                res.end(JSON.stringify({ message: "Erreur lors de l'inscription.", error: error.message }));
                                return;
                            }

                            res.writeHead(201, { "Content-Type": "application/json", 'X-Content-Type-Options': 'nosniff' });
                            res.end(JSON.stringify({ message: "Membre enregistré avec succès !" }));
                        } catch (err) {
                            res.writeHead(400, { "Content-Type": "application/json", 'X-Content-Type-Options': 'nosniff' });
                            res.end(JSON.stringify({ message: "Format de données invalide." }));
                        }
                    } else {
                        renderNotFoundPage(res);
                    }
                });
            } else {
                renderNotFoundPage(res);
            }
        } catch (err) {
            res.writeHead(500, { "Content-Type": "text/plain", 'X-Content-Type-Options': 'nosniff' });
            res.end("Erreur interne du serveur");
        }
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`));