// Modèle pour les départements
const mongoose = require("mongoose")

const DepartmentSchema = new mongoose.Schema(
  {
    nom: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    membres: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    dateCreation: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
)

module.exports = mongoose.model("Department", DepartmentSchema)
