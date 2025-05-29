// Modèle pour les utilisateurs
const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

const UserSchema = new mongoose.Schema(
  {
    nom: {
      type: String,
      required: true,
      trim: true,
    },
    prenom: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    motDePasse: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "manager", "employee", "assistant"],
      default: "employee",
    },
    departement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
    },
    poste: {
      type: String,
      trim: true,
    },
    dateEmbauche: {
      type: Date,
    },
    dateNaissance: {
      type: Date,
    },
    adresse: {
      type: String,
    },
    telephone: {
      type: String,
    },
    photoProfil: {
      type: String,
    },
    soldeConges: {
      type: Number,
      default: 25,
    },
    premiereConnexion: {
      type: Boolean,
      default: true,
    },
    actif: {
      type: Boolean,
      default: true,
    },
    googleRefreshToken: {
      type: String,
    },
  },
  { timestamps: true },
)

// Middleware pour hacher le mot de passe avant l'enregistrement
UserSchema.pre("save", async function (next) {
  // Ne hacher le mot de passe que s'il a été modifié (ou est nouveau)
  if (!this.isModified("motDePasse")) return next()

  try {
    // Générer un sel
    const salt = await bcrypt.genSalt(10)
    // Hacher le mot de passe avec le sel
    this.motDePasse = await bcrypt.hash(this.motDePasse, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// Méthode pour comparer les mots de passe
UserSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.motDePasse)
  } catch (error) {
    throw error
  }
}

module.exports = mongoose.model("User", UserSchema)
