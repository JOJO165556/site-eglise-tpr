const http = require("http");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
require("dotenv").config();

const { envoyerRecu } = require("./utils/email");

const API_KEY = process.env.FEDAPAY_API_KEY;

function render(res, file) {
  const filePath = path.join(__dirname, "templates", file);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Page non trouvée");
    } else {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(data);
    }
  });
}

const server = http.createServer((req, res) => {
  if (req.url === "/" && req.method === "GET") {
    render(res, "index.html");

  } else if (req.url === "/don" && req.method === "GET") {
    render(res, "don.html");

  } else if (req.url === "/creer-session-paiement" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => { body += chunk.toString(); });
    req.on("end", async () => {
      const params = new URLSearchParams(body);
      const montant = parseInt(params.get("donation_amount"));
      const nom = params.get("firstname");
      const email = params.get("email");
      const phone = params.get("phone");

      if (isNaN(montant) || montant <= 0) {
        res.writeHead(400);
        return res.end("Montant invalide");
      }

      try {
        // Créer transaction FedaPay
        const response = await axios.post(
          "https://sandbox-api.fedapay.com/v1/transactions",
          {
            description: "Don pour l'église TPR",
            amount: montant,
            currency: { iso: "XOF" },
            callback_url: "https://f8006a7f34f1.ngrok-free.app/confirmation-paiement",
            cancel_url: "http://localhost:5000/don",
            customer: { firstname: nom, lastname: "TPR", email, phone_number: { number: phone, country: "tg" } }
          },
          { headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" } }
        );

        const transaction = response.data["v1/transaction"];

        // Rediriger le donateur vers FedaPay
        res.writeHead(302, { Location: transaction.payment_url });
        res.end();

      } catch (err) {
        console.error(err.response?.data || err.message);
        res.writeHead(500);
        res.end("Erreur lors de la transaction");
      }
    });

  } else if (req.url === "/confirmation-paiement" && req.method === "POST") {
    // Callback FedaPay
    let body = "";
    req.on("data", chunk => { body += chunk.toString(); });
    req.on("end", async () => {
      try {
        const data = JSON.parse(body);
        const email = data.customer?.email;
        const nom = data.customer?.firstname;
        const montant = data.amount;

        console.log("✅ Callback reçu :", data);

        if (email && nom && montant) {
          await envoyerRecu(email, nom, montant);
          console.log("📧 Reçu envoyé à", email);
        }

        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("OK");

      } catch (err) {
        console.error("Erreur callback :", err);
        res.writeHead(500);
        res.end("Erreur");
      }
    });

  } else {
    res.writeHead(404);
    res.end("404 Not Found");
  }
});

server.listen(5000, () => console.log("🚀 Serveur démarré sur http://localhost:5000"));
