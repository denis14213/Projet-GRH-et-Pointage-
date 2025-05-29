// Ajouter les fonctions pour gérer les commentaires, les fichiers et les notifications
const Task = require("../models/Task")
const User = require("../models/User")
const Department = require("../models/Department")
const nodemailer = require("nodemailer")
const multer = require("multer")
const path = require("path")
const fs = require("fs")
const cron = require("node-cron")

// Configuration de multer pour le stockage des fichiers
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/tasks"
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
})

// Configuration du transporteur d'email
// const transporter = nodemailer.createTransport({
//   service: process.env.EMAIL_SERVICE || "gmail",
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASSWORD,
//   },
// })

// Fonction pour envoyer un email
const sendEmail = async (to, subject, html) => {
  try {
    // Check if email credentials are properly configured
    if (
      !process.env.EMAIL_USER ||
      !process.env.EMAIL_PASSWORD ||
      process.env.EMAIL_USER === "votre_email@gmail.com" ||
      process.env.EMAIL_PASSWORD === "votre_mot_de_passe_email"
    ) {
      console.log("Email configuration incomplete. Skipping email sending.")
      return { sent: false, reason: "missing_credentials" }
    }

    // Create transporter only when needed with proper error handling
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    })

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html,
    })

    return { sent: true }
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email:", error)
    return { sent: false, reason: "error", error }
  }
}

// Créer une nouvelle tâche
exports.createTask = async (req, res) => {
  try {
    const { titre, description, assigneA, departement, priorite, dateEcheance } = req.body
    const creePar = req.user.id

    // Vérifier si l'utilisateur a le droit de créer une tâche (admin ou manager)
    if (req.user.role !== "admin" && req.user.role !== "manager") {
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à créer des tâches" })
    }

    // Vérifier si l'utilisateur assigné existe
    const assignedUser = await User.findById(assigneA)
    if (!assignedUser) {
      return res.status(404).json({ message: "Utilisateur assigné non trouvé" })
    }

    // Vérifier si le département existe si fourni
    if (departement) {
      const dept = await Department.findById(departement)
      if (!dept) {
        return res.status(404).json({ message: "Département non trouvé" })
      }
    }

    // Créer la tâche
    const newTask = new Task({
      titre,
      description,
      assigneA,
      creePar,
      departement,
      priorite,
      dateEcheance: dateEcheance ? new Date(dateEcheance) : undefined,
    })

    await newTask.save()

    // Notifier l'utilisateur assigné
    const io = req.app.get("io")
    io.to(assigneA).emit("task_assigned", {
      message: "Une nouvelle tâche vous a été assignée",
      task: newTask,
    })

    // Envoyer un email à l'utilisateur assigné
    const emailSent = await sendEmail(
      assignedUser.email,
      "Nouvelle tâche assignée",
      `
        <h1>Nouvelle tâche assignée</h1>
        <p>Bonjour ${assignedUser.prenom} ${assignedUser.nom},</p>
        <p>Une nouvelle tâche vous a été assignée :</p>
        <p><strong>Titre :</strong> ${titre}</p>
        <p><strong>Description :</strong> ${description}</p>
        <p><strong>Priorité :</strong> ${priorite}</p>
        <p><strong>Date d'échéance :</strong> ${dateEcheance ? new Date(dateEcheance).toLocaleDateString() : "Non définie"}</p>
        <p>Veuillez vous connecter à la plateforme pour plus de détails.</p>
      `,
    )

    res.status(201).json({
      message: "Tâche créée avec succès",
      task: newTask,
      emailSent,
    })
  } catch (error) {
    console.error("Erreur lors de la création de la tâche:", error)
    res.status(500).json({ message: "Erreur serveur lors de la création de la tâche" })
  }
}

// Obtenir toutes les tâches (filtrées selon le rôle)
exports.getAllTasks = async (req, res) => {
  try {
    const { statut, priorite, departement } = req.query
    const userId = req.user.id
    const userRole = req.user.role

    // Construire la requête
    const query = {}

    // Filtrer par statut si fourni
    if (statut) {
      query.statut = statut
    }

    // Filtrer par priorité si fournie
    if (priorite) {
      query.priorite = priorite
    }

    // Filtrer selon le rôle de l'utilisateur
    if (userRole === "admin") {
      // L'administrateur peut voir toutes les tâches
      // Filtrer par département si fourni
      if (departement) {
        query.departement = departement
      }
    } else if (userRole === "manager") {
      // Le manager peut voir les tâches de son département
      const managedDept = await Department.findOne({ manager: userId })
      if (managedDept) {
        query.$or = [{ departement: managedDept._id }, { creePar: userId }, { assigneA: userId }]
      } else {
        // Si le manager n'a pas de département, ne montrer que ses propres tâches
        query.$or = [{ creePar: userId }, { assigneA: userId }]
      }
    } else {
      // Les autres utilisateurs ne peuvent voir que leurs propres tâches
      query.assigneA = userId
    }

    const tasks = await Task.find(query)
      .sort({ dateEcheance: 1, priorite: -1 })
      .populate("assigneA", "nom prenom email photoProfil")
      .populate("creePar", "nom prenom email photoProfil")
      .populate("departement", "nom")
      .populate("commentaires.utilisateur", "nom prenom email photoProfil")
      .populate("fichiers.ajoutePar", "nom prenom email photoProfil")
      .populate("historique.utilisateur", "nom prenom email photoProfil")

    res.status(200).json(tasks)
  } catch (error) {
    console.error("Erreur lors de la récupération des tâches:", error)
    res.status(500).json({ message: "Erreur serveur lors de la récupération des tâches" })
  }
}

// Obtenir une tâche par ID
exports.getTaskById = async (req, res) => {
  try {
    const taskId = req.params.id
    const userId = req.user.id
    const userRole = req.user.role

    // Trouver la tâche avec toutes les relations nécessaires
    const task = await Task.findById(taskId)
      .populate("assigneA", "nom prenom email photoProfil")
      .populate("creePar", "nom prenom email photoProfil")
      .populate("departement", "nom")
      .populate("commentaires.utilisateur", "nom prenom email photoProfil")
      .populate("fichiers.ajoutePar", "nom prenom email photoProfil")
      .populate("historique.utilisateur", "nom prenom email photoProfil")

    if (!task) {
      return res.status(404).json({ message: "Tâche non trouvée" })
    }

    // Vérifier les permissions
    let hasAccess = false

    // Les administrateurs ont accès à toutes les tâches
    if (userRole === "admin") {
      hasAccess = true
    }
    // Le créateur de la tâche a accès
    else if (task.creePar && task.creePar._id && task.creePar._id.toString() === userId) {
      hasAccess = true
    }
    // L'utilisateur assigné à la tâche a accès
    else if (task.assigneA && task.assigneA._id && task.assigneA._id.toString() === userId) {
      hasAccess = true
    }
    // Les managers ont accès aux tâches de leur département
    else if (userRole === "manager") {
      const dept = await Department.findById(task.departement._id)
      if (dept && dept.manager && dept.manager.toString() === userId) {
        hasAccess = true
      } else {
        // Check if the task is assigned to someone in the manager's department
        const dept = await Department.findOne({ manager: userId })
        if (dept && task.assigneA) {
          const user = await User.findById(task.assigneA)
          if (user && user.departement && user.departement.toString() === dept._id.toString()) {
            hasAccess = true
          }
        }
      }
    }
    // Les assistants ont accès à toutes les tâches (pour aider à la gestion)
    else if (userRole === "assistant") {
      hasAccess = true
    } else if (userRole === "employee") {
      hasAccess = true
    }

    if (!hasAccess) {
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à accéder à cette tâche" })
    }

    res.status(200).json(task)
  } catch (error) {
    console.error("Erreur lors de la récupération de la tâche:", error)
    res.status(500).json({ message: "Erreur serveur lors de la récupération de la tâche" })
  }
}

// Mettre à jour la fonction updateTask pour envoyer des emails à chaque changement de statut
exports.updateTask = async (req, res) => {
  try {
    const { titre, description, assigneA, departement, priorite, statut, dateEcheance } = req.body
    const taskId = req.params.id
    const userId = req.user.id
    const userRole = req.user.role

    // Trouver la tâche
    const task = await Task.findById(taskId)
      .populate("assigneA", "nom prenom email")
      .populate("creePar", "nom prenom email")
      .populate("departement")

    if (!task) {
      return res.status(404).json({ message: "Tâche non trouvée" })
    }

    // Vérifier les permissions
    let canUpdateAll = false
    if (userRole === "admin" || (task.creePar && task.creePar.toString() === userId)) {
      canUpdateAll = true
    } else if (userRole === "manager" && task.departement) {
      const dept = await Department.findById(task.departement)
      if (dept && dept.manager && dept.manager.toString() === userId) {
        canUpdateAll = true
      }
    }

    // Si l'utilisateur est assigné à la tâche ou est un assistant, il peut uniquement mettre à jour le statut
    const isAssigned = task.assigneA && task.assigneA._id && task.assigneA._id.toString() === userId
    const isAssistant = userRole === "assistant" || userRole === "employee"

    if (!canUpdateAll && !isAssigned && !isAssistant) {
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à modifier cette tâche" })
    }

    // Enregistrer l'ancien statut pour l'historique
    const ancienStatut = task.statut

    // Mettre à jour les champs
    if (canUpdateAll) {
      if (titre) task.titre = titre
      if (description) task.description = description
      if (priorite) task.priorite = priorite
      if (dateEcheance) task.dateEcheance = new Date(dateEcheance)

      // Vérifier si l'utilisateur assigné existe
      if (assigneA && task.assigneA && assigneA !== task.assigneA._id.toString()) {
        const assignedUser = await User.findById(assigneA)
        if (!assignedUser) {
          return res.status(404).json({ message: "Utilisateur assigné non trouvé" })
        }
        task.assigneA = assigneA

        // Notifier le nouvel utilisateur assigné
        const io = req.app.get("io")
        if (io) {
          io.to(assigneA).emit("task_assigned", {
            message: "Une tâche vous a été assignée",
            task,
          })
        }

        // Envoyer un email au nouvel utilisateur assigné - handle failure gracefully
        const emailResult = await sendEmail(
          assignedUser.email,
          "Tâche assignée",
          `
            <h1>Tâche assignée</h1>
            <p>Bonjour ${assignedUser.prenom} ${assignedUser.nom},</p>
            <p>Une tâche vous a été assignée :</p>
            <p><strong>Titre :</strong> ${task.titre}</p>
            <p><strong>Description :</strong> ${task.description}</p>
            <p><strong>Priorité :</strong> ${task.priorite}</p>
            <p><strong>Date d'échéance :</strong> ${task.dateEcheance ? new Date(task.dateEcheance).toLocaleDateString() : "Non définie"}</p>
            <p>Veuillez vous connecter à la plateforme pour plus de détails.</p>
          `,
        )
        console.log("Email assignment result:", emailResult)
      }

      // Vérifier si le département existe
      if (
        departement &&
        departement !== (task.departement && task.departement._id ? task.departement._id.toString() : null)
      ) {
        const dept = await Department.findById(departement)
        if (!dept) {
          return res.status(404).json({ message: "Département non trouvé" })
        }
        task.departement = departement
      }
    }

    // Tous les utilisateurs autorisés peuvent mettre à jour le statut
    if (statut && statut !== ancienStatut) {
      task.statut = statut

      // Ajouter à l'historique
      task.historique.push({
        action: "Changement de statut",
        ancienStatut,
        nouveauStatut: statut,
        utilisateur: userId,
        date: new Date(),
      })

      // Récupérer les informations de l'utilisateur qui fait le changement
      const currentUser = await User.findById(userId)

      // Notifier par socket
      const io = req.app.get("io")

      // Tentative d'envoi d'emails - les échecs ne bloqueront pas la mise à jour
      try {
        // 1. Notifier le créateur si différent de l'utilisateur actuel
        if (task.creePar && task.creePar._id && task.creePar._id.toString() !== userId) {
          if (io) {
            io.to(task.creePar._id.toString()).emit("task_status_updated", {
              message: `Le statut de la tâche "${task.titre}" a été mis à jour en "${statut}" par ${currentUser.prenom} ${currentUser.nom}`,
              task,
            })
          }

          // Email au créateur - handle failure gracefully
          if (task.creePar.email) {
            const emailResult = await sendEmail(
              task.creePar.email,
              "Statut de tâche mis à jour",
              `
                <h1>Statut de tâche mis à jour</h1>
                <p>Bonjour ${task.creePar.prenom} ${task.creePar.nom},</p>
                <p>Le statut de la tâche "${task.titre}" a été mis à jour de "${ancienStatut}" à "${statut}" par ${currentUser.prenom} ${currentUser.nom}.</p>
                <p><strong>Détails de la tâche :</strong></p>
                <p><strong>Description :</strong> ${task.description}</p>
                <p><strong>Priorité :</strong> ${task.priorite}</p>
                <p><strong>Date d'échéance :</strong> ${task.dateEcheance ? new Date(task.dateEcheance).toLocaleDateString() : "Non définie"}</p>
                <p>Veuillez vous connecter à la plateforme pour plus de détails.</p>
              `,
            )
            console.log("Email to creator result:", emailResult)
          }
        }

        // 2. Notifier l'assigné si différent de l'utilisateur actuel
        if (task.assigneA && task.assigneA._id && task.assigneA._id.toString() !== userId) {
          if (io) {
            io.to(task.assigneA._id.toString()).emit("task_status_updated", {
              message: `Le statut de votre tâche "${task.titre}" a été mis à jour en "${statut}" par ${currentUser.prenom} ${currentUser.nom}`,
              task,
            })
          }

          // Email à l'assigné - handle failure gracefully
          if (task.assigneA.email) {
            const emailResult = await sendEmail(
              task.assigneA.email,
              "Statut de votre tâche mis à jour",
              `
                <h1>Statut de votre tâche mis à jour</h1>
                <p>Bonjour ${task.assigneA.prenom} ${task.assigneA.nom},</p>
                <p>Le statut de votre tâche "${task.titre}" a été mis à jour de "${ancienStatut}" à "${statut}" par ${currentUser.prenom} ${currentUser.nom}.</p>
                <p><strong>Détails de la tâche :</strong></p>
                <p><strong>Description :</strong> ${task.description}</p>
                <p><strong>Priorité :</strong> ${task.priorite}</p>
                <p><strong>Date d'échéance :</strong> ${task.dateEcheance ? new Date(task.dateEcheance).toLocaleDateString() : "Non définie"}</p>
                <p>Veuillez vous connecter à la plateforme pour plus de détails.</p>
              `,
            )
            console.log("Email to assignee result:", emailResult)
          }
        }

        // 3. Notifier le manager du département si différent du créateur et de l'utilisateur actuel
        if (task.departement && task.departement._id) {
          const dept = await Department.findById(task.departement._id).populate("manager")
          if (
            dept &&
            dept.manager &&
            dept.manager._id &&
            task.creePar &&
            task.creePar._id &&
            dept.manager._id.toString() !== task.creePar._id.toString() &&
            dept.manager._id.toString() !== userId
          ) {
            if (io) {
              io.to(dept.manager._id.toString()).emit("task_status_updated", {
                message: `Le statut de la tâche "${task.titre}" a été mis à jour en "${statut}" par ${currentUser.prenom} ${currentUser.nom}`,
                task,
              })
            }

            // Email au manager - handle failure gracefully
            if (dept.manager.email) {
              const emailResult = await sendEmail(
                dept.manager.email,
                "Statut de tâche mis à jour dans votre département",
                `
                  <h1>Statut de tâche mis à jour dans votre département</h1>
                  <p>Bonjour ${dept.manager.prenom} ${dept.manager.nom},</p>
                  <p>Le statut de la tâche "${task.titre}" a été mis à jour de "${ancienStatut}" à "${statut}" par ${currentUser.prenom} ${currentUser.nom}.</p>
                  <p><strong>Détails de la tâche :</strong></p>
                  <p><strong>Assignée à :</strong> ${task.assigneA.prenom} ${task.assigneA.nom}</p>
                  <p><strong>Description :</strong> ${task.description}</p>
                  <p><strong>Priorité :</strong> ${task.priorite}</p>
                  <p><strong>Date d'échéance :</strong> ${task.dateEcheance ? new Date(task.dateEcheance).toLocaleDateString() : "Non définie"}</p>
                  <p>Veuillez vous connecter à la plateforme pour plus de détails.</p>
                `,
              )
              console.log("Email to manager result:", emailResult)
            }
          }
        }

        // 4. Notifier tous les administrateurs (sauf l'utilisateur actuel)
        const admins = await User.find({ role: "admin", _id: { $ne: userId } })
        for (const admin of admins) {
          if (io) {
            io.to(admin._id.toString()).emit("task_status_updated", {
              message: `Le statut de la tâche "${task.titre}" a été mis à jour en "${statut}" par ${currentUser.prenom} ${currentUser.nom}`,
              task,
            })
          }

          // Email aux admins - handle failure gracefully
          const emailResult = await sendEmail(
            admin.email,
            "Statut de tâche mis à jour",
            `
              <h1>Statut de tâche mis à jour</h1>
              <p>Bonjour ${admin.prenom} ${admin.nom},</p>
              <p>Le statut de la tâche "${task.titre}" a été mis à jour de "${ancienStatut}" à "${statut}" par ${currentUser.prenom} ${currentUser.nom}.</p>
              <p><strong>Détails de la tâche :</strong></p>
              <p><strong>Assignée à :</strong> ${task.assigneA.prenom} ${task.assigneA.nom}</p>
              <p><strong>Description :</strong> ${task.description}</p>
              <p><strong>Priorité :</strong> ${task.priorite}</p>
              <p><strong>Date d'échéance :</strong> ${task.dateEcheance ? new Date(task.dateEcheance).toLocaleDateString() : "Non définie"}</p>
              <p>Veuillez vous connecter à la plateforme pour plus de détails.</p>
            `,
          )
          console.log("Email to admin result:", emailResult)
        }
      } catch (emailError) {
        // Log the error but don't fail the task update
        console.error("Erreur lors de l'envoi des notifications par email:", emailError)
      }
    }

    task.derniereMiseAJour = Date.now()
    await task.save()

    res.status(200).json({
      message: "Tâche mise à jour avec succès",
      task,
      emailStatus: "Email notifications may have been skipped due to missing configuration",
    })
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la tâche:", error)
    res.status(500).json({ message: "Erreur serveur lors de la mise à jour de la tâche" })
  }
}

// Supprimer une tâche
exports.deleteTask = async (req, res) => {
  try {
    const taskId = req.params.id
    const userId = req.user.id
    const userRole = req.user.role

    // Trouver la tâche
    const task = await Task.findById(taskId)
    if (!task) {
      return res.status(404).json({ message: "Tâche non trouvée" })
    }

    // Vérifier les permissions (seul l'admin ou le créateur peut supprimer)
    if (userRole !== "admin" && task.creePar.toString() !== userId) {
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à supprimer cette tâche" })
    }

    // Supprimer la tâche
    await Task.findByIdAndDelete(taskId)

    // Notifier l'utilisateur assigné
    const io = req.app.get("io")
    io.to(task.assigneA.toString()).emit("task_deleted", {
      message: `La tâche "${task.titre}" a été supprimée`,
      taskId,
    })

    res.status(200).json({ message: "Tâche supprimée avec succès" })
  } catch (error) {
    console.error("Erreur lors de la suppression de la tâche:", error)
    res.status(500).json({ message: "Erreur serveur lors de la suppression de la tâche" })
  }
}

// Obtenir les tâches assignées à l'utilisateur connecté
exports.getUserTasks = async (req, res) => {
  try {
    const userId = req.user.id
    const userRole = req.user.role
    const { statut } = req.query

    // Construire la requête
    let query = {}

    // Pour les employés, montrer uniquement les tâches qui leur sont assignées
    if (userRole === "employee") {
      query.assigneA = userId
    }
    // Pour les assistants, montrer toutes les tâches
    else if (userRole === "assistant") {
      // Pas de filtre spécifique, ils peuvent voir toutes les tâches
    }
    // Pour les managers et admins, la logique existante est correcte
    else {
      query = { assigneA: userId }
    }

    // Filtrer par statut si fourni
    if (statut) {
      query.statut = statut
    }

    const tasks = await Task.find(query)
      .sort({ dateEcheance: 1, priorite: -1 })
      .populate("assigneA", "nom prenom email photoProfil")
      .populate("creePar", "nom prenom email photoProfil")
      .populate("departement", "nom")
      .populate("commentaires.utilisateur", "nom prenom email photoProfil")
      .populate("fichiers.ajoutePar", "nom prenom email photoProfil")
      .populate("historique.utilisateur", "nom prenom email photoProfil")

    res.status(200).json(tasks)
  } catch (error) {
    console.error("Erreur lors de la récupération des tâches de l'utilisateur:", error)
    res.status(500).json({ message: "Erreur serveur lors de la récupération des tâches de l'utilisateur" })
  }
}

// Ajouter un commentaire à une tâche
exports.addComment = async (req, res) => {
  try {
    const { contenu } = req.body
    const taskId = req.params.id
    const userId = req.user.id

    // Vérifier si la tâche existe
    const task = await Task.findById(taskId)
    if (!task) {
      return res.status(404).json({ message: "Tâche non trouvée" })
    }

    // Vérifier si l'utilisateur est autorisé (admin, créateur, manager du département ou assigné)
    const isAdmin = req.user.role === "admin"
    const isCreator = task.creePar.toString() === userId
    const isAssigned = task.assigneA.toString() === userId
    const isManager = req.user.role === "manager"

    // Autoriser tous les utilisateurs à commenter pour l'instant
    // Nous pouvons ajouter des restrictions plus tard si nécessaire

    // Créer le commentaire
    const newComment = {
      utilisateur: userId,
      contenu,
      date: new Date(),
      fichiers: [],
    }

    // Ajouter les fichiers s'ils existent
    if (req.files && req.files.length > 0) {
      newComment.fichiers = req.files.map((file) => ({
        nom: file.originalname,
        url: `/uploads/tasks/${file.filename}`,
        type: file.mimetype,
      }))
    }

    // Ajouter le commentaire à la tâche
    task.commentaires.push(newComment)
    task.derniereMiseAJour = Date.now()
    await task.save()

    // Notifier les personnes concernées
    const io = req.app.get("io")

    // Notifier l'assigné si le commentaire est d'une autre personne
    if (!isAssigned) {
      io.to(task.assigneA.toString()).emit("task_comment_added", {
        message: `Un nouveau commentaire a été ajouté à la tâche "${task.titre}"`,
        task,
        comment: newComment,
      })
    }

    // Notifier le créateur si le commentaire est d'une autre personne
    if (!isCreator && task.creePar.toString() !== task.assigneA.toString()) {
      io.to(task.creePar.toString()).emit("task_comment_added", {
        message: `Un nouveau commentaire a été ajouté à la tâche "${task.titre}"`,
        task,
        comment: newComment,
      })
    }

    res.status(201).json({
      message: "Commentaire ajouté avec succès",
      comment: newComment,
    })
  } catch (error) {
    console.error("Erreur lors de l'ajout du commentaire:", error)
    res.status(500).json({ message: "Erreur serveur lors de l'ajout du commentaire" })
  }
}

// Ajouter un fichier à une tâche
exports.addFile = async (req, res) => {
  try {
    const taskId = req.params.id
    const userId = req.user.id

    // Vérifier si la tâche existe
    const task = await Task.findById(taskId)
    if (!task) {
      return res.status(404).json({ message: "Tâche non trouvée" })
    }

    // Vérifier si l'utilisateur est autorisé (admin, créateur, manager du département ou assigné)
    const isAdmin = req.user.role === "admin"
    const isCreator = task.creePar.toString() === userId
    const isAssigned = task.assigneA.toString() === userId
    const isManager = req.user.role === "manager"

    // Autoriser tous les utilisateurs à ajouter des fichiers pour l'instant
    // Nous pouvons ajouter des restrictions plus tard si nécessaire

    // Vérifier si des fichiers ont été téléchargés
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "Aucun fichier n'a été téléchargé" })
    }

    // S'assurer que le dossier de destination existe
    const uploadDir = "uploads/tasks"
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    // Ajouter les fichiers à la tâche
    const newFiles = req.files.map((file) => ({
      nom: file.originalname,
      url: `/uploads/tasks/${file.filename}`,
      type: file.mimetype,
      ajoutePar: userId,
      dateAjout: new Date(),
    }))

    // Assurez-vous que chaque fichier est correctement ajouté au tableau
    for (const newFile of newFiles) {
      task.fichiers.push(newFile)
    }

    task.derniereMiseAJour = Date.now()
    await task.save()

    // Notifier les personnes concernées
    const io = req.app.get("io")

    // Notifier l'assigné si le fichier est ajouté par une autre personne
    if (!isAssigned) {
      io.to(task.assigneA.toString()).emit("task_file_added", {
        message: `De nouveaux fichiers ont été ajoutés à la tâche "${task.titre}"`,
        task,
        files: newFiles,
      })
    }

    // Notifier le créateur si le fichier est ajouté par une autre personne
    if (!isCreator && task.creePar.toString() !== task.assigneA.toString()) {
      io.to(task.creePar.toString()).emit("task_file_added", {
        message: `De nouveaux fichiers ont été ajoutés à la tâche "${task.titre}"`,
        task,
        files: newFiles,
      })
    }

    res.status(201).json({
      message: "Fichiers ajoutés avec succès",
      files: newFiles,
    })
  } catch (error) {
    console.error("Erreur lors de l'ajout des fichiers:", error)
    res.status(500).json({ message: "Erreur serveur lors de l'ajout des fichiers" })
  }
}

// Configurer une tâche cron pour vérifier les tâches à échéance proche
cron.schedule("0 9 * * *", async () => {
  try {
    console.log("Vérification des tâches à échéance proche...")

    // Trouver les tâches dont l'échéance est demain et qui ne sont pas terminées
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)

    const dayAfterTomorrow = new Date(tomorrow)
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1)

    const tasks = await Task.find({
      dateEcheance: {
        $gte: tomorrow,
        $lt: dayAfterTomorrow,
      },
      statut: { $ne: "terminee" },
    })
      .populate("assigneA")
      .populate("creePar")

    console.log(`${tasks.length} tâches à échéance proche trouvées.`)

    // Envoyer un email de rappel pour chaque tâche
    for (const task of tasks) {
      if (task.assigneA && task.assigneA.email) {
        await sendEmail(
          task.assigneA.email,
          "Rappel: Tâche à échéance proche",
          `
            <h1>Rappel: Tâche à échéance proche</h1>
            <p>Bonjour ${task.assigneA.prenom} ${task.assigneA.nom},</p>
            <p>La tâche suivante arrive à échéance demain :</p>
            <p><strong>Titre :</strong> ${task.titre}</p>
            <p><strong>Description :</strong> ${task.description}</p>
            <p><strong>Priorité :</strong> ${task.priorite}</p>
            <p><strong>Date d'échéance :</strong> ${new Date(task.dateEcheance).toLocaleDateString()}</p>
            <p>Veuillez terminer cette tâche et mettre à jour son statut dès que possible.</p>
            <p>Si la tâche est déjà terminée, n'oubliez pas de changer son statut sur la plateforme.</p>
          `,
        )

        console.log(`Email de rappel envoyé à ${task.assigneA.email} pour la tâche "${task.titre}"`)
      }
    }
  } catch (error) {
    console.error("Erreur lors de la vérification des tâches à échéance proche:", error)
  }
})
