const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, 'members.db');
let db;

try {
  // Connexion synchrone à la base de données
  db = new Database(dbPath, { readonly: true });
  console.log("✅ Connexion à la base de données réussie.");

  // Prépare la requête et l'exécute de manière synchrone
  const stmt = db.prepare("SELECT * FROM members");
  const rows = stmt.all();

  console.log("-------------------");
  console.log("Contenu de la table 'members' :");
  console.log(rows);
  console.log("-------------------");

  if (rows.length === 0) {
    console.log("La table est vide.");
  } else {
    console.log(`${rows.length} membre(s) trouvé(s).`);
  }

} catch (err) {
  // Attrape et affiche les erreurs
  console.error("❌ Erreur lors des opérations sur la base de données :", err.message);
} finally {
  // Ferme la connexion de manière sécurisée
  if (db) {
    db.close();
    console.log("✅ Connexion à la base de données fermée.");
  }
}