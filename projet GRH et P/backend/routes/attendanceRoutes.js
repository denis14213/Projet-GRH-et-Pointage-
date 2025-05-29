// Routes pour la gestion des pointages
const express = require("express")
const router = express.Router()
const attendanceController = require("../controllers/attendanceController")
const { auth, checkRole } = require("../middleware/auth")
const multer = require("multer")

// Configuration de multer pour l'importation de fichiers Excel
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/temp")
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimetype === "application/vnd.ms-excel"
    ) {
      cb(null, true)
    } else {
      cb(new Error("Format de fichier non supporté. Seuls les fichiers Excel sont acceptés."), false)
    }
  },
})

// Routes pour l'enregistrement des pointages (assistante)
router.post("/", auth, checkRole("admin", "assistant"), attendanceController.recordAttendance)
// Permettre à tous les utilisateurs authentifiés de voir leurs propres pointages
router.get("/user/:userId", auth, attendanceController.getUserAttendance)
router.get("/", auth, checkRole("admin", "assistant", "manager"), attendanceController.getAllAttendance)
router.put("/:id", auth, checkRole("admin", "assistant"), attendanceController.updateAttendance)
router.delete("/:id", auth, checkRole("admin", "assistant"), attendanceController.deleteAttendance)

// Route pour l'importation de pointages depuis un fichier Excel
router.post(
  "/import",
  auth,
  checkRole("admin", "assistant"),
  upload.single("file"),
  attendanceController.importAttendance,
)

// Route pour la génération de rapports
router.get("/report", auth, checkRole("admin", "assistant", "manager"), attendanceController.generateReport)

module.exports = router
