// Routes pour la gestion des tâches
const express = require("express")
const router = express.Router()
const taskController = require("../controllers/taskController")
const { auth, checkRole } = require("../middleware/auth")

// Routes pour les tâches
router.post("/", auth, checkRole("admin", "manager"), taskController.createTask)
router.get("/", auth, taskController.getAllTasks)
router.get("/me", auth, taskController.getUserTasks)
router.get("/:id", auth, taskController.getTaskById)
router.put("/:id", auth, taskController.updateTask)
router.delete("/:id", auth, taskController.deleteTask)

// Nouvelles routes pour les commentaires et fichiers
router.post("/:id/comments", auth, taskController.upload.array("fichiers", 5), taskController.addComment)
router.post("/:id/files", auth, taskController.upload.array("fichiers", 5), taskController.addFile)

module.exports = router
