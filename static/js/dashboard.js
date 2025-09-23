// --- DÉCLARATION DES VARIABLES GLOBALES ET ÉTATS ---
let membersData = [];
let currentSortColumn = "name";
let currentSortDirection = "asc";

// --- GESTION DE L'AFFICHAGE ET DU TRI DU TABLEAU ---

/**
 * Affiche les membres dans le tableau HTML.
 * @param {Array<Object>} members Le tableau de membres à afficher.
 */
function renderMembers(members) {
    const tableBody = document.querySelector("#membersTable tbody");
    tableBody.innerHTML = "";

    if (members.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="9" class="text-center">Aucun membre trouvé.</td></tr>`;
        return;
    }

    members.forEach((member) => {
        const row = document.createElement("tr");
        row.innerHTML = `
      <td>${member.name || ""}</td>
      <td>${member.first_names || ""}</td>
      <td>${member.statut || "Non renseigné"}</td>
      <td>${member.neighborhood || "Non renseigné"}</td>
      <td>${member.age_group || "Non renseigné"}</td>
      <td>${member.profession || "Non renseigné"}</td>
      <td>${member.email || "Non renseigné"}</td>
      <td>${member.phone || "Non renseigné"}</td>
      <td>
        <button class="btn btn-sm btn-outline-info me-2" data-action="edit" data-id="${member.id}">
          <i class="bi bi-pencil-square"></i> Modifier
        </button>
        <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${member.id}">
          <i class="bi bi-trash"></i> Supprimer
        </button>
      </td>
    `;
        tableBody.appendChild(row);
    });
}

// --- GESTION DES REQUÊTES API ---

/**
 * Récupère les membres depuis l'API sécurisée.
 * @param {string} [sortColumn=currentSortColumn] La colonne sur laquelle trier.
 * @param {string} [sortDirection=currentSortDirection] La direction du tri (asc/desc).
 * @param {string} [searchQuery=""] Le terme de recherche.
 */
async function fetchAndRenderMembers(sortColumn, sortDirection, searchQuery) {
    try {
        const tableBody = document.querySelector("#membersTable tbody");
        const loadingMessage = searchQuery
            ? `Recherche en cours...`
            : `Chargement des membres...`;
        tableBody.innerHTML = `<tr><td colspan="9" class="text-center">${loadingMessage}</td></tr>`;

        const urlParams = new URLSearchParams();
        urlParams.append("sortColumn", sortColumn);
        urlParams.append("sortDirection", sortDirection);
        if (searchQuery) {
            urlParams.append("searchQuery", searchQuery);
        }

        const response = await fetch(`/api/admin/members?${urlParams.toString()}`);
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }

        membersData = await response.json();
        renderMembers(membersData);
    } catch (error) {
        console.error("Erreur lors de la récupération des membres:", error);
        const tableBody = document.querySelector("#membersTable tbody");
        tableBody.innerHTML = `<tr><td colspan="9" class="text-center text-danger">Erreur de connexion. Veuillez vous reconnecter.</td></tr>`;
    }
}

// --- LOGIQUE POUR LA MODIFICATION ET LA SUPPRESSION ---

/**
 * Fonction pour pré-remplir le formulaire de modification et afficher la modale.
 * @param {string} memberId L'ID du membre à modifier.
 */
async function showEditModal(memberId) {
    const member = membersData.find(m => m.id == memberId);
    if (!member) {
        console.error("Membre non trouvé pour l'ID :", memberId);
        return;
    }

    // Remplissage des champs de la modale en se basant sur les données du membre
    document.getElementById('edit-member-id').value = member.id;
    document.getElementById('edit-name').value = member.name || '';
    document.getElementById('edit-first_names').value = member.first_names || '';
    document.getElementById('edit-neighborhood').value = member.neighborhood || '';
    document.getElementById('edit-age_group').value = member.age_group || '';
    document.getElementById('edit-profession').value = member.profession || '';
    document.getElementById('edit-email').value = member.email || '';
    document.getElementById('edit-phone').value = member.phone || '';

    // Lignes spécifiques pour la mise à jour du champ "statut" qui utilise Select2
    // On détruit d'abord l'instance Select2 existante pour éviter les conflits
    if (typeof $.fn.select2 !== 'undefined' && $('#edit-statut').hasClass('select2-hidden-accessible')) {
        $('#edit-statut').select2('destroy');
    }
    
    // On réinitialise Select2 sur le champ, puis on définit la valeur
    // et on déclenche l'événement 'change' pour mettre à jour l'affichage
    if (typeof $.fn.select2 !== 'undefined') {
        $('#edit-statut').select2();
        $('#edit-statut').val(member.statut || '').trigger('change');
    }
    
    const editModal = new bootstrap.Modal(document.getElementById('editMemberModal'));
    editModal.show();
}

/**
 * Gère la soumission du formulaire de modification.
 */
async function submitEditForm() {
    const form = document.getElementById('editMemberForm');
    const memberId = document.getElementById('edit-member-id').value;
    const formMessage = document.getElementById('edit-form-message');

    // Collecte des données du formulaire
    const updatedData = {
        name: form.querySelector('#edit-name').value,
        first_names: form.querySelector('#edit-first_names').value,
        statut: form.querySelector('#edit-statut').value,
        neighborhood: form.querySelector('#edit-neighborhood').value,
        age_group: form.querySelector('#edit-age_group').value,
        profession: form.querySelector('#edit-profession').value,
        email: form.querySelector('#edit-email').value,
        phone: form.querySelector('#edit-phone').value,
    };

    formMessage.innerHTML = `<div class="alert alert-info" role="alert">Mise à jour en cours...</div>`;

    try {
        const response = await fetch(`/api/admin/members/${memberId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData),
        });

        if (response.ok) {
            formMessage.innerHTML = `<div class="alert alert-success" role="alert">Membre mis à jour avec succès !</div>`;
            await fetchAndRenderMembers();
            setTimeout(() => {
                const editModal = bootstrap.Modal.getInstance(document.getElementById('editMemberModal'));
                if (editModal) {
                    editModal.hide();
                }
            }, 1000);
        } else {
            const errorData = await response.json();
            formMessage.innerHTML = `<div class="alert alert-warning" role="alert">Erreur: ${errorData.message || 'Erreur inconnue'}</div>`;
        }
    } catch (error) {
        console.error("Erreur de mise à jour:", error);
        formMessage.innerHTML = `<div class="alert alert-danger" role="alert">Erreur réseau.</div>`;
    }
}

// --- INITIALISATION DES ÉVÉNEMENTS ---

document.addEventListener("DOMContentLoaded", async () => {
    // Initialisation des plugins
    if (typeof $.fn.select2 !== 'undefined') {
        $(".js-example-basic-single").select2();
    }
    const phoneInput = document.querySelector("#phone");
    const iti = window.intlTelInput(phoneInput, {
        initialCountry: "tg",
        preferredCountries: ["tg", "ci", "gh", "sn"],
        separateDialCode: true,
        utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js",
    });

    // Références aux éléments du DOM
    const memberForm = document.getElementById("memberForm");
    const formMessage = document.getElementById("form-message");
    const searchInput = document.getElementById("searchInput");
    const editMemberForm = document.getElementById('editMemberForm');

    // Événement pour les actions "Modifier" et "Supprimer"
    document.querySelector("#membersTable tbody").addEventListener("click", function (e) {
        const targetBtn = e.target.closest("button");
        if (!targetBtn) return;

        const action = targetBtn.dataset.action;
        const memberId = targetBtn.dataset.id;

        if (action === "edit") {
            showEditModal(memberId);
        } else if (action === "delete") {
            if (confirm("Êtes-vous sûr de vouloir supprimer ce membre ?")) {
                console.log(`Suppression du membre avec l'ID ${memberId}`);
            }
        }
    });

    // Événement pour la soumission du formulaire de modification
    editMemberForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitEditForm();
    });

    // Événement pour le tri du tableau
    document.querySelector("#membersTable thead").addEventListener("click", function (e) {
        const header = e.target.closest("th");
        if (!header || !header.dataset.sort) return;

        const column = header.dataset.sort;
        if (currentSortColumn === column) {
            currentSortDirection = currentSortDirection === "asc" ? "desc" : "asc";
        } else {
            currentSortColumn = column;
            currentSortDirection = "asc";
        }
        
        // Appelle la fonction de tri et de rendu mise à jour
        fetchAndRenderMembers(currentSortColumn, currentSortDirection);
    });

    // Événement pour la barre de recherche
    searchInput.addEventListener("keyup", (e) => {
        const searchValue = e.target.value;
        const filteredMembers = membersData.filter((member) => {
            return Object.values(member).some((value) =>
                String(value).toLowerCase().includes(searchValue.toLowerCase())
            );
        });
        renderMembers(filteredMembers);
    });

    // Gestion de la soumission du formulaire d'ajout de membre
    async function submitMemberForm(memberData, formMessage, memberForm) {
        if (!memberData.name || !memberData.first_names || !memberData.age_group || !memberData.profession) {
            formMessage.innerHTML = `<div class="alert alert-danger" role="alert">Les champs Nom, Prénoms, Tranche d'âge et Profession sont obligatoires.</div>`;
            return;
        }

        formMessage.innerHTML = `<div class="alert alert-info" role="alert">Envoi en cours...</div>`;

        try {
            const response = await fetch("/api/admin/members", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(memberData),
            });

            if (response.ok) {
                formMessage.innerHTML = `<div class="alert alert-success" role="alert">Membre enregistré avec succès !</div>`;
                memberForm.reset();
                $(".js-example-basic-single").val("").trigger("change");
                await fetchAndRenderMembers(currentSortColumn, currentSortDirection);
            } else {
                const errorData = await response.json();
                formMessage.innerHTML = `<div class="alert alert-warning" role="alert">Erreur lors de l'enregistrement: ${errorData.message || "Erreur inconnue"}</div>`;
            }
        } catch (error) {
            console.error("Erreur lors de l'enregistrement:", error);
            formMessage.innerHTML = `<div class="alert alert-danger" role="alert">Erreur réseau lors de l'enregistrement.</div>`;
        }
    }

    memberForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fullNumber = phoneInput ? iti.getNumber() : null;
        const formData = new FormData(memberForm);
        const memberData = {
            statut: formData.get("statut"),
            name: formData.get("name"),
            first_names: formData.get("first_names"),
            neighborhood: formData.get("neighborhood"),
            age_group: formData.get("age_group"),
            profession: formData.get("profession"),
            email: memberForm.email.value,
            phone: fullNumber,
        };
        await submitMemberForm(memberData, formMessage, memberForm);
    });

    // Lancement initial : charge les membres au premier chargement de la page
    await fetchAndRenderMembers(currentSortColumn, currentSortDirection);

    const logoutButton = document.getElementById("logoutButton");
    if (logoutButton) {
        logoutButton.addEventListener("click", async (event) => {
            event.preventDefault();
            try {
                const response = await fetch("/api/logout", { method: "POST" });
                if (response.ok) {
                    window.location.href = "/login";
                } else {
                    console.error("Logout failed:", await response.json());
                    alert("Déconnexion échouée. Veuillez réessayer.");
                }
            } catch (error) {
                console.error("Network or server error during logout:", error);
                alert("Erreur de connexion. Veuillez réessayer plus tard.");
            }
        });
    }

});