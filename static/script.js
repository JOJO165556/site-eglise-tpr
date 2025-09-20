// Attente du chargement complet du DOM avant d'exécuter le script
document.addEventListener("DOMContentLoaded", () => {
    // ==================== 5. Chargement des membres via API (JSON) ====================
    // Récupère le total des membres et les derniers inscrits pour les afficher sur la page d'accueil.
    async function loadMembersData() {
        try {
            const response = await fetch("/api/members");
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            const members = await response.json();

            // 1. Afficher le nombre total de membres
            const totalMembersElement = document.getElementById("totalMembersCount");
            if (totalMembersElement) {
                totalMembersElement.textContent = members.length;
            }

            // 2. Afficher les 10 derniers membres
            const lastTenMembers = members.slice(0, 10); // Prend les 10 premiers (qui sont les derniers car triés par l'API)
            const tableBody = document.querySelector("#members-list tbody");
            if (tableBody) {
                tableBody.innerHTML = ""; // Vide le contenu existant

                if (lastTenMembers.length === 0) {
                    tableBody.innerHTML = `<tr><td colspan="7" class="text-center">Aucun membre inscrit pour le moment.</td></tr>`;
                } else {
                    lastTenMembers.forEach((member) => {
                        const row = document.createElement("tr");

                        // Création et ajout des cellules de manière sécurisée
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
            const tableBody = document.querySelector("#members-list tbody");
            if (tableBody) {
                tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Erreur de connexion.</td></tr>`;
            }
        }
    }

    // Exécute la fonction pour charger les données
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
                setTimeout(typeWriter, 100); // vitesse (ms)
            }
        }
        setTimeout(typeWriter, 1000); // synchronisé avec l'animation delay
    }

    // ==================== 1. Défilement doux (Smooth Scroll) ====================
    // Applique un défilement fluide à tous les liens qui pointent vers une section de la page
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener("click", (e) => {
            const href = anchor.getAttribute("href");
            // S'assurer que le lien n'est pas un simple '#' ou vide
            if (href && href.length > 1) {
                e.preventDefault(); // Empêche le comportement par défaut du lien
                const target = document.querySelector(href);
                if (target) {
                    // Fait défiler la page jusqu'à l'élément cible
                    target.scrollIntoView({ behavior: "smooth", block: "start" });
                }
            }
        });
    });

    // ==================== 2. Animations au défilement (Intersection Observer) ====================
    // Rend les éléments visibles avec une animation lorsqu'ils entrent dans le viewport
    const animatedElements = document.querySelectorAll(
        ".fade-in-card, .section-title-animated"
    );

    // Crée un observateur d'intersection
    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(
            (entries, observer) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        // Ajoute la classe 'visible' pour déclencher l'animation CSS
                        entry.target.classList.add("visible");
                        // N'observe plus cet élément une fois qu'il est visible
                        observer.unobserve(entry.target);
                    }
                });
            },
            {
                // Déclenche l'animation dès que 10% de l'élément est visible
                threshold: 0.1,
            }
        );

        // Attache l'observateur à chaque élément à animer
        animatedElements.forEach((element) => {
            observer.observe(element);
        });
    } else {
        // Fallback pour les anciens navigateurs : affiche les éléments directement
        animatedElements.forEach((element) => element.classList.add("visible"));
    }

    // ==================== 3. Bouton "Retour en haut" au défilement ====================
    // Affiche/cache un bouton pour revenir en haut de la page
    const backToTopBtn = document.getElementById("backToTopBtn");
    const scrollThreshold = 300; // Seuil de défilement en pixels

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
    // Gère la soumission du formulaire sans recharger la page
    const contactForm = document.getElementById("contactForm");
    const formMessage = document.getElementById("form-message");

    if (contactForm) {
        contactForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const formData = new FormData(contactForm);
            const name = formData.get("nom");
            const email = formData.get("email");
            const message = formData.get("message");

            // Validation simple
            if (!name || !email || !message) {
                formMessage.innerHTML = `<div class="alert alert-danger" role="alert">Merci de remplir tous les champs avant d'envoyer.</div>`;
                return;
            }

            formMessage.innerHTML = `<div class="alert alert-info" role="alert">Envoi en cours...</div>`;

            try {
                const response = await fetch(contactForm.action, {
                    method: contactForm.method,
                    body: formData,
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.success) {
                        // Utilisation sécurisée de la variable "name"
                        const successMessage = document.createElement("div");
                        successMessage.className = "alert alert-success";
                        successMessage.setAttribute("role", "alert");
                        successMessage.textContent = `Merci ${name}, votre message a bien été envoyé !`;
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

    // ==================== 6. Intégration YouTube API ====================
    async function fetchYouTubeVideos() {
        try {
            // L'appel se fait maintenant vers votre propre serveur
            const response = await fetch("/api/youtube-videos");

            if (!response.ok) {
                throw new Error("Erreur de requête API du serveur");
            }
            const data = await response.json();
            const carouselContainer = document.getElementById("youtube-carousel");

            // Assurez-vous que l'élément existe avant de le manipuler
            if (!carouselContainer) {
                console.warn(
                    "Element #youtube-carousel not found, YouTube videos cannot be displayed."
                );
                return;
            }

            // On vide le contenu existant
            carouselContainer.innerHTML = "";

            if (data.items.length === 0) {
                carouselContainer.innerHTML =
                    '<p class="text-center">Aucune vidéo trouvée.</p>';
                return;
            }

            // Création de l'intérieur du carrousel
            const carouselInner = document.createElement("div");
            carouselInner.className = "carousel-inner";

            data.items.forEach((item, index) => {
                const videoTitle = item.snippet.title;
                const videoId = item.snippet.resourceId.videoId;
                const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
                const thumbnailUrl = item.snippet.thumbnails.high.url;

                // Création d'un élément de carrousel pour chaque vidéo
                const carouselItem = document.createElement("div");
                carouselItem.className = `carousel-item ${index === 0 ? "active" : ""}`; // Le premier item doit avoir la classe 'active'

                // Crée le conteneur de la vignette et du titre
                const videoContainer = document.createElement("div");
                videoContainer.className = "d-flex flex-column align-items-center p-3";

                // Crée le lien pour l'image
                const thumbnailLink = document.createElement("a");
                thumbnailLink.href = videoUrl;
                thumbnailLink.target = "_blank";
                thumbnailLink.rel = "noopener noreferrer";

                // Crée l'élément img pour la vignette
                const thumbnail = document.createElement("img");
                thumbnail.src = thumbnailUrl;
                thumbnail.alt = `Vignette de la vidéo: ${videoTitle}`;
                thumbnail.className = "img-fluid rounded";

                // Crée le lien pour le titre
                const titleLink = document.createElement("a");
                titleLink.href = videoUrl;
                titleLink.textContent = videoTitle;
                titleLink.target = "_blank";
                titleLink.rel = "noopener noreferrer";
                titleLink.className = "d-block text-truncate mt-2";

                // Ajoute les éléments au conteneur, puis au carousel item
                thumbnailLink.appendChild(thumbnail);
                videoContainer.appendChild(thumbnailLink);
                videoContainer.appendChild(titleLink);
                carouselItem.appendChild(videoContainer);
                carouselInner.appendChild(carouselItem);
            });

            // Ajoute le carrousel intérieur au conteneur principal
            carouselContainer.appendChild(carouselInner);

            // Crée les contrôles de navigation (précédent/suivant)
            const prevControl = document.createElement("a");
            prevControl.className = "carousel-control-prev";
            prevControl.href = "#youtube-carousel";
            prevControl.role = "button";
            prevControl.setAttribute("data-bs-slide", "prev");
            prevControl.innerHTML =
                '<span class="carousel-control-prev-icon" aria-hidden="true"></span><span class="visually-hidden">Précédent</span>';

            const nextControl = document.createElement("a");
            nextControl.className = "carousel-control-next";
            nextControl.href = "#youtube-carousel";
            nextControl.role = "button";
            nextControl.setAttribute("data-bs-slide", "next");
            nextControl.innerHTML =
                '<span class="carousel-control-next-icon" aria-hidden="true"></span><span class="visually-hidden">Suivant</span>';

            // Ajoute les contrôles de navigation au carrousel
            carouselContainer.appendChild(prevControl);
            carouselContainer.appendChild(nextControl);
        } catch (error) {
            console.error(
                "Erreur lors de la récupération des vidéos YouTube:",
                error
            );
            if (document.getElementById("youtube-carousel")) {
                document.getElementById("youtube-carousel").innerHTML =
                    '<p class="text-center text-danger">Impossible de charger les vidéos. Veuillez réessayer plus tard.</p>';
            }
        }
    }

    // Exécute la fonction au chargement de la page
    fetchYouTubeVideos();
});