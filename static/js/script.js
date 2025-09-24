// script.js

// ==================== Déclarations et fonctions globales pour la pagination vidéo ====================
let currentPage = 1;
let currentSearchQuery = "";
let currentSortOrder = "date"; // 'date' ou 'title'

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

    // ==================== 1. Défilement doux (Smooth Scroll) ====================
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
    // Crée une version debounced de la fonction de recherche
    const debouncedSearch = debounce(() => {
        currentPage = 1; // Réinitialise la pagination pour une nouvelle recherche
        fetchVideos();
    }, 300); // Délai de 300ms

    if (searchInput) {
        searchInput.addEventListener('input', (event) => {
            currentSearchQuery = event.target.value.trim(); // Met à jour la variable globale
            debouncedSearch(); // Appelle la fonction debounced
        });
    }
    
    // Événement pour le bouton de recherche (si présent)
    const searchButton = document.getElementById("search-button"); // Assurez-vous d'avoir un id="search-button" dans votre HTML
    if (searchButton) {
        searchButton.addEventListener("click", () => {
            currentSearchQuery = searchInput.value.trim(); // Met à jour la variable globale avec la valeur actuelle
            currentPage = 1; // Réinitialise la pagination
            fetchVideos(); // Lance la recherche immédiatement sans debounce pour le bouton
        });
    }

    // Événement pour le tri
    const sortSelect = document.getElementById("video-sort-select");
    if (sortSelect) {
        sortSelect.addEventListener("change", () => {
            currentSortOrder = sortSelect.value;
            currentPage = 1; // Réinitialise la pagination pour un nouveau tri
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
});