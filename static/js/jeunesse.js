// Ce script gère le calendrier, le quiz, la pensée du jour, le carrousel

// --- GESTION DES SONS ---

/**
 * Joue un son prédéfini en utilisant la balise audio HTML correspondante.
 * @param {string} type Le type de son à jouer ('correct', 'incorrect').
 */
const playSound = (type) => {
    let elementId = '';
    if (type === 'correct') {
        elementId = 'correct-sound';
    } else if (type === 'incorrect') {
        elementId = 'incorrect-sound';
    }

    const targetAudio = document.getElementById(elementId);

    if (targetAudio) {
        targetAudio.currentTime = 0;
        targetAudio.volume = 0.5;
        targetAudio.play().catch(e => {
            console.warn(`Avertissement: Impossible de jouer le son ${type}.`, e);
        });
    }
};

// --- GESTION DES DONNÉES ET ÉTATS LOCAUX ---
let currentDate = new Date();
let currentQuestionIndex = 0;
let score = 0;
const MAX_QUESTIONS = 10;
let events = [];
let quizQuestions = [];

// --- FONCTIONS DE RÉCUPÉRATION DES DONNÉES (API) ---

/**
 * Récupère les questions du quiz depuis l'API du serveur, les mélange et démarre le quiz.
 */
const fetchQuizQuestions = async () => {
    try {
        const response = await fetch('/api/quiz-questions');
        if (!response.ok) {
            throw new Error('Erreur de chargement du quiz');
        }
        const data = await response.json();
        const shuffledData = data.sort(() => Math.random() - 0.5);
        startQuiz(shuffledData);
    } catch (error) {
        console.error('Erreur lors du chargement du quiz:', error);
        const quizContainer = document.getElementById('quiz-container');
        if (quizContainer) {
            quizContainer.innerHTML = "<p>Désolé, le quiz n'a pas pu être chargé. Veuillez réessayer plus tard.</p>";
        }
    }
};

/**
 * Récupère les événements de la jeunesse depuis l'API du serveur pour le calendrier.
 */
const fetchJeunesseEvents = async () => {
    try {
        const response = await fetch('/api/jeunesse-events');
        if (!response.ok) {
            throw new Error('Erreur de chargement des événements');
        }
        const data = await response.json();
        events = data;
        renderCalendar();
    } catch (error) {
        console.error('Erreur lors du chargement des événements jeunesse:', error);
    }
};

// --- GESTION DU CALENDRIER ---

/**
 * Affiche le calendrier du mois courant, y compris les noms de jours et les numéros.
 */
const renderCalendar = () => {
    const calendarElement = document.getElementById('calendar');
    calendarElement.innerHTML = '';
    const monthLabel = document.getElementById('month-label');
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    monthLabel.textContent = new Date(year, month).toLocaleString('fr-fr', { month: 'long', year: 'numeric' });

    const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']; dayNames.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-header';
        dayHeader.textContent = day;
        calendarElement.appendChild(dayHeader);
    });

    const startOffset = (firstDayOfMonth === 0) ? 6 : firstDayOfMonth - 1;

    for (let i = 0; i < startOffset; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day empty';
        calendarElement.appendChild(emptyDay);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let day = 1; day <= daysInMonth; day++) {
        const dayCard = document.createElement('div');
        dayCard.className = 'calendar-day card h-100 p-2 shadow-sm';

        const fullDate = new Date(year, month, day);
        fullDate.setHours(0, 0, 0, 0);

        if (fullDate.getTime() === today.getTime()) {
            dayCard.classList.add('today');
        }

        const dayNumber = document.createElement('h5');
        dayNumber.className = 'card-title day-number';
        dayNumber.textContent = day;
        dayCard.appendChild(dayNumber);

        const cardBody = document.createElement('div');
        cardBody.className = 'card-body p-0';
        dayCard.appendChild(cardBody);

        const formattedDate = `${fullDate.getFullYear()}-${(fullDate.getMonth() + 1).toString().padStart(2, '0')}-${fullDate.getDate().toString().padStart(2, '0')}`;
        const dayEvents = events.filter(event => new Date(event.date).toISOString().slice(0, 10) === formattedDate);

        if (dayEvents.length > 0) {
            if (fullDate < today) {
                dayCard.classList.add('past-event');
                const eventIcon = document.createElement('i');
                eventIcon.className = 'fas fa-check event-icon past-icon';
                dayCard.appendChild(eventIcon);
            } else {
                dayCard.classList.add('has-event');
                const eventIcon = document.createElement('i');
                eventIcon.className = 'fas fa-star event-icon';
                dayCard.appendChild(eventIcon);
            }

            dayEvents.forEach(event => {
                dayCard.addEventListener('click', () => {
                    showEventModal(event);
                });
            });
        }
        calendarElement.appendChild(dayCard);
    }
};

/**
 * Affiche la fenêtre modale avec les détails de l'événement.
 * @param {Object} event L'objet événement à afficher (avec .title et .link).
 */
const showEventModal = (event) => {
    const modal = document.getElementById('eventModal');

    document.getElementById('modal-title').textContent = event.title;

    const eventDate = new Date(event.date);
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    document.getElementById('modal-date').textContent = eventDate.toLocaleDateString('fr-fr', dateOptions);

    document.getElementById('modal-description').textContent = event.description;

    const modalLink = document.getElementById('modal-link');
    const default404 = '/erreur-evenement-404';
    const linkValue = event.link ? String(event.link).trim() : '';

    if (!linkValue || linkValue === '#') {
        modalLink.href = default404;
    } else {
        modalLink.href = event.link;
    }

    modalLink.style.display = 'inline-block';
    // Utilisation de Bootstrap 5 Modal
    const bootstrapModal = bootstrap.Modal.getOrCreateInstance(modal);
    bootstrapModal.show();
};

/**
 * Cache la fenêtre modale de l'événement.
 */
const hideEventModal = () => {
    const modal = document.getElementById('eventModal');
    // Utilisation de Bootstrap 5 Modal
    const bootstrapModal = bootstrap.Modal.getOrCreateInstance(modal);
    bootstrapModal.hide();
};

/**
 * Gère le changement de mois dans le calendrier.
 * @param {number} direction -1 pour le mois précédent, 1 pour le mois suivant.
 */
window.changeMonth = (direction) => {
    currentDate.setMonth(currentDate.getMonth() + direction);
    renderCalendar();
};

// --- GESTION DU QUIZ (LIMITE ET SCORE) ---

/**
 * Démarre le quiz avec les questions fournies et gère l'affichage/le masquage des conteneurs.
 * @param {Array} questions Le tableau de questions du quiz.
 */
const startQuiz = (questions) => {
    // Récupération des nouveaux conteneurs de structure
    const quizContent = document.getElementById('quiz-content');
    const quizEndMessage = document.getElementById('quiz-end-message');
    
    // 1. Réinitialise l'affichage pour un nouveau quiz :
    // Masque le message de fin de partie (s'il était affiché)
    if (quizEndMessage) {
        quizEndMessage.style.display = 'none';
    }
    // Affiche le contenu principal du quiz (s'il était masqué)
    if (quizContent) {
        quizContent.style.display = 'block';
    }

    if (questions && questions.length > 0) {
        quizQuestions = questions.slice(0, MAX_QUESTIONS);
        currentQuestionIndex = 0;
        score = 0;
        
        const nextBtn = document.getElementById('next-question-btn');
        if (nextBtn) {
            nextBtn.style.display = 'none';
        } else {
            console.warn("L'élément 'next-question-btn' est introuvable pour la réinitialisation.");
        } 
        
        // C'est maintenant ici que le showQuestion est appelé sans erreur !
        showQuestion();
    } else {
        console.error("Les questions du quiz n'ont pas pu être chargées.");
        // Gère l'erreur d'une manière qui ne détruit pas la structure
        if (quizContent) {
             quizContent.innerHTML = "<p>Désolé, le quiz n'a pas pu être chargé. Veuillez réessayer plus tard.</p>";
        }
    }
};

/**
 * Affiche la question courante et met à jour la progression et le score.
 */
const showQuestion = () => {
    // 1. Déclaration et sécurisation des conteneurs principaux
    const questionContainer = document.getElementById('quiz-question');
    const optionsContainer = document.getElementById('quiz-options');
    const resultContainer = document.getElementById('quiz-result');

    // Si les conteneurs essentiels manquent, nous arrêtons l'exécution ici pour éviter les erreurs
    if (!questionContainer || !optionsContainer) {
        console.error("Erreur critique : les conteneurs 'quiz-question' ou 'quiz-options' sont manquants. Vérifiez votre HTML.");
        return;
    }

    // 2. Déclaration des éléments secondaires (sécurisés plus bas)
    const scoreElement = document.getElementById('quiz-score');
    const progressElement = document.getElementById('quiz-progress');

    const currentQuestion = quizQuestions[currentQuestionIndex];
    if (!currentQuestion) {
        endQuiz();
        return;
    }

    // 3. CORRECTION : Sécuriser l'accès à scoreElement (ligne précédente d'erreur)
    if (scoreElement) {
        scoreElement.textContent = `Score: ${score}`;
    } else {
        console.warn("L'élément 'quiz-score' est introuvable. Le score ne sera pas affiché.");
    }
    
    // 4. Gestion de la progression (avec vérification existante)
    const currentProgress = currentQuestionIndex + 1;
    const progressPercent = (currentProgress / MAX_QUESTIONS) * 100;

    if (progressElement) {
        progressElement.style.width = `${progressPercent}%`;
        progressElement.setAttribute('aria-valuenow', currentProgress);
        progressElement.textContent = `${currentProgress} / ${MAX_QUESTIONS}`;
    }

    // 5. Mise à jour des conteneurs principaux (qui sont garantis d'exister par le check initial)
    questionContainer.textContent = currentQuestion.question;
    optionsContainer.innerHTML = '';
    
    // Sécuriser également l'accès à resultContainer avant de l'utiliser
    if (resultContainer) {
        resultContainer.textContent = '';
    }

    currentQuestion.options.forEach(option => {
        const button = document.createElement('button');
        button.className = 'btn btn-outline-secondary';
        button.textContent = option;
        button.onclick = () => checkAnswer(option);
        optionsContainer.appendChild(button);
    });
};

/**
 * Vérifie la réponse choisie par l'utilisateur.
 * @param {string} selectedOption L'option sélectionnée par l'utilisateur.
 */
const checkAnswer = (selectedOption) => {
    const options = document.querySelectorAll('#quiz-options button');
    const resultContainer = document.getElementById('quiz-result');
    const nextButton = document.getElementById('next-question-btn');
    const currentQuestion = quizQuestions[currentQuestionIndex];
    const correctAnswer = currentQuestion.answer;

    if (selectedOption === correctAnswer) {
        playSound('correct');
        resultContainer.textContent = "Correct ! 🎉";
        resultContainer.style.color = 'green';
        score++;
    } else {
        playSound('incorrect');
        resultContainer.textContent = `Incorrect. La bonne réponse est : ${correctAnswer}`;
        resultContainer.style.color = 'red';

        const wrongButton = Array.from(options).find(btn => btn.textContent === selectedOption);
        if (wrongButton) {
            wrongButton.classList.add('btn-danger');
        }
    }

    options.forEach(button => {
        button.disabled = true;
        if (button.textContent === correctAnswer) {
            button.classList.add('btn-success');
        }
    });

    nextButton.style.display = 'block';
    document.getElementById('quiz-score').textContent = `Score: ${score}`;
};

/**
 * Passe à la question suivante du quiz.
 */
const nextQuestion = () => {
    currentQuestionIndex++;
    if (currentQuestionIndex >= MAX_QUESTIONS) {
        endQuiz();
    } else {
        showQuestion();
        document.getElementById('next-question-btn').style.display = 'none';
    }
};

/**
 * Affiche le résultat final du quiz.
 */
const endQuiz = () => {
    const quizContent = document.getElementById('quiz-content');
    const quizEndMessage = document.getElementById('quiz-end-message');
    const finalMessage = `Quiz terminé ! Votre score final est de ${score} sur ${MAX_QUESTIONS} ! ✨`;

    // 1. Affiche le message de fin dans son conteneur dédié
    if (quizEndMessage) {
        quizEndMessage.innerHTML = `
            <h3>Résultats du Quiz</h3>
            <p class="h4 text-center mt-4">${finalMessage}</p>
            <p class="text-center mt-3">Merci d'avoir participé !</p>
            <button class="btn btn-primary mt-3" onclick="fetchQuizQuestions()">Recommencer le Quiz</button> 
            `;
        quizEndMessage.style.display = 'block';
    }

    // 2. Masque l'intégralité du contenu du quiz pour la fin de la partie
    if (quizContent) {
        quizContent.style.display = 'none';
    }
};

// --- GESTION DU CARROUSEL (CARROUSEL AUTOMATIQUE DU HAUT) ---

const setupAutoCarousel = () => {
    const sliderImages = document.querySelectorAll('.slider-image');
    let currentSlide = 0;

    const nextSlide = () => {
        if (sliderImages.length === 0) return;
        sliderImages[currentSlide].classList.remove('active');
        currentSlide = (currentSlide + 1) % sliderImages.length;
        sliderImages[currentSlide].classList.add('active');
    };

    if (sliderImages.length > 0) {
        // Démarrage du carrousel avec intervalle UNIQUEMENT si le DOM est chargé
        setInterval(nextSlide, 5000);
    }
};


// --- GESTION DE LA PENSÉE DU JOUR ---

/**
 * Récupère la pensée du jour depuis l'API et l'affiche, ainsi que sa référence.
 */
const displayDailyQuote = async () => {
    const quoteElement = document.getElementById('daily-quote');
    const quoteIconLeft = document.querySelector('.fa-quote-left');
    const quoteIconRight = document.querySelector('.fa-quote-right');

    // Fonction pour masquer/afficher les icônes
    const setIconsVisibility = (isVisible) => {
        const visibility = isVisible ? 'visible' : 'hidden';
        if (quoteIconLeft) quoteIconLeft.style.visibility = visibility;
        if (quoteIconRight) quoteIconRight.style.visibility = visibility;
    };

    // Réinitialise les éléments
    if (quoteElement) quoteElement.textContent = '';
    setIconsVisibility(false); // Masque initialement les icônes

    try {
        const response = await fetch('/api/daily-quote');

        if (!response.ok) {
            // Gère les statuts HTTP non 200 (comme 404, 500)
            throw new Error(`Erreur HTTP: ${response.status}`);
        }

        const data = await response.json();

        // 🛑 Utilise 'data.quote' (synchronisé avec le serveur)
        const quoteText = data.quote;
        const quoteReference = data.reference;

        if (quoteElement && quoteText) {
            // --- LOGIQUE DE CONCATÉNATION ---
            let finalQuote = quoteText;

            // Ajoute la référence SEULEMENT si elle n'est pas déjà dans le texte
            if (quoteReference && !quoteText.includes(quoteReference)) {
                finalQuote += ` — ${quoteReference}`;
            }

            quoteElement.textContent = finalQuote;
            setIconsVisibility(true); // Affiche les icônes si la citation est réussie
        }
    } catch (error) {
        console.error('Erreur lors du chargement de la pensée du jour:', error);

        if (quoteElement) {
            // Texte de secours en cas d'échec de l'API (assure la lisibilité)
            const fallbackQuote = "L'Éternel est bon ; il est un refuge au jour de la détresse ; il connaît ceux qui se confient en lui.";
            const fallbackReference = "Nahum 1:7";

            // Utilise la même logique de concaténation
            quoteElement.textContent = `${fallbackQuote} — ${fallbackReference}`;
            setIconsVisibility(true); // Affiche les icônes pour le texte de secours
        }
    }
};

/**
 * Vérifie si la section des affiches contient des images.
 */
const checkAffichesContent = () => {
    const affichesContainer = document.getElementById('affiches-content');
    const emptyMessage = document.getElementById('empty-message');

    if (!affichesContainer || !emptyMessage) return;

    // Cette vérification est basée sur l'existence d'éléments enfants, 
    // qui doivent être créés par un autre script ou directement dans le HTML.
    const imageCount = affichesContainer.querySelectorAll('img').length;

    if (imageCount === 0) {
        affichesContainer.style.display = 'none';
        emptyMessage.style.display = 'block';
    } else {
        affichesContainer.style.display = 'flex';
        emptyMessage.style.display = 'none';
    }
};

// --- NOUVELLE GESTION OFFCAVNAS ET ANCRES ---

/**
 * Gère le clic sur TOUS les liens du menu Offcanvas pour assurer la fermeture avant la navigation.
 */
const setupOffcanvasScroll = () => {
    const offcanvasElement = document.getElementById('offcanvasNavbar');

    if (!offcanvasElement) return;

    // S'assurer que 'bootstrap' est disponible.
    if (typeof bootstrap === 'undefined' || !bootstrap.Offcanvas) {
        console.warn("Bootstrap 5 non détecté. Impossible d'initialiser l'Offcanvas.");
        return;
    }

    const offcanvas = new bootstrap.Offcanvas(offcanvasElement);

    const allOffcanvasLinks = offcanvasElement.querySelectorAll('.nav-link');

    allOffcanvasLinks.forEach(link => {
        // Empêche de surcharger les liens qui ont déjà une gestion de fermeture
        if (link.hasAttribute('data-bs-dismiss')) {
            return;
        }

        link.addEventListener('click', function (event) {
            const href = this.getAttribute('href');

            // 1. Ferme le menu Offcanvas
            offcanvas.hide();

            // S'il s'agit d'un lien d'ancre (commence par #) sur la page actuelle
            if (href && href.startsWith('#')) {
                event.preventDefault(); // Empêche la navigation immédiate

                // Attendre la fin de l'animation pour le défilement
                setTimeout(() => {
                    const targetElement = document.querySelector(href);
                    if (targetElement) {
                        targetElement.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                }, 350);
            }
            // S'il s'agit d'un lien vers une autre page (ex: /jeunesse_don) ou vers la page courante (/index)
            else if (href) {
                // Pour tous les autres liens, on laisse la navigation se faire APRES la fermeture.
                event.preventDefault();

                // Attendre la fin de l'animation pour la navigation
                setTimeout(() => {
                    window.location.href = href;
                }, 350);
            }
        });
    });
};

// --- INITIALISATION UNIQUE DE LA PAGE (MEILLEURE PRATIQUE) ---

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Initialisation des composants interactifs ---

    // Quiz : Assurer le lien du bouton "Suivant"
    const nextQuestionBtn = document.getElementById('next-question-btn');
    if (nextQuestionBtn) {
        nextQuestionBtn.addEventListener('click', nextQuestion);
    }

    // Modale d'Événements : Gestion de la fermeture manuelle
    const modal = document.getElementById('eventModal');
    const closeBtn = document.getElementsByClassName('close-btn')[0];
    if (closeBtn) {
        // ATTENTION : Ce code est redondant avec Bootstrap Modal JS, mais on le garde.
        closeBtn.onclick = hideEventModal;
    }
    window.onclick = (event) => {
        if (event.target == modal) {
            hideEventModal();
        }
    };

    // --- 2. Initialisation des carrousels Bootstrap (Affichage du compteur) ---

    // Carrousel 'Camp Des Jeunes'
    const campJeunesCarousel = document.getElementById('campJeunesCarousel');
    const campJeunesCountDisplay = document.getElementById('campJeunesCompteur');
    const totalCampJeunesSlides = 2; // Référence au nombre de slides réel

    if (campJeunesCarousel && campJeunesCountDisplay) {
        campJeunesCarousel.addEventListener('slid.bs.carousel', function (event) {
            const currentSlideIndex = event.to + 1;
            campJeunesCountDisplay.textContent = `Image ${currentSlideIndex} sur ${totalCampJeunesSlides}`;
        });
        // Initialiser le compteur au chargement de la page pour le premier slide (index 0)
        campJeunesCountDisplay.textContent = `Image 1 sur ${totalCampJeunesSlides}`;
    }

    // Carrousel 'Séminaire JC'
    const seminaireJcCarousel = document.getElementById('seminaireJcCarousel');
    const seminaireJcCountDisplay = document.getElementById('seminaireJcCompteur');
    const totalSeminaireJcSlides = 16; // Référence au nombre de slides réel

    if (seminaireJcCarousel && seminaireJcCountDisplay) {
        seminaireJcCarousel.addEventListener('slid.bs.carousel', function (event) {
            const currentSlideIndex = event.to + 1;
            seminaireJcCountDisplay.textContent = `Image ${currentSlideIndex} sur ${totalSeminaireJcSlides}`;
        });
        // Initialiser le compteur au chargement de la page pour le premier slide (index 0)
        seminaireJcCountDisplay.textContent = `Image 1 sur ${totalSeminaireJcSlides}`;
    }

    // --- 3. Initialisation des fonctionnalités et chargement des données ---

    // Carrousel Automatique (Déplacé ici pour être sûr que le DOM est prêt)
    setupAutoCarousel();

    // Gestion Offcanvas (Correction du défilement)
    setupOffcanvasScroll();

    // Chargement des données via API
    fetchJeunesseEvents();
    fetchQuizQuestions();
    displayDailyQuote(); // Appel de la fonction pour afficher la pensée du jour

    // Vérification du contenu des affiches
    checkAffichesContent();
});