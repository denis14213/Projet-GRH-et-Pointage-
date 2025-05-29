/**
 * Script pour générer des données de démonstration complètes
 * Exécuter avec: npm run seed:demo
 *
 * Ce script génère des données pour tester toutes les fonctionnalités de la plateforme:
 * - Utilisateurs (admin, managers, employés)
 * - Départements
 * - Pointages (présences, absences, retards)
 * - Congés
 * - Tâches
 * - Messages
 */

const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")
const colors = require("colors")
const dotenv = require("dotenv")
const moment = require("moment")

// Charger les variables d'environnement
dotenv.config()

// Modèles
const User = require("../models/User")
const Department = require("../models/Department")
const Attendance = require("../models/Attendance")
const Leave = require("../models/Leave")
const Task = require("../models/Task")
const Message = require("../models/Message")

// Connexion à la base de données
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})

// Fonction pour générer un nombre aléatoire entre min et max
const getRandomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// Fonction pour générer une date aléatoire entre deux dates
const getRandomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

// Fonction pour générer un statut de présence aléatoire avec distribution réaliste
const getRandomAttendanceStatus = () => {
  const statuses = ["present", "absent", "retard", "conge"]
  const weights = [0.7, 0.1, 0.15, 0.05] // Pondération pour rendre certains statuts plus probables

  const random = Math.random()
  let sum = 0

  for (let i = 0; i < weights.length; i++) {
    sum += weights[i]
    if (random < sum) {
      return statuses[i]
    }
  }

  return statuses[0]
}

// Fonction pour générer un statut de congé aléatoire
const getRandomLeaveStatus = () => {
  const statuses = ["en_attente", "approuve", "refuse"]
  const weights = [0.2, 0.7, 0.1]

  const random = Math.random()
  let sum = 0

  for (let i = 0; i < weights.length; i++) {
    sum += weights[i]
    if (random < sum) {
      return statuses[i]
    }
  }

  return statuses[0]
}

// Fonction pour générer un statut de tâche aléatoire
const getRandomTaskStatus = () => {
  const statuses = ["a_faire", "en_cours", "en_revue", "terminee"]
  const weights = [0.3, 0.4, 0.2, 0.1]

  const random = Math.random()
  let sum = 0

  for (let i = 0; i < weights.length; i++) {
    sum += weights[i]
    if (random < sum) {
      return statuses[i]
    }
  }

  return statuses[0]
}

// Fonction pour générer une priorité de tâche aléatoire
const getRandomTaskPriority = () => {
  const priorities = ["basse", "moyenne", "haute", "urgente"]
  const weights = [0.3, 0.4, 0.2, 0.1]

  const random = Math.random()
  let sum = 0

  for (let i = 0; i < weights.length; i++) {
    sum += weights[i]
    if (random < sum) {
      return priorities[i]
    }
  }

  return priorities[0]
}

// Fonction pour générer un type de congé aléatoire
const getRandomLeaveType = () => {
  const types = ["conge_paye", "maladie", "familial", "sans_solde", "formation"]
  const weights = [0.5, 0.2, 0.1, 0.1, 0.1]

  const random = Math.random()
  let sum = 0

  for (let i = 0; i < weights.length; i++) {
    sum += weights[i]
    if (random < sum) {
      return types[i]
    }
  }

  return types[0]
}

// Fonction pour générer une heure d'arrivée en fonction du statut
const generateArrivalTime = (date, status) => {
  const arrivalTime = new Date(date)

  if (status === "present") {
    // Heure d'arrivée entre 8h00 et 8h59
    arrivalTime.setHours(8, getRandomInt(0, 59), 0, 0)
  } else if (status === "retard") {
    // Heure d'arrivée entre 9h01 et 10h30 pour les retards
    arrivalTime.setHours(9 + getRandomInt(0, 1), getRandomInt(1, 59), 0, 0)
  } else {
    // Pour les absents ou congés, pas d'heure d'arrivée
    return null
  }

  return arrivalTime
}

// Fonction pour générer une heure de départ en fonction du statut et de l'heure d'arrivée
const generateDepartureTime = (date, arrivalTime, status) => {
  if (status !== "present" && status !== "retard") {
    return null
  }

  const departureTime = new Date(date)

  // Durée de travail entre 7h et 9h
  const workDuration = getRandomInt(7, 9)

  if (arrivalTime) {
    // Calculer l'heure de départ en fonction de l'heure d'arrivée
    const departureHour = arrivalTime.getHours() + workDuration
    departureTime.setHours(departureHour, getRandomInt(0, 59), 0, 0)
  } else {
    // Heure de départ par défaut entre 17h et 18h30
    departureTime.setHours(17 + getRandomInt(0, 1), getRandomInt(0, 59), 0, 0)
  }

  return departureTime
}

// Fonction pour générer un commentaire en fonction du statut
const generateAttendanceComment = (status) => {
  if (status === "absent") {
    const absentReasons = [
      "Absence non justifiée",
      "Maladie sans certificat médical",
      "Problème personnel",
      "Absence enregistrée automatiquement par le système",
      "N'a pas prévenu de son absence",
    ]
    return absentReasons[getRandomInt(0, absentReasons.length - 1)]
  } else if (status === "retard") {
    const lateReasons = [
      "Retard dû aux transports",
      "Problème de réveil",
      "Rendez-vous médical",
      "Retard détecté automatiquement par le système",
      "A prévenu de son retard",
    ]
    return lateReasons[getRandomInt(0, lateReasons.length - 1)]
  } else if (status === "conge") {
    return "En congé approuvé"
  }

  return ""
}

// Fonction principale pour générer les données
const seedData = async () => {
  try {
    // Supprimer toutes les données existantes
    await User.deleteMany({})
    await Department.deleteMany({})
    await Attendance.deleteMany({})
    await Leave.deleteMany({})
    await Task.deleteMany({})
    await Message.deleteMany({})

    console.log("Données existantes supprimées".yellow)

    // Créer les départements
    const departments = [
      {
        nom: "Direction",
        description: "Direction générale de l'entreprise",
      },
      {
        nom: "Ressources Humaines",
        description: "Gestion des ressources humaines",
      },
      {
        nom: "Informatique",
        description: "Développement et maintenance des systèmes informatiques",
      },
      {
        nom: "Marketing",
        description: "Stratégie marketing et communication",
      },
      {
        nom: "Finance",
        description: "Gestion financière et comptabilité",
      },
      {
        nom: "Commercial",
        description: "Ventes et relations clients",
      },
    ]

    const createdDepartments = await Department.insertMany(departments)
    console.log(`${createdDepartments.length} départements créés`.green)

    // Créer les utilisateurs
    const password = await bcrypt.hash("password123", 10)

    // Créer un administrateur
    const admin = new User({
      nom: "Admin",
      prenom: "System",
      email: "andzouanamerveille@gmail.com",
      motDePasse: "password123",
      role: "admin",
      dateNaissance: new Date("1985-01-15"),
      telephone: "0123456789",
      adresse: "123 Rue de l'Administration",
      dateEmbauche: new Date("2018-01-01"),
      departement: createdDepartments[0]._id,
      soldeConges: 25,
      estActif: true,
    })

    await admin.save()
    console.log("Administrateur créé".green)

    // Créer des managers pour chaque département
    const managers = []

    for (let i = 0; i < createdDepartments.length; i++) {
      const manager = new User({
        nom: `Manager${i + 1}`,
        prenom: `Dept${i + 1}`,
        email: `manager${i + 1}@example.com`,
        motDePasse: "password123",
        role: "manager",
        dateNaissance: new Date(`198${i}-05-${10 + i}`),
        telephone: `01234${i}6789`,
        adresse: `${i + 1}23 Rue du Management`,
        dateEmbauche: new Date(`201${i + 3}-03-01`),
        departement: createdDepartments[i]._id,
        soldeConges: 22 + i,
        estActif: true,
      })

      await manager.save()
      managers.push(manager)

      // Mettre à jour le département avec le manager
      await Department.findByIdAndUpdate(createdDepartments[i]._id, {
        manager: manager._id,
      })
    }

    console.log(`${managers.length} managers créés`.green)

    // Créer des employés pour chaque département
    const employees = []
    const roles = ["employee", "assistant"]

    for (let i = 0; i < createdDepartments.length; i++) {
      // Créer entre 3 et 8 employés par département
      const numEmployees = getRandomInt(3, 8)

      for (let j = 0; j < numEmployees; j++) {
        const role = roles[getRandomInt(0, roles.length - 1)]

        const employee = new User({
          nom: `Employe${j + 1}`,
          prenom: `Dept${i + 1}`,
          email: `employe${j + 1}_dept${i + 1}@example.com`,
          motDePasse: "password123",
          role,
          dateNaissance: new Date(`199${j % 9}-${(j % 12) + 1}-${(j % 28) + 1}`),
          telephone: `0${j}234${i}6789`,
          adresse: `${j + 1}${i + 1} Rue des Employés`,
          dateEmbauche: new Date(`201${(j % 9) + 1}-${(j % 12) + 1}-01`),
          departement: createdDepartments[i]._id,
          soldeConges: 20 + (j % 6),
          estActif: true,
        })

        await employee.save()
        employees.push(employee)

        // Ajouter l'employé au département
        await Department.findByIdAndUpdate(createdDepartments[i]._id, {
          $push: { membres: employee._id },
        })
      }
    }

    console.log(`${employees.length} employés créés`.green)

    // Créer des données de présence
    const attendances = []
    const today = new Date()
    const threeMonthsAgo = new Date(today)
    threeMonthsAgo.setMonth(today.getMonth() - 3)

    // Pour chaque utilisateur (sauf admin)
    const allUsers = [...managers, ...employees]

    for (const user of allUsers) {
      // Générer des présences pour les 3 derniers mois (jours ouvrables uniquement)
      const currentDate = new Date(threeMonthsAgo)

      while (currentDate <= today) {
        // Ignorer les weekends
        const dayOfWeek = currentDate.getDay()
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          // Générer un statut avec une distribution réaliste
          const status = getRandomAttendanceStatus()

          // Générer des heures d'arrivée et de départ en fonction du statut
          const arrivalTime = generateArrivalTime(currentDate, status)
          const departureTime = generateDepartureTime(currentDate, arrivalTime, status)

          // Générer un commentaire approprié
          const comment = generateAttendanceComment(status)

          const attendance = new Attendance({
            utilisateur: user._id,
            date: new Date(currentDate),
            heureArrivee: arrivalTime,
            heureDepart: departureTime,
            statut: status,
            commentaire: comment,
            // Ajouter un champ pour indiquer si le pointage a été fait automatiquement
            enregistreAutomatiquement: Math.random() > 0.7, // 30% des pointages sont automatiques
          })

          await attendance.save()
          attendances.push(attendance)
        }

        // Passer au jour suivant
        currentDate.setDate(currentDate.getDate() + 1)
      }

      // Ajouter des pointages spécifiques pour aujourd'hui pour certains utilisateurs
      // afin de tester les fonctionnalités de rappel et de détection de retard
      if (Math.random() > 0.7) {
        // 30% des utilisateurs n'ont pas encore pointé aujourd'hui
        // Ne rien faire - ces utilisateurs seront ciblés par le rappel de 10h
      } else if (Math.random() > 0.5) {
        // 35% des utilisateurs ont pointé à l'heure
        const todayAttendance = new Attendance({
          utilisateur: user._id,
          date: new Date(today),
          heureArrivee: new Date(today.setHours(8, getRandomInt(0, 59), 0, 0)),
          heureDepart: null, // Pas encore parti
          statut: "present",
          commentaire: "",
          enregistreAutomatiquement: false,
        })

        await todayAttendance.save()
        attendances.push(todayAttendance)
      } else {
        // 35% des utilisateurs sont en retard
        const todayAttendance = new Attendance({
          utilisateur: user._id,
          date: new Date(today),
          heureArrivee: new Date(today.setHours(9, getRandomInt(1, 59), 0, 0)),
          heureDepart: null, // Pas encore parti
          statut: "retard",
          commentaire: "Retard détecté automatiquement par le système",
          enregistreAutomatiquement: false,
        })

        await todayAttendance.save()
        attendances.push(todayAttendance)
      }
    }

    console.log(`${attendances.length} pointages créés`.green)

    // Créer des demandes de congés
    const leaves = []

    for (const user of allUsers) {
      // Générer entre 1 et 4 demandes de congés par utilisateur
      const numLeaves = getRandomInt(1, 4)

      for (let i = 0; i < numLeaves; i++) {
        const startDate = getRandomDate(threeMonthsAgo, new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000))
        const duration = getRandomInt(1, 10)
        const endDate = new Date(startDate)
        endDate.setDate(startDate.getDate() + duration - 1)

        const leaveType = getRandomLeaveType()
        const status = getRandomLeaveStatus()

        const leave = new Leave({
          utilisateur: user._id,
          typeConge: leaveType,
          dateDebut: startDate,
          dateFin: endDate,
          nombreJours: duration,
          motif: `Demande de congé ${leaveType}`,
          statut: status,
          commentaire: status === "refuse" ? "Refusé pour raisons de service" : "",
        })

        await leave.save()
        leaves.push(leave)
      }
    }

    console.log(`${leaves.length} demandes de congés créées`.green)

    // Créer des tâches
    const tasks = []
    const taskTitles = [
      "Mise à jour du site web",
      "Préparation du rapport mensuel",
      "Organisation de la réunion d'équipe",
      "Révision des procédures internes",
      "Formation des nouveaux employés",
      "Analyse des données de vente",
      "Développement de nouvelles fonctionnalités",
      "Résolution des bugs signalés",
      "Préparation de la présentation client",
      "Audit de sécurité",
      "Mise à jour des logiciels",
      "Rédaction de la documentation",
      "Planification du budget annuel",
      "Recrutement pour le poste vacant",
      "Évaluation des performances",
    ]

    // Pour chaque département
    for (const department of createdDepartments) {
      // Récupérer les membres du département
      const departmentUsers = allUsers.filter((user) => user.departement.toString() === department._id.toString())

      if (departmentUsers.length === 0) continue

      // Générer entre 5 et 15 tâches par département
      const numTasks = getRandomInt(5, 15)

      for (let i = 0; i < numTasks; i++) {
        const title = taskTitles[getRandomInt(0, taskTitles.length - 1)]
        const status = getRandomTaskStatus()
        const priority = getRandomTaskPriority()

        // Date de création entre il y a 3 mois et aujourd'hui
        const creationDate = getRandomDate(threeMonthsAgo, today)

        // Date d'échéance entre la date de création et dans 2 mois
        const twoMonthsFromNow = new Date(today)
        twoMonthsFromNow.setMonth(today.getMonth() + 2)
        const dueDate = getRandomDate(creationDate, twoMonthsFromNow)

        // Assigner la tâche à un utilisateur aléatoire du département
        const assignedTo = departmentUsers[getRandomInt(0, departmentUsers.length - 1)]._id

        // Créer entre 0 et 3 collaborateurs
        const collaborators = []
        const numCollaborators = getRandomInt(0, 3)

        for (let j = 0; j < numCollaborators; j++) {
          const collaborator = departmentUsers[getRandomInt(0, departmentUsers.length - 1)]._id
          if (!collaborators.includes(collaborator) && collaborator.toString() !== assignedTo.toString()) {
            collaborators.push(collaborator)
          }
        }

        const task = new Task({
          titre: title,
          description: `Description détaillée de la tâche: ${title}`,
          statut: status,
          priorite: priority,
          dateCreation: creationDate,
          dateEcheance: dueDate,
          assigneA: assignedTo,
          collaborateurs: collaborators,
          departement: department._id,
          commentaires: [],
        })

        // Ajouter des commentaires si la tâche n'est pas à faire
        if (status !== "a_faire") {
          const numComments = getRandomInt(1, 3)

          for (let j = 0; j < numComments; j++) {
            const commentDate = getRandomDate(creationDate, today)
            const commentAuthor = departmentUsers[getRandomInt(0, departmentUsers.length - 1)]._id

            task.commentaires.push({
              utilisateur: commentAuthor,
              contenu: `Commentaire ${j + 1} sur la tâche: ${title}`,
              date: commentDate,
            })
          }
        }

        await task.save()
        tasks.push(task)
      }
    }

    console.log(`${tasks.length} tâches créées`.green)

    // Créer des messages
    const messages = []
    const messageContents = [
      "Bonjour, pouvez-vous me donner un retour sur le projet ?",
      "Merci pour votre travail sur la dernière tâche.",
      "Quand pouvons-nous planifier une réunion ?",
      "J'ai besoin de votre aide sur un dossier urgent.",
      "Félicitations pour votre promotion !",
      "Pouvez-vous me transmettre le rapport mensuel ?",
      "N'oubliez pas la réunion de demain à 10h.",
      "Avez-vous terminé la tâche que je vous ai assignée ?",
      "Je serai absent demain, pouvez-vous me remplacer ?",
      "Merci de votre collaboration sur ce projet.",
    ]

    // Pour chaque utilisateur
    for (const sender of allUsers) {
      // Envoyer des messages à 2-5 autres utilisateurs
      const numRecipients = getRandomInt(2, 5)
      const recipients = []

      // Sélectionner des destinataires aléatoires
      while (recipients.length < numRecipients) {
        const recipient = allUsers[getRandomInt(0, allUsers.length - 1)]

        if (
          recipient._id.toString() !== sender._id.toString() &&
          !recipients.some((r) => r._id.toString() === recipient._id.toString())
        ) {
          recipients.push(recipient)
        }
      }

      // Pour chaque destinataire, envoyer 1-10 messages
      for (const recipient of recipients) {
        // Créer une conversation avec 1-10 messages
        const numMessages = getRandomInt(1, 10)
        const conversationMessages = []

        // Date de début de la conversation (entre il y a 3 mois et aujourd'hui)
        let messageDate = getRandomDate(threeMonthsAgo, today)

        for (let i = 0; i < numMessages; i++) {
          // Déterminer qui envoie ce message (alternance avec un peu d'aléatoire)
          const currentSender = i % 2 === 0 || Math.random() > 0.3 ? sender : recipient
          const currentRecipient = currentSender._id.toString() === sender._id.toString() ? recipient : sender

          // Contenu du message
          const content = messageContents[getRandomInt(0, messageContents.length - 1)]

          // Incrémenter la date pour simuler une conversation réelle
          messageDate = new Date(messageDate.getTime() + getRandomInt(1, 60) * 60000) // 1-60 minutes plus tard

          // Statut de lecture (les messages plus récents ont plus de chances d'être non lus)
          const isRead = messageDate < new Date(today.getTime() - 24 * 60 * 60 * 1000) || Math.random() > 0.3

          // Créer le message avec ou sans pièce jointe
          const messageData = {
            expediteur: currentSender._id,
            destinataire: currentRecipient._id,
            contenu: content,
            date: messageDate,
            lu: isRead,
            fichiers: [],
          }

          // Ajouter des pièces jointes pour certains messages (20% de chance)
          if (Math.random() > 0.8) {
            messageData.fichiers.push({
              nom: `fichier_${i}.pdf`,
              url: `https://example.com/files/fichier_${i}.pdf`,
              type: "application/pdf",
              taille: getRandomInt(100, 5000), // taille en KB
            })
          }

          const message = new Message(messageData)
          await message.save()
          conversationMessages.push(message)
        }

        // Ajouter tous les messages de cette conversation
        messages.push(...conversationMessages)
      }
    }

    console.log(`${messages.length} messages créés`.green)

    console.log("Données de démonstration générées avec succès !".green.bold)
    process.exit(0)
  } catch (error) {
    console.error("Erreur lors de la génération des données de démonstration:".red, error)
    process.exit(1)
  }
}

// Exécuter la fonction principale
const seedDemo = async () => {
  await seedData()
}

seedDemo()
