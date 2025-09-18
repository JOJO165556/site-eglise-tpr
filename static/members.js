// Déclaration des variables globales
let membersData = [];
let currentSortColumn = 'name';
let currentSortDirection = 'asc';

// Fonction pour afficher les membres dans le tableau
function renderMembers(members) {
    const tableBody = document.querySelector('#membersTable tbody');
    tableBody.innerHTML = '';
    
    if (members.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" class="text-center">Aucun membre trouvé.</td></tr>`;
        return;
    }

    members.forEach(member => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${member.name || ''}</td>
            <td>${member.first_names || ''}</td>
            <td>${member.statut || 'Non renseigné'}</td>
            <td>${member.age_group || 'Non renseigné'}</td>
            <td>${member.neighborhood || 'Non renseigné'}</td>
            <td>${member.profession || 'Non renseigné'}</td>
            <td>${member.email || 'Non renseigné'}</td> <td>${member.phone || 'Non renseigné'}</td> `;
        tableBody.appendChild(row);
    });
}

// Fonction pour trier et afficher les membres
function loadAndSortMembers() {
    const sortedMembers = [...membersData].sort((a, b) => {
        const valA = a[currentSortColumn];
        const valB = b[currentSortColumn];
        
        if (valA < valB) return currentSortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return currentSortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    renderMembers(sortedMembers);
}

// Fonction pour charger les membres depuis l'API
async function fetchMembers() {
    try {
        const tableBody = document.querySelector('#membersTable tbody');
        tableBody.innerHTML = `<tr><td colspan="8" class="text-center">Chargement des membres...</td></tr>`;
        
        const response = await fetch('/api/members');
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        membersData = await response.json();
        loadAndSortMembers();
    } catch (error) {
        console.error("Erreur lors de la récupération des membres:", error);
        const tableBody = document.querySelector('#membersTable tbody');
        tableBody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Erreur de connexion.</td></tr>`;
    }
}

// Attente du chargement complet du DOM
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Le formulaire a été soumis !");
    // Initialisation des plugins
    $('.js-example-basic-single').select2();
    const phoneInput = document.querySelector("#phone");
    const iti = window.intlTelInput(phoneInput, {
        initialCountry: "tg",
        preferredCountries: ["tg", "ci", "gh", "sn"],
        separateDialCode: true,
        utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js",
    });

    const memberForm = document.getElementById('memberForm');
    console.log("Formulaire trouvé :", memberForm);
    const formMessage = document.getElementById('form-message');
    const searchInput = document.getElementById('searchInput');

    // Événement pour le tri du tableau
    document.querySelector('#membersTable thead').addEventListener('click', function(e) {
        const header = e.target.closest('th');
        if (!header) return;

        const column = header.dataset.sort;
        if (currentSortColumn === column) {
            currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            currentSortColumn = column;
            currentSortDirection = 'asc';
        }
        
        document.querySelectorAll('#membersTable thead th i').forEach(icon => {
            icon.className = 'bi bi-sort-down-alt';
        });

        const icon = header.querySelector('i');
        if (icon) {
            icon.className = currentSortDirection === 'asc' ? 'bi bi-sort-down' : 'bi bi-sort-up';
        }
        
        loadAndSortMembers();
    });

    // Événement pour la barre de recherche
    searchInput.addEventListener('keyup', (e) => {
        const searchValue = e.target.value.toLowerCase();
        const filteredMembers = membersData.filter(member => {
            return Object.values(member).some(value => 
                String(value).toLowerCase().includes(searchValue)
            );
        });
        
        renderMembers(filteredMembers);
    });

    // Gestion de la soumission du formulaire
    memberForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const fullNumber = iti.getNumber();
        const formData = new FormData(memberForm);
        const memberData = {
            statut: formData.get('statut'),
            name: formData.get('name'),
            first_names: formData.get('first_names'),
            neighborhood: formData.get('neighborhood'),
            age_group: formData.get('age_group'),
            profession: formData.get('profession'),
            email: memberForm.email.value,
            phone: fullNumber
        };

        if (!memberData.name || !memberData.first_names || !memberData.age_group || !memberData.profession) {
            formMessage.innerHTML = `<div class="alert alert-danger" role="alert">Les champs Nom, Prénoms, Tranche d'âge et Profession sont obligatoires.</div>`;
            return;
        }

        formMessage.innerHTML = `<div class="alert alert-info" role="alert">Envoi en cours...</div>`;

        try {
            const response = await fetch('/api/members', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(memberData)
            });

            if (response.ok) {
                formMessage.innerHTML = `<div class="alert alert-success" role="alert">Membre enregistré avec succès !</div>`;
                memberForm.reset();
                $('.js-example-basic-single').val('').trigger('change');
                await fetchMembers();
            } else {
                const errorData = await response.json();
                formMessage.innerHTML = `<div class="alert alert-warning" role="alert">Erreur lors de l'enregistrement: ${errorData.message || 'Erreur inconnue'}</div>`;
            }
        } catch (error) {
            console.error("Erreur lors de l'enregistrement:", error);
            formMessage.innerHTML = `<div class="alert alert-danger" role="alert">Erreur réseau lors de l'enregistrement.</div>`;
        }
    });

    // Lancement initial
    await fetchMembers();
});