const axios = require("axios");

const API_KEY = "sk_sandbox_DV2IOlx7yUyXOH7FXEkwZMJM";

(async () => {
  try {
    const response = await axios.post(
      "https://sandbox-api.fedapay.com/v1/transactions",
      {
        description: "Don test depuis Node.js sans SDK",
        amount: 500,
        currency: { iso: "XOF" },
        customer: {
          firstname: "Test",
          lastname: "User",
          email: "test@example.com",
          phone_number: {
            number: "+22890000000",
            country: "tg"
          }
        }
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`, // 🔑 Auth correcte
          "Content-Type": "application/json"
        }
      }
    );

    console.log("✅ Transaction créée !");
    console.log(response.data);

    // Extraire la transaction
    const transaction = response.data["v1/transaction"];

    // URL de redirection pour payer
    console.log("👉 URL de paiement :", transaction.payment_url);

  } catch (err) {
    console.error("❌ Erreur transaction :", err.response?.data || err.message);
  }
})();
