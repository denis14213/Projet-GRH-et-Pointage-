// Modèle pour les pointages
const mongoose = require("mongoose")

const AttendanceSchema = new mongoose.Schema(
  {
    utilisateur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    heureArrivee: {
      type: Date,
    },
    heureDepart: {
      type: Date,
    },
    statut: {
      type: String,
      enum: ["present", "absent", "retard", "conge"],
      default: "absent",
    },
    commentaire: {
      type: String,
    },
    enregistrePar: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
)

module.exports = mongoose.model("Attendance", AttendanceSchema)
