// Contrôleur pour la génération de rapports
const User = require("../models/User")
const Department = require("../models/Department")
const Attendance = require("../models/Attendance")
const Leave = require("../models/Leave")
const excel = require("exceljs")
const moment = require("moment")
const fs = require("fs")
const path = require("path")

// Générer un rapport global
exports.generateGlobalReport = async (req, res) => {
  try {
    const { startDate, endDate, departement, format } = req.query

    // Vérifier les dates
    if (!startDate || !endDate) {
      return res.status(400).json({ message: "Les dates de début et de fin sont requises" })
    }

    // Construire les requêtes
    const query = {}
    const attendanceQuery = {}
    const leaveQuery = {}

    // Filtrer par date
    if (startDate || endDate) {
      attendanceQuery.date = {}
      leaveQuery.dateDebut = {}

      if (startDate) {
        attendanceQuery.date.$gte = new Date(startDate)
        leaveQuery.dateDebut.$gte = new Date(startDate)
      }

      if (endDate) {
        const endDateObj = new Date(endDate)
        endDateObj.setHours(23, 59, 59, 999)
        attendanceQuery.date.$lte = endDateObj
        leaveQuery.dateFin = { $lte: endDateObj }
      }
    }

    // Filtrer par département
    let userIds = []
    if (departement) {
      const dept = await Department.findById(departement)
      if (dept) {
        userIds = dept.membres
        attendanceQuery.utilisateur = { $in: userIds }
        leaveQuery.utilisateur = { $in: userIds }
      }
    }

    // Récupérer les données
    const users = departement ? await User.find({ _id: { $in: userIds } }) : await User.find()

    const attendances = await Attendance.find(attendanceQuery).populate("utilisateur", "nom prenom email")

    const leaves = await Leave.find(leaveQuery).populate("utilisateur", "nom prenom email")

    // Analyser les données
    const userData = users.map((user) => {
      const userAttendances = attendances.filter(
        (att) => att.utilisateur && att.utilisateur._id.toString() === user._id.toString(),
      )

      const userLeaves = leaves.filter(
        (leave) => leave.utilisateur && leave.utilisateur._id.toString() === user._id.toString(),
      )

      // Calculer les statistiques de présence
      const totalDays = moment(endDate).diff(moment(startDate), "days") + 1
      const workingDays = Array.from({ length: totalDays }, (_, i) => {
        const date = moment(startDate).add(i, "days")
        return date.day() !== 0 && date.day() !== 6 // Exclure les weekends
      }).filter(Boolean).length

      const presentDays = userAttendances.filter((att) => att.statut === "present").length
      const absentDays = userAttendances.filter((att) => att.statut === "absent").length
      const lateDays = userAttendances.filter((att) => att.statut === "retard").length

      // Calculer les statistiques de congés
      const approvedLeaves = userLeaves.filter((leave) => leave.statut === "approuve")
      const pendingLeaves = userLeaves.filter((leave) => leave.statut === "en_attente")
      const rejectedLeaves = userLeaves.filter((leave) => leave.statut === "refuse")

      const totalLeaveDays = approvedLeaves.reduce((sum, leave) => sum + leave.nombreJours, 0)

      return {
        id: user._id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
        departement: user.departement,
        soldeConges: user.soldeConges,
        presence: {
          total: workingDays,
          present: presentDays,
          absent: absentDays,
          retard: lateDays,
          tauxPresence: workingDays > 0 ? (presentDays / workingDays) * 100 : 0,
        },
        conges: {
          approuves: approvedLeaves.length,
          enAttente: pendingLeaves.length,
          refuses: rejectedLeaves.length,
          joursTotal: totalLeaveDays,
        },
      }
    })

    // Générer le rapport selon le format demandé
    if (format === "excel") {
      // Créer un nouveau classeur Excel
      const workbook = new excel.Workbook()

      // Feuille des utilisateurs
      const userSheet = workbook.addWorksheet("Utilisateurs")
      userSheet.columns = [
        { header: "Nom", key: "nom", width: 20 },
        { header: "Prénom", key: "prenom", width: 20 },
        { header: "Email", key: "email", width: 30 },
        { header: "Rôle", key: "role", width: 15 },
        { header: "Jours travaillés", key: "joursTravailes", width: 15 },
        { header: "Jours présent", key: "joursPresent", width: 15 },
        { header: "Jours absent", key: "joursAbsent", width: 15 },
        { header: "Jours en retard", key: "joursRetard", width: 15 },
        { header: "Taux de présence (%)", key: "tauxPresence", width: 20 },
        { header: "Congés approuvés", key: "congesApprouves", width: 15 },
        { header: "Jours de congés pris", key: "joursConges", width: 20 },
        { header: "Solde de congés", key: "soldeConges", width: 15 },
      ]

      userData.forEach((user) => {
        userSheet.addRow({
          nom: user.nom,
          prenom: user.prenom,
          email: user.email,
          role: user.role,
          joursTravailes: user.presence.total,
          joursPresent: user.presence.present,
          joursAbsent: user.presence.absent,
          joursRetard: user.presence.retard,
          tauxPresence: user.presence.tauxPresence.toFixed(2),
          congesApprouves: user.conges.approuves,
          joursConges: user.conges.joursTotal,
          soldeConges: user.soldeConges,
        })
      })

      // Feuille des pointages
      const attendanceSheet = workbook.addWorksheet("Pointages")
      attendanceSheet.columns = [
        { header: "Nom", key: "nom", width: 20 },
        { header: "Prénom", key: "prenom", width: 20 },
        { header: "Date", key: "date", width: 15 },
        { header: "Heure d'arrivée", key: "heureArrivee", width: 15 },
        { header: "Heure de départ", key: "heureDepart", width: 15 },
        { header: "Statut", key: "statut", width: 15 },
        { header: "Commentaire", key: "commentaire", width: 30 },
      ]

      attendances.forEach((att) => {
        attendanceSheet.addRow({
          nom: att.utilisateur?.nom || "",
          prenom: att.utilisateur?.prenom || "",
          date: moment(att.date).format("DD/MM/YYYY"),
          heureArrivee: att.heureArrivee ? moment(att.heureArrivee).format("HH:mm") : "",
          heureDepart: att.heureDepart ? moment(att.heureDepart).format("HH:mm") : "",
          statut: att.statut,
          commentaire: att.commentaire || "",
        })
      })

      // Feuille des congés
      const leaveSheet = workbook.addWorksheet("Congés")
      leaveSheet.columns = [
        { header: "Nom", key: "nom", width: 20 },
        { header: "Prénom", key: "prenom", width: 20 },
        { header: "Type de congé", key: "typeConge", width: 15 },
        { header: "Date de début", key: "dateDebut", width: 15 },
        { header: "Date de fin", key: "dateFin", width: 15 },
        { header: "Nombre de jours", key: "nombreJours", width: 15 },
        { header: "Statut", key: "statut", width: 15 },
        { header: "Motif", key: "motif", width: 30 },
      ]

      leaves.forEach((leave) => {
        leaveSheet.addRow({
          nom: leave.utilisateur?.nom || "",
          prenom: leave.utilisateur?.prenom || "",
          typeConge: leave.typeConge,
          dateDebut: moment(leave.dateDebut).format("DD/MM/YYYY"),
          dateFin: moment(leave.dateFin).format("DD/MM/YYYY"),
          nombreJours: leave.nombreJours,
          statut: leave.statut,
          motif: leave.motif,
        })
      })

      // Créer le dossier de rapports s'il n'existe pas
      const reportsDir = path.join(__dirname, "..", "reports")
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true })
      }

      // Générer un nom de fichier unique
      const fileName = `rapport_global_${moment().format("YYYYMMDD_HHmmss")}.xlsx`
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
      res.status(200).json({
        periode: {
          debut: startDate,
          fin: endDate,
        },
        utilisateurs: userData,
      })
    }
  } catch (error) {
    console.error("Erreur lors de la génération du rapport global:", error)
    res.status(500).json({ message: "Erreur serveur lors de la génération du rapport global" })
  }
}

// Générer des statistiques pour le tableau de bord
exports.getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id
    const userRole = req.user.role

    // Obtenir la date actuelle et le premier jour du mois
    const today = new Date()
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

    // Statistiques générales
    const stats = {
      utilisateurs: {
        total: 0,
        parRole: {},
      },
      departements: {
        total: 0,
      },
      presences: {
        aujourd_hui: {
          present: 0,
          absent: 0,
          retard: 0,
          conge: 0,
        },
        mois: {
          present: 0,
          absent: 0,
          retard: 0,
          conge: 0,
        },
      },
      conges: {
        enAttente: 0,
        approuves: 0,
        refuses: 0,
      },
      messages: {
        nonLus: 0,
      },
    }

    // Statistiques spécifiques à l'utilisateur
    const userStats = {
      presences: {
        mois: {
          present: 0,
          absent: 0,
          retard: 0,
          conge: 0,
        },
      },
      conges: {
        solde: 0,
        enAttente: 0,
        approuves: 0,
        refuses: 0,
      },
      messages: {
        nonLus: 0,
      },
    }

    // Récupérer les statistiques selon le rôle
    if (userRole === "admin" || userRole === "assistant") {
      // Statistiques des utilisateurs
      const users = await User.find()
      stats.utilisateurs.total = users.length

      // Compter par rôle
      const roleCount = {}
      users.forEach((user) => {
        roleCount[user.role] = (roleCount[user.role] || 0) + 1
      })
      stats.utilisateurs.parRole = roleCount

      // Statistiques des départements
      const departments = await Department.find()
      stats.departements.total = departments.length

      // Statistiques de présence pour aujourd'hui
      const todayStart = new Date(today)
      todayStart.setHours(0, 0, 0, 0)
      const todayEnd = new Date(today)
      todayEnd.setHours(23, 59, 59, 999)

      const todayAttendances = await Attendance.find({
        date: {
          $gte: todayStart,
          $lte: todayEnd,
        },
      })

      todayAttendances.forEach((att) => {
        stats.presences.aujourd_hui[att.statut]++
      })

      // Statistiques de présence pour le mois
      const monthAttendances = await Attendance.find({
        date: {
          $gte: firstDayOfMonth,
          $lte: today,
        },
      })

      monthAttendances.forEach((att) => {
        stats.presences.mois[att.statut]++
      })

      // Statistiques des congés
      const leaves = await Leave.find()
      stats.conges.enAttente = leaves.filter((leave) => leave.statut === "en_attente").length
      stats.conges.approuves = leaves.filter((leave) => leave.statut === "approuve").length
      stats.conges.refuses = leaves.filter((leave) => leave.statut === "refuse").length
    } else if (userRole === "manager") {
      // Trouver le département géré par le manager
      const department = await Department.findOne({ manager: userId })

      if (department) {
        // Statistiques des utilisateurs du département
        const deptUsers = await User.find({ departement: department._id })
        stats.utilisateurs.total = deptUsers.length

        // Compter par rôle
        const roleCount = {}
        deptUsers.forEach((user) => {
          roleCount[user.role] = (roleCount[user.role] || 0) + 1
        })
        stats.utilisateurs.parRole = roleCount

        // IDs des utilisateurs du département
        const userIds = deptUsers.map((user) => user._id)

        // Statistiques de présence pour aujourd'hui
        const todayStart = new Date(today)
        todayStart.setHours(0, 0, 0, 0)
        const todayEnd = new Date(today)
        todayEnd.setHours(23, 59, 59, 999)

        const todayAttendances = await Attendance.find({
          utilisateur: { $in: userIds },
          date: {
            $gte: todayStart,
            $lte: todayEnd,
          },
        })

        todayAttendances.forEach((att) => {
          stats.presences.aujourd_hui[att.statut]++
        })

        // Statistiques de présence pour le mois
        const monthAttendances = await Attendance.find({
          utilisateur: { $in: userIds },
          date: {
            $gte: firstDayOfMonth,
            $lte: today,
          },
        })

        monthAttendances.forEach((att) => {
          stats.presences.mois[att.statut]++
        })

        // Statistiques des congés
        const leaves = await Leave.find({ utilisateur: { $in: userIds } })
        stats.conges.enAttente = leaves.filter((leave) => leave.statut === "en_attente").length
        stats.conges.approuves = leaves.filter((leave) => leave.statut === "approuve").length
        stats.conges.refuses = leaves.filter((leave) => leave.statut === "refuse").length
      }
    }

    // Statistiques personnelles (pour tous les rôles)
    const user = await User.findById(userId)
    userStats.conges.solde = user.soldeConges

    // Présences personnelles du mois
    const userMonthAttendances = await Attendance.find({
      utilisateur: userId,
      date: {
        $gte: firstDayOfMonth,
        $lte: today,
      },
    })

    userMonthAttendances.forEach((att) => {
      userStats.presences.mois[att.statut]++
    })

    // Congés personnels
    const userLeaves = await Leave.find({ utilisateur: userId })
    userStats.conges.enAttente = userLeaves.filter((leave) => leave.statut === "en_attente").length
    userStats.conges.approuves = userLeaves.filter((leave) => leave.statut === "approuve").length
    userStats.conges.refuses = userLeaves.filter((leave) => leave.statut === "refuse").length

    // Messages non lus
    const unreadMessages = await require("../models/Message").countDocuments({
      destinataire: userId,
      lu: false,
    })
    userStats.messages.nonLus = unreadMessages

    // Pour les employés, copier leurs statistiques personnelles dans stats pour les graphiques
    if (userRole === "employee") {
      // Copier les statistiques personnelles dans stats pour l'affichage des graphiques
      stats.presences.mois = userStats.presences.mois
      stats.conges = userStats.conges
    }

    res.status(200).json({
      stats,
      userStats,
    })
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques du tableau de bord:", error)
    res.status(500).json({ message: "Erreur serveur lors de la récupération des statistiques du tableau de bord" })
  }
}

// Contrôleur pour la génération de rapports
const Task = require("../models/Task")

// Générer un rapport de tâches
exports.generateTaskReport = async (req, res) => {
  try {
    const { startDate, endDate, departement, format } = req.query

    // Vérifier les dates
    if (!startDate || !endDate) {
      return res.status(400).json({ message: "Les dates de début et de fin sont requises" })
    }

    // Construire la requête
    const query = {}

    // Filtrer par date de création
    if (startDate || endDate) {
      query.dateCreation = {}
      if (startDate) {
        query.dateCreation.$gte = new Date(startDate)
      }
      if (endDate) {
        const endDateObj = new Date(endDate)
        endDateObj.setHours(23, 59, 59, 999)
        query.dateCreation.$lte = endDateObj
      }
    }

    // Filtrer par département
    if (departement) {
      query.departement = departement
    }

    // Récupérer les tâches
    const tasks = await Task.find(query)
      .populate("assigneA", "nom prenom email")
      .populate("creePar", "nom prenom email")
      .populate("departement", "nom")

    // Générer le rapport selon le format demandé
    if (format === "excel") {
      // Créer un nouveau classeur Excel
      const workbook = new excel.Workbook()
      const worksheet = workbook.addWorksheet("Rapport de tâches")

      // Définir les en-têtes
      worksheet.columns = [
        { header: "Titre", key: "titre", width: 30 },
        { header: "Description", key: "description", width: 50 },
        { header: "Assigné à", key: "assigneA", width: 25 },
        { header: "Créé par", key: "creePar", width: 25 },
        { header: "Département", key: "departement", width: 20 },
        { header: "Priorité", key: "priorite", width: 15 },
        { header: "Statut", key: "statut", width: 15 },
        { header: "Date d'échéance", key: "dateEcheance", width: 15 },
        { header: "Date de création", key: "dateCreation", width: 15 },
      ]

      // Ajouter les données
      tasks.forEach((task) => {
        worksheet.addRow({
          titre: task.titre || "",
          description: task.description || "",
          assigneA: task.assigneA ? `${task.assigneA.prenom} ${task.assigneA.nom}` : "",
          creePar: task.creePar ? `${task.creePar.prenom} ${task.creePar.nom}` : "",
          departement: task.departement?.nom || "",
          priorite: task.priorite || "",
          statut: task.statut || "",
          dateEcheance: task.dateEcheance ? moment(task.dateEcheance).format("DD/MM/YYYY") : "",
          dateCreation: moment(task.dateCreation).format("DD/MM/YYYY"),
        })
      })

      // Créer le dossier de rapports s'il n'existe pas
      const reportsDir = path.join(__dirname, "..", "reports")
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true })
      }

      // Générer un nom de fichier unique
      const fileName = `rapport_taches_${moment().format("YYYYMMDD_HHmmss")}.xlsx`
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
      res.status(200).json(tasks)
    }
  } catch (error) {
    console.error("Erreur lors de la génération du rapport de tâches:", error)
    res.status(500).json({ message: "Erreur serveur lors de la génération du rapport de tâches" })
  }
}

// Générer un rapport de congés
exports.generateLeaveReport = async (req, res) => {
  try {
    const { startDate, endDate, departement, format } = req.query

    // Vérifier les dates
    if (!startDate || !endDate) {
      return res.status(400).json({ message: "Les dates de début et de fin sont requises" })
    }

    // Construire la requête
    const query = {}

    // Filtrer par date de début
    if (startDate || endDate) {
      query.dateDebut = {}
      if (startDate) {
        query.dateDebut.$gte = new Date(startDate)
      }
      if (endDate) {
        const endDateObj = new Date(endDate)
        endDateObj.setHours(23, 59, 59, 999)
        query.dateDebut.$lte = endDateObj
      }
    }

    // Filtrer par département
    if (departement) {
      query.utilisateur = { $in: departement }
    }

    // Récupérer les congés
    const leaves = await Leave.find(query)
      .populate("utilisateur", "nom prenom email")
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
    console.error("Erreur lors de la génération du rapport de congés:", error)
    res.status(500).json({ message: "Erreur serveur lors de la génération du rapport de congés" })
  }
}

// Générer un rapport des employés
exports.generateEmployeeReport = async (req, res) => {
  try {
    const { departement, format } = req.query

    // Construire la requête
    const query = {}

    // Filtrer par département
    if (departement) {
      query.departement = departement
    }

    // Récupérer les employés
    const users = await User.find(query).populate("departement", "nom")

    // Générer le rapport selon le format demandé
    if (format === "excel") {
      // Créer un nouveau classeur Excel
      const workbook = new excel.Workbook()
      const worksheet = workbook.addWorksheet("Rapport des employés")

      // Définir les en-têtes
      worksheet.columns = [
        { header: "Nom", key: "nom", width: 20 },
        { header: "Prénom", key: "prenom", width: 20 },
        { header: "Email", key: "email", width: 30 },
        { header: "Rôle", key: "role", width: 15 },
        { header: "Département", key: "departement", width: 20 },
        { header: "Date de création", key: "dateCreation", width: 15 },
      ]

      // Ajouter les données
      users.forEach((user) => {
        worksheet.addRow({
          nom: user.nom || "",
          prenom: user.prenom || "",
          email: user.email || "",
          role: user.role || "",
          departement: user.departement?.nom || "",
          dateCreation: moment(user.dateCreation).format("DD/MM/YYYY"),
        })
      })

      // Créer le dossier de rapports s'il n'existe pas
      const reportsDir = path.join(__dirname, "..", "reports")
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true })
      }

      // Générer un nom de fichier unique
      const fileName = `rapport_employes_${moment().format("YYYYMMDD_HHmmss")}.xlsx`
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
      res.status(200).json(users)
    }
  } catch (error) {
    console.error("Erreur lors de la génération du rapport des employés:", error)
    res.status(500).json({ message: "Erreur serveur lors de la génération du rapport des employés" })
  }
}
