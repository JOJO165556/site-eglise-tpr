const http = require("http");
const fs = require("fs").promises;
const path = require("path");
const serveStatic = require("serve-static");
const axios = require("axios");
require("dotenv").config();

const { envoyerRecu } = require("./utils/email");
const API_KEY = process.env.FEDAPAY_API_KEY;

// Crée un gestionnaire de fichiers statiques pour le dossier 'static'
const servePublic = serveStatic(path.join(__dirname, "static"));

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

const server = http.createServer(async (req, res) => {
    // 1. Essayer de servir la requête comme un fichier statique
    servePublic(req, res, async () => {
        // 2. Si ce n'est pas un fichier statique, gérer les routes HTML et API
        try {
            if (req.method === "GET") {
                switch (req.url) {
                    case "/":
                        await renderHtml(res, "index.html");
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
                    case "/confirmation-paiement":
                        await renderHtml(res, "confirmation-paiement.html");
                        break;
                    default:
                        res.writeHead(404, { "Content-Type": "text/plain" });
                        res.end("Page non trouvée");
                }
            } else if (req.method === "POST") {
                if (req.url === "/creer-session-paiement") {
                    let body = "";
                    for await (const chunk of req) { body += chunk.toString(); }

                    const params = new URLSearchParams(body);
                    const montant = parseInt(params.get("donation_amount"));
                    const nom = params.get("firstname");
                    const email = params.get("email");
                    const phone = params.get("phone");
                    const descriptionMessage = params.get("donation_description");

                    if (isNaN(montant) || montant <= 0) {
                        res.writeHead(400);
                        return res.end("Montant invalide");
                    }
                    
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

                } else if (req.url === "/fedapay-webhook") {
                    let body = "";
                    for await (const chunk of req) { body += chunk.toString(); }
                    const data = JSON.parse(body);
                    
                    console.log("✅ Webhook reçu. Traitement en cours...", data);
                    
                    if (data.event === "transaction.after_successful_payment") {
                        const transaction = data.data.transaction;
                        const nom = transaction.customer.firstname;
                        const email = transaction.customer.email;
                        const montant = transaction.amount;
                        const message = transaction.description;

                        console.log(`Paiement de ${montant} XOF reçu de ${nom}. Envoi du reçu à ${email}...`);
                        await envoyerRecu(email, nom, montant, message);
                    }
                    
                    res.writeHead(200, { "Content-Type": "text/plain" });
                    res.end("OK");
                }
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

const PORT = 5000;
server.listen(PORT, () => console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`));