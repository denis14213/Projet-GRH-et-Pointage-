// Modèle pour les tâches
const mongoose = require("mongoose")

const TaskSchema = new mongoose.Schema(
  {
    titre: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    assigneA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    creePar: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    departement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
    },
    priorite: {
      type: String,
      enum: ["basse", "moyenne", "haute", "urgente"],
      default: "moyenne",
    },
    statut: {
      type: String,
      enum: ["a_faire", "en_cours", "en_revue", "terminee"],
      default: "a_faire",
    },
    dateEcheance: {
      type: Date,
    },
    dateCreation: {
      type: Date,
      default: Date.now,
    },
    derniereMiseAJour: {
      type: Date,
      default: Date.now,
    },
    commentaires: [
      {
        utilisateur: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        contenu: {
          type: String,
          required: true,
        },
        date: {
          type: Date,
          default: Date.now,
        },
        fichiers: [
          {
            nom: String,
            url: String,
            type: String,
          },
        ],
      },
    ],
    fichiers: [
      {
        nom: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
        type: {
          type: String,
        },
        ajoutePar: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        dateAjout: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    historique: [
      {
        action: String,
        ancienStatut: String,
        nouveauStatut: String,
        utilisateur: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true },
)

module.exports = mongoose.model("Task", TaskSchema)
