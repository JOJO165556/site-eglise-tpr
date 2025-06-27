// Attente du chargement complet du DOM
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Défilement doux pour les liens d'ancrage ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', e => {
            const href = anchor.getAttribute('href');
            // S'assurer que le lien n'est pas un simple '#'
            if (href.length > 1) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        });
    });
    
    const animatedElements = document.querySelectorAll('.fade-in-card, .section-title-animated');
    // Définissez les options pour l'observateur (quand déclencher l'animation)
    const observerOptions = {
        root: null, // On observe par rapport à la fenêtre du navigateur (le viewport)
        rootMargin: '0px',
        threshold: 0.1 // Déclenche l'animation dès que 10% de l'élément est visible
    };
    
    // Définissez ce qui se passe quand un élément entre dans la vue
    const observerCallback = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Si l'élément est visible, ajoutez la classe 'visible'
                entry.target.classList.add('visible');
                // Arrêtez d'observer cet élément pour ne pas redéclencher l'animation
                observer.unobserve(entry.target);
            }
        });
    };
    
    // Créez l'observateur en utilisant la fonction et les options définies
    const observer = new IntersectionObserver(observerCallback, observerOptions);
    
    // Observez chaque élément de notre liste
    animatedElements.forEach(element => {
        observer.observe(element);
    });
    
    // --- Votre autre code JavaScript (e.g., bouton "Retour en haut", etc.) va ici ---
    // --- C'est important de le mettre à l'intérieur de 'DOMContentLoaded' ---
    

    if (backToTopBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > scrollThreshold) {
                backToTopBtn.classList.add('visible');
            } else {
                backToTopBtn.classList.remove('visible');
            }
        });
    }


    // --- 2. Animation d'apparition des cartes au scroll (avec Intersection Observer) ---
    // C'est plus performant que l'écouteur d'événement 'scroll'
    const cards = document.querySelectorAll('.fade-in-card');

    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    // On arrête d'observer l'élément une fois qu'il est visible
                    observer.unobserve(entry.target);
                }
            });
        }, {
            // La carte apparaît quand elle est à 10% du viewport
            threshold: 0.1,
            rootMargin: '0px 0px -100px 0px' // Réduit la zone d'observation de 100px en bas
        });

        cards.forEach(card => observer.observe(card));
    } else {
        // Fallback pour les anciens navigateurs sans Intersection Observer
        cards.forEach(card => card.classList.add('visible'));
    }

    // --- 3. Validation et envoi du formulaire de contact (AJAX) ---
    const contactForm = document.getElementById('contactForm');
    const formMessage = document.getElementById('form-message');

    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Récupération des données du formulaire
            const formData = new FormData(contactForm);
            const name = formData.get('nom');
            const email = formData.get('email');
            const message = formData.get('message');

            // Validation simple
            if (!name || !email || !message) {
                formMessage.innerHTML = `<div class="alert alert-danger" role="alert">Merci de remplir tous les champs avant d'envoyer.</div>`;
                return; // Arrêter la fonction si la validation échoue
            }

            // Afficher un message de chargement
            formMessage.innerHTML = `<div class="alert alert-info" role="alert">Envoi en cours...</div>`;

            // Envoi des données au backend via AJAX (Fetch API)
            try {
                // Remplacer 'submit_form.php' par l'URL de votre backend
                const response = await fetch(contactForm.action, {
                    method: contactForm.method,
                    body: formData
                });

                // Vérifier si la requête a réussi (status 200-299)
                if (response.ok) {
                    const result = await response.json(); // Ou response.text() si le backend ne renvoie pas de JSON
                    if (result.success) {
                        formMessage.innerHTML = `<div class="alert alert-success" role="alert">Merci ${name}, votre message a bien été envoyé !</div>`;
                        contactForm.reset(); // Vider le formulaire
                    } else {
                        formMessage.innerHTML = `<div class="alert alert-warning" role="alert">Une erreur est survenue : ${result.message}.</div>`;
                    }
                } else {
                    // Gérer les erreurs de réponse HTTP (ex: 404, 500)
                    formMessage.innerHTML = `<div class="alert alert-danger" role="alert">Erreur de serveur. Veuillez réessayer plus tard.</div>`;
                }

            } catch (error) {
                // Gérer les erreurs réseau (ex: pas de connexion internet)
                console.error('Erreur lors de l\'envoi du formulaire:', error);
                formMessage.innerHTML = `<div class="alert alert-danger" role="alert">Une erreur réseau est survenue. Veuillez vérifier votre connexion.</div>`;
            }
        });
    }

    // --- 6. Bouton Retour en Haut au scroll ---
    const backToTopBtn = document.getElementById('backToTopBtn');
    // Définissez le seuil de défilement (en pixels) avant que le bouton n'apparaisse
    const scrollThreshold = 300;

    if (backToTopBtn) {
        window.addEventListener('scroll', () => {
            // Si l'utilisateur a défilé plus que le seuil, affichez le bouton
            if (window.scrollY > scrollThreshold) {
                backToTopBtn.classList.add('visible');
            } else {
                // Sinon, cachez le bouton
                backToTopBtn.classList.remove('visible');
            }
        });
    }

});