const http = require("http");
const fs = require("fs").promises;
const path = require("path");
const serveStatic = require("serve-static");
const axios = require("axios");
const querystring = require('querystring');
const nodemailer = require('nodemailer');
const sqlite3 = require('sqlite3').verbose(); 
require("dotenv").config();
const { URL } = require("url");

const { envoyerRecu } = require("./utils/email");
const API_KEY = process.env.FEDAPAY_API_KEY;

const servePublic = serveStatic(path.join(__dirname, "static"));

// La fonction toTitleCase doit être ici, en dehors des autres fonctions
function toTitleCase(str) {
    if (!str) return '';
    return str.replace(/\w\S*/g, function(txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}

async function renderHtml(res, file) {
    const filePath = path.join(__dirname, "templates", file);
    try {
        const data = await fs.readFile(filePath);
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(data);
    } catch (err) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Page non trouvée");
    }
}

const server = http.createServer(async (req, res) => {
    servePublic(req, res, async () => {
        try {
            // Utilisation correcte de l'objet URL
            const { pathname } = new URL(req.url, `http://${req.headers.host}`);

            if (req.method === "GET") {
                switch (pathname) {
                    case "/":
                        // La page d'accueil doit juste se charger.
                        // Son script JS se chargera de récupérer le total des membres
                        await renderHtml(res, "index.html");
                        break;
                    
                    case "/members":
                        // La page des membres doit juste se charger.
                        // Son script JS va maintenant chercher les données via l'API.
                        await renderHtml(res, "members.html");
                        break;
                    
                    // Votre route API est déjà correcte. Elle renvoie le JSON.
                    case "/api/members":
                        const dbApi = new sqlite3.Database(path.resolve(__dirname, 'members.db'), sqlite3.OPEN_READONLY);
                        dbApi.all("SELECT * FROM members ORDER BY name", [], (err, rows) => {
                            dbApi.close();
                            if (err) {
                                res.writeHead(500, { "Content-Type": "application/json" });
                                res.end(JSON.stringify({ error: err.message }));
                                return;
                            }
                            res.writeHead(200, { "Content-Type": "application/json" });
                            res.end(JSON.stringify(rows));
                        });
                        break;
                        
                    case "/don":
                        await renderHtml(res, "don.html");
                        break;
                    case "/jeunesse":
                        await renderHtml(res, "jeunesse.html");
                        break;
                    case "/jeunesse_don":
                        await renderHtml(res, "jeunesse_don.html");
                        break;
                    case "/enfants":
                        await renderHtml(res, "enfants.html");
                        break;
                    case "/entretien":
                        await renderHtml(res, "entretien.html");
                        break;
                    case "/telecommunication":
                        await renderHtml(res, "telecommunication.html");
                        break;
                    case "/confirmation-paiement":
                        await renderHtml(res, "confirmation-paiement.html");
                        break;
                    default:
                        res.writeHead(404, { "Content-Type": "text/plain" });
                        res.end("Page non trouvée");
                }
            } else if (req.method === "POST") {
                let body = "";
                req.on('data', (chunk) => {
                    body += chunk.toString();
                });
                req.on('end', async () => {
                    // Correction de la ligne dans le gestionnaire POST aussi
                    const { pathname } = new URL(req.url, `http://${req.headers.host}`);
                    
                    switch (pathname) {
                        case "/members":
                            const params = querystring.parse(body);
                            const { statut, name, first_names, neighborhood, age_group, profession, phone } = params;
                            const formattedNeighborhood = toTitleCase(neighborhood);
                            if (!statut || !name || name.trim() === '' || !first_names || first_names.trim() === '') {
                                res.writeHead(400, { "Content-Type": "text/plain" });
                                res.end("Erreur : Le statut, le nom et les prénoms sont obligatoires.");
                                return;
                            }
                            if (!age_group || age_group === '' || !profession || profession === '') {
                                res.writeHead(400, { "Content-Type": "text/plain" });
                                res.end("Erreur : La tranche d'âge et la profession sont obligatoires.");
                                return;
                            }
                            const dbMembersPost = new sqlite3.Database(path.resolve(__dirname, 'members.db'), sqlite3.OPEN_READWRITE);
                            const sql = `INSERT INTO members (statut, name, first_names, neighborhood, age_group, profession, phone) VALUES (?, ?, ?, ?, ?, ?, ?)`;
                            dbMembersPost.run(sql, [statut, name, first_names, formattedNeighborhood, age_group, profession, phone], function(err) {
                                if (err) {
                                    console.error('❌ Erreur lors de l\'ajout du membre :', err.message);
                                    res.writeHead(500, { "Content-Type": "text/plain" });
                                    res.end("Erreur lors de l'inscription.");
                                } else {
                                    console.log(`✅ Membre ajouté : ${this.lastID}`);
                                    res.writeHead(302, { Location: "/members" });
                                    res.end();
                                }
                                dbMembersPost.close(); 
                            });
                            break;
                        // Ajoutez les autres cas POST ici
                        default:
                            res.writeHead(404, { "Content-Type": "text/plain" });
                            res.end("Route POST non trouvée");
                    }
                });
            } else {
                res.writeHead(404, { "Content-Type": "text/plain" });
                res.end("Page non trouvée");
            }
        } catch (err) {
            console.error("Erreur du serveur :", err);
            res.writeHead(500, { "Content-Type": "text/plain" });
            res.end("Erreur interne du serveur");
        }
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`));