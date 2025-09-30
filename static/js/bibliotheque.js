// FONCTION GLOBALE : RÉCUPÉRATION DES BROCHURES AVEC GESTION D'ERREUR DÉTAILLÉE

/**
 * Récupère les brochures depuis l'API. Retourne un tableau de brochures en cas de succès,
 * ou un objet { error: string, message: string } en cas d'échec (API ou réseau).
 */
async function fetchBrochures() {
    const url = '/api/brochures';
    try {
        const response = await fetch(url);
        
        // Si la réponse n'est PAS OK (404, 500, etc.), nous lisons le JSON pour le message
        if (!response.ok) {
            const errorData = await response.json();
            // Retourne l'objet d'erreur pour un affichage détaillé dans le DOM
            return { error: errorData.error, message: errorData.message };
        }
        
        // Si la réponse est OK (200), nous retournons le tableau des brochures
        return response.json();
    } catch (error) {
        // Gère les erreurs réseau (pas de connexion, URL incorrecte)
        console.error("Erreur de l'API ou réseau :", error);
        return { error: 'Erreur Réseau', message: 'Impossible de contacter le serveur. Veuillez vérifier votre connexion.' };
    }
}

// LOGIQUE PRINCIPALE DÈS QUE LE DOM EST CHARGÉ

document.addEventListener("DOMContentLoaded", () => {
    
    // PARTIE LECTURE DE LA BIBLE 
    
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
                // Supprime la mise en évidence des anciens versets
                document.querySelectorAll('#verseText p.highlight').forEach(el => el.classList.remove('highlight'));
                
                // Ajoute la mise en évidence au nouveau verset
                targetVerse.classList.add('highlight');
                
                // Défilement doux vers le verset
                targetVerse.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 50); 
    });

    // PARTIE AFFICHAGE DES BROCHURES 
    
    const brochuresList = document.getElementById("brochuresList");
    const brochureErrorMessageDiv = document.getElementById("brochureErrorMessage");
    const brochuresTab = document.getElementById("brochures-tab");

    /**
     * Fonction pour générer les cartes de brochure dans le DOM.
     */
    function renderBrochures(brochures) {
        brochuresList.innerHTML = "";
        if (!brochures || brochures.length === 0) {
            brochuresList.innerHTML = '<p class="text-center text-muted">Aucune brochure disponible pour le moment.</p>';
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

    /**
     * Écoute l'événement 'shown.bs.tab' (typiquement Bootstrap) pour charger les données.
     */
    if (brochuresTab) {
        brochuresTab.addEventListener('shown.bs.tab', async () => {
            // Nettoyer et afficher le chargement
            brochuresList.innerHTML = `<p class="text-center text-muted">Chargement des brochures...</p>`;
            brochureErrorMessageDiv.textContent = "";

            const result = await fetchBrochures();

            if (result.error) {
                // Afficher le message d'erreur détaillé renvoyé par fetchBrochures
                brochuresList.innerHTML = ""; // Vider le message de chargement
                brochureErrorMessageDiv.innerHTML = `<div class="alert alert-warning" role="alert">
                    <strong>${result.error} :</strong> ${result.message}
                </div>`;
            } else {
                // Afficher les brochures (le résultat est un tableau)
                renderBrochures(result);
            }
        });
    }

    // LANCEMENT INITIAL
    loadBibleData();
});