// --- DÉCLARATION DES VARIABLES GLOBALES ET ÉTATS ---
let membersData = [];
let currentSortColumn = "name";
let currentSortDirection = "asc";
let currentSearchQuery = "";

// --- GESTION DES REQUÊTES API ---

/**
 * Fonction générique pour faire des requêtes API avec gestion des erreurs d'authentification.
 */
async function apiRequest(url, method, body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: body ? JSON.stringify(body) : null,
    };

    try {
        const response = await fetch(url, options);
        if (response.status === 401 || response.status === 403) {
            alert('Votre session a expiré. Veuillez vous reconnecter.');
            window.location.href = '/login';
            return;
        }
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erreur inconnue');
        }
        return response.json();
    } catch (error) {
        console.error("Erreur de l'API :", error);
        throw error;
    }
}

/**
 * Récupère les membres depuis l'API sécurisée et les affiche.
 */
async function fetchAndRenderMembers() {
    try {
        const tableBody = document.querySelector("#membersTable tbody");
        if (tableBody) {
            const loadingMessage = currentSearchQuery
                ? `Recherche en cours...`
                : `Chargement des membres...`;
            tableBody.innerHTML = `<tr><td colspan="9" class="text-center">${loadingMessage}</td></tr>`;
        }

        const urlParams = new URLSearchParams();
        urlParams.append("sortColumn", currentSortColumn);
        urlParams.append("sortDirection", currentSortDirection);
        if (currentSearchQuery) {
            urlParams.append("searchQuery", currentSearchQuery);
        }

        membersData = await apiRequest(`/api/admin/members?${urlParams.toString()}`, 'GET');
        renderMembers(membersData);
    } catch (error) {
        console.error("Erreur lors de la récupération des membres:", error);
        const tableBody = document.querySelector("#membersTable tbody");
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="9" class="text-center text-danger">Erreur de connexion. Veuillez vous reconnecter.</td></tr>`;
        }
    }
}

/**
 * Fonction pour supprimer un membre
 */
async function deleteMember(memberId) {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce membre ?')) {
        try {
            await apiRequest(`/api/admin/members/${memberId}`, 'DELETE');
            alert('Membre supprimé avec succès.');
            fetchAndRenderMembers(); // Actualise la liste des membres
        } catch (error) {
            console.error('Erreur de suppression:', error);
            alert(`Erreur de suppression: ${error.message}`);
        }
    }
}

// --- GESTION DE L'AFFICHAGE ET DU TRI DU TABLEAU ---

/**
 * Affiche les membres dans le tableau HTML.
 * @param {Array<Object>} members Le tableau de membres à afficher.
 */
function renderMembers(members) {
    const tableBody = document.querySelector("#membersTable tbody");
    if (!tableBody) return;

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

    document.getElementById('edit-member-id').value = member.id;
    document.getElementById('edit-name').value = member.name || '';
    document.getElementById('edit-first_names').value = member.first_names || '';
    document.getElementById('edit-neighborhood').value = member.neighborhood || '';
    document.getElementById('edit-age_group').value = member.age_group || '';
    document.getElementById('edit-profession').value = member.profession || '';
    document.getElementById('edit-email').value = member.email || '';
    document.getElementById('edit-phone').value = member.phone || '';

    const statutSelect = $('#edit-statut');
    if (statutSelect.length) {
        if (statutSelect.data('select2')) {
            statutSelect.select2('destroy');
        }
        statutSelect.val(member.statut || '').select2();
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
        await apiRequest(`/api/admin/members/${memberId}`, 'PUT', updatedData);
        formMessage.innerHTML = `<div class="alert alert-success" role="alert">Membre mis à jour avec succès !</div>`;
        await fetchAndRenderMembers();
        setTimeout(() => {
            const editModal = bootstrap.Modal.getInstance(document.getElementById('editMemberModal'));
            if (editModal) {
                editModal.hide();
            }
        }, 1000);
    } catch (error) {
        console.error("Erreur de mise à jour:", error);
        formMessage.innerHTML = `<div class="alert alert-danger" role="alert">Erreur: ${error.message}</div>`;
    }
}


// --- INITIALISATION DES ÉVÉNEMENTS ---

document.addEventListener("DOMContentLoaded", async () => {
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
            deleteMember(memberId);
        }
    });

    if (editMemberForm) {
        editMemberForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await submitEditForm();
        });
    }

    const sortSelect = document.getElementById("member-sort-select");
    if (sortSelect) {
        sortSelect.addEventListener("change", (e) => {
            currentSortColumn = e.target.value;
            fetchAndRenderMembers();
        });
    }

    if (searchInput) {
        searchInput.addEventListener("keyup", (e) => {
            currentSearchQuery = e.target.value;
            fetchAndRenderMembers();
        });
    }

    async function submitMemberForm(memberData, formMessage, memberForm) {
        if (!memberData.name || !memberData.first_names || !memberData.age_group || !memberData.profession) {
            formMessage.innerHTML = `<div class="alert alert-danger" role="alert">Les champs Nom, Prénoms, Tranche d'âge et Profession sont obligatoires.</div>`;
            return;
        }

        formMessage.innerHTML = `<div class="alert alert-info" role="alert">Envoi en cours...</div>`;

        try {
            await apiRequest("/api/admin/members", "POST", memberData);
            formMessage.innerHTML = `<div class="alert alert-success" role="alert">Membre enregistré avec succès !</div>`;
            memberForm.reset();
            $(".js-example-basic-single").val("").trigger("change");
            await fetchAndRenderMembers();
        } catch (error) {
            console.error("Erreur lors de l'enregistrement:", error);
            formMessage.innerHTML = `<div class="alert alert-danger" role="alert">Erreur lors de l'enregistrement: ${error.message}</div>`;
        }
    }

    if (memberForm) {
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
    }

    fetchAndRenderMembers();

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