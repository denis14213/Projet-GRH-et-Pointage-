// Contrôleur pour l'assistant IA RH
const AIConversation = require("../models/AIConversation")
const User = require("../models/User")
const Task = require("../models/Task")
const Leave = require("../models/Leave")
const Department = require("../models/Department")
const axios = require("axios")

// Configuration de l'API OpenAI
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_MODEL = "gpt-4o" // Utiliser le modèle le plus récent disponible

// Vérifier la présence de la clé API au démarrage
if (!OPENAI_API_KEY) {
  console.error("⚠️ ATTENTION: Clé API OpenAI (OPENAI_API_KEY) non configurée dans les variables d'environnement")
  console.error("L'assistant IA ne fonctionnera pas correctement sans cette clé")
}

// Fonction pour générer une réponse via l'API OpenAI
const generateAIResponse = async (messages, systemPrompt) => {
  try {
    // Vérifier si la clé API est configurée
    if (!OPENAI_API_KEY) {
      console.error("Clé API OpenAI non configurée")
      return {
        success: false,
        message:
          "L'assistant IA n'est pas correctement configuré. La clé API OpenAI est manquante. Veuillez contacter l'administrateur système.",
        errorType: "configuration",
      }
    }

    // Préparer les messages pour l'API OpenAI
    const apiMessages = [
      {
        role: "system",
        content: systemPrompt,
      },
      ...messages.map((msg) => ({
        role: msg.role,
        content: msg.contenu,
      })),
    ]

    console.log(`Envoi de requête à OpenAI: ${messages.length} messages, modèle: ${OPENAI_MODEL}`)

    // Appeler l'API OpenAI
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: OPENAI_MODEL,
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 1000,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
      },
    )

    console.log("Réponse OpenAI reçue avec succès")

    // Extraire et retourner la réponse
    return {
      success: true,
      message: response.data.choices[0].message.content,
    }
  } catch (error) {
    console.error("Erreur lors de la génération de la réponse IA:", error)

    // Gérer différents types d'erreurs
    if (error.response) {
      console.error("Détails de l'erreur API:", error.response.data)

      // Erreur d'authentification
      if (error.response.status === 401) {
        return {
          success: false,
          message:
            "Erreur d'authentification avec le service IA. La clé API OpenAI semble invalide. Veuillez contacter l'administrateur.",
          errorType: "authentication",
        }
      }

      // Erreur de quota
      if (error.response.status === 429) {
        return {
          success: false,
          message: "Le service IA est temporairement indisponible (quota dépassé). Veuillez réessayer plus tard.",
          errorType: "quota",
        }
      }
    }

    return {
      success: false,
      message: "Une erreur est survenue lors de la génération de la réponse. Veuillez réessayer.",
      errorType: "unknown",
    }
  }
}

// Fonction pour créer un prompt système personnalisé basé sur le rôle de l'utilisateur
const createSystemPrompt = async (user) => {
  try {
    let basePrompt = `Tu es un assistant RH intelligent pour notre système de gestion des ressources humaines. 
    Ton nom est "AssistantRH". Tu dois être professionnel, courtois et précis dans tes réponses.
    
    Informations sur l'utilisateur actuel:
    - Nom: ${user.prenom} ${user.nom}
    - Email: ${user.email}
    - Rôle: ${user.role}
    `

    // Ajouter des informations spécifiques au rôle
    if (user.role === "admin") {
      basePrompt += `
      En tant qu'administrateur, tu peux aider avec:
      - La gestion des utilisateurs et des départements
      - L'approbation des congés
      - La supervision des tâches
      - L'analyse des rapports
      
      Tu dois fournir des réponses détaillées et stratégiques.
      `
    } else if (user.role === "manager") {
      // Récupérer le département géré
      const department = await Department.findOne({ manager: user._id })

      basePrompt += `
      En tant que manager${department ? ` du département ${department.nom}` : ""}, tu peux aider avec:
      - La gestion des membres de l'équipe
      - L'approbation des congés de l'équipe
      - L'attribution et le suivi des tâches
      - L'analyse des performances de l'équipe
      
      Tu dois fournir des conseils pratiques et orientés résultats.
      `
    } else {
      // Pour les employés et autres rôles
      basePrompt += `
      Tu peux aider avec:
      - Les informations sur les congés disponibles et comment les demander
      - Le suivi des tâches assignées
      - Les questions générales sur les politiques RH
      - Les procédures de l'entreprise
      
      Tu dois fournir des réponses claires et utiles.
      `
    }

    // Ajouter des instructions sur la façon de répondre
    basePrompt += `
    Quand tu ne connais pas la réponse, indique clairement que tu n'as pas cette information et suggère de contacter le service RH.
    
    Pour les questions sur les congés, tu peux suggérer de consulter la page des congés.
    Pour les questions sur les tâches, tu peux suggérer de consulter la page des tâches.
    
    Utilise un ton professionnel mais amical. Sois concis mais complet dans tes réponses.
    `

    return basePrompt
  } catch (error) {
    console.error("Erreur lors de la création du prompt système:", error)
    return `Tu es un assistant RH intelligent. Aide l'utilisateur avec ses questions sur les ressources humaines, les congés et les tâches.`
  }
}

// Fonction pour enrichir le contexte avec des données du système
const enrichContextWithData = async (userId, userMessage) => {
  try {
    const context = {}
    const lowerCaseMessage = userMessage.toLowerCase()

    // Vérifier si le message concerne les congés
    if (
      lowerCaseMessage.includes("congé") ||
      lowerCaseMessage.includes("vacances") ||
      lowerCaseMessage.includes("absence") ||
      lowerCaseMessage.includes("jour off")
    ) {
      // Récupérer les informations sur les congés de l'utilisateur
      const user = await User.findById(userId)
      const leaves = await Leave.find({ utilisateur: userId }).sort({ dateCreation: -1 }).limit(5)

      context.conges = {
        solde: user.soldeConges,
        recents: leaves.map((leave) => ({
          id: leave._id,
          type: leave.typeConge,
          debut: leave.dateDebut,
          fin: leave.dateFin,
          statut: leave.statut,
          jours: leave.nombreJours,
        })),
      }
    }

    // Vérifier si le message concerne les tâches
    if (
      lowerCaseMessage.includes("tâche") ||
      lowerCaseMessage.includes("tache") ||
      lowerCaseMessage.includes("travail") ||
      lowerCaseMessage.includes("projet") ||
      lowerCaseMessage.includes("assigné")
    ) {
      // Récupérer les tâches assignées à l'utilisateur
      const tasks = await Task.find({ assigneA: userId }).sort({ dateEcheance: 1 }).limit(5)

      context.taches = {
        nombre: tasks.length,
        recentes: tasks.map((task) => ({
          id: task._id,
          titre: task.titre,
          statut: task.statut,
          priorite: task.priorite,
          echeance: task.dateEcheance,
        })),
      }

      // Si l'utilisateur est un manager, récupérer aussi les tâches qu'il a créées
      const user = await User.findById(userId)
      if (user.role === "manager" || user.role === "admin") {
        const createdTasks = await Task.find({ creePar: userId }).sort({ dateCreation: -1 }).limit(5)

        context.tachesCreees = {
          nombre: createdTasks.length,
          recentes: createdTasks.map((task) => ({
            id: task._id,
            titre: task.titre,
            statut: task.statut,
            assigneA: task.assigneA,
          })),
        }
      }
    }

    return context
  } catch (error) {
    console.error("Erreur lors de l'enrichissement du contexte:", error)
    return {}
  }
}

// Créer une nouvelle conversation
exports.createConversation = async (req, res) => {
  try {
    const userId = req.user.id
    const { message } = req.body

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Le message ne peut pas être vide" })
    }

    // Récupérer l'utilisateur pour personnaliser les réponses
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" })
    }

    // Vérifier si la clé API OpenAI est configurée
    if (!OPENAI_API_KEY) {
      return res.status(503).json({
        message: "L'assistant IA n'est pas disponible actuellement. La clé API OpenAI n'est pas configurée.",
        errorType: "configuration",
      })
    }

    // Créer le prompt système personnalisé
    const systemPrompt = await createSystemPrompt(user)

    // Enrichir le contexte avec des données pertinentes
    const context = await enrichContextWithData(userId, message)

    // Créer une nouvelle conversation
    const newConversation = new AIConversation({
      utilisateur: userId,
      titre: `Conversation du ${new Date().toLocaleDateString()}`,
      messages: [
        {
          role: "user",
          contenu: message,
          date: new Date(),
          contexte: context,
        },
      ],
    })

    // Générer une réponse IA
    const aiResponse = await generateAIResponse(newConversation.messages, systemPrompt)

    // Ajouter la réponse à la conversation
    newConversation.messages.push({
      role: "assistant",
      contenu: aiResponse.success
        ? aiResponse.message
        : aiResponse.message || "Je suis désolé, je ne peux pas répondre pour le moment. Veuillez réessayer plus tard.",
      date: new Date(),
      erreur: !aiResponse.success ? aiResponse.errorType : null,
    })

    // Sauvegarder la conversation
    await newConversation.save()

    res.status(201).json({
      message: "Conversation créée avec succès",
      conversation: newConversation,
      aiError: !aiResponse.success ? aiResponse.errorType : null,
    })
  } catch (error) {
    console.error("Erreur lors de la création de la conversation:", error)
    res.status(500).json({ message: "Erreur serveur lors de la création de la conversation" })
  }
}

// Envoyer un message dans une conversation existante
exports.sendMessage = async (req, res) => {
  try {
    const userId = req.user.id
    const conversationId = req.params.id
    const { message } = req.body

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Le message ne peut pas être vide" })
    }

    // Récupérer la conversation
    const conversation = await AIConversation.findById(conversationId)
    if (!conversation) {
      return res.status(404).json({ message: "Conversation non trouvée" })
    }

    // Vérifier que l'utilisateur est bien le propriétaire de la conversation
    if (conversation.utilisateur.toString() !== userId.toString()) {
      console.log(
        `Erreur d'autorisation: ID utilisateur ${userId} tente d'accéder à la conversation ${conversationId} appartenant à ${conversation.utilisateur}`,
      )
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à accéder à cette conversation" })
    }

    // Vérifier si la clé API OpenAI est configurée
    if (!OPENAI_API_KEY) {
      return res.status(503).json({
        message: "L'assistant IA n'est pas disponible actuellement. La clé API OpenAI n'est pas configurée.",
        errorType: "configuration",
      })
    }

    // Récupérer l'utilisateur pour personnaliser les réponses
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" })
    }

    // Créer le prompt système personnalisé
    const systemPrompt = await createSystemPrompt(user)

    // Enrichir le contexte avec des données pertinentes
    const context = await enrichContextWithData(userId, message)

    // Ajouter le message de l'utilisateur à la conversation
    conversation.messages.push({
      role: "user",
      contenu: message,
      date: new Date(),
      contexte: context,
    })

    // Limiter le nombre de messages pour éviter de dépasser les limites de l'API
    const recentMessages = conversation.messages.slice(-10)

    // Générer une réponse IA
    const aiResponse = await generateAIResponse(recentMessages, systemPrompt)

    // Ajouter la réponse à la conversation
    conversation.messages.push({
      role: "assistant",
      contenu: aiResponse.success
        ? aiResponse.message
        : aiResponse.message || "Je suis désolé, je ne peux pas répondre pour le moment. Veuillez réessayer plus tard.",
      date: new Date(),
      erreur: !aiResponse.success ? aiResponse.errorType : null,
    })

    // Mettre à jour la date de dernière mise à jour
    conversation.derniereMiseAJour = new Date()

    // Sauvegarder la conversation
    await conversation.save()

    res.status(200).json({
      message: "Message envoyé avec succès",
      conversation,
      aiError: !aiResponse.success ? aiResponse.errorType : null,
    })
  } catch (error) {
    console.error("Erreur lors de l'envoi du message:", error)
    res.status(500).json({ message: "Erreur serveur lors de l'envoi du message" })
  }
}

// Récupérer toutes les conversations de l'utilisateur
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.id

    // Récupérer les conversations de l'utilisateur
    const conversations = await AIConversation.find({
      utilisateur: userId,
      actif: true,
    }).sort({ derniereMiseAJour: -1 })

    res.status(200).json(conversations)
  } catch (error) {
    console.error("Erreur lors de la récupération des conversations:", error)
    res.status(500).json({ message: "Erreur serveur lors de la récupération des conversations" })
  }
}

// Récupérer une conversation spécifique
exports.getConversation = async (req, res) => {
  try {
    const userId = req.user.id
    const conversationId = req.params.id

    // Récupérer la conversation
    const conversation = await AIConversation.findById(conversationId)
    if (!conversation) {
      return res.status(404).json({ message: "Conversation non trouvée" })
    }

    // Vérifier que l'utilisateur est bien le propriétaire de la conversation
    if (conversation.utilisateur.toString() !== userId.toString()) {
      console.log(
        `Erreur d'autorisation: ID utilisateur ${userId} tente d'accéder à la conversation ${conversationId} appartenant à ${conversation.utilisateur}`,
      )
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à accéder à cette conversation" })
    }

    res.status(200).json(conversation)
  } catch (error) {
    console.error("Erreur lors de la récupération de la conversation:", error)
    res.status(500).json({ message: "Erreur serveur lors de la récupération de la conversation" })
  }
}

// Supprimer une conversation (soft delete)
exports.deleteConversation = async (req, res) => {
  try {
    const userId = req.user.id
    const conversationId = req.params.id

    // Récupérer la conversation
    const conversation = await AIConversation.findById(conversationId)
    if (!conversation) {
      return res.status(404).json({ message: "Conversation non trouvée" })
    }

    // Vérifier que l'utilisateur est bien le propriétaire de la conversation
    if (conversation.utilisateur.toString() !== userId.toString()) {
      console.log(
        `Erreur d'autorisation: ID utilisateur ${userId} tente de supprimer la conversation ${conversationId} appartenant à ${conversation.utilisateur}`,
      )
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à supprimer cette conversation" })
    }

    // Soft delete (marquer comme inactif)
    conversation.actif = false
    await conversation.save()

    res.status(200).json({ message: "Conversation supprimée avec succès" })
  } catch (error) {
    console.error("Erreur lors de la suppression de la conversation:", error)
    res.status(500).json({ message: "Erreur serveur lors de la suppression de la conversation" })
  }
}

// Renommer une conversation
exports.renameConversation = async (req, res) => {
  try {
    const userId = req.user.id
    const conversationId = req.params.id
    const { titre } = req.body

    if (!titre || !titre.trim()) {
      return res.status(400).json({ message: "Le titre ne peut pas être vide" })
    }

    // Récupérer la conversation
    const conversation = await AIConversation.findById(conversationId)
    if (!conversation) {
      return res.status(404).json({ message: "Conversation non trouvée" })
    }

    // Vérifier que l'utilisateur est bien le propriétaire de la conversation
    if (conversation.utilisateur.toString() !== userId.toString()) {
      console.log(
        `Erreur d'autorisation: ID utilisateur ${userId} tente de renommer la conversation ${conversationId} appartenant à ${conversation.utilisateur}`,
      )
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à modifier cette conversation" })
    }

    // Mettre à jour le titre
    conversation.titre = titre
    await conversation.save()

    res.status(200).json({
      message: "Conversation renommée avec succès",
      conversation,
    })
  } catch (error) {
    console.error("Erreur lors du renommage de la conversation:", error)
    res.status(500).json({ message: "Erreur serveur lors du renommage de la conversation" })
  }
}

// Vérifier l'état de l'API OpenAI
exports.checkApiStatus = async (req, res) => {
  try {
    // Vérifier si l'utilisateur est un administrateur
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Seuls les administrateurs peuvent vérifier l'état de l'API" })
    }

    // Vérifier si la clé API est configurée
    if (!OPENAI_API_KEY) {
      return res.status(200).json({
        status: "error",
        message: "La clé API OpenAI n'est pas configurée",
        configured: false,
      })
    }

    // Tester l'API avec une requête simple
    try {
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-3.5-turbo", // Utiliser un modèle moins coûteux pour le test
          messages: [{ role: "user", content: "Test de connexion" }],
          max_tokens: 5,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
        },
      )

      return res.status(200).json({
        status: "success",
        message: "La connexion à l'API OpenAI fonctionne correctement",
        configured: true,
        model: OPENAI_MODEL,
      })
    } catch (apiError) {
      console.error("Erreur lors du test de l'API OpenAI:", apiError)

      let errorMessage = "Erreur lors du test de l'API OpenAI"
      let errorType = "unknown"

      if (apiError.response) {
        if (apiError.response.status === 401) {
          errorMessage = "La clé API OpenAI est invalide ou a expiré"
          errorType = "authentication"
        } else if (apiError.response.status === 429) {
          errorMessage = "Quota dépassé pour l'API OpenAI"
          errorType = "quota"
        } else {
          errorMessage = `Erreur API: ${apiError.response.status} - ${apiError.response.data.error?.message || "Erreur inconnue"}`
        }
      }

      return res.status(200).json({
        status: "error",
        message: errorMessage,
        errorType,
        configured: true,
        details: apiError.response?.data || null,
      })
    }
  } catch (error) {
    console.error("Erreur lors de la vérification de l'état de l'API:", error)
    res.status(500).json({ message: "Erreur serveur lors de la vérification de l'état de l'API" })
  }
}

// Analyser les performances des tâches (pour les managers)
exports.analyzeTaskPerformance = async (req, res) => {
  try {
    const userId = req.user.id
    const { departementId, periode } = req.query

    // Vérifier que l'utilisateur est un manager ou un admin
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" })
    }

    if (user.role !== "manager" && user.role !== "admin") {
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à accéder à cette fonctionnalité" })
    }

    // Déterminer la période d'analyse
    const dateDebut = new Date()
    if (periode === "semaine") {
      dateDebut.setDate(dateDebut.getDate() - 7)
    } else if (periode === "mois") {
      dateDebut.setMonth(dateDebut.getMonth() - 1)
    } else {
      // Par défaut, 30 jours
      dateDebut.setDate(dateDebut.getDate() - 30)
    }

    // Construire la requête
    const query = {
      derniereMiseAJour: { $gte: dateDebut },
    }

    // Si un département spécifique est demandé et que l'utilisateur est admin
    if (departementId && user.role === "admin") {
      query.departement = departementId
    }
    // Si l'utilisateur est un manager, limiter aux tâches de son département
    else if (user.role === "manager") {
      const managedDept = await Department.findOne({ manager: userId })
      if (managedDept) {
        query.departement = managedDept._id
      } else {
        // Si le manager n'a pas de département, retourner un résultat vide
        return res.status(200).json({
          message: "Aucun département géré trouvé",
          performance: {
            totalTasks: 0,
            completedTasks: 0,
            completionRate: 0,
            averageCompletionTime: 0,
            tasksByStatus: {},
            tasksByPriority: {},
          },
        })
      }
    }

    // Récupérer les tâches
    const tasks = await Task.find(query).populate("assigneA", "nom prenom").populate("departement", "nom")

    // Analyser les performances
    const completedTasks = tasks.filter((task) => task.statut === "terminee")
    const completionRate = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0

    // Calculer le temps moyen de complétion
    let totalCompletionTime = 0
    let tasksWithCompletionTime = 0

    completedTasks.forEach((task) => {
      if (task.historique && task.historique.length > 0) {
        // Trouver l'entrée d'historique où la tâche a été marquée comme terminée
        const completionEntry = task.historique.find((entry) => entry.nouveauStatut === "terminee")

        if (completionEntry && completionEntry.date) {
          const creationDate = task.dateCreation || task.createdAt
          const completionDate = new Date(completionEntry.date)

          // Calculer la différence en jours
          const diffTime = Math.abs(completionDate - creationDate)
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

          totalCompletionTime += diffDays
          tasksWithCompletionTime++
        }
      }
    })

    const averageCompletionTime = tasksWithCompletionTime > 0 ? totalCompletionTime / tasksWithCompletionTime : 0

    // Regrouper les tâches par statut
    const tasksByStatus = {}
    tasks.forEach((task) => {
      if (!tasksByStatus[task.statut]) {
        tasksByStatus[task.statut] = 0
      }
      tasksByStatus[task.statut]++
    })

    // Regrouper les tâches par priorité
    const tasksByPriority = {}
    tasks.forEach((task) => {
      if (!tasksByPriority[task.priorite]) {
        tasksByPriority[task.priorite] = 0
      }
      tasksByPriority[task.priorite]++
    })

    // Regrouper les tâches par utilisateur
    const tasksByUser = {}
    tasks.forEach((task) => {
      if (task.assigneA) {
        const userId = task.assigneA._id.toString()
        const userName = `${task.assigneA.prenom} ${task.assigneA.nom}`

        if (!tasksByUser[userId]) {
          tasksByUser[userId] = {
            name: userName,
            total: 0,
            completed: 0,
            inProgress: 0,
            overdue: 0,
          }
        }

        tasksByUser[userId].total++

        if (task.statut === "terminee") {
          tasksByUser[userId].completed++
        } else if (task.statut === "en_cours") {
          tasksByUser[userId].inProgress++
        }

        // Vérifier si la tâche est en retard
        if (task.dateEcheance && new Date(task.dateEcheance) < new Date() && task.statut !== "terminee") {
          tasksByUser[userId].overdue++
        }
      }
    })

    res.status(200).json({
      message: "Analyse des performances récupérée avec succès",
      performance: {
        totalTasks: tasks.length,
        completedTasks: completedTasks.length,
        completionRate: Number.parseFloat(completionRate.toFixed(2)),
        averageCompletionTime: Number.parseFloat(averageCompletionTime.toFixed(2)),
        tasksByStatus,
        tasksByPriority,
        tasksByUser: Object.values(tasksByUser),
      },
    })
  } catch (error) {
    console.error("Erreur lors de l'analyse des performances:", error)
    res.status(500).json({ message: "Erreur serveur lors de l'analyse des performances" })
  }
}
