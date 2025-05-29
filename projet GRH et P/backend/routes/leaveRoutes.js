// Routes pour la gestion des congés
const express = require("express")
const router = express.Router()
const leaveController = require("../controllers/leaveController")
const { auth, checkRole } = require("../middleware/auth")

// Routes pour les demandes de congés
router.post("/", auth, leaveController.requestLeave)
router.get("/me", auth, leaveController.getUserLeaves)
// Ajouter la route pour obtenir une demande de congé par ID après la route "/me"
router.get("/:id", auth, leaveController.getLeaveById)
router.get("/", auth, leaveController.getAllLeaves)
router.put("/:id", auth, leaveController.updateLeave)
router.put("/:id/status", auth, checkRole("admin", "manager"), leaveController.updateLeaveStatus)
router.delete("/:id", auth, leaveController.cancelLeave)

// Route pour la génération de rapports
router.get("/report", auth, checkRole("admin", "assistant", "manager"), leaveController.generateReport)

module.exports = router
