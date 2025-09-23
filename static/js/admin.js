// admin.js
document.addEventListener('DOMContentLoaded', async () => {
    // Fonction générique pour faire des requêtes API
    async function apiRequest(url, method, body = null) {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : null,
        };

        const response = await fetch(url, options);
        if (response.status === 401 || response.status === 403) {
            // Le cookie de session a expiré ou est invalide, on redirige
            alert('Votre session a expiré. Veuillez vous reconnecter.');
            window.location.href = '/login'; 
            return;
        }
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erreur inconnue');
        }
        return response.json();
    }

    // Fonction pour charger et afficher les membres
    const loadMembers = async () => {
        try {
            const members = await apiRequest('/api/admin/members', 'GET');
            const membersTableBody = document.querySelector('#members-table tbody');
            membersTableBody.innerHTML = '';
            members.forEach(member => {
                // Code pour générer les lignes du tableau
            });
        } catch (error) {
            console.error("Erreur lors du chargement des membres :", error);
        }
    };

    // ... (Ajoute ici les fonctions pour gérer l'ajout, la modification et la suppression de membres) ...
    // Les requêtes POST et DELETE n'ont plus besoin du token en header, le cookie s'en charge.

    // Appel initial au chargement de la page
    loadMembers();
});