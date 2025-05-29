const mongoose = require("mongoose");
const User = require("./models/User"); // Assurez-vous que le chemin est correct
const bcrypt = require("bcryptjs");

// Configuration de la connexion à MongoDB
const dbUrl = "mongodb://localhost:27017/hr_management_system"; // Remplacez par votre URL MongoDB

const adminData = {
  nom: "Admin",
  prenom: "Super",
  email: "admin@example.com",
  motDePasse: "MotDePasseAdmin123!", // Changez ceci en production
  role: "admin",
  age: 35,
  sexe: "M",
  adresse: "123 Rue Admin, Ville",
  telephone: "0123456789",
  premiereConnexion: false,
  soldeConges: 30
};

async function createAdmin() {
  try {
    // Connexion à MongoDB
    await mongoose.connect(dbUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connecté à MongoDB");

    // Vérifier si l'admin existe déjà
    const existingAdmin = await User.findOne({ email: adminData.email });
    if (existingAdmin) {
      console.log("Un administrateur avec cet email existe déjà");
      return;
    }

    // Créer le nouvel admin
    const admin = new User(adminData);
    await admin.save();
    console.log("Administrateur créé avec succès:", admin);

  } catch (error) {
    console.error("Erreur lors de la création de l'administrateur:", error);
  } finally {
    // Fermer la connexion
    await mongoose.disconnect();
    console.log("Déconnecté de MongoDB");
  }
}

// Exécuter la fonction
createAdmin();