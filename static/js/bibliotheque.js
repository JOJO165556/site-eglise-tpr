// /js/bibliotheque.js

// Fonction pour récupérer les brochures (cette partie ne change pas)
async function fetchBrochures() {
    const url = '/api/brochures';
    try {
        const response = await fetch(url);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erreur de chargement des brochures');
        }
        return response.json();
    } catch (error) {
        console.error("Erreur de l'API :", error);
        throw error;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // --- Logique pour la LECTURE DE LA BIBLE (partie front-end) ---
    // SÉLECTEURS POUR LES ÉLÉMENTS HTML
    const bookDropdownButton = document.getElementById("bookDropdown");
    const chapterDropdownButton = document.getElementById("chapterDropdown");
    const verseDropdownButton = document.getElementById("verseDropdown");
    const bookList = document.getElementById("bookList");
    const chapterList = document.getElementById("chapterList");
    const verseList = document.getElementById("verseList");
    
    const verseResult = document.getElementById("verseResult");
    const verseTextDiv = document.getElementById("verseText");
    const bibleErrorMessageDiv = document.getElementById("bibleErrorMessage");
    let bibleData = {}; 

    // Charge le fichier JSON de la Bible et le transforme
    async function loadBibleData() {
        try {
            const response = await fetch('/data/segond_1910.json'); 
            const data = await response.json();
            
            bibleData = {}; 
            data.verses.forEach(verse => {
                const bookName = verse.book_name;
                const chapterNumber = verse.chapter.toString();
                const verseNumber = verse.verse.toString();

                if (!bibleData[bookName]) {
                    bibleData[bookName] = {};
                }
                if (!bibleData[bookName][chapterNumber]) {
                    bibleData[bookName][chapterNumber] = {};
                }
                bibleData[bookName][chapterNumber][verseNumber] = verse.text;
            });

            populateBooks();
        } catch (error) {
            bibleErrorMessageDiv.textContent = "Erreur de chargement de la Bible.";
            console.error(error);
        }
    }
    
    function populateBooks() {
        bookList.innerHTML = "";
        Object.keys(bibleData).forEach(bookName => {
            const li = document.createElement("li");
            const a = document.createElement("a");
            a.className = "dropdown-item";
            a.href = "#";
            a.textContent = bookName;
            a.setAttribute('data-value', bookName);
            li.appendChild(a);
            bookList.appendChild(li);
        });
    }

    // GESTIONNAIRE D'ÉVÉNEMENTS POUR LA LISTE DES LIVRES
    bookList.addEventListener("click", (event) => {
        event.preventDefault();
        const selectedBookName = event.target.getAttribute('data-value');
        if (!selectedBookName) return;

        bookDropdownButton.textContent = selectedBookName;
        chapterDropdownButton.disabled = false;
        verseDropdownButton.disabled = true;
        verseResult.classList.add('d-none');
        
        populateChapters(selectedBookName);
    });

    function populateChapters(bookName) {
        chapterList.innerHTML = "";
        const chapters = Object.keys(bibleData[bookName]);
        chapters.forEach(chapterNumber => {
            const li = document.createElement("li");
            const a = document.createElement("a");
            a.className = "dropdown-item";
            a.href = "#";
            a.textContent = chapterNumber;
            a.setAttribute('data-value', chapterNumber);
            li.appendChild(a);
            chapterList.appendChild(li);
        });
    }

    // GESTIONNAIRE D'ÉVÉNEMENTS POUR LA LISTE DES CHAPITRES
    chapterList.addEventListener("click", (event) => {
        event.preventDefault();
        const selectedChapterNumber = event.target.getAttribute('data-value');
        const selectedBookName = bookDropdownButton.textContent;
        if (!selectedChapterNumber) return;

        chapterDropdownButton.textContent = `Chapitre ${selectedChapterNumber}`;
        verseDropdownButton.disabled = false;
        
        verseList.innerHTML = "";
        const verses = bibleData[selectedBookName][selectedChapterNumber];
        verseTextDiv.innerHTML = "";
        
        Object.keys(verses).forEach(verseNumber => {
            const verseText = verses[verseNumber];
            const verseElement = document.createElement("p");
            verseElement.id = `verse-${verseNumber}`;
            verseElement.innerHTML = `<strong>${verseNumber}</strong> ${verseText}`;
            verseTextDiv.appendChild(verseElement);

            const li = document.createElement("li");
            const a = document.createElement("a");
            a.className = "dropdown-item";
            a.href = "#";
            a.textContent = verseNumber;
            a.setAttribute('data-value', verseNumber);
            li.appendChild(a);
            verseList.appendChild(li);
        });
        
        verseResult.classList.remove('d-none');
        bibleErrorMessageDiv.textContent = "";
    });

    // GESTIONNAIRE D'ÉVÉNEMENTS POUR LA LISTE DES VERSETS
    verseList.addEventListener("click", (event) => {
        event.preventDefault();
        const selectedVerseNumber = event.target.getAttribute('data-value');
        if (!selectedVerseNumber) return;
        
        verseDropdownButton.textContent = `Verset ${selectedVerseNumber}`;
        
        setTimeout(() => {
            const targetVerse = document.getElementById(`verse-${selectedVerseNumber}`);
            if (targetVerse) {
                document.querySelectorAll('#verseText p.highlight').forEach(el => el.classList.remove('highlight'));
                
                targetVerse.classList.add('highlight');
                
                targetVerse.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 50); // Petit d\u00e9lai pour laisser le temps au navigateur de charger les \u00e9l\u00e9ments
    });


    // --- Logique pour l'AFFICHAGE des BROCHURES (cette partie ne change pas) ---
    const brochuresList = document.getElementById("brochuresList");
    const brochureErrorMessageDiv = document.getElementById("brochureErrorMessage");
    const brochuresTab = document.getElementById("brochures-tab");

    brochuresTab.addEventListener('shown.bs.tab', async () => {
        try {
            const brochures = await fetchBrochures();
            renderBrochures(brochures);
        } catch (error) {
            brochureErrorMessageDiv.textContent = "Impossible de charger les brochures.";
            console.error(error);
        }
    });

    function renderBrochures(brochures) {
        brochuresList.innerHTML = "";
        if (brochures.length === 0) {
            brochuresList.innerHTML = '<p class="text-center">Aucune brochure disponible pour le moment.</p>';
            return;
        }
        brochures.forEach(brochure => {
            const card = document.createElement("div");
            card.className = "col-md-4 mb-4";
            card.innerHTML = `
                <div class="card h-100">
                    <div class="card-body">
                        <h5 class="card-title">${brochure.title}</h5>
                        <h6 class="card-subtitle mb-2 text-muted">${brochure.author}</h6>
                        <a href="${brochure.link}" class="btn btn-primary" target="_blank">
                            <i class="bi bi-box-arrow-up-right"></i> Lire
                        </a>
                    </div>
                </div>
            `;
            brochuresList.appendChild(card);
        });
    }

    // Lancement initial
    loadBibleData();
});