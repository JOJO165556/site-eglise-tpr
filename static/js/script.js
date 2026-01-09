// ==================== Déclarations et fonctions globales pour la pagination vidéo ====================
let currentPage = 1;
let currentSearchQuery = "";
let currentSortOrder = "date";

// Fonction principale asynchrone pour récupérer et afficher les vidéos
async function fetchVideos() {
    const videoGridContainer = document.getElementById("videos-grid");
    const loadingMessage = document.getElementById("loadingMessageHome");
    const prevPageBtn = document.getElementById("prevPageBtnHome");
    const nextPageBtn = document.getElementById("nextPageBtnHome");

    if (!videoGridContainer) {
        console.warn(
            "Element #videos-grid not found, videos cannot be displayed on this page."
        );
        return;
    }

    if (loadingMessage) {
        loadingMessage.innerHTML = `<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Chargement...</span></div><p class="mt-2">Chargement des vidéos...</p>`;
        loadingMessage.style.display = "block";
    }
    videoGridContainer.innerHTML = ""; // Nettoie le conteneur avant de charger

    try {
        const params = new URLSearchParams({
            page: currentPage,
            sort: currentSortOrder
        });
        if (currentSearchQuery) {
            params.append("search", currentSearchQuery);
        }

        const response = await fetch(`/api/videos?${params.toString()}`);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Erreur inconnue de l'API.");
        }
        const data = await response.json();

        if (loadingMessage) loadingMessage.style.display = "none";

        if (data.items && data.items.length > 0) {
            data.items.forEach((item) => {
                const videoId = item.video_id;
                const videoTitle = item.title;
                const thumbnailUrl = item.thumbnail_url;
                const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
                const col = document.createElement("div");
                col.className = "col";
                col.innerHTML = `
                    <div class="card card-custom h-100">
                        <a href="${videoUrl}" target="_blank" rel="noopener noreferrer">
                            <img src="${thumbnailUrl}" class="card-img-top" alt="${videoTitle}">
                        </a>
                        <div class="card-body">
                            <h5 class="card-title text-truncate">${videoTitle}</h5>
                            <a href="${videoUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-outline-custom mt-2">Regarder</a>
                        </div>
                    </div>
                `;
                videoGridContainer.appendChild(col);
            });
        } else {
            videoGridContainer.innerHTML = '<p class="text-center text-muted">Aucune vidéo trouvée.</p>';
        }

        // Met à jour l'état des boutons de pagination
        if (prevPageBtn) prevPageBtn.disabled = data.prevPage === null;
        if (nextPageBtn) nextPageBtn.disabled = data.nextPage === null;

    } catch (error) {
        console.error("Erreur lors de la récupération des vidéos:", error);
        if (loadingMessage) loadingMessage.innerHTML = '<p class="text-center text-danger">Impossible de charger les vidéos. Veuillez réessayer plus tard.</p>';
        if (prevPageBtn) prevPageBtn.disabled = true;
        if (nextPageBtn) nextPageBtn.disabled = true;
    }
}

// ==================== FONCTIONS DE GESTION DU LIVE STREAM YOUTUBE ====================

/**
 * Affiche le lecteur YouTube et met à jour le message de statut en mode "EN DIRECT".
 */
function displayLivePlayer(container, message, url, title) { // ⬅️ NOUVEAU PARAMÈTRE: title
    if (container) {
        // Crée le div parent pour gérer le ratio
        const ratioWrapper = document.createElement('div');
        ratioWrapper.className = 'ratio ratio-16x9';

        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.title = title || "Diffusion en Direct"; // ⬅️ UTILISATION DU TITRE
        iframe.frameBorder = 0;
        iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
        iframe.allowFullscreen = true;

        ratioWrapper.appendChild(iframe);
        container.innerHTML = '';
        container.appendChild(ratioWrapper);
        container.style.display = 'block';
    }

    if (message) {
        // ⬅️ UTILISATION DU TITRE DANS LE MESSAGE
        message.innerHTML = `<i class="fas fa-satellite-dish me-2"></i> <strong>EN DIRECT MAINTENANT :</strong> ${title} 🎉`;
        message.classList.remove('alert-info', 'alert-warning', 'alert-danger');
        message.classList.add('alert-success'); // Vert pour le succès
        message.style.display = 'block';
    }
}

/**
 * Fonction principale: Vérifie l'état du direct YouTube.
 */
const checkLiveStatus = async () => {
    const liveContainer = document.getElementById('live-player-container');
    const statusMessage = document.getElementById('live-status-message');

    // CONTRÔLE CRITIQUE: Sortie si les conteneurs DOM sont manquants
    if (!liveContainer || !statusMessage) {
        console.error("Erreur critique: Le conteneur du lecteur ou le message de statut est manquant dans le HTML.");
        return;
    }

    // Simule la récupération de l'ID de chaîne
    const channelId = window.APP_SETTINGS ? window.APP_SETTINGS.YOUTUBE_CHANNEL_ID : 'FALLBACK_ID_SI_ERREUR';

    // 1. Vérification de l'ID de la chaîne (Erreur de configuration)
    if (!channelId || channelId === 'FALLBACK_ID_SI_ERREUR') {
        console.error("Erreur: L'ID de chaîne YouTube n'a pas été injecté par le serveur.");
        statusMessage.textContent = "Erreur de configuration. ID de chaîne manquant.";
        statusMessage.classList.remove('alert-info', 'alert-warning');
        statusMessage.classList.add('alert-danger'); // Rouge
        statusMessage.style.display = 'block';
        return;
    }

    // =========================================================================
    // NOUVELLE LOGIQUE : APPEL API au serveur pour obtenir le statut
    // =========================================================================
    let isLive = false;
    let videoId = null;
    let videoTitle = null; // ⬅️ NOUVELLE VARIABLE

    try {
        const response = await fetch('/api/youtube-status');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        // Récupère les données renvoyées par le serveur (isLive, videoId ET videoTitle)
        isLive = data.isLive;
        videoId = data.videoId;
        videoTitle = data.videoTitle; // ⬅️ RÉCUPÉRATION DU TITRE DU DIRECT

    } catch (error) {
        console.error("Erreur lors de la vérification du statut YouTube:", error);
        isLive = false;
    }
    // =========================================================================

    // 2. Logique d'affichage basée sur l'état 'isLive'
    if (isLive && videoId) {
        // --- CAS EN DIRECT : Utilisation de l'ID Vidéo Spécifique ---
        const specificEmbedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
        // ⬅️ PASSAGE DU TITRE À LA FONCTION D'AFFICHAGE
        displayLivePlayer(liveContainer, statusMessage, specificEmbedUrl, videoTitle);

    } else {
        // --- CAS HORS LIGNE ou ID VIDÉO MANQUANT ---
        liveContainer.innerHTML = '';
        liveContainer.style.display = 'none';

        statusMessage.style.display = 'block';

        // Si isLive est true mais videoId est null, il pourrait y avoir un problème de flux
        if (isLive && !videoId) {
            statusMessage.textContent = "Le direct est détecté, mais le flux vidéo n'est pas encore actif. Veuillez patienter.";
            statusMessage.classList.remove('alert-success', 'alert-danger');
            statusMessage.classList.add('alert-info'); // Info
        } else {
            // Statut HORS LIGNE
            statusMessage.textContent = "Aucune diffusion en direct n'est actuellement en cours.";
            statusMessage.classList.remove('alert-info', 'alert-success', 'alert-danger');
            statusMessage.classList.add('alert-warning'); // Jaune/Orange
        }
    }
};

// ==================== Attente du chargement complet du DOM ====================
document.addEventListener("DOMContentLoaded", () => {

    // ==================== 0. Effet texte automatique (machine à écrire) ====================
    const text = "BIENVENUE DANS LA MAISON DU SEIGNEUR...";
    const target = document.getElementById("autoText");
    let index = 0;

    if (target) {
        function typeWriter() {
            if (index < text.length) {
                target.innerHTML += text.charAt(index);
                index++;
                setTimeout(typeWriter, 100);
            }
        }
        setTimeout(typeWriter, 1000);
    }

    // ==================== 1. Défilement doux (Smooth Scroll) et Fermeture Offcanvas ====================
    // (Cette logique doit être dans une fonction externe si vous avez suivi les étapes précédentes, mais ici, 
    // on laisse l'écouteur d'événement en place pour les ancres génériques)
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener("click", (e) => {
            const href = anchor.getAttribute("href");
            if (href && href.length > 1) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({ behavior: "smooth", block: "start" });
                }
            }
        });
    });

    // ==================== 2. Animations au défilement (Intersection Observer) ====================
    const animatedElements = document.querySelectorAll(
        ".fade-in-card, .section-title-animated"
    );

    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(
            (entries, observer) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("visible");
                        observer.unobserve(entry.target);
                    }
                });
            },
            {
                threshold: 0.1,
            }
        );

        animatedElements.forEach((element) => {
            observer.observe(element);
        });
    } else {
        animatedElements.forEach((element) => element.classList.add("visible"));
    }

    // ==================== 3. Bouton "Retour en haut" au défilement ====================
    const backToTopBtn = document.getElementById("backToTopBtn");
    const scrollThreshold = 300;

    if (backToTopBtn) {
        window.addEventListener("scroll", () => {
            if (window.scrollY > scrollThreshold) {
                backToTopBtn.classList.add("visible");
            } else {
                backToTopBtn.classList.remove("visible");
            }
        });
    }

    // ==================== 4. Validation et envoi du formulaire de contact (AJAX) ====================
    const contactForm = document.getElementById("contact-form");
    const formMessage = document.getElementById("form-message");

    if (contactForm) {
        contactForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const formData = {
                name: document.getElementById("nom").value,
                email: document.getElementById("email").value,
                message: document.getElementById("message").value,
            };

            if (!formData.name || !formData.email || !formData.message) {
                formMessage.innerHTML = `<div class="alert alert-danger" role="alert">Merci de remplir tous les champs avant d'envoyer.</div>`;
                return;
            }

            formMessage.innerHTML = `<div class="alert alert-info" role="alert">Envoi en cours...</div>`;

            try {
                const response = await fetch("/api/contact-form", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(formData),
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.success) {
                        const successMessage = document.createElement("div");
                        successMessage.className = "alert alert-success";
                        successMessage.setAttribute("role", "alert");
                        successMessage.textContent = `Merci ${formData.name}, votre message a bien été envoyé !`;
                        formMessage.innerHTML = "";
                        formMessage.appendChild(successMessage);
                        contactForm.reset();
                    } else {
                        formMessage.innerHTML = `<div class="alert alert-warning" role="alert">Une erreur est survenue : ${result.message}.</div>`;
                    }
                } else {
                    formMessage.innerHTML = `<div class="alert alert-danger" role="alert">Erreur de serveur. Veuillez réessayer plus tard.</div>`;
                }
            } catch (error) {
                console.error("Erreur lors de l'envoi du formulaire:", error);
                formMessage.innerHTML = `<div class="alert alert-danger" role="alert">Une erreur réseau est survenue. Veuillez vérifier votre connexion.</div>`;
            }
        });
    }

    // ==================== Événements pour la recherche et le tri des vidéos ====================

    // Fonction pour le debouncing
    function debounce(func, delay) {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    }

    // Événement pour le champ de recherche
    const searchInput = document.getElementById("video-search-input");
    const debouncedSearch = debounce(() => {
        currentPage = 1;
        fetchVideos();
    }, 300);

    if (searchInput) {
        searchInput.addEventListener('input', (event) => {
            currentSearchQuery = event.target.value.trim();
            debouncedSearch();
        });
    }

    // Événement pour le bouton de recherche (si présent)
    const searchButton = document.getElementById("search-button");
    if (searchButton) {
        searchButton.addEventListener("click", () => {
            currentSearchQuery = searchInput.value.trim();
            currentPage = 1;
            fetchVideos();
        });
    }

    // Événement pour le tri (CORRECTION À VÉRIFIER)
    const sortSelect = document.getElementById("video-sort-select");
    if (sortSelect) {
        sortSelect.addEventListener("change", () => {
            // ASSUREZ-VOUS D'UTILISER LA VARIABLE GLOBALE CORRECTE
            currentSortOrder = sortSelect.value;
            currentPage = 1;
            fetchVideos();
        });
    }
    
    // Événements pour les boutons de pagination
    const prevPageBtn = document.getElementById("prevPageBtnHome");
    const nextPageBtn = document.getElementById("nextPageBtnHome");

    if (prevPageBtn) {
        prevPageBtn.addEventListener("click", () => {
            if (currentPage > 1) {
                currentPage--;
                fetchVideos();
            }
        });
    }

    if (nextPageBtn) {
        nextPageBtn.addEventListener("click", () => {
            if (!nextPageBtn.disabled) {
                currentPage++;
                fetchVideos();
            }
        });
    }

    // Appel initial au chargement de la page pour afficher les vidéos
    const videoGridExists = document.getElementById("videos-grid");
    if (videoGridExists) {
        fetchVideos();
    }

    // ==================== 5. Initialisation du lecteur YouTube en direct ====================
    const liveContainerExists = document.getElementById('live-player-container');

    if (liveContainerExists) {
        // N'appelle la fonction que si au moins le conteneur principal est présent.
        checkLiveStatus();
    }
});