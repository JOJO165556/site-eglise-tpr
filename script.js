// Attente du chargement complet du DOM avant d'exécuter le script
document.addEventListener('DOMContentLoaded', () => {
    // ==================== 0. Effet texte automatique (machine à écrire) ====================
    const text = "BIENVENUE DANS LA MAISON DU SEIGNEUR...";
    const target = document.getElementById("autoText");
    let index = 0;

    if (target) {
        function typeWriter() {
            if (index < text.length) {
                target.innerHTML += text.charAt(index);
                index++;
                setTimeout(typeWriter, 100); // vitesse (ms)
            }
        }
        setTimeout(typeWriter, 1000); // synchronisé avec l'animation delay
    }

    // ==================== 1. Défilement doux (Smooth Scroll) ====================
    // Applique un défilement fluide à tous les liens qui pointent vers une section de la page
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', e => {
            const href = anchor.getAttribute('href');
            // S'assurer que le lien n'est pas un simple '#' ou vide
            if (href && href.length > 1) {
                e.preventDefault(); // Empêche le comportement par défaut du lien
                const target = document.querySelector(href);
                if (target) {
                    // Fait défiler la page jusqu'à l'élément cible
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        });
    });
    
    // ==================== 2. Animations au défilement (Intersection Observer) ====================
    // Rend les éléments visibles avec une animation lorsqu'ils entrent dans le viewport
    const animatedElements = document.querySelectorAll('.fade-in-card, .section-title-animated');
    
    // Crée un observateur d'intersection
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Ajoute la classe 'visible' pour déclencher l'animation CSS
                    entry.target.classList.add('visible');
                    // N'observe plus cet élément une fois qu'il est visible
                    observer.unobserve(entry.target);
                }
            });
        }, {
            // Déclenche l'animation dès que 10% de l'élément est visible
            threshold: 0.1
        });
        
        // Attache l'observateur à chaque élément à animer
        animatedElements.forEach(element => {
            observer.observe(element);
        });
    } else {
        // Fallback pour les anciens navigateurs : affiche les éléments directement
        animatedElements.forEach(element => element.classList.add('visible'));
    }

    // ==================== 3. Bouton "Retour en haut" au défilement ====================
    // Affiche/cache un bouton pour revenir en haut de la page
    const backToTopBtn = document.getElementById('backToTopBtn');
    const scrollThreshold = 300; // Seuil de défilement en pixels
    
    if (backToTopBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > scrollThreshold) {
                backToTopBtn.classList.add('visible');
            } else {
                backToTopBtn.classList.remove('visible');
            }
        });
    }

    // ==================== 4. Validation et envoi du formulaire de contact (AJAX) ====================
    // Gère la soumission du formulaire sans recharger la page
    const contactForm = document.getElementById('contactForm');
    const formMessage = document.getElementById('form-message');

    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(contactForm);
            const name = formData.get('nom');
            const email = formData.get('email');
            const message = formData.get('message');

            // Validation simple
            if (!name || !email || !message) {
                formMessage.innerHTML = `<div class="alert alert-danger" role="alert">Merci de remplir tous les champs avant d'envoyer.</div>`;
                return;
            }

            formMessage.innerHTML = `<div class="alert alert-info" role="alert">Envoi en cours...</div>`;

            try {
                const response = await fetch(contactForm.action, {
                    method: contactForm.method,
                    body: formData
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.success) {
                        formMessage.innerHTML = `<div class="alert alert-success" role="alert">Merci ${name}, votre message a bien été envoyé !</div>`;
                        contactForm.reset();
                    } else {
                        formMessage.innerHTML = `<div class="alert alert-warning" role="alert">Une erreur est survenue : ${result.message}.</div>`;
                    }
                } else {
                    formMessage.innerHTML = `<div class="alert alert-danger" role="alert">Erreur de serveur. Veuillez réessayer plus tard.</div>`;
                }

            } catch (error) {
                console.error('Erreur lors de l\'envoi du formulaire:', error);
                formMessage.innerHTML = `<div class="alert alert-danger" role="alert">Une erreur réseau est survenue. Veuillez vérifier votre connexion.</div>`;
            }
        });
    }
    
});