// script.js

// ==================== Déclarations et fonctions globales pour la pagination YouTube ====================
// Ces variables et fonctions sont au début du fichier (scope global)
// pour être accessibles par toutes les autres fonctions du script.
let currentHomePageToken = "";
let nextHomePageToken = "";
let previousHomePageToken = "";
let currentSearchQuery = "";
let currentSortOrder = "date"; // Tri par défaut à la date pour une meilleure expérience

// Fonction pour mettre à jour l'état des boutons de pagination (désactivés ou actifs)
function updatePaginationButtons() {
    const prevPageBtn = document.getElementById("prevPageBtnHome");
    const nextPageBtn = document.getElementById("nextPageBtnHome");
    if (prevPageBtn) prevPageBtn.disabled = !previousHomePageToken;
    if (nextPageBtn) nextPageBtn.disabled = !nextHomePageToken;
}

// Fonction asynchrone pour récupérer et afficher les vidéos YouTube
async function fetchYouTubeVideos() {
    const videoGridContainer = document.getElementById("youtube-videos-grid");
    const loadingMessage = document.getElementById("loadingMessageHome");

    // Vérifie si le conteneur existe avant de continuer
    if (!videoGridContainer) {
        console.warn(
            "Element #youtube-videos-grid not found, YouTube videos cannot be displayed on this page."
        );
        return;
    }

    // Affiche un message de chargement et nettoie le conteneur existant
    if (loadingMessage) {
        loadingMessage.innerHTML = `<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Chargement...</span></div><p class="mt-2">Chargement des vidéos...</p>`;
        loadingMessage.style.display = "block";
    }
    videoGridContainer.innerHTML = "";

    try {
        // Construit l'URL de l'API avec les paramètres de recherche, tri et pagination
        const urlParams = new URLSearchParams();
        urlParams.append("maxResults", 9); // Nombre de vidéos par page
        urlParams.append("sort", currentSortOrder);

        if (currentHomePageToken) {
            urlParams.append("pageToken", currentHomePageToken);
        }
        if (currentSearchQuery) {
            urlParams.append("query", currentSearchQuery);
        }

        const response = await fetch(`/api/youtube-videos?${urlParams.toString()}`);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Erreur inconnue de l'API.");
        }
        const data = await response.json();

        // Masque le message de chargement après la réussite de la requête
        if (loadingMessage) loadingMessage.style.display = "none";

        // Stocke les tokens pour la gestion de la pagination
        nextHomePageToken = data.nextPageToken || "";
        previousHomePageToken = data.prevPageToken || "";

        if (data.items && data.items.length > 0) {
            data.items.forEach((item) => {
                // Extrait l'ID de la vidéo (gère les deux structures de réponse de l'API YouTube)
                const videoId = item.id.videoId || item.snippet.resourceId.videoId;
                const videoTitle = item.snippet.title;
                const thumbnailUrl = item.snippet.thumbnails.high.url;
                const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

                // Crée la carte vidéo pour l'affichage en grille
                const col = document.createElement("div");
                col.className = "col"; // Classe Bootstrap pour la grille
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
            // Affiche un message si aucune vidéo n'est trouvée
            videoGridContainer.innerHTML =
                '<p class="text-center text-muted">Aucune vidéo trouvée.</p>';
        }
        updatePaginationButtons(); // Met à jour l'état des boutons après le rendu
    } catch (error) {
        console.error("Erreur lors de la récupération des vidéos YouTube:", error);

        // Affiche un message d'erreur et désactive les boutons en cas d'échec
        if (loadingMessage) {
            loadingMessage.innerHTML =
                '<p class="text-center text-danger">Impossible de charger les vidéos. Veuillez réessayer plus tard.</p>';
            loadingMessage.style.display = "block";
        }
        updatePaginationButtons(); // Désactive les boutons
    }
}

// ==================== Attente du chargement complet du DOM ====================
document.addEventListener("DOMContentLoaded", () => {
    // ==================== 5. Chargement des membres via API (JSON) ====================
    // Cette fonction est appelée uniquement si l'élément "totalMembersCount" ou "members-list" est présent
    async function loadMembersData() {
        const totalMembersElement = document.getElementById("totalMembersCount");
        const tableBody = document.querySelector("#members-list tbody");

        // Ne tente de charger les données que si les éléments existent sur la page
        if (!totalMembersElement && !tableBody) {
            // console.log("Éléments des membres non trouvés, skip le chargement des données des membres.");
            return;
        }

        try {
            const response = await fetch("/api/members");
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            const members = await response.json();

            if (totalMembersElement) {
                totalMembersElement.textContent = members.length;
            }

            if (tableBody) {
                const lastTenMembers = members.slice(0, 10);
                tableBody.innerHTML = "";

                if (lastTenMembers.length === 0) {
                    tableBody.innerHTML = `<tr><td colspan="7" class="text-center">Aucun membre inscrit pour le moment.</td></tr>`;
                } else {
                    lastTenMembers.forEach((member) => {
                        const row = document.createElement("tr");
                        const cells = [
                            member.statut || "Non renseigné",
                            member.name,
                            member.first_names,
                            member.neighborhood || "Non renseigné",
                            member.age_group,
                            member.profession,
                            member.phone || "Non renseigné",
                        ];
                        cells.forEach((cellText) => {
                            const td = document.createElement("td");
                            td.textContent = cellText;
                            row.appendChild(td);
                        });
                        tableBody.appendChild(row);
                    });
                }
            }
        } catch (error) {
            console.error(
                "Erreur lors du chargement des données des membres:",
                error
            );
            if (tableBody) {
                tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Erreur de connexion.</td></tr>`;
            }
        }
    }

    // Exécute la fonction pour charger les données des membres si les éléments sont présents
    loadMembersData();

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

            // Récupère explicitement les valeurs des champs
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

    // ==================== Intégration YouTube API : Événements pour les boutons de pagination, recherche et tri ====================
    const prevPageBtn = document.getElementById("prevPageBtnHome");
    const nextPageBtn = document.getElementById("nextPageBtnHome");
    const searchForm = document.getElementById("video-search-form");
    const searchInput = document.getElementById("video-search-input");
    const sortSelect = document.getElementById("video-sort-select");

    if (prevPageBtn) {
        prevPageBtn.addEventListener("click", (e) => {
            e.preventDefault();
            if (previousHomePageToken) {
                currentHomePageToken = previousHomePageToken;
                fetchYouTubeVideos();
            }
        });
    }

    if (nextPageBtn) {
        nextPageBtn.addEventListener("click", (e) => {
            e.preventDefault();
            if (nextHomePageToken) {
                currentHomePageToken = nextHomePageToken;
                fetchYouTubeVideos();
            }
        });
    }

    if (searchForm) {
        searchForm.addEventListener("submit", (e) => {
            e.preventDefault();
            currentSearchQuery = searchInput.value;
            currentHomePageToken = ""; // Réinitialise la pagination pour une nouvelle recherche
            fetchYouTubeVideos();
        });
    }

    if (sortSelect) {
        sortSelect.addEventListener("change", () => {
            currentSortOrder = sortSelect.value;
            currentHomePageToken = ""; // Réinitialise la pagination pour le nouveau tri
            fetchYouTubeVideos();
        });
    }

    // Le chargement initial des vidéos YouTube se fait ici si les éléments sont présents
    // C'est important de le faire après avoir défini tous les listeners.
    const youtubeGridExists = document.getElementById("youtube-videos-grid");
    if (youtubeGridExists) {
        fetchYouTubeVideos();
    }
});
