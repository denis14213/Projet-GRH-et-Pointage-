// Modèle pour les congés
const mongoose = require("mongoose")

const LeaveSchema = new mongoose.Schema(
  {
    utilisateur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    typeConge: {
      type: String,
      enum: [
        "annuel",
        "maladie",
        "maternite",
        "paternite",
        "special",
        "autre",
        "conge_paye",
        "sans_solde",
        "familial",
        "formation",
      ],
      required: true,
    },
    dateDebut: {
      type: Date,
      required: true,
    },
    dateFin: {
      type: Date,
      required: true,
    },
    nombreJours: {
      type: Number,
      required: true,
    },
    motif: {
      type: String,
      required: true,
    },
    statut: {
      type: String,
      enum: ["en_attente", "approuve_manager", "approuve", "refuse"],
      default: "en_attente",
    },
    commentaire: {
      type: String,
    },
    approuvePar: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    dateApprobation: {
      type: Date,
    },
    dateCreation: {
      type: Date,
      default: Date.now,
    },
    googleEventId: {
      type: String,
    },
  },
  { timestamps: true },
)

module.exports = mongoose.model("Leave", LeaveSchema)
