$(document).ready(function() {
    $('.js-example-basic-single').select2();

    const input = document.querySelector("#phone");
    const iti = window.intlTelInput(input, {
        utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js",
    });

    // Fonction pour charger et afficher les membres
    function loadMembers() {
        $.ajax({
            url: '/api/members', // Nouvelle route API
            type: 'GET',
            dataType: 'json',
            success: function(members) {
                const tableBody = $('#membersTable tbody');
                tableBody.empty(); // Vider le tableau existant

                if (members.length === 0) {
                    tableBody.append('<tr><td colspan="7" class="text-center">Aucun membre inscrit.</td></tr>');
                    return;
                }

                members.forEach(member => {
                    const row = `
                        <tr>
                            <td>${member.statut || 'Non renseigné'}</td>
                            <td>${member.name}</td>
                            <td>${member.first_names}</td>
                            <td>${member.neighborhood || 'Non renseigné'}</td>
                            <td>${member.age_group}</td>
                            <td>${member.profession}</td>
                            <td>${member.phone || 'Non renseigné'}</td>
                        </tr>
                    `;
                    tableBody.append(row);
                });
            },
            error: function(error) {
                console.error("Erreur lors de la récupération des membres :", error);
                const tableBody = $('#membersTable tbody');
                tableBody.empty();
                tableBody.append('<tr><td colspan="7" class="text-center text-danger">Erreur lors du chargement des membres.</td></tr>');
            }
        });
    }

    // Fonction de recherche
    $('#searchInput').on('keyup', function() {
        const value = $(this).val().toLowerCase();
        $("#membersTable tbody tr").filter(function() {
            $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1);
        });
    });

    // Appel initial pour charger les membres au chargement de la page
    loadMembers();
});