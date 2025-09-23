// static/js/login.js

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginMessage = document.getElementById('login-message');
    const loginButton = document.querySelector('button[type="submit"]');
    const buttonText = document.getElementById('button-text');
    const loadingSpinner = document.getElementById('loading-spinner');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Affiche le spinner et désactive le bouton
        buttonText.style.display = 'none';
        loadingSpinner.style.display = 'inline-block';
        loginButton.disabled = true;

        const formData = new FormData(loginForm);
        const username = formData.get('username');
        const password = formData.get('password');

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                // Connexion réussie, redirige l'utilisateur
                window.location.href = '/dashboard';
            } else {
                // Affiche le message d'erreur
                loginMessage.innerHTML = `<div class="alert alert-danger" role="alert">${data.message}</div>`;
            }
        } catch (error) {
            console.error("Erreur de connexion:", error);
            loginMessage.innerHTML = `<div class="alert alert-danger" role="alert">Une erreur réseau est survenue. Veuillez réessayer plus tard.</div>`;
        } finally {
            // Masque le spinner et réactive le bouton
            buttonText.style.display = 'inline-block';
            loadingSpinner.style.display = 'none';
            loginButton.disabled = false;
        }
    });
});