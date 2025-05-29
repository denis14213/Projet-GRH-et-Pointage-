// Service pour les tâches planifiées
const cron = require("node-cron")
const User = require("../models/User")
const Attendance = require("../models/Attendance")
const nodemailer = require("nodemailer")
const moment = require("moment")

// Configuration du transporteur d'email
const createTransporter = () => {
  // Vérifier si les variables d'environnement sont définies
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.warn("ATTENTION: Variables d'environnement EMAIL_USER ou EMAIL_PASSWORD non définies")
    return null
  }

  // Créer le transporteur
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    debug: process.env.NODE_ENV === "development",
    logger: process.env.NODE_ENV === "development",
  })
}

// Fonction pour envoyer un email de rappel
const sendReminderEmail = async (user) => {
  try {
    const transporter = createTransporter()
    if (!transporter) {
      console.warn(`Impossible d'envoyer un rappel à ${user.email}: Configuration email manquante`)
      return false
    }

    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Rappel de pointage",
      html: `
        <h2>Rappel de pointage</h2>
        <p>Bonjour ${user.prenom} ${user.nom},</p>
        <p>Nous n'avons pas encore enregistré votre pointage pour aujourd'hui.</p>
        <p>Veuillez vous connecter à l'application pour effectuer votre pointage ou contacter votre responsable si vous êtes absent(e).</p>
        <p>Cordialement,<br>Le système de gestion RH</p>
      `,
    })

    console.log(`Email de rappel envoyé à ${user.email}: ${info.messageId}`)
    return true
  } catch (error) {
    console.error(`Erreur lors de l'envoi du rappel à ${user.email}:`, error)
    return false
  }
}

// Tâche planifiée pour envoyer des rappels à 10h00
const scheduleAttendanceReminders = (io) => {
  // Exécuter tous les jours à 10h00
  cron.schedule(
    "0 10 * * 1-5",
    async () => {
      console.log("Exécution de la tâche de rappel de pointage à 10h00")

      try {
        // Obtenir la date du jour
        const today = new Date()
        const startOfDay = new Date(today.setHours(0, 0, 0, 0))
        const endOfDay = new Date(today.setHours(23, 59, 59, 999))

        // Récupérer tous les utilisateurs actifs
        const activeUsers = await User.find({ actif: true })

        // Pour chaque utilisateur actif
        for (const user of activeUsers) {
          // Vérifier si l'utilisateur a déjà pointé aujourd'hui
          const attendance = await Attendance.findOne({
            utilisateur: user._id,
            date: { $gte: startOfDay, $lte: endOfDay },
            heureArrivee: { $exists: true, $ne: null },
          })

          // Si l'utilisateur n'a pas encore pointé, envoyer un rappel
          if (!attendance) {
            await sendReminderEmail(user)

            // Envoyer également une notification en temps réel
            io.to(user._id.toString()).emit("attendance_reminder", {
              message: "N'oubliez pas de pointer votre présence aujourd'hui",
            })

            console.log(`Rappel envoyé à ${user.prenom} ${user.nom} (${user.email})`)
          }
        }

        console.log("Tâche de rappel de pointage terminée")
      } catch (error) {
        console.error("Erreur lors de l'exécution de la tâche de rappel:", error)
      }
    },
    {
      timezone: "Europe/Paris", // Ajuster selon votre fuseau horaire
    },
  )
}

// Tâche planifiée pour marquer les absences à 23h00
const scheduleAbsenceMarking = (io) => {
  // Exécuter tous les jours à 23h00
  cron.schedule(
    "0 23 * * 1-5",
    async () => {
      console.log("Exécution de la tâche de marquage des absences à 23h00")

      try {
        // Obtenir la date du jour
        const today = new Date()
        const startOfDay = new Date(today.setHours(0, 0, 0, 0))
        const endOfDay = new Date(today.setHours(23, 59, 59, 999))

        // Récupérer tous les utilisateurs actifs
        const activeUsers = await User.find({ actif: true })

        // Pour chaque utilisateur actif
        for (const user of activeUsers) {
          // Vérifier si l'utilisateur a déjà un pointage aujourd'hui
          let attendance = await Attendance.findOne({
            utilisateur: user._id,
            date: { $gte: startOfDay, $lte: endOfDay },
          })

          // Si aucun pointage n'existe, créer un pointage avec statut "absent"
          if (!attendance) {
            attendance = new Attendance({
              utilisateur: user._id,
              date: today,
              statut: "absent",
              commentaire: "Absence automatiquement enregistrée par le système",
            })

            await attendance.save()

            // Envoyer une notification en temps réel
            io.to(user._id.toString()).emit("attendance_marked_absent", {
              message: "Vous avez été marqué absent aujourd'hui",
            })

            console.log(`${user.prenom} ${user.nom} (${user.email}) marqué comme absent`)
          }
          // Si un pointage existe mais sans heure d'arrivée, le marquer comme absent
          else if (!attendance.heureArrivee) {
            attendance.statut = "absent"
            attendance.commentaire = "Absence automatiquement enregistrée par le système"
            await attendance.save()

            console.log(`${user.prenom} ${user.nom} (${user.email}) marqué comme absent (pointage existant)`)
          }
        }

        console.log("Tâche de marquage des absences terminée")
      } catch (error) {
        console.error("Erreur lors de l'exécution de la tâche de marquage des absences:", error)
      }
    },
    {
      timezone: "Europe/Paris", // Ajuster selon votre fuseau horaire
    },
  )
}

// Exporter les fonctions pour les utiliser dans server.js
module.exports = {
  scheduleAttendanceReminders,
  scheduleAbsenceMarking,
}
