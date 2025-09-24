// Ce script gère le calendrier, le quiz, la pensée du jour et le carrousel de la page jeunesse.
// --- GESTION DES DONNÉES ET ÉTATS LOCAUX ---
let currentDate = new Date();
let currentQuestionIndex = 0;

// Événements du calendrier (données statiques)
let events = [
    {
        "title": "Rencontre de Jeunes",
        "description": "Thème : la vie en Christ.",
        "date": "2025-09-27T10:00:00Z",
        "link": "https://eglise-test.com/jeunes"
    },
    {
        "title": "Culte des familles",
        "description": "Un service spécial pour les jeunes et les moins jeunes.",
        "date": "2025-10-12T11:00:00Z",
        "link": "https://eglise-test.com/familles"
    },
    {
        "title": "Journée de prière",
        "description": "Un moment de communion et d'intercession.",
        "date": "2025-10-25T19:00:00Z",
        "link": "https://eglise-test.com/priere"
    }
];

let quizQuestions = []; // Sera rempli par les données de l'API

// Pensées du jour (ces données peuvent rester statiques)
const quotes = [
    "La foi est une ferme assurance des choses qu'on espère, une démonstration de celles qu'on ne voit pas.",
    "Tout ce que vous demandez avec foi par la prière, vous le recevrez.",
    "Car là où deux ou trois sont assemblés en mon nom, je suis au milieu d'eux.",
    "L'Éternel est mon berger : je ne manquerai de rien.",
    "Ne vous inquiétez de rien; mais en toute chose faites connaître vos besoins à Dieu."
];

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

    for (let i = 0; i < firstDayOfMonth; i++) {
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
 * @param {Object} event L'objet événement à afficher.
 */
const showEventModal = (event) => {
    const modal = document.getElementById('eventModal');
    document.getElementById('modal-title').textContent = event.title;
    document.getElementById('modal-date').textContent = new Date(event.date).toLocaleDateString('fr-fr', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById('modal-description').textContent = event.description;
    const modalLink = document.getElementById('modal-link');
    if (event.link && event.link !== '#') {
        modalLink.href = event.link;
        modalLink.style.display = 'inline-block';
    } else {
        modalLink.style.display = 'none';
    }
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

// --- GESTION DU QUIZ ---

/**
 * Démarre le quiz avec les questions fournies.
 * @param {Array} questions Le tableau de questions du quiz.
 */
const startQuiz = (questions) => {
    if (questions && questions.length > 0) {
        quizQuestions = questions;
        document.getElementById('next-question-btn').style.display = 'none';
        showQuestion();
    } else {
        console.error("Les questions du quiz n'ont pas pu être chargées.");
    }
};

/**
 * Affiche la question courante et ses options.
 */
const showQuestion = () => {
    const questionContainer = document.getElementById('quiz-question');
    const optionsContainer = document.getElementById('quiz-options');
    const resultContainer = document.getElementById('quiz-result');

    const currentQuestion = quizQuestions[currentQuestionIndex];
    if (!currentQuestion) {
        console.error("Erreur: Question non trouvée à l'index " + currentQuestionIndex);
        return;
    }

    questionContainer.textContent = currentQuestion.question;
    optionsContainer.innerHTML = '';
    resultContainer.textContent = '';

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
        resultContainer.textContent = "Correct ! 🎉";
        resultContainer.style.color = 'green';
    } else {
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
};

/**
 * Passe à la question suivante du quiz.
 */
const nextQuestion = () => {
    currentQuestionIndex = (currentQuestionIndex + 1) % quizQuestions.length;
    showQuestion();
};

// --- GESTION DU CARROUSEL ---

const sliderImages = document.querySelectorAll('.slider-image');
let currentSlide = 0;

const nextSlide = () => {
    if (sliderImages.length === 0) return;
    sliderImages[currentSlide].classList.remove('active');
    currentSlide = (currentSlide + 1) % sliderImages.length;
    sliderImages[currentSlide].classList.add('active');
};

setInterval(nextSlide, 5000);

// --- GESTION DE LA PENSÉE DU JOUR ---

/**
 * Affiche une pensée du jour différente.
 */
const displayDailyQuote = () => {
    const today = new Date().toISOString().slice(0, 10);
    const quoteIndex = today.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % quotes.length;
    document.getElementById('daily-quote').textContent = quotes[quoteIndex];
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

    // Charge toutes les données et rend l'interface
    renderCalendar();
    fetchQuizQuestions(); // Cet appel charge les questions depuis l'API
    displayDailyQuote();
});