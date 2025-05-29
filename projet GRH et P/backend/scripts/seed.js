const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")
const User = require("../models/User")
const Department = require("../models/Department")
require("dotenv").config()

// Connexion à MongoDB
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/hr-management")
  .then(() => console.log("Connexion à MongoDB réussie pour le seeding"))
  .catch((err) => console.error("Erreur de connexion à MongoDB:", err))

// Fonction pour créer un utilisateur admin par défaut
const createDefaultAdmin = async () => {
  try {
    // Vérifier si un admin existe déjà
    const adminExists = await User.findOne({ role: "admin" })
    if (adminExists) {
      console.log("Un administrateur existe déjà")
      return
    }

    // Créer un département par défaut
    const defaultDepartment = new Department({
      nom: "Administration",
      description: "Département d'administration",
    })
    await defaultDepartment.save()
    console.log("Département par défaut créé")

    // Créer un admin par défaut
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash("admin123", salt)

    const admin = new User({
      nom: "Admin",
      prenom: "System",
      email: "admin@system.com",
      motDePasse: hashedPassword,
      role: "admin",
      departement: defaultDepartment._id,
      premiereConnexion: false,
    })

    await admin.save()
    console.log("Administrateur par défaut créé")
    console.log("Email: admin@system.com")
    console.log("Mot de passe: admin123")
  } catch (error) {
    console.error("Erreur lors de la création de l'admin par défaut:", error)
  }
}

// Exécuter le seeding
const runSeed = async () => {
  try {
    await createDefaultAdmin()
    console.log("Seeding terminé avec succès")
    process.exit(0)
  } catch (error) {
    console.error("Erreur lors du seeding:", error)
    process.exit(1)
  }
}

runSeed()
