const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'members.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error("Erreur lors de l'ouverture de la base de données :", err.message);
  } else {
    console.log("✅ Connexion à la base de données réussie.");

    // Sélectionne tous les membres et les affiche
    db.all("SELECT * FROM members", [], (err, rows) => {
      if (err) {
        console.error("Erreur lors de la lecture des membres :", err.message);
      } else {
        console.log("-------------------");
        console.log("Contenu de la table 'members' :");
        console.log(rows);
        console.log("-------------------");
        if (rows.length === 0) {
          console.log("La table est vide.");
        } else {
          console.log(`${rows.length} membre(s) trouvé(s).`);
        }
      }
      // Ferme la connexion après l'exécution
      db.close();
    });
  }
});