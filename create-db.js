const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'members.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("❌ Erreur lors de la connexion à la base de données :", err.message);
    } else {
        console.log("✅ Connexion à la base de données 'members.db' réussie.");
        
        db.serialize(() => {
            // Crée la table 'members' si elle n'existe pas
            db.run(`CREATE TABLE IF NOT EXISTS members (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                first_names TEXT NOT NULL,
                neighborhood TEXT,
                age_group TEXT,
                profession TEXT
            )`, (err) => {
                if (err) {
                    console.error("❌ Erreur lors de la création de la table 'members' :", err.message);
                } else {
                    console.log("✅ Table 'members' créée ou déjà existante.");
                }
            });

            // Ajoute la colonne 'phone' si elle n'existe pas
            db.run("ALTER TABLE members ADD COLUMN phone TEXT", (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                    console.error("❌ Erreur lors de l'ajout de la colonne 'phone':", err.message);
                } else {
                    console.log("✅ Colonne 'phone' ajoutée ou déjà existante.");
                }
            });

            // Ajoute la colonne 'statut' si elle n'existe pas
            db.run("ALTER TABLE members ADD COLUMN statut TEXT", (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                    console.error("❌ Erreur lors de l'ajout de la colonne 'statut':", err.message);
                } else {
                    console.log("✅ Colonne 'statut' ajoutée ou déjà existante.");
                    console.log("La base de données est prête !");
                }
            });

            // Ferme la connexion après toutes les opérations
            db.close((err) => {
                if (err) {
                    console.error(err.message);
                }
                console.log("Connexion à la base de données fermée.");
            });
        });
    }
});