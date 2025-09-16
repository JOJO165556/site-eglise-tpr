require("dotenv").config();
const axios = require("axios");

async function testFormspree() {
  console.log("Tentative de connexion à Formspree...");
  try {
    const response = await axios.post(
      process.env.FORMSPREE_URL,
      { name: "Test", email: "test@example.com", message: "Ceci est un test de connexion." },
      { headers: { 'Accept': 'application/json' } }
    );

    console.log("✅ Connexion réussie ! Statut :", response.status);
  } catch (error) {
    console.error("❌ Connexion échouée. Détails de l'erreur :");
    if (error.response) {
      console.error("  Statut HTTP:", error.response.status);
      console.error("  Données de l'erreur:", error.response.data);
    } else if (error.request) {
      console.error("  La requête n'a pas reçu de réponse.");
      console.error("  Erreur:", error.message);
    } else {
      console.error("  Erreur:", error.message);
    }
  }
}

testFormspree();