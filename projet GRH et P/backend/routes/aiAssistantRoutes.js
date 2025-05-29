// Routes pour l'assistant IA
const express = require("express")
const router = express.Router()
const aiAssistantController = require("../controllers/aiAssistantController")
const { auth } = require("../middleware/auth")

// Routes pour les conversations avec l'assistant IA
router.post("/conversations", auth, aiAssistantController.createConversation)
router.get("/conversations", auth, aiAssistantController.getConversations)
router.get("/conversations/:id", auth, aiAssistantController.getConversation)
router.post("/conversations/:id/messages", auth, aiAssistantController.sendMessage)
router.put("/conversations/:id", auth, aiAssistantController.renameConversation)
router.delete("/conversations/:id", auth, aiAssistantController.deleteConversation)

// Route pour l'analyse des performances (managers uniquement)
router.get("/analyze/tasks", auth, aiAssistantController.analyzeTaskPerformance)

module.exports = router
