// Routes pour la gestion des utilisateurs
const express = require("express")
const router = express.Router()
const userController = require("../controllers/userController")
const { auth, checkRole } = require("../middleware/auth")

// Routes pour l'administrateur
router.get("/", auth, userController.getAllUsers) // Supprimer checkRole("admin") pour permettre à tous les utilisateurs authentifiés d'accéder
router.get("/:id", auth, checkRole("admin", "manager"), userController.getUserById)
router.put("/:id", auth, checkRole("admin"), userController.upload.single("photoProfil"), userController.updateUser)
router.delete("/:id", auth, checkRole("admin"), userController.deleteUser)

// Routes pour le profil de l'utilisateur connecté
router.get("/profile/me", auth, userController.getProfile)
router.put("/profile/me", auth, userController.upload.single("photoProfil"), userController.updateProfile)

module.exports = router
