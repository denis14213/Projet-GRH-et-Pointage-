// Contrôleur pour la gestion des pointages
const Attendance = require("../models/Attendance")
const User = require("../models/User")
const Department = require("../models/Department")
const excel = require("exceljs")
const moment = require("moment")
const fs = require("fs")
const path = require("path")

// Configuration de multer pour le stockage des fichiers
const multer = require("multer") // Import multer

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/temp"
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`)
  },
})

exports.upload = multer({
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

// Enregistrer un pointage (arrivée ou départ)
exports.recordAttendance = async (req, res) => {
  try {
    const { userId, type, date, commentaire } = req.body
    const assistantId = req.user.id

    // Vérifier si l'utilisateur existe
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" })
    }

    // Formater la date (utiliser la date fournie ou la date actuelle)
    const attendanceDate = date ? new Date(date) : new Date()
    const startOfDay = new Date(attendanceDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(attendanceDate)
    endOfDay.setHours(23, 59, 59, 999)

    // Vérifier si un pointage existe déjà pour cette date
    let attendance = await Attendance.findOne({
      utilisateur: userId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    })

    // Si aucun pointage n'existe, en créer un nouveau
    if (!attendance) {
      attendance = new Attendance({
        utilisateur: userId,
        date: attendanceDate,
        enregistrePar: assistantId,
        commentaire,
      })
    }

    // Mettre à jour l'heure d'arrivée ou de départ
    if (type === "arrivee") {
      attendance.heureArrivee = attendanceDate

      // Vérifier si l'employé est en retard (après 9h00)
      const arrivalHour = attendanceDate.getHours()
      const arrivalMinutes = attendanceDate.getMinutes()

      if (arrivalHour > 9 || (arrivalHour === 9 && arrivalMinutes > 0)) {
        attendance.statut = "retard"
        if (!attendance.commentaire) {
          attendance.commentaire = "Retard automatiquement détecté par le système"
        }
      } else if (!attendance.heureDepart) {
        attendance.statut = "present"
      }
    } else if (type === "depart") {
      attendance.heureDepart = attendanceDate
      if (!attendance.heureArrivee) {
        attendance.statut = "absent"
      } else {
        attendance.statut = "present"
      }
    }

    // Mettre à jour le commentaire si fourni
    if (commentaire) {
      attendance.commentaire = commentaire
    }

    await attendance.save()

    // Notifier l'utilisateur du pointage
    const io = req.app.get("io")
    io.to(userId).emit("attendance_recorded", {
      message: `Votre pointage ${type === "arrivee" ? "d'arrivée" : "de départ"} a été enregistré`,
      attendance,
    })

    res.status(200).json({
      message: "Pointage enregistré avec succès",
      attendance,
    })
  } catch (error) {
    console.error("Erreur lors de l'enregistrement du pointage:", error)
    res.status(500).json({ message: "Erreur serveur lors de l'enregistrement du pointage" })
  }
}

// Obtenir les pointages d'un utilisateur
exports.getUserAttendance = async (req, res) => {
  try {
    const userId = req.params.userId
    const { startDate, endDate } = req.query

    // Vérifier si l'utilisateur existe
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" })
    }

    // Vérifier que l'utilisateur demande ses propres pointages ou a les permissions nécessaires
    if (userId !== req.user.id && !["admin", "assistant", "manager", "employee"].includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Vous n'êtes pas autorisé à consulter les pointages d'autres utilisateurs" })
    }

    // Si l'utilisateur est un manager, vérifier qu'il est bien le manager de l'utilisateur demandé
    if (req.user.role === "manager" && userId !== req.user.id) {
      // Récupérer le département du manager
      const managerDepartments = await Department.find({ manager: req.user.id })
      const departmentIds = managerDepartments.map((dept) => dept._id)

      // Vérifier si l'utilisateur appartient à l'un des départements du manager
      const userDepartments = await Department.find({
        _id: { $in: departmentIds },
        membres: { $in: [userId] },
      })

      if (userDepartments.length === 0) {
        return res.status(403).json({
          message: "Vous n'êtes pas autorisé à consulter les pointages de cet utilisateur",
        })
      }
    }

    // Construire la requête
    const query = { utilisateur: userId }

    // Ajouter les filtres de date si fournis
    if (startDate || endDate) {
      query.date = {}
      if (startDate) {
        query.date.$gte = new Date(startDate)
      }
      if (endDate) {
        const endDateObj = new Date(endDate)
        endDateObj.setHours(23, 59, 59, 999)
        query.date.$lte = endDateObj
      }
    }

    // Récupérer les pointages
    const attendances = await Attendance.find(query).sort({ date: -1 }).populate("enregistrePar", "nom prenom")

    res.status(200).json(attendances)
  } catch (error) {
    console.error("Erreur lors de la récupération des pointages:", error)
    res.status(500).json({ message: "Erreur serveur lors de la récupération des pointages" })
  }
}

// Obtenir tous les pointages (pour l'administrateur ou l'assistante)
exports.getAllAttendance = async (req, res) => {
  try {
    const { startDate, endDate, departement, statut } = req.query

    // Construire la requête
    const query = {}

    // Ajouter les filtres de date si fournis
    if (startDate || endDate) {
      query.date = {}
      if (startDate) {
        query.date.$gte = new Date(startDate)
      }
      if (endDate) {
        const endDateObj = new Date(endDate)
        endDateObj.setHours(23, 59, 59, 999)
        query.date.$lte = endDateObj
      }
    }

    // Ajouter le filtre de statut si fourni
    if (statut) {
      query.statut = statut
    }

    // Si un département est spécifié, récupérer les utilisateurs de ce département
    if (departement) {
      const dept = await Department.findById(departement)
      if (dept) {
        query.utilisateur = { $in: dept.membres }
      }
    }

    // Récupérer les pointages
    const attendances = await Attendance.find(query)
      .sort({ date: -1 })
      .populate("utilisateur", "nom prenom email")
      .populate("enregistrePar", "nom prenom")

    res.status(200).json(attendances)
  } catch (error) {
    console.error("Erreur lors de la récupération des pointages:", error)
    res.status(500).json({ message: "Erreur serveur lors de la récupération des pointages" })
  }
}

// Mettre à jour un pointage
exports.updateAttendance = async (req, res) => {
  try {
    const { heureArrivee, heureDepart, statut, commentaire } = req.body
    const attendanceId = req.params.id

    // Vérifier si le pointage existe
    const attendance = await Attendance.findById(attendanceId)
    if (!attendance) {
      return res.status(404).json({ message: "Pointage non trouvé" })
    }

    // Mettre à jour les champs
    if (heureArrivee) {
      const arrivalTime = new Date(heureArrivee)
      attendance.heureArrivee = arrivalTime

      // Vérifier si l'employé est en retard (après 9h00)
      const arrivalHour = arrivalTime.getHours()
      const arrivalMinutes = arrivalTime.getMinutes()

      if (arrivalHour > 9 || (arrivalHour === 9 && arrivalMinutes > 0)) {
        attendance.statut = "retard"
        if (!commentaire && !attendance.commentaire) {
          attendance.commentaire = "Retard automatiquement détecté par le système"
        }
      }
    }

    if (heureDepart) attendance.heureDepart = new Date(heureDepart)
    if (statut) attendance.statut = statut
    if (commentaire) attendance.commentaire = commentaire

    // Enregistrer les modifications
    await attendance.save()

    // Notifier l'utilisateur de la mise à jour du pointage
    const io = req.app.get("io")
    io.to(attendance.utilisateur.toString()).emit("attendance_updated", {
      message: "Votre pointage a été mis à jour",
      attendance,
    })

    res.status(200).json({
      message: "Pointage mis à jour avec succès",
      attendance,
    })
  } catch (error) {
    console.error("Erreur lors de la mise à jour du pointage:", error)
    res.status(500).json({ message: "Erreur serveur lors de la mise à jour du pointage" })
  }
}

// Supprimer un pointage
exports.deleteAttendance = async (req, res) => {
  try {
    const attendanceId = req.params.id

    // Vérifier si le pointage existe
    const attendance = await Attendance.findById(attendanceId)
    if (!attendance) {
      return res.status(404).json({ message: "Pointage non trouvé" })
    }

    // Supprimer le pointage
    await Attendance.findByIdAndDelete(attendanceId)

    // Notifier l'utilisateur de la suppression du pointage
    const io = req.app.get("io")
    io.to(attendance.utilisateur.toString()).emit("attendance_deleted", {
      message: "Votre pointage a été supprimé",
    })

    res.status(200).json({ message: "Pointage supprimé avec succès" })
  } catch (error) {
    console.error("Erreur lors de la suppression du pointage:", error)
    res.status(500).json({ message: "Erreur serveur lors de la suppression du pointage" })
  }
}

// Importer des pointages depuis un fichier Excel
exports.importAttendance = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Aucun fichier n'a été téléchargé" })
    }

    // Log the req.file object to inspect its properties
    console.log("req.file object:", req.file)

    // Construct the absolute file path
    const filePath = path.resolve(req.file.path)

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      console.error(`File not found at path: ${filePath}`)
      return res.status(500).json({ message: "Fichier non trouvé sur le serveur" })
    }

    const workbook = new excel.Workbook()
    await workbook.xlsx.readFile(filePath)

    const worksheet = workbook.getWorksheet(1)
    const attendances = []
    const errors = []

    // Parcourir les lignes du fichier Excel
    worksheet.eachRow({ includeEmpty: false }, async (row, rowNumber) => {
      // Ignorer la première ligne (en-têtes)
      if (rowNumber === 1) return

      const email = row.getCell(1).value
      const dateStr = row.getCell(2).value
      const heureArriveeStr = row.getCell(3).value
      const heureDepartStr = row.getCell(4).value
      const statut = row.getCell(5).value
      const commentaire = row.getCell(6).value

      try {
        // Trouver l'utilisateur par email
        const user = await User.findOne({ email })
        if (!user) {
          errors.push(`Ligne ${rowNumber}: Utilisateur avec l'email ${email} non trouvé`)
          return
        }

        // Convertir les dates et heures
        const date = new Date(dateStr)
        let heureArrivee = null
        let heureDepart = null

        if (heureArriveeStr) {
          const [hours, minutes] = heureArriveeStr.split(":").map(Number)
          heureArrivee = new Date(date)
          heureArrivee.setHours(hours, minutes, 0, 0)
        }

        if (heureDepartStr) {
          const [hours, minutes] = heureDepartStr.split(":").map(Number)
          heureDepart = new Date(date)
          heureDepart.setHours(hours, minutes, 0, 0)
        }

        // Créer ou mettre à jour le pointage
        const startOfDay = new Date(date)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(date)
        endOfDay.setHours(23, 59, 59, 999)

        let attendance = await Attendance.findOne({
          utilisateur: user._id,
          date: {
            $gte: startOfDay,
            $lte: endOfDay,
          },
        })

        if (!attendance) {
          attendance = new Attendance({
            utilisateur: user._id,
            date,
            enregistrePar: req.user.id,
          })
        }

        if (heureArrivee) {
          attendance.heureArrivee = heureArrivee

          // Vérifier si l'employé est en retard (après 9h00)
          const arrivalHour = heureArrivee.getHours()
          const arrivalMinutes = heureArrivee.getMinutes()

          if (arrivalHour > 9 || (arrivalHour === 9 && arrivalMinutes > 0)) {
            attendance.statut = "retard"
            if (!commentaire && !attendance.commentaire) {
              attendance.commentaire = "Retard automatiquement détecté par le système"
            }
          }
        }

        if (heureDepart) attendance.heureDepart = heureDepart
        if (statut) attendance.statut = statut
        if (commentaire) attendance.commentaire = commentaire

        await attendance.save()
        attendances.push(attendance)
      } catch (error) {
        errors.push(`Ligne ${rowNumber}: ${error.message}`)
      }
    })

    // Supprimer le fichier temporaire
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error("Erreur lors de la suppression du fichier temporaire:", err)
      }
    })

    res.status(200).json({
      message: "Importation des pointages terminée",
      attendances,
      errors: errors.length > 0 ? errors : null,
    })
  } catch (error) {
    console.error("Erreur lors de l'importation des pointages:", error)

    // Supprimer le fichier temporaire en cas d'erreur
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlink(req.file.path, (err) => {
        if (err) {
          console.error("Erreur lors de la suppression du fichier temporaire:", err)
        }
      })
    }

    res.status(500).json({ message: "Erreur serveur lors de l'importation des pointages" })
  }
}

// Générer un rapport de pointage
exports.generateReport = async (req, res) => {
  try {
    const { startDate, endDate, departement, format } = req.query

    // Vérifier les dates
    if (!startDate || !endDate) {
      return res.status(400).json({ message: "Les dates de début et de fin sont requises" })
    }

    // Construire la requête
    const query = {
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    }

    // Si un département est spécifié, récupérer les utilisateurs de ce département
    if (departement) {
      const dept = await Department.findById(departement)
      if (dept) {
        query.utilisateur = { $in: dept.membres }
      }
    }

    // Récupérer les pointages
    const attendances = await Attendance.find(query)
      .sort({ date: 1 })
      .populate("utilisateur", "nom prenom email")
      .populate("enregistrePar", "nom prenom")

    // Générer le rapport selon le format demandé
    if (format === "excel") {
      // Créer un nouveau classeur Excel
      const workbook = new excel.Workbook()
      const worksheet = workbook.addWorksheet("Rapport de pointage")

      // Définir les en-têtes
      worksheet.columns = [
        { header: "Nom", key: "nom", width: 20 },
        { header: "Prénom", key: "prenom", width: 20 },
        { header: "Email", key: "email", width: 30 },
        { header: "Date", key: "date", width: 15 },
        { header: "Heure d'arrivée", key: "heureArrivee", width: 15 },
        { header: "Heure de départ", key: "heureDepart", width: 15 },
        { header: "Statut", key: "statut", width: 15 },
        { header: "Commentaire", key: "commentaire", width: 30 },
        { header: "Enregistré par", key: "enregistrePar", width: 20 },
      ]

      // Ajouter les données
      attendances.forEach((att) => {
        worksheet.addRow({
          nom: att.utilisateur?.nom || "",
          prenom: att.utilisateur?.prenom || "",
          email: att.utilisateur?.email || "",
          date: moment(att.date).format("DD/MM/YYYY"),
          heureArrivee: att.heureArrivee ? moment(att.heureArrivee).format("HH:mm") : "",
          heureDepart: att.heureDepart ? moment(att.heureDepart).format("HH:mm") : "",
          statut: att.statut,
          commentaire: att.commentaire || "",
          enregistrePar: att.enregistrePar ? `${att.enregistrePar.prenom} ${att.enregistrePar.nom}` : "",
        })
      })

      // Créer le dossier de rapports s'il n'existe pas
      const reportsDir = path.join(__dirname, "..", "reports")
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true })
      }

      // Générer un nom de fichier unique
      const fileName = `rapport_pointage_${moment().format("YYYYMMDD_HHmmss")}.xlsx`
      const filePath = path.join(reportsDir, fileName)

      // Enregistrer le fichier
      await workbook.xlsx.writeFile(filePath)

      // Envoyer le fichier
      res.download(filePath, fileName, (err) => {
        if (err) {
          console.error("Erreur lors de l'envoi du fichier:", err)
          return res.status(500).json({ message: "Erreur lors de l'envoi du fichier" })
        }

        // Supprimer le fichier après l'envoi
        fs.unlinkSync(filePath)
      })
    } else {
      // Format JSON par défaut
      res.status(200).json(attendances)
    }
  } catch (error) {
    console.error("Erreur lors de la génération du rapport:", error)
    res.status(500).json({ message: "Erreur serveur lors de la génération du rapport" })
  }
}
