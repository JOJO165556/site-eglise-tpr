// Données pour le calendrier
const events = {
    "2025-08-31": {
        title: "Séminaire jeunesse",
        description: "Thème : Le jeune chrétien face aux défis du 21ᵉ siècle. Lieu : Hôtel Muget de 08h00 à 18h00.",
        link: "https://www.youtube.com/@emissionstaparev3801"
    },
    "2025-10-15": {
        title: "Rencontre de Prière",
        description: "Rejoignez-nous pour un moment de prière et d'adoration intense.",
        link: "#"
    },
    "2025-10-25": {
        title: "Service de la jeunesse",
        description: "Le culte sera entièrement animé par les jeunes, venez nombreux !",
        link: "#"
    }
};

// Données pour la pensée du jour
const dailyQuotes = [
    "Un jeune passionné par Christ n'est pas seulement l'avenir de l'Église, il est son présent.",
    "Ta jeunesse est un cadeau de Dieu. Utilise-la pour le servir avec force et créativité !",
    "L'enthousiasme de la jeunesse, la sagesse de la Parole : une combinaison invincible.",
    "Ne te laisse pas décourager par le monde, mais sois une lumière qui brille pour Christ.",
    "Le plus grand défi de la jeunesse chrétienne n'est pas de rester pur, mais de rester pertinent.",
    "La foi ne te protège pas des tempêtes, elle t'apprend à danser sous la pluie.",
    "Sois la personne que Dieu t'a appelé à être, pas celle que le monde veut que tu sois.",
    "La vraie force vient de celui qui t'a créé. Appuie-toi sur lui chaque jour.",
    "Ta vie est une histoire. Fais en sorte que chaque chapitre glorifie Dieu.",
    "Le but de la jeunesse est de se trouver, mais le but du jeune chrétien est de se perdre en Christ."
];

let quizQuestions = [];
let currentQuestionIndex = 0;
const quizContainer = document.getElementById("quiz-container");
const quizQuestionEl = document.getElementById("quiz-question");
const quizOptionsEl = document.getElementById("quiz-options");
const quizResultEl = document.getElementById("quiz-result");
const nextQuestionBtn = document.getElementById("next-question-btn");

// Fonction pour récupérer les questions du quiz depuis un fichier JSON
async function fetchQuizQuestions() {
    try {
        const response = await fetch('quizzes.json');
        if (!response.ok) {
            throw new Error(`Erreur HTTP! Statut: ${response.status}`);
        }
        quizQuestions = await response.json();
        loadQuizQuestion();
    } catch (error) {
        console.error("Erreur de chargement des questions:", error);
        quizContainer.innerHTML = '<h5>Impossible de charger le quiz. Veuillez réessayer plus tard.</h5>';
    }
}

// Fonction pour afficher une question
function loadQuizQuestion() {
    if (quizQuestions.length === 0) {
        quizContainer.innerHTML = '<h5>Pas de questions disponibles pour le moment.</h5>';
        return;
    }
    const currentQuestion = quizQuestions[currentQuestionIndex];
    quizQuestionEl.textContent = currentQuestion.question;
    quizOptionsEl.innerHTML = "";
    quizResultEl.textContent = "";
    nextQuestionBtn.style.display = 'none';

    currentQuestion.options.forEach(option => {
        const button = document.createElement("button");
        button.textContent = option;
        button.classList.add("btn", "btn-secondary", "my-2");
        button.addEventListener("click", () => checkAnswer(option, currentQuestion.answer));
        quizOptionsEl.appendChild(button);
    });
}

// Fonction pour vérifier la réponse
function checkAnswer(selectedOption, correctAnswer) {
    const buttons = quizOptionsEl.querySelectorAll("button");
    buttons.forEach(button => {
        button.disabled = true;
        if (button.textContent === correctAnswer) {
            button.classList.add("btn-success");
            button.classList.remove("btn-secondary");
        } else if (button.textContent === selectedOption) {
            button.classList.add("btn-danger");
            button.classList.remove("btn-secondary");
        }
    });

    if (selectedOption === correctAnswer) {
        quizResultEl.textContent = "Bonne réponse ! 🎉";
        quizResultEl.style.color = 'green';
    } else {
        quizResultEl.textContent = "Mauvaise réponse. Essayez encore ! 🤔";
        quizResultEl.style.color = 'red';
    }
    nextQuestionBtn.style.display = 'block';
}

// Gestion du bouton "Question suivante"
nextQuestionBtn.addEventListener('click', () => {
    currentQuestionIndex++;
    if (currentQuestionIndex < quizQuestions.length) {
        loadQuizQuestion();
    } else {
        quizContainer.innerHTML = '<h5>Félicitations, vous avez terminé le quiz ! 🎉</h5>';
        nextQuestionBtn.style.display = 'none';
    }
});

let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();

function updateMonthLabel() {
    const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
    document.getElementById("month-label").textContent = `${monthNames[currentMonth]} ${currentYear}`;
}

function changeMonth(offset) {
    currentMonth += offset;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    } else if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    generateCalendar(currentYear, currentMonth);
    updateMonthLabel();
}

function generateCalendar(year, month) {
    const calendar = document.getElementById("calendar");
    calendar.innerHTML = "";

    const date = new Date(year, month, 1);
    const today = new Date();
    const firstDay = date.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const daysOfWeek = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
    daysOfWeek.forEach(day => {
        const dayHeader = document.createElement("div");
        dayHeader.classList.add("calendar-day", "day-header");
        dayHeader.textContent = day;
        calendar.appendChild(dayHeader);
    });

    for (let i = 0; i < firstDay; i++) {
        const emptyDiv = document.createElement("div");
        calendar.appendChild(emptyDiv);
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const dayDate = new Date(year, month, i);
        const dayKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const dayDiv = document.createElement("div");
        dayDiv.classList.add("calendar-day");
        dayDiv.textContent = i;

        if (events[dayKey]) {
            if (dayDate < today) {
                dayDiv.classList.add("past-event");
            } else {
                dayDiv.classList.add("future-event");
            }
            dayDiv.classList.add("event-with-details");
            dayDiv.addEventListener("click", () => showEventModal(dayKey));
        }

        calendar.appendChild(dayDiv);
    }
}

function showEventModal(dateKey) {
    const event = events[dateKey];
    if (!event) return;

    const modal = document.getElementById("eventModal");
    document.getElementById("modal-title").textContent = event.title;
    document.getElementById("modal-date").textContent = new Date(dateKey).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById("modal-description").textContent = event.description;

    const modalLink = document.getElementById("modal-link");
    if (event.link && event.link !== '#') {
        modalLink.href = event.link;
        modalLink.style.display = 'inline-block';
    } else {
        modalLink.style.display = 'none';
    }

    modal.style.display = "block";
}

// Fonction pour gérer le diaporama d'images
function startSlider() {
    const images = document.querySelectorAll('.slider-image');
    let currentIndex = 0;

    setInterval(() => {
        images[currentIndex].classList.remove('active');
        currentIndex = (currentIndex + 1) % images.length;
        images[currentIndex].classList.add('active');
    }, 5000);
}

// Fonction pour afficher la pensée du jour
function showDailyQuote() {
    const today = new Date();
    const start = new Date(today.getFullYear(), 0, 0);
    const diff = today - start;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);

    const quoteIndex = dayOfYear % dailyQuotes.length;
    document.getElementById('daily-quote').textContent = dailyQuotes[quoteIndex];
}

// Exécuter le code après le chargement complet de la page
document.addEventListener('DOMContentLoaded', () => {
    generateCalendar(currentYear, currentMonth);
    updateMonthLabel();
    fetchQuizQuestions();
    startSlider();
    showDailyQuote();

    const modal = document.getElementById("eventModal");
    const closeBtn = document.querySelector(".close-btn");

    closeBtn.addEventListener('click', () => {
        modal.style.display = "none";
    });

    window.addEventListener('click', (event) => {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    });
});