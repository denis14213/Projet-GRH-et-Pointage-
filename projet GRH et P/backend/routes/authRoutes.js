// Routes d'authentification
const express = require("express")
const router = express.Router()
const authController = require("../controllers/authController")
const { auth, checkRole } = require("../middleware/auth")
const multer = require("multer")
const path = require("path")
const fs = require("fs")

// Configuration de multer pour le stockage des images de profil
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/profiles"
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`)
  },
})

// Filtre pour les types de fichiers acceptés
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png"]
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error("Type de fichier non supporté. Seuls JPEG, JPG et PNG sont acceptés."), false)
  }
}

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter,
})

// Middleware pour déboguer les requêtes
const debugRequest = (req, res, next) => {
  console.log("Requête reçue sur:", req.originalUrl)
  console.log("Méthode:", req.method)
  console.log("Headers:", req.headers)
  console.log("Body avant multer:", typeof req.body, req.body)
  next()
}

// Route d'inscription (réservée à l'administrateur)
router.post(
  "/register",
  debugRequest,
  auth,
  checkRole("admin"),
  upload.single("photoProfil"),
  (req, res, next) => {
    console.log("Body après multer:", typeof req.body, req.body)
    console.log("Fichier reçu:", req.file)
    next()
  },
  authController.register,
)

// Route de connexion
router.post("/login", authController.login)

// Route de changement de mot de passe
router.post("/change-password", auth, authController.changePassword)

// Route de réinitialisation de mot de passe
router.post("/reset-password", authController.resetPassword)

// Route de vérification du token
router.get("/verify-token", authController.verifyToken)

// Routes pour l'intégration Google Calendar
router.get("/google/auth-url", auth, authController.getGoogleAuthUrl)
router.post("/google/callback", auth, authController.handleGoogleCallback)
router.post("/google/disconnect", auth, authController.disconnectGoogleCalendar)

module.exports = router
