// Ce script gère le calendrier, le quiz, la pensée du jour et le carrousel de la page jeunesse.

// --- GESTION DES SONS ---

/**
 * Joue un son prédéfini en utilisant la balise audio HTML correspondante.
 * @param {string} type Le type de son à jouer ('correct', 'incorrect').
 */
const playSound = (type) => {
    // Le chemin dans le HTML utilise 'correct-sound' et 'incorrect-sound'
    let elementId = '';
    if (type === 'correct') {
        elementId = 'correct-sound';
    } else if (type === 'incorrect') {
        elementId = 'incorrect-sound';
    }

    const targetAudio = document.getElementById(elementId);
    
    if (targetAudio) {
        // Important: réinitialiser le son à zéro avant de le jouer pour qu'il se rejoue à chaque appel
        targetAudio.currentTime = 0; 
        targetAudio.volume = 0.5; // Ajuster le volume
        targetAudio.play().catch(e => {
            // Gère les erreurs de lecture automatique du navigateur
            console.warn(`Avertissement: Impossible de jouer le son ${type}.`, e);
        });
    }
};

// --- GESTION DES DONNÉES ET ÉTATS LOCAUX ---
let currentDate = new Date();
let currentQuestionIndex = 0;
let score = 0; // Suivi du score
const MAX_QUESTIONS = 10; // Limite du quiz à 10 questions

// Événements du calendrier (à récupérer depuis l'API)
let events = [];

let quizQuestions = []; // Sera rempli par les données de l'API

// Le tableau 'quotes' a été supprimé car les données viennent maintenant de l'API.

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

        // Mélange les questions pour un ordre aléatoire
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
        // Appelle la route que nous avons définie précédemment
        const response = await fetch('/api/jeunesse-events');

        if (!response.ok) {
            throw new Error('Erreur de chargement des événements');
        }

        const data = await response.json();

        // Stocke les données dans la variable globale
        events = data;

        // Re-rend le calendrier avec les nouvelles données
        renderCalendar();

    } catch (error) {
        console.error('Erreur lors du chargement des événements jeunesse:', error);
        // On pourrait afficher un message d'erreur dans le calendrier ici.
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

    const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    dayNames.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-header';
        dayHeader.textContent = day;
        calendarElement.appendChild(dayHeader);
    });

    // Correction de l'offset du premier jour (0=dimanche, on veut qu'il soit le dernier jour de la semaine)
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
        // Correction de l'heure pour la comparaison de date
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

        // Formate la date pour la comparaison (YYYY-MM-DD)
        const formattedDate = `${fullDate.getFullYear()}-${(fullDate.getMonth() + 1).toString().padStart(2, '0')}-${fullDate.getDate().toString().padStart(2, '0')}`;
        // Filtre les événements pour le jour courant (en ignorant l'heure)
        const dayEvents = events.filter(event => new Date(event.date).toISOString().slice(0, 10) === formattedDate);

        if (dayEvents.length > 0) {
            // Utiliser fullDate < today est correct car today est réglé à 00:00:00
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
            
            // Ajoute l'écouteur d'événement
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
    
    // Utilisation des noms de colonnes en ANGLAIS (title, link)
    document.getElementById('modal-title').textContent = event.title; 
    
    // Affichage de la date et de l'heure (toLocaleTimeString ajoute l'heure)
    const eventDate = new Date(event.date);
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    document.getElementById('modal-date').textContent = eventDate.toLocaleDateString('fr-fr', dateOptions);
    
    document.getElementById('modal-description').textContent = event.description;
    
    const modalLink = document.getElementById('modal-link');
    
    // URL non définie que le middleware 404 du serveur doit gérer
    const default404 = '/erreur-evenement-404'; 
    
    // Nettoie la valeur du lien
    const linkValue = event.link ? String(event.link).trim() : '';

    // VÉRIFICATION RENFORCÉE : Intercepte les liens qui sont vides (""), seulement "#", ou null
    if (!linkValue || linkValue === '#') {
        // Le lien n'est pas valide ou est le marqueur de redirection 404
        modalLink.href = default404; 
    } else {
        // Le lien est valide (contient une URL utilisable)
        modalLink.href = event.link;
    }
    
    modalLink.style.display = 'inline-block'; 
    modal.style.display = 'block';
};

/**
 * Cache la fenêtre modale de l'événement.
 */
const hideEventModal = () => {
    const modal = document.getElementById('eventModal');
    modal.style.display = 'none';
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
 * Démarre le quiz avec les questions fournies.
 * @param {Array} questions Le tableau de questions du quiz.
 */
const startQuiz = (questions) => {
    if (questions && questions.length > 0) {
        // Limite le quiz à MAX_QUESTIONS (10), même si l'API en renvoie plus
        quizQuestions = questions.slice(0, MAX_QUESTIONS); 
        // Réinitialisation de l'état
        currentQuestionIndex = 0;
        score = 0;
        document.getElementById('next-question-btn').style.display = 'none';
        showQuestion();
    } else {
        console.error("Les questions du quiz n'ont pas pu être chargées.");
        document.getElementById('quiz-container').innerHTML = "<p>Désolé, le quiz n'a pas pu être chargé.</p>";
    }
};

/**
 * Affiche la question courante et met à jour la progression et le score.
 */
const showQuestion = () => {
    const questionContainer = document.getElementById('quiz-question');
    const optionsContainer = document.getElementById('quiz-options');
    const resultContainer = document.getElementById('quiz-result');
    
    const scoreElement = document.getElementById('quiz-score'); 
    const progressElement = document.getElementById('quiz-progress');

    const currentQuestion = quizQuestions[currentQuestionIndex];
    if (!currentQuestion) {
        // Si l'index est hors limite (le quiz est terminé)
        endQuiz(); 
        return;
    }

    // Mise à jour de la barre de progression et du score
    scoreElement.textContent = `Score: ${score}`;
    
    const currentProgress = currentQuestionIndex + 1;
    const progressPercent = (currentProgress / MAX_QUESTIONS) * 100;
    
    if (progressElement) {
        progressElement.style.width = `${progressPercent}%`;
        progressElement.setAttribute('aria-valuenow', currentProgress);
        progressElement.textContent = `${currentProgress} / ${MAX_QUESTIONS}`;
    }

    questionContainer.textContent = currentQuestion.question;
    optionsContainer.innerHTML = '';
    resultContainer.textContent = '';

    currentQuestion.options.forEach(option => {
        const button = document.createElement('button');
        button.className = 'btn btn-outline-secondary';
        button.textContent = option;
        // Le clic sur l'option va directement à checkAnswer() qui jouera le son
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
        playSound('correct'); // Joue l'audio HTML #correct-sound
        resultContainer.textContent = "Correct ! 🎉";
        resultContainer.style.color = 'green';
        score++; // Incrémenter le score
    } else {
        playSound('incorrect'); // Joue l'audio HTML #incorrect-sound
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
    
    // Mettre à jour le score visible immédiatement
    document.getElementById('quiz-score').textContent = `Score: ${score}`; 
};

/**
 * Passe à la question suivante du quiz.
 */
const nextQuestion = () => {
    currentQuestionIndex++;
    
    // Vérifie si le quiz est terminé (après 10 questions)
    if (currentQuestionIndex >= MAX_QUESTIONS) {
        endQuiz(); // Appel de la fonction de fin
    } else {
        showQuestion();
        document.getElementById('next-question-btn').style.display = 'none';
    }
};

/**
 * Affiche le résultat final du quiz.
 */
const endQuiz = () => {
    const quizContainer = document.getElementById('quiz-container');
    const finalMessage = `Quiz terminé ! Votre score final est de ${score} sur ${MAX_QUESTIONS} ! ✨`;
    
    if (quizContainer) {
        quizContainer.innerHTML = `
            <h3>Résultats du Quiz</h3>
            <p class="h4 text-center mt-4">${finalMessage}</p>
            <p class="text-center mt-3">Merci d'avoir participé !</p>
            <button class="btn btn-primary mt-3" onclick="window.location.reload()">Recommencer le Quiz</button>
        `;
    }
};

// --- GESTION DU CARROUSEL ---

// Assurez-vous que cette partie se trouve après la définition des images dans le HTML
const sliderImages = document.querySelectorAll('.slider-image');
let currentSlide = 0;

const nextSlide = () => {
    if (sliderImages.length === 0) return;
    sliderImages[currentSlide].classList.remove('active');
    currentSlide = (currentSlide + 1) % sliderImages.length;
    sliderImages[currentSlide].classList.add('active');
};

// Démarrage du carrousel après le chargement des images
if (sliderImages.length > 0) {
    setInterval(nextSlide, 5000);
}


// --- GESTION DE LA PENSÉE DU JOUR (MISE À JOUR PAR API) ---

/**
 * Récupère la pensée du jour depuis l'API et l'affiche, ainsi que sa référence.
 */
const displayDailyQuote = async () => {
    const quoteElement = document.getElementById('daily-quote');
    const quoteReferenceElement = document.getElementById('daily-quote-reference');
    const quoteIconLeft = document.querySelector('.fa-quote-left');
    const quoteIconRight = document.querySelector('.fa-quote-right');
    
    // 1. Initialisation (Efface les guillemets pour éviter le décalage initial)
    if (quoteElement) quoteElement.textContent = '';
    if (quoteReferenceElement) quoteReferenceElement.textContent = '';
    
    // Optionnel : Masquer les icônes si elles causent un décalage.
    if (quoteIconLeft) quoteIconLeft.style.visibility = 'hidden';
    if (quoteIconRight) quoteIconRight.style.visibility = 'hidden';

    try {
        // Nouvelle route API pour récupérer la pensée du jour.
        const response = await fetch('/api/daily-quote'); 
        
        if (!response.ok) {
            // Cela capture les 404 du backend ou les 500
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const data = await response.json(); 
        
        const quoteText = data.quote_text;
        const quoteReference = data.reference; 

        
        if (quoteElement && quoteText) {
            quoteElement.textContent = quoteText;
            // 2. Afficher les icônes après avoir rempli le texte
            if (quoteIconLeft) quoteIconLeft.style.visibility = 'visible';
            if (quoteIconRight) quoteIconRight.style.visibility = 'visible';
        }

        // Affichage de la référence seulement si elle existe
        if (quoteReferenceElement) {
            quoteReferenceElement.textContent = quoteReference ? `— ${quoteReference}` : '';
        }

    } catch (error) {
        console.error('Erreur lors du chargement de la pensée du jour:', error);
        
        // --- Texte de Secours en cas d'échec API ---
        
        // 3. Remplir avec le texte de secours
        if (quoteElement) {
            quoteElement.textContent = "Une pensée de secours : L'Éternel est bon ; il est un refuge au jour de la détresse ; il connaît ceux qui se confient en lui.";
        }
        
        if (quoteReferenceElement) {
            quoteReferenceElement.textContent = "Nahum 1:7";
        }
        
        // 4. Afficher les icônes pour le texte de secours
        if (quoteIconLeft) quoteIconLeft.style.visibility = 'visible';
        if (quoteIconRight) quoteIconRight.style.visibility = 'visible';
    }
};

/**
 * Vérifie si la section des affiches contient des images.
 */
const checkAffichesContent = () => {
    // Ciblez le nouveau container qui contient les images
    const affichesContainer = document.getElementById('affiches-content'); 
    const emptyMessage = document.getElementById('empty-message');
    
    // IMPORTANT : On vérifie si l'élément existe avant de continuer
    if (!affichesContainer || !emptyMessage) return;

    // Compte le nombre d'images ENFANT direct dans le conteneur
    const imageCount = affichesContainer.querySelectorAll('img').length;
    
    // Si la vérification donne 0 images...
    if (imageCount === 0) {
        // Masque le conteneur vide d'affiches
        affichesContainer.style.display = 'none';
        // Affiche le message d'attente
        emptyMessage.style.display = 'block';
    } else {
        // Sinon (s'il y a des images) : s'assurer qu'elles s'affichent
        affichesContainer.style.display = 'flex'; // ou 'block' selon le besoin du row
        emptyMessage.style.display = 'none';
    }
};

// --- INITIALISATION DE LA PAGE ---

document.addEventListener('DOMContentLoaded', () => {
    // Liez les boutons du quiz
    const nextQuestionBtn = document.getElementById('next-question-btn');
    if (nextQuestionBtn) {
        nextQuestionBtn.addEventListener('click', nextQuestion);
    }

    // Liez les événements de la modale
    const modal = document.getElementById('eventModal');
    const closeBtn = document.getElementsByClassName('close-btn')[0];
    if (closeBtn) {
        closeBtn.onclick = hideEventModal;
    }
    window.onclick = (event) => {
        if (event.target == modal) {
            hideEventModal();
        }
    }; 

    // Appel à la fonction de vérification des affiches
    checkAffichesContent();

    // Charge toutes les données et rend l'interface
    fetchJeunesseEvents(); // Charge les événements et appelle renderCalendar
    fetchQuizQuestions(); // Charge les questions et démarre le quiz
    displayDailyQuote(); // Charge la pensée du jour via API
});