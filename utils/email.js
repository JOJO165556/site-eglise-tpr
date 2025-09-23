const nodemailer = require("nodemailer");
require("dotenv").config();

// Ajout du paramètre 'message'
async function envoyerRecu(email, nom, montant, message) {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS, 
        },
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Confirmation de votre don à l'église TPR",
        // Utilisation de HTML pour un rendu plus propre avec le message
        html: `
            <h1>Merci pour votre don, ${nom}!</h1>
            <p>Nous avons bien reçu votre don de <strong>${montant} XOF</strong>.</p>
            
            ${message ? `<p><strong>Votre message :</strong><br/>${message}</p>` : ""}
            
            <p>Que Dieu vous bénisse.</p>
            <p>L'équipe de l'église TPR</p>
        `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Reçu envoyé à ${email}`);
}

module.exports = { envoyerRecu };