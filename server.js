const http = require("http");
const fs = require("fs").promises;
const path = require("path");
const axios = require("axios");
require("dotenv").config();

const { envoyerRecu } = require("./utils/email");
const API_KEY = process.env.FEDAPAY_API_KEY;

// Fonction pour servir les fichiers HTML depuis le dossier 'templates'
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

// Fonction pour servir les fichiers statiques depuis le dossier 'static'
async function serveStaticFile(req, res) {
    const safePath = path.normalize(req.url).replace(/^(\.\.[\/\\])+/, '');
    const filePath = path.join(__dirname, "static", safePath);

    const extname = path.extname(filePath).toLowerCase();
    let contentType = 'application/octet-stream';
    switch (extname) {
        case '.css':
            contentType = 'text/css';
            break;
        case '.js':
            contentType = 'text/javascript';
            break;
        case '.png':
            contentType = 'image/png';
            break;
        case '.jpg':
        case '.jpeg':
            contentType = 'image/jpeg';
            break;
        case '.gif':
            contentType = 'image/gif';
            break;
        case '.svg':
            contentType = 'image/svg+xml';
            break;
        case '.ico':
            contentType = 'image/x-icon';
            break;
        case '.woff':
        case '.woff2':
            contentType = "font/woff";
            break;
        case '.ttf':
            contentType = "font/ttf";
            break;
        case '.json': 
            contentType = 'application/json';
            break;
    }

    try {
        const data = await fs.readFile(filePath);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    } catch (err) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Ressource statique non trouvée");
    }
}

const server = http.createServer(async (req, res) => {
    try {
        if (req.method === "GET" && req.url === "/") {
            await renderHtml(res, "index.html");

        } else if (req.method === "GET" && req.url === "/don") {
            await renderHtml(res, "don.html");
            
        } else if (req.method === "GET" && req.url === "/jeunesse") { 
            await renderHtml(res, "jeunesse.html");

        } else if (req.method === "GET" && req.url === "/entretien") {
            await renderHtml(res, "entretien.html");

        } else if (req.method === "GET" && req.url === "/confirmation-paiement") {
            await renderHtml(res, "confirmation-paiement.html");

        } else if (req.method === "POST" && req.url === "/creer-session-paiement") {
            let body = "";
            for await (const chunk of req) { body += chunk.toString(); }

            const params = new URLSearchParams(body);
            const montant = parseInt(params.get("donation_amount"));
            const nom = params.get("firstname");
            const email = params.get("email");
            const phone = params.get("phone");
            // Récupération du champ de description
            const descriptionMessage = params.get("donation_description");

            if (isNaN(montant) || montant <= 0) {
                res.writeHead(400);
                return res.end("Montant invalide");
            }
            
            // On utilise la description personnalisée, ou une description par défaut si elle est vide
            const description = descriptionMessage && descriptionMessage.length > 0
                ? descriptionMessage
                : "Don pour l'église TPR";

            const response = await axios.post(
                "https://sandbox-api.fedapay.com/v1/transactions",
                {
                    description: description,
                    amount: montant,
                    currency: { iso: "XOF" },
                    callback_url: "https://f8006a7f34f1.ngrok-free.app/fedapay-webhook",
                    redirect_url: "http://localhost:5000/confirmation-paiement",
                    customer: { 
                        firstname: nom, 
                        lastname: "TPR", 
                        email, 
                        phone_number: { number: phone, country: "tg" } 
                    }
                },
                { headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" } }
            );

            const transaction = response.data["v1/transaction"];
            res.writeHead(302, { Location: transaction.payment_url });
            res.end();

        } else if (req.method === "POST" && req.url === "/fedapay-webhook") {
            let body = "";
            for await (const chunk of req) { body += chunk.toString(); }
            const data = JSON.parse(body);
            
            console.log("✅ Webhook reçu. Traitement en cours...", data);
            
            // Si le paiement est un succès
            if (data.event === "transaction.after_successful_payment") {
                const transaction = data.data.transaction;

                const nom = transaction.customer.firstname;
                const email = transaction.customer.email;
                const montant = transaction.amount;
                const message = transaction.description;

                console.log(`Paiement de ${montant} XOF reçu de ${nom}. Envoi du reçu à ${email}...`);

                // Appel de la fonction pour envoyer l'e-mail avec le message du donateur
                await envoyerRecu(email, nom, montant, message);
            }
            
            res.writeHead(200, { "Content-Type": "text/plain" });
            res.end("OK");

        } else {
            await serveStaticFile(req, res);
        }
    } catch (err) {
        console.error("Erreur du serveur :", err);
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Erreur interne du serveur");
    }
});

const PORT = 5000;
server.listen(PORT, () => console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`));