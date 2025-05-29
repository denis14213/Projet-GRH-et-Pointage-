const mongoose = require("mongoose")

const fichierSchema = new mongoose.Schema({
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
    required: true,
  },
  taille: {
    type: Number,
    required: false,
  },
})

const messageSchema = new mongoose.Schema(
  {
    expediteur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    destinataire: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    contenu: {
      type: String,
      required: function () {
        // Le contenu est requis seulement s'il n'y a pas de fichiers
        return !this.fichiers || this.fichiers.length === 0
      },
      default: "",
    },
    dateEnvoi: {
      type: Date,
      default: Date.now,
    },
    lu: {
      type: Boolean,
      default: false,
    },
    fichiers: [fichierSchema],
  },
  {
    timestamps: true,
  },
)

// Index pour améliorer les performances des requêtes
messageSchema.index({ expediteur: 1, destinataire: 1 })
messageSchema.index({ dateEnvoi: -1 })

const Message = mongoose.model("Message", messageSchema)

module.exports = Message
