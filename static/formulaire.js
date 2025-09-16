document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('contact-form');

    form.addEventListener('submit', async (event) => {
        // Empêche la soumission normale du formulaire
        event.preventDefault();

        // Récupère les données du formulaire
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        const formspreeUrl = 'https://formspree.io/f/xpwjgaow';

        try {
            // Envoie la requête directement à Formspree
            const response = await fetch(formspreeUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                alert('Votre message a été envoyé avec succès !');
                form.reset(); // Réinitialise le formulaire
            } else {
                alert('Une erreur est survenue lors de l\'envoi du message.');
            }
        } catch (error) {
            console.error('Erreur de soumission du formulaire :', error);
            alert('Une erreur réseau est survenue. Veuillez vérifier votre connexion.');
        }
    });
});