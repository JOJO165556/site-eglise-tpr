const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, 'members.db');
let db;

try {
    // Connexion synchrone à la base de données
    db = new Database(dbPath);
    console.log("✅ Connexion à la base de données 'members.db' réussie.");

    // Crée la table 'members' si elle n'existe pas
    db.exec(`
        CREATE TABLE IF NOT EXISTS members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            first_names TEXT NOT NULL,
            neighborhood TEXT,
            age_group TEXT,
            profession TEXT,
            phone TEXT,
            statut TEXT
        )
    `);
    console.log("✅ Table 'members' créée ou déjà existante.");

    // Note : Avec better-sqlite3, il est plus simple d'ajouter toutes les colonnes à la fois,
    // car les requêtes sont exécutées de manière synchrone.
    // L'ancienne gestion des ALTER TABLE distincts n'est plus nécessaire.

} catch (err) {
    // Gère les erreurs de manière synchrone
    console.error("❌ Erreur lors de l'initialisation de la base de données :", err.message);
} finally {
    // Ferme la connexion de manière sécurisée
    if (db) {
        db.close();
        console.log("✅ Connexion à la base de données fermée.");
    }
}