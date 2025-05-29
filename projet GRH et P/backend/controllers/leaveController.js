// Contrôleur pour la gestion des congés
const Leave = require("../models/Leave")
const User = require("../models/User")
const Department = require("../models/Department")
const nodemailer = require("nodemailer")
const { google } = require("googleapis")
const moment = require("moment")
const excel = require("exceljs")
const fs = require("fs")
const path = require("path")

// Configuration du transporteur d'email
const createTransporter = () => {
  // Vérifier si les variables d'environnement sont définies
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.warn("ATTENTION: Variables d'environnement EMAIL_USER ou EMAIL_PASSWORD non définies")
    return null
  }

  // Créer le transporteur avec plus d'options de débogage
  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    debug: true, // Active le débogage
    logger: true, // Active la journalisation
  })

  // Vérifier la connexion au serveur SMTP avant d'envoyer
  transporter.verify((error, success) => {
    if (error) {
      console.error("Erreur de connexion au serveur SMTP:", error)
    } else {
      console.log("Connexion au serveur SMTP réussie")
    }
  })

  return transporter
}

// Configuration de l'API Google Calendar
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI,
)

// Fonction pour calculer le nombre de jours ouvrables entre deux dates
const calculateWorkingDays = (startDate, endDate) => {
  let count = 0
  const start = moment(startDate)
  const end = moment(endDate)

  // Cloner la date de début pour ne pas la modifier
  const current = start.clone()

  // Compter les jours ouvrables (lundi à vendredi)
  while (current.isSameOrBefore(end, "day")) {
    // 0 = dimanche, 6 = samedi
    if (current.day() !== 0 && current.day() !== 6) {
      count++
    }
    current.add(1, "day")
  }

  return count
}

// Fonction pour ajouter un événement au calendrier Google de l'utilisateur
const addToUserGoogleCalendar = async (user, leave) => {
  try {
    // Vérifier si l'utilisateur a un token Google Calendar
    if (!user.googleRefreshToken) {
      console.log(`L'utilisateur ${user.email} n'a pas de token Google Calendar`)
      return null
    }

    // Configurer le client OAuth2 avec le token de l'utilisateur
    oauth2Client.setCredentials({
      refresh_token: user.googleRefreshToken,
    })

    const calendar = google.calendar({ version: "v3", auth: oauth2Client })

    // Créer l'événement
    const event = {
      summary: `Congé - ${leave.typeConge}`,
      description: `Type: ${leave.typeConge}\nMotif: ${leave.motif}\nStatut: ${leave.statut}`,
      start: {
        date: moment(leave.dateDebut).format("YYYY-MM-DD"),
        timeZone: "Europe/Paris",
      },
      end: {
        date: moment(leave.dateFin).add(1, "days").format("YYYY-MM-DD"),
        timeZone: "Europe/Paris",
      },
      colorId: leave.typeConge === "annuel" ? "2" : "4", // Bleu pour congé annuel, rouge pour maladie
      // Stocker l'ID de la demande de congé dans les propriétés étendues
      extendedProperties: {
        private: {
          leaveId: leave._id.toString(),
        },
      },
    }

    // Ajouter l'événement au calendrier de l'utilisateur
    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
    })

    console.log(`Événement créé dans le calendrier de ${user.email}: ${response.data.htmlLink}`)

    // Stocker l'ID de l'événement Google Calendar dans la demande de congé
    leave.googleEventId = response.data.id
    await leave.save()

    return response.data
  } catch (error) {
    console.error(`Erreur lors de l'ajout au calendrier Google de ${user.email}:`, error)
    return null
  }
}

// Fonction pour mettre à jour un événement dans le calendrier Google de l'utilisateur
const updateUserGoogleCalendarEvent = async (user, leave) => {
  try {
    // Vérifier si l'utilisateur a un token Google Calendar et si la demande a un ID d'événement
    if (!user.googleRefreshToken || !leave.googleEventId) {
      console.log(`Impossible de mettre à jour l'événement pour ${user.email}`)
      return null
    }

    // Configurer le client OAuth2 avec le token de l'utilisateur
    oauth2Client.setCredentials({
      refresh_token: user.googleRefreshToken,
    })

    const calendar = google.calendar({ version: "v3", auth: oauth2Client })

    // Mettre à jour l'événement
    const event = {
      summary: `Congé - ${leave.typeConge}`,
      description: `Type: ${leave.typeConge}\nMotif: ${leave.motif}\nStatut: ${leave.statut}`,
      start: {
        date: moment(leave.dateDebut).format("YYYY-MM-DD"),
        timeZone: "Europe/Paris",
      },
      end: {
        date: moment(leave.dateFin).add(1, "days").format("YYYY-MM-DD"),
        timeZone: "Europe/Paris",
      },
      colorId: leave.typeConge === "annuel" ? "2" : "4", // Bleu pour congé annuel, rouge pour maladie
      // Stocker l'ID de la demande de congé dans les propriétés étendues
      extendedProperties: {
        private: {
          leaveId: leave._id.toString(),
        },
      },
    }

    // Mettre à jour l'événement dans le calendrier de l'utilisateur
    const response = await calendar.events.update({
      calendarId: "primary",
      eventId: leave.googleEventId,
      requestBody: event,
    })

    console.log(`Événement mis à jour dans le calendrier de ${user.email}: ${response.data.htmlLink}`)
    return response.data
  } catch (error) {
    console.error(`Erreur lors de la mise à jour de l'événement dans le calendrier Google de ${user.email}:`, error)
    return null
  }
}

// Fonction pour supprimer un événement du calendrier Google de l'utilisateur
const deleteUserGoogleCalendarEvent = async (user, leave) => {
  try {
    // Vérifier si l'utilisateur a un token Google Calendar et si la demande a un ID d'événement
    if (!user.googleRefreshToken || !leave.googleEventId) {
      console.log(`Impossible de supprimer l'événement pour ${user.email}`)
      return false
    }

    // Configurer le client OAuth2 avec le token de l'utilisateur
    oauth2Client.setCredentials({
      refresh_token: user.googleRefreshToken,
    })

    const calendar = google.calendar({ version: "v3", auth: oauth2Client })

    // Supprimer l'événement du calendrier de l'utilisateur
    await calendar.events.delete({
      calendarId: "primary",
      eventId: leave.googleEventId,
    })

    console.log(`Événement supprimé du calendrier de ${user.email}`)

    // Supprimer l'ID de l'événement Google Calendar de la demande de congé
    leave.googleEventId = undefined
    await leave.save()

    return true
  } catch (error) {
    console.error(`Erreur lors de la suppression de l'événement du calendrier Google de ${user.email}:`, error)
    return false
  }
}

// Demander un congé
exports.requestLeave = async (req, res) => {
  try {
    const { typeConge, dateDebut, dateFin, motif } = req.body
    const userId = req.user.id

    // Vérifier si l'utilisateur existe
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" })
    }

    // Calculer le nombre de jours ouvrables
    const startDate = new Date(dateDebut)
    const endDate = new Date(dateFin)
    const nombreJours = calculateWorkingDays(startDate, endDate)

    // Vérifier si l'utilisateur a assez de jours de congés (sauf pour les congés maladie)
    if (typeConge === "annuel" && nombreJours > user.soldeConges) {
      return res.status(400).json({
        message: "Solde de congés insuffisant",
        soldeActuel: user.soldeConges,
        joursdemandes: nombreJours,
      })
    }

    // Créer la demande de congé
    const newLeave = new Leave({
      utilisateur: userId,
      typeConge,
      dateDebut: startDate,
      dateFin: endDate,
      nombreJours,
      motif,
      statut: "en_attente",
    })

    await newLeave.save()

    // Trouver le manager du département de l'utilisateur
    let managerEmail = null
    if (user.departement) {
      const department = await Department.findById(user.departement).populate("manager", "email")
      if (department && department.manager) {
        managerEmail = department.manager.email
      }
    }

    // Envoyer un email au manager si trouvé
    if (managerEmail) {
      const transporter = createTransporter()
      if (transporter) {
        try {
          await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: managerEmail,
            subject: "Nouvelle demande de congé",
            html: `
             <h1>Nouvelle demande de congé</h1>
             <p><strong>Employé :</strong> ${user.prenom} ${user.nom}</p>
             <p><strong>Type de congé :</strong> ${typeConge}</p>
             <p><strong>Date de début :</strong> ${moment(startDate).format("DD/MM/YYYY")}</p>
             <p><strong>Date de fin :</strong> ${moment(endDate).format("DD/MM/YYYY")}</p>
             <p><strong>Nombre de jours :</strong> ${nombreJours}</p>
             <p><strong>Motif :</strong> ${motif}</p>
             <p>Veuillez vous connecter à la plateforme pour approuver ou refuser cette demande.</p>
           `,
          })
        } catch (emailError) {
          console.error("Erreur lors de l'envoi de l'email:", emailError)
          return res.status(500).json({ message: "Erreur lors de l'envoi de l'email" })
        }
      } else {
        return res.status(500).json({ message: "Erreur lors de la création du transporteur d'email" })
      }
    }

    // Notifier l'utilisateur de la création de la demande
    const io = req.app.get("io")
    io.to(userId).emit("leave_requested", {
      message: "Votre demande de congé a été créée avec succès",
      leave: newLeave,
    })

    res.status(201).json({
      message: "Demande de congé créée avec succès",
      leave: newLeave,
    })
  } catch (error) {
    console.error("Erreur lors de la création de la demande de congé:", error)
    res.status(500).json({ message: "Erreur serveur lors de la création de la demande de congé" })
  }
}

// Obtenir les congés de l'utilisateur connecté
exports.getUserLeaves = async (req, res) => {
  try {
    const userId = req.user.id

    const leaves = await Leave.find({ utilisateur: userId })
      .sort({ dateCreation: -1 })
      .populate("approuvePar", "nom prenom")

    res.status(200).json(leaves)
  } catch (error) {
    console.error("Erreur lors de la récupération des congés:", error)
    res.status(500).json({ message: "Erreur serveur lors de la récupération des congés" })
  }
}

// Ajouter la fonction pour obtenir une demande de congé par ID après la fonction getUserLeaves

// Obtenir une demande de congé par ID
exports.getLeaveById = async (req, res) => {
  try {
    const leaveId = req.params.id
    const userId = req.user.id
    const userRole = req.user.role

    // Trouver la demande de congé
    const leave = await Leave.findById(leaveId)
      .populate("utilisateur", "nom prenom email departement photoProfil googleRefreshToken")
      .populate("approuvePar", "nom prenom")

    if (!leave) {
      return res.status(404).json({ message: "Demande de congé non trouvée" })
    }

    // Vérifier les permissions
    // L'administrateur, le manager et l'assistant peuvent voir toutes les demandes
    // L'utilisateur peut voir ses propres demandes
    if (
      userRole !== "admin" &&
      userRole !== "manager" &&
      userRole !== "assistant" &&
      userRole !== "employee" &&
      leave.utilisateur._id.toString() !== userId
    ) {
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à voir cette demande de congé" })
    }

    // Si l'utilisateur est un manager, vérifier qu'il gère le département de l'employé
    if (userRole === "manager") {
      const manager = await User.findById(userId).populate("departement")
      const employee = await User.findById(leave.utilisateur._id).populate("departement")

      if (
        !manager.departement ||
        !employee.departement ||
        manager.departement._id.toString() !== employee.departement._id.toString()
      ) {
        return res.status(403).json({
          message: "Vous n'êtes pas autorisé à voir cette demande de congé",
        })
      }
    }

    // Récupérer les informations complètes du département de l'utilisateur
    if (leave.utilisateur && leave.utilisateur.departement) {
      const dept = await Department.findById(leave.utilisateur.departement)
      if (dept) {
        leave.utilisateur.departement = dept
      }
    }

    res.status(200).json(leave)
  } catch (error) {
    console.error("Erreur lors de la récupération de la demande de congé:", error)
    res.status(500).json({ message: "Erreur serveur lors de la récupération de la demande de congé" })
  }
}

// Obtenir tous les congés (pour l'administrateur ou le manager)
exports.getAllLeaves = async (req, res) => {
  try {
    const { statut, departement, startDate, endDate } = req.query
    const userId = req.user.id
    const userRole = req.user.role

    // Construire la requête
    const query = {}

    // Filtrer par statut si fourni
    if (statut) query.statut = statut

    // Filtrer par date si fournies
    if (startDate || endDate) {
      query.dateDebut = {}
      if (startDate) {
        query.dateDebut.$gte = new Date(startDate)
      }
      if (endDate) {
        query.dateFin = { $lte: new Date(endDate) }
      }
    }

    // Restrict access based on user role
    if (userRole === "admin" || userRole === "assistant") {
      // Optionally filter by department if provided
      if (departement) {
        const deptUsers = await User.find({ departement })
        const userIds = deptUsers.map((user) => user._id)
        query.utilisateur = { $in: userIds }
      }
    } else if (userRole === "manager") {
      // For managers, only show leaves from their department
      const manager = await User.findById(userId).populate("departement")
      if (manager && manager.departement) {
        const deptUsers = await User.find({ departement: manager.departement._id })
        const userIds = deptUsers.map((user) => user._id)
        query.utilisateur = { $in: userIds }
      } else {
        // If the manager doesn't have a department, return an empty array
        return res.status(200).json([])
      }
    } else {
      // For other roles (e.g., employee), only show their own leaves
      query.utilisateur = userId
    }

    const leaves = await Leave.find(query)
      .sort({ dateCreation: -1 })
      .populate("utilisateur", "nom prenom email departement photoProfil googleRefreshToken")
      .populate("approuvePar", "nom prenom")

    // Pour chaque congé, ajouter le département de l'utilisateur
    const leavesWithDept = await Promise.all(
      leaves.map(async (leave) => {
        if (leave.utilisateur && leave.utilisateur.departement) {
          const dept = await Department.findById(leave.utilisateur.departement)
          if (dept) {
            leave.utilisateur.departement = dept
          }
        }
        return leave
      }),
    )

    res.status(200).json(leavesWithDept)
  } catch (error) {
    console.error("Erreur lors de la récupération des congés:", error)
    res.status(500).json({ message: "Erreur serveur lors de la récupération des congés" })
  }
}

// Obtenir un congé par ID
// exports.getLeaveById = async (req, res) => {
//   try {
//     const leaveId = req.params.id
//     const leave = await Leave.findById(leaveId)
//       .populate("utilisateur", "nom prenom email departement photoProfil")
//       .populate("approuvePar", "nom prenom")

//     if (!leave) {
//       return res.status(404).json({ message: "Demande de congé non trouvée" })
//     }

//     res.status(200).json(leave)
//   } catch (error) {
//     console.error("Erreur lors de la récupération de la demande de congé:", error)
//     res.status(500).json({ message: "Erreur serveur lors de la récupération de la demande de congé" })
//   }
// }

// Approuver ou refuser une demande de congé
exports.updateLeaveStatus = async (req, res) => {
  try {
    const { statut, commentaire } = req.body
    const leaveId = req.params.id
    const userId = req.user.id
    const userRole = req.user.role

    // Vérifier si la demande existe
    const leave = await Leave.findById(leaveId).populate("utilisateur")
    if (!leave) {
      return res.status(404).json({ message: "Demande de congé non trouvée" })
    }

    // Vérifier si la demande est déjà traitée définitivement
    if (leave.statut === "approuve" || leave.statut === "refuse") {
      return res.status(400).json({ message: "Cette demande a déjà été traitée définitivement" })
    }

    // Vérifier les permissions selon le rôle
    if (userRole === "manager") {
      // Le manager ne peut que passer à "approuve_manager" ou "refuse"
      if (statut === "approuve") {
        return res.status(400).json({ message: "Un manager ne peut pas approuver définitivement une demande" })
      }

      // Récupérer le département du manager
      const manager = await User.findById(userId).populate("departement")
      if (!manager.departement) {
        return res.status(403).json({ message: "Vous n'êtes pas assigné à un département" })
      }

      // Récupérer le département de l'employé
      const employee = await User.findById(leave.utilisateur._id).populate("departement")
      if (!employee.departement) {
        return res.status(403).json({ message: "L'employé n'est pas assigné à un département" })
      }

      // Vérifier si l'employé appartient au département du manager
      if (manager.departement._id.toString() !== employee.departement._id.toString()) {
        return res.status(403).json({
          message: "Vous ne pouvez approuver que les congés des membres de votre département",
        })
      }

      // Si le manager approuve, passer au statut intermédiaire
      if (statut === "approuve_manager" && leave.statut === "en_attente") {
        leave.statut = "approuve_manager"
      } else if (statut === "refuse") {
        leave.statut = "refuse"
      }
    } else if (userRole === "admin") {
      // L'admin peut approuver définitivement ou refuser
      // L'admin ne peut approuver définitivement que si le manager a déjà approuvé
      if (statut === "approuve" && leave.statut !== "approuve_manager") {
        return res.status(400).json({
          message: "La demande doit d'abord être approuvée par un manager avant l'approbation finale",
        })
      }

      leave.statut = statut
    } else {
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à traiter cette demande" })
    }

    // Si le statut est "refuse", vérifier qu'un commentaire est fourni
    if (statut === "refuse" && !commentaire) {
      return res.status(400).json({ message: "Un motif de refus est requis" })
    }

    // Mettre à jour les informations de la demande
    leave.commentaire = commentaire
    leave.approuvePar = userId
    leave.dateApprobation = new Date()

    // Récupérer l'utilisateur complet pour accéder à son token Google Calendar
    const user = await User.findById(leave.utilisateur._id)

    // Si le congé est approuvé définitivement
    if (statut === "approuve") {
      // Si c'est un congé annuel, déduire du solde de congés
      if (leave.typeConge === "annuel") {
        if (user) {
          user.soldeConges -= leave.nombreJours
          await user.save()
        }
      }

      // Ajouter l'événement au calendrier Google de l'utilisateur
      if (user && user.googleRefreshToken) {
        await addToUserGoogleCalendar(user, leave)
      }
    }
    // Si le congé est refusé et qu'il avait déjà un événement dans le calendrier
    else if (statut === "refuse" && leave.googleEventId) {
      // Supprimer l'événement du calendrier Google de l'utilisateur
      if (user && user.googleRefreshToken) {
        await deleteUserGoogleCalendarEvent(user, leave)
      }
    }

    await leave.save()

    // Envoyer un email à l'utilisateur
    try {
      const transporter = createTransporter()
      if (transporter) {
        let emailSubject = ""
        let emailContent = ""

        if (statut === "approuve_manager") {
          emailSubject = "Votre demande de congé a été approuvée par votre manager"
          emailContent = `
            <h1>Mise à jour de votre demande de congé</h1>
            <p>Bonjour ${leave.utilisateur.prenom} ${leave.utilisateur.nom},</p>
            <p>Votre demande de congé du ${moment(leave.dateDebut).format("DD/MM/YYYY")} au ${moment(leave.dateFin).format("DD/MM/YYYY")} a été approuvée par votre manager.</p>
            <p>Elle est maintenant en attente d'approbation finale par l'administration.</p>
            ${commentaire ? `<p><strong>Commentaire :</strong> ${commentaire}</p>` : ""}
            <p>Type de congé: ${leave.typeConge}</p>
            <p>Nombre de jours: ${leave.nombreJours}</p>
            <p>Vous pouvez consulter les détails sur la plateforme.</p>
            <p>Cordialement,<br>L'équipe RH</p>
          `
        } else if (statut === "approuve") {
          emailSubject = "Votre demande de congé a été définitivement approuvée"
          emailContent = `
            <h1>Mise à jour de votre demande de congé</h1>
            <p>Bonjour ${leave.utilisateur.prenom} ${leave.utilisateur.nom},</p>
            <p>Votre demande de congé du ${moment(leave.dateDebut).format("DD/MM/YYYY")} au ${moment(leave.dateFin).format("DD/MM/YYYY")} a été définitivement approuvée.</p>
            ${commentaire ? `<p><strong>Commentaire :</strong> ${commentaire}</p>` : ""}
            <p>Type de congé: ${leave.typeConge}</p>
            <p>Nombre de jours: ${leave.nombreJours}</p>
            ${leave.typeConge === "annuel" ? `<p>Votre solde de congés a été mis à jour en conséquence.</p>` : ""}
            <p>Vous pouvez consulter les détails sur la plateforme.</p>
            <p>Cordialement,<br>L'équipe RH</p>
          `
        } else if (statut === "refuse") {
          emailSubject = "Votre demande de congé a été refusée"
          emailContent = `
            <h1>Mise à jour de votre demande de congé</h1>
            <p>Bonjour ${leave.utilisateur.prenom} ${leave.utilisateur.nom},</p>
            <p>Votre demande de congé du ${moment(leave.dateDebut).format("DD/MM/YYYY")} au ${moment(leave.dateFin).format("DD/MM/YYYY")} a été refusée.</p>
            <p><strong>Motif du refus :</strong> ${commentaire}</p>
            <p>Type de congé: ${leave.typeConge}</p>
            <p>Nombre de jours: ${leave.nombreJours}</p>
            <p>Vous pouvez consulter les détails sur la plateforme.</p>
            <p>Cordialement,<br>L'équipe RH</p>
          `
        }

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: leave.utilisateur.email,
          subject: emailSubject,
          html: emailContent,
        })
        console.log(`Email envoyé à ${leave.utilisateur.email} concernant sa demande de congé`)

        // Si le statut est "approuve_manager", envoyer également une notification aux administrateurs
        if (statut === "approuve_manager") {
          const admins = await User.find({ role: "admin" })
          if (admins.length > 0) {
            const adminEmails = admins.map((admin) => admin.email)

            await transporter.sendMail({
              from: process.env.EMAIL_USER,
              to: adminEmails.join(", "),
              subject: "Nouvelle demande de congé à approuver",
              html: `
                <h1>Nouvelle demande de congé en attente d'approbation finale</h1>
                <p>Une demande de congé a été approuvée par un manager et nécessite votre approbation finale.</p>
                <p><strong>Employé :</strong> ${leave.utilisateur.prenom} ${leave.utilisateur.nom}</p>
                <p><strong>Type de congé :</strong> ${leave.typeConge}</p>
                <p><strong>Date de début :</strong> ${moment(leave.dateDebut).format("DD/MM/YYYY")}</p>
                <p><strong>Date de fin :</strong> ${moment(leave.dateFin).format("DD/MM/YYYY")}</p>
                <p><strong>Nombre de jours :</strong> ${leave.nombreJours}</p>
                <p><strong>Motif :</strong> ${leave.motif}</p>
                <p>Veuillez vous connecter à la plateforme pour approuver ou refuser cette demande.</p>
              `,
            })
          }
        }
      } else {
        console.error("Erreur lors de la création du transporteur d'email")
      }
    } catch (emailError) {
      console.error("Erreur lors de l'envoi de l'email:", emailError)
      // Ne pas bloquer le processus si l'email échoue
    }

    // Notifier l'utilisateur de la mise à jour
    const io = req.app.get("io")
    io.to(leave.utilisateur._id.toString()).emit("leave_status_updated", {
      message: `Votre demande de congé a été ${
        statut === "approuve"
          ? "définitivement approuvée"
          : statut === "approuve_manager"
            ? "approuvée par votre manager"
            : "refus��e"
      }`,
      leave,
      statut,
      commentaire,
    })

    // Si le statut est "approuve_manager", notifier également les administrateurs
    if (statut === "approuve_manager") {
      const admins = await User.find({ role: "admin" })
      admins.forEach((admin) => {
        io.to(admin._id.toString()).emit("leave_pending_admin_approval", {
          message: "Nouvelle demande de congé en attente d'approbation finale",
          leave,
        })
      })
    }

    res.status(200).json({
      message: `Demande de congé ${
        statut === "approuve"
          ? "définitivement approuvée"
          : statut === "approuve_manager"
            ? "approuvée par le manager"
            : "refusée"
      } avec succès`,
      leave,
    })
  } catch (error) {
    console.error("Erreur lors de la mise à jour du statut de la demande:", error)
    res.status(500).json({ message: "Erreur serveur lors de la mise à jour du statut de la demande" })
  }
}

// Annuler une demande de congé
exports.cancelLeave = async (req, res) => {
  try {
    const leaveId = req.params.id
    const userId = req.user.id
    const userRole = req.user.role

    // Vérifier si la demande existe
    const leave = await Leave.findById(leaveId)
    if (!leave) {
      return res.status(404).json({ message: "Demande de congé non trouvée" })
    }

    // Vérifier si l'utilisateur est le propriétaire de la demande ou un admin
    if (leave.utilisateur.toString() !== userId && userRole !== "admin") {
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à annuler cette demande" })
    }

    // Récupérer l'utilisateur complet pour accéder à son token Google Calendar
    const user = await User.findById(leave.utilisateur)

    // Vérifier si la demande est déjà traitée
    if (leave.statut === "approuve") {
      // Si le congé était approuvé, recréditer les jours de congés
      if (leave.typeConge === "annuel") {
        if (user) {
          user.soldeConges += leave.nombreJours
          await user.save()
        }
      }

      // Supprimer l'événement du calendrier Google de l'utilisateur
      if (user && user.googleRefreshToken && leave.googleEventId) {
        await deleteUserGoogleCalendarEvent(user, leave)
      }
    }

    // Supprimer la demande
    await Leave.findByIdAndDelete(leaveId)

    // Notifier l'utilisateur de l'annulation
    const io = req.app.get("io")
    io.to(leave.utilisateur.toString()).emit("leave_canceled", {
      message: "Votre demande de congé a été annulée",
      leaveId,
    })

    res.status(200).json({ message: "Demande de congé annulée avec succès" })
  } catch (error) {
    console.error("Erreur lors de l'annulation de la demande:", error)
    res.status(500).json({ message: "Erreur serveur lors de l'annulation de la demande" })
  }
}

// Mettre à jour une demande de congé
exports.updateLeave = async (req, res) => {
  try {
    const { typeConge, dateDebut, dateFin, motif } = req.body
    const leaveId = req.params.id
    const userId = req.user.id
    const userRole = req.user.role

    // Vérifier si la demande existe
    const leave = await Leave.findById(leaveId)
    if (!leave) {
      return res.status(404).json({ message: "Demande de congé non trouvée" })
    }

    // Vérifier si l'utilisateur est le propriétaire de la demande ou un admin
    if (leave.utilisateur.toString() !== userId && userRole !== "admin") {
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à modifier cette demande" })
    }

    // Vérifier si la demande est déjà traitée
    if (leave.statut !== "en_attente" && userRole !== "admin") {
      return res.status(400).json({ message: "Vous ne pouvez pas modifier une demande déjà traitée" })
    }

    // Calculer le nombre de jours ouvrables
    const startDate = new Date(dateDebut)
    const endDate = new Date(dateFin)
    const nombreJours = calculateWorkingDays(startDate, endDate)

    // Vérifier si l'utilisateur a assez de jours de congés (sauf pour les congés maladie)
    if (typeConge === "annuel" && leave.typeConge !== "annuel") {
      const user = await User.findById(userId)
      if (user && nombreJours > user.soldeConges) {
        return res.status(400).json({
          message: "Solde de congés insuffisant",
          soldeActuel: user.soldeConges,
          joursdemandes: nombreJours,
        })
      }
    }

    // Mettre à jour la demande
    leave.typeConge = typeConge
    leave.dateDebut = startDate
    leave.dateFin = endDate
    leave.nombreJours = nombreJours
    leave.motif = motif

    await leave.save()

    // Si la demande était déjà approuvée, mettre à jour l'événement dans le calendrier Google
    if (leave.statut === "approuve") {
      const user = await User.findById(leave.utilisateur)
      if (user && user.googleRefreshToken && leave.googleEventId) {
        await updateUserGoogleCalendarEvent(user, leave)
      }
    }

    res.status(200).json({
      message: "Demande de congé mise à jour avec succès",
      leave,
    })
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la demande de congé:", error)
    res.status(500).json({ message: "Erreur serveur lors de la mise à jour de la demande de congé" })
  }
}

// Générer un rapport de congés
exports.generateReport = async (req, res) => {
  try {
    const { startDate, endDate, departement, format } = req.query

    // Vérifier les dates
    if (!startDate || !endDate) {
      return res.status(400).json({ message: "Les dates de début et de fin sont requises" })
    }

    // Construire la requête
    const query = {
      dateDebut: { $gte: new Date(startDate) },
      dateFin: { $lte: new Date(endDate) },
    }

    // Si un département est spécifié, récupérer les utilisateurs de ce département
    if (departement) {
      const deptUsers = await User.find({ departement })
      const userIds = deptUsers.map((user) => user._id)
      query.utilisateur = { $in: userIds }
    }

    // Récupérer les congés
    const leaves = await Leave.find(query)
      .sort({ dateDebut: 1 })
      .populate("utilisateur", "nom prenom email soldeConges")
      .populate("approuvePar", "nom prenom")

    // Générer le rapport selon le format demandé
    if (format === "excel") {
      // Créer un nouveau classeur Excel
      const workbook = new excel.Workbook()
      const worksheet = workbook.addWorksheet("Rapport de congés")

      // Définir les en-têtes
      worksheet.columns = [
        { header: "Nom", key: "nom", width: 20 },
        { header: "Prénom", key: "prenom", width: 20 },
        { header: "Email", key: "email", width: 30 },
        { header: "Type de congé", key: "typeConge", width: 15 },
        { header: "Date de début", key: "dateDebut", width: 15 },
        { header: "Date de fin", key: "dateFin", width: 15 },
        { header: "Nombre de jours", key: "nombreJours", width: 15 },
        { header: "Statut", key: "statut", width: 15 },
        { header: "Motif", key: "motif", width: 30 },
        { header: "Approuvé par", key: "approuvePar", width: 20 },
        { header: "Solde de congés restant", key: "soldeConges", width: 20 },
      ]

      // Ajouter les données
      leaves.forEach((leave) => {
        worksheet.addRow({
          nom: leave.utilisateur?.nom || "",
          prenom: leave.utilisateur?.prenom || "",
          email: leave.utilisateur?.email || "",
          typeConge: leave.typeConge,
          dateDebut: moment(leave.dateDebut).format("DD/MM/YYYY"),
          dateFin: moment(leave.dateFin).format("DD/MM/YYYY"),
          nombreJours: leave.nombreJours,
          statut: leave.statut,
          motif: leave.motif,
          approuvePar: leave.approuvePar ? `${leave.approuvePar.prenom} ${leave.approuvePar.nom}` : "",
          soldeConges: leave.utilisateur?.soldeConges || 0,
        })
      })

      // Créer le dossier de rapports s'il n'existe pas
      const reportsDir = path.join(__dirname, "..", "reports")
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true })
      }

      // Générer un nom de fichier unique
      const fileName = `rapport_conges_${moment().format("YYYYMMDD_HHmmss")}.xlsx`
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
      res.status(200).json(leaves)
    }
  } catch (error) {
    console.error("Erreur lors de la génération du rapport:", error)
    res.status(500).json({ message: "Erreur serveur lors de la génération du rapport" })
  }
}
