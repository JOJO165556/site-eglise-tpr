document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('contact-form');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // Change the URL to your own Express server endpoint
        const serverUrl = '/api/contact-form';

        try {
            const response = await fetch(serverUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                alert('Votre message a été envoyé avec succès !');
                form.reset();
            } else {
                const result = await response.json();
                alert(`Une erreur est survenue lors de l'envoi du message: ${result.message}`);
            }
        } catch (error) {
            console.error('Erreur de soumission du formulaire :', error);
            alert('Une erreur réseau est survenue. Veuillez vérifier votre connexion.');
        }
    });
});