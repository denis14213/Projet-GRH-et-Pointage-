// Serveur principal pour l'application de gestion RH
const dotenv = require("dotenv")

// Configuration des variables d'environnement - DOIT ÊTRE CHARGÉ EN PREMIER
dotenv.config()

// Vérification des variables d'environnement critiques au démarrage
console.log("=== VÉRIFICATION DES VARIABLES D'ENVIRONNEMENT ===")
console.log(`PORT: ${process.env.PORT || "5000 (défaut)"}`)
console.log(`NODE_ENV: ${process.env.NODE_ENV || "non défini"}`)
console.log(`MONGODB_URI: ${process.env.MONGODB_URI ? "configuré" : "non configuré"}`)
console.log(`JWT_SECRET: ${process.env.JWT_SECRET ? "configuré" : "non configuré"}`)
console.log(`OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? "configuré" : "non configuré"}`)
if (process.env.OPENAI_API_KEY) {
  // Masquer la clé pour la sécurité, n'afficher que les 5 premiers caractères
  console.log(`OPENAI_API_KEY commence par: ${process.env.OPENAI_API_KEY.substring(0, 5)}...`)
}
console.log("===============================================")

const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const http = require("http")
const socketIo = require("socket.io")
const path = require("path")
const fs = require("fs") // Import the 'fs' module
const authRoutes = require("./routes/authRoutes")
const userRoutes = require("./routes/userRoutes")
const departmentRoutes = require("./routes/departmentRoutes")
const attendanceRoutes = require("./routes/attendanceRoutes")
const leaveRoutes = require("./routes/leaveRoutes")
const messageRoutes = require("./routes/messageRoutes")
const reportRoutes = require("./routes/reportRoutes")
const taskRoutes = require("./routes/taskRoutes")
const { scheduleAttendanceReminders, scheduleAbsenceMarking } = require("./services/scheduledTasks")
const aiAssistantRoutes = require("./routes/aiAssistantRoutes")

// Initialisation de l'application Express
const app = express()
const server = http.createServer(app)
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
})

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Servir les fichiers statiques
app.use("/uploads", express.static(path.join(__dirname, "uploads")))

// Créer les dossiers d'uploads s'ils n'existent pas
const uploadDirs = ["uploads", "uploads/profiles", "uploads/tasks", "uploads/messages", "uploads/temp", "reports"]
uploadDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
    console.log(`Dossier ${dir} créé`)
  }
})

// Middleware de débogage pour les requêtes
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`)
  console.log("Headers:", JSON.stringify(req.headers, null, 2))
  if (req.method === "POST" || req.method === "PUT") {
    console.log("Content-Type:", req.headers["content-type"])
    if (req.headers["content-type"] && req.headers["content-type"].includes("multipart/form-data")) {
      console.log("Requête multipart détectée")
    } else {
      console.log("Body:", JSON.stringify(req.body, null, 2))
    }
  }
  next()
})

// Connexion à MongoDB
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/hr-management")
  .then(() => console.log("Connexion à MongoDB réussie"))
  .catch((err) => console.error("Erreur de connexion à MongoDB:", err))

// Configuration de Socket.IO pour les notifications en temps réel
io.on("connection", (socket) => {
  console.log("Nouvel utilisateur connecté")

  // Rejoindre une salle spécifique pour les notifications personnalisées
  socket.on("join", (userId) => {
    socket.join(userId)
    console.log(`Utilisateur ${userId} a rejoint sa salle personnelle`)
  })

  // Gestion de la déconnexion
  socket.on("disconnect", () => {
    console.log("Utilisateur déconnecté")
  })
})

// Rendre l'instance io accessible aux routes
app.set("io", io)

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/users", userRoutes)
app.use("/api/departments", departmentRoutes)
app.use("/api/attendance", attendanceRoutes)
app.use("/api/leaves", leaveRoutes)
app.use("/api/messages", messageRoutes)
app.use("/api/reports", reportRoutes)
app.use("/api/tasks", taskRoutes)
app.use("/api/ai", aiAssistantRoutes)

// Route de base
app.get("/", (req, res) => {
  res.send("API de Gestion RH et Pointage")
})

// Planifier les tâches automatiques
scheduleAttendanceReminders(io)
scheduleAbsenceMarking(io)

// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).send("Erreur serveur")
})

// Démarrage du serveur
const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`)
  console.log(`Tâches planifiées activées: rappels à 10h00 et marquage des absences à 23h00`)
})

module.exports = { app, io }
