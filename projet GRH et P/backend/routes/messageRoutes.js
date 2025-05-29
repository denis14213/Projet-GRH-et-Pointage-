// Routes pour la gestion des messages
const express = require("express")
const router = express.Router()
const messageController = require("../controllers/messageController")
const { auth } = require("../middleware/auth")

// Route de test pour vérifier que le système de messagerie fonctionne
router.get("/test", auth, (req, res) => {
  res.status(200).json({
    message: "Le système de messagerie fonctionne correctement",
    userId: req.user.id,
    timestamp: new Date().toISOString(),
  })
})

// Routes pour les messages
router.post("/", auth, messageController.upload.array("fichiers", 5), messageController.sendMessage)
router.get("/conversations", auth, messageController.getConversations)
router.get("/user/:userId", auth, messageController.getMessages)
router.put("/:id/read", auth, messageController.markAsRead)
router.delete("/:id", auth, messageController.deleteMessage)
router.get("/unread", auth, messageController.getUnreadCount)

module.exports = router
