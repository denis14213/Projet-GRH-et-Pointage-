// Modèle pour les conversations avec l'assistant IA
const mongoose = require("mongoose")

const AIConversationSchema = new mongoose.Schema(
  {
    utilisateur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    messages: [
      {
        role: {
          type: String,
          enum: ["user", "assistant", "system"],
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
        contexte: {
          // Stocke des informations contextuelles comme les IDs de tâches ou de congés mentionnés
          type: Object,
          default: {},
        },
      },
    ],
    titre: {
      type: String,
      default: "Nouvelle conversation",
    },
    dateCreation: {
      type: Date,
      default: Date.now,
    },
    derniereMiseAJour: {
      type: Date,
      default: Date.now,
    },
    actif: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
)

module.exports = mongoose.model("AIConversation", AIConversationSchema)
