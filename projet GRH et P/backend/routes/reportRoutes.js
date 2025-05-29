// Routes pour la génération de rapports
const express = require("express")
const router = express.Router()
const reportController = require("../controllers/reportController")
const { auth, checkRole } = require("../middleware/auth")

// Route pour la génération de rapports globaux
router.get("/global", auth, checkRole("admin", "manager", "assistant"), reportController.generateGlobalReport)

// Route pour les statistiques du tableau de bord
router.get("/dashboard", auth, reportController.getDashboardStats)

// Route pour la génération de rapports de tâches
router.get("/tasks", auth, checkRole("admin", "manager", "assistant"), reportController.generateTaskReport)

// Route pour la génération de rapports de congés
router.get("/leaves", auth, checkRole("admin", "manager", "assistant"), reportController.generateLeaveReport)

// Route pour la génération de rapports des employés
router.get("/employees", auth, checkRole("admin", "manager", "assistant"), reportController.generateEmployeeReport)

module.exports = router
