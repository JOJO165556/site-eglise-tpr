const http = require("http");
const fs = require("fs").promises;
const path = require("path");
const serveStatic = require("serve-static");
const axios = require("axios");
const querystring = require('querystring');
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');
require("dotenv").config();
const { URL } = require("url");

const { envoyerRecu } = require("./utils/email");

// Initialisation du client Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const servePublic = serveStatic(path.join(__dirname, "static"));

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
                        // Récupération des données depuis Supabase
                        const { data, error } = await supabase
                            .from('members')
                            .select('*')
                            .order('name');

                        if (error) {
                            console.error("❌ Erreur Supabase:", error);
                            res.writeHead(500, { "Content-Type": "application/json" });
                            res.end(JSON.stringify({ error: error.message }));
                            return;
                        }
                        
                        res.writeHead(200, { "Content-Type": "application/json" });
                        res.end(JSON.stringify(data));
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
                            
                            // Insertion des données dans la base de données Supabase
                            const { data, error } = await supabase
                                .from('members')
                                .insert([{ 
                                    statut: statut, 
                                    name: name, 
                                    first_names: first_names, 
                                    neighborhood: formattedNeighborhood, 
                                    age_group: age_group, 
                                    profession: profession, 
                                    phone: phone 
                                }]);
                            
                            if (error) {
                                console.error('❌ Erreur Supabase lors de l\'ajout du membre :', error.message);
                                res.writeHead(500, { "Content-Type": "text/plain" });
                                res.end("Erreur lors de l'inscription.");
                                return;
                            }

                            console.log(`✅ Membre ajouté avec succès !`);
                            res.writeHead(302, { Location: "/members" });
                            res.end();
                            break;
                            
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