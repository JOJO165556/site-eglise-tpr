const nodemailer = require("nodemailer");
require("dotenv").config();

async function envoyerRecu(email, nom, montant) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // mot de passe d'application Gmail
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Reçu de votre don",
    text: `Bonjour ${nom},\n\nMerci pour votre don de ${montant} XOF.\n\nL'équipe de l'église TPR`,
  };

  await transporter.sendMail(mailOptions);
  console.log(`✅ Reçu envoyé à ${email}`);
}

module.exports = { envoyerRecu };
