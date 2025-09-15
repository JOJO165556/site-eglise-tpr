// Données de l'agenda
const events = [
    {
        date: '2025-09-07',
        title: 'Culte dominical',
        description: 'Service de louange et prédication.',
        link: '#',
    },
    {
        date: '2025-09-14',
        title: 'Culte dominical',
        description: 'Service de louange et prédication.',
        link: '#',
    },
    {
        date: '2025-09-28',
        title: 'Réunion mensuelle de la jeunesse',
        description: 'Le dernier dimanche du mois, nous nous retrouvons pour prier et partager.',
        link: '#',
    },
    {
        date: '2025-10-05',
        title: 'Culte dominical',
        description: 'Service de louange et prédication.',
        link: '#',
    },
    {
        date: '2025-10-26',
        title: 'Réunion mensuelle de la jeunesse',
        description: 'Le dernier dimanche du mois, nous nous retrouvons pour prier et partager.',
        link: '#',
    },
    {
        date: '2025-11-02',
        title: 'Culte dominical',
        description: 'Service de louange et prédication.',
        link: '#',
    },
    {
        date: '2025-11-30',
        title: 'Réunion mensuelle de la jeunesse',
        description: 'Le dernier dimanche du mois, nous nous retrouvons pour prier et partager.',
        link: '#',
    },
];

// Pensées du jour
const quotes = [
    "La foi est une ferme assurance des choses qu'on espère, une démonstration de celles qu'on ne voit pas.",
    "Tout ce que vous demandez avec foi par la prière, vous le recevrez.",
    "Car là où deux ou trois sont assemblés en mon nom, je suis au milieu d'eux.",
    "L'Éternel est mon berger : je ne manquerai de rien.",
    "Ne vous inquiétez de rien; mais en toute chose faites connaître vos besoins à Dieu."
];

let currentDate = new Date();
let currentQuestionIndex = 0;
let quizQuestions = [];

// Fonction pour le calendrier
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

        const isToday = fullDate.getTime() === today.getTime();
        if (isToday) {
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
        const dayEvents = events.filter(event => event.date === formattedDate);

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

const hideEventModal = () => {
    const modal = document.getElementById('eventModal');
    modal.style.display = 'none';
};

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

// Fonctions pour changer de mois
const changeMonth = (direction) => {
    currentDate.setMonth(currentDate.getMonth() + direction);
    renderCalendar();
};

window.changeMonth = changeMonth;

// Fonction pour le slider d'images
const sliderImages = document.querySelectorAll('.slider-image');
let currentSlide = 0;

const nextSlide = () => {
    sliderImages[currentSlide].classList.remove('active');
    currentSlide = (currentSlide + 1) % sliderImages.length;
    sliderImages[currentSlide].classList.add('active');
};

setInterval(nextSlide, 5000);

// Fonction pour le quiz
const startQuiz = (questions) => {
    if (questions && questions.length > 0) {
        quizQuestions = questions;
        document.getElementById('next-question-btn').style.display = 'none';
        showQuestion();
    } else {
        console.error("Les questions du quiz n'ont pas pu être chargées.");
    }
};

const showQuestion = () => {
    const questionContainer = document.getElementById('quiz-question');
    const optionsContainer = document.getElementById('quiz-options');
    const resultContainer = document.getElementById('quiz-result');

    questionContainer.textContent = quizQuestions[currentQuestionIndex].question;
    optionsContainer.innerHTML = '';
    resultContainer.textContent = '';

    quizQuestions[currentQuestionIndex].options.forEach(option => {
        const button = document.createElement('button');
        button.className = 'btn btn-outline-secondary';
        button.textContent = option;
        button.onclick = () => checkAnswer(option);
        optionsContainer.appendChild(button);
    });
};

const checkAnswer = (selectedOption) => {
    const options = document.querySelectorAll('#quiz-options button');
    const resultContainer = document.getElementById('quiz-result');
    const nextButton = document.getElementById('next-question-btn');
    const correctAnswer = quizQuestions[currentQuestionIndex].answer;

    if (selectedOption === correctAnswer) {
        resultContainer.textContent = "Correct ! 🎉";
        resultContainer.style.color = 'green';
    } else {
        resultContainer.textContent = `Incorrect. La bonne réponse est : ${correctAnswer}`;
        resultContainer.style.color = 'red';
    }

    options.forEach(button => {
        button.disabled = true;
        if (button.textContent === correctAnswer) {
            button.classList.add('btn-success');
        }
    });

    nextButton.style.display = 'block';
};

const nextQuestion = () => {
    currentQuestionIndex = (currentQuestionIndex + 1) % quizQuestions.length;
    showQuestion();
};

// Fonction pour la pensée du jour
const displayDailyQuote = () => {
    const today = new Date().toISOString().slice(0, 10);
    const quoteIndex = today.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % quotes.length;
    document.getElementById('daily-quote').textContent = quotes[quoteIndex];
};

// Initialisation du quiz et des événements
document.addEventListener('DOMContentLoaded', () => {
    renderCalendar();
    displayDailyQuote();

    fetch('quizzes.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            startQuiz(data);
            const nextQuestionBtn = document.getElementById('next-question-btn');
            if (nextQuestionBtn) {
                 nextQuestionBtn.addEventListener('click', nextQuestion);
            }
        })
        .catch(error => {
            console.error('Il y a eu un problème avec le chargement du quiz:', error);
            const quizContainer = document.getElementById('quiz-container');
            if (quizContainer) {
                quizContainer.innerHTML = "<p>Désolé, le quiz n'a pas pu être chargé.</p>";
            }
        });
});