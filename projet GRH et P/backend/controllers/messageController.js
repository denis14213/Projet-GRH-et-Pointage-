// Contrôleur pour la gestion des messages
const Message = require("../models/Message")
const User = require("../models/User")
const multer = require("multer")
const path = require("path")
const fs = require("fs")

// Configuration de multer pour le stockage des fichiers
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/messages"
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

// Envoyer un message
exports.sendMessage = async (req, res) => {
  try {
    const { destinataire, contenu } = req.body
    const expediteur = req.user.id

    console.log("Tentative d'envoi de message:")
    console.log("- De:", expediteur)
    console.log("- À:", destinataire)
    console.log("- Contenu:", contenu ? `${contenu.substring(0, 30)}${contenu.length > 30 ? "..." : ""}` : "vide")
    console.log("- Fichiers:", req.files ? req.files.length : 0)

    // Vérifier si l'ID du destinataire est valide
    if (!destinataire || destinataire === "undefined") {
      return res.status(400).json({ message: "ID de destinataire invalide ou manquant" })
    }

    // Vérifier si l'ID est au format ObjectId valide
    if (!/^[0-9a-fA-F]{24}$/.test(destinataire)) {
      return res.status(400).json({ message: "Format d'ID destinataire invalide" })
    }

    // Vérifier si le destinataire existe
    const destinataireUser = await User.findById(destinataire)
    if (!destinataireUser) {
      return res.status(404).json({ message: "Destinataire non trouvé" })
    }

    // Vérifier si le contenu est fourni lorsqu'il n'y a pas de fichiers
    if (!contenu && (!req.files || req.files.length === 0)) {
      return res.status(400).json({ message: "Le message doit contenir du texte ou des fichiers" })
    }

    // Créer le message
    const newMessage = new Message({
      expediteur,
      destinataire,
      contenu: contenu || "", // Assurer qu'il y a au moins une chaîne vide
    })

    // Ajouter les fichiers s'ils existent
    if (req.files && req.files.length > 0) {
      newMessage.fichiers = req.files.map((file) => ({
        nom: file.originalname,
        url: `/uploads/messages/${file.filename}`,
        type: file.mimetype,
        taille: file.size, // Ajouter la taille du fichier
      }))
    }

    await newMessage.save()
    console.log("Message enregistré avec succès, ID:", newMessage._id)

    // Notifier le destinataire en temps réel
    try {
      const io = req.app.get("io")
      if (io) {
        io.to(destinataire).emit("new_message", {
          message: newMessage,
          expediteur: {
            id: req.user.id,
            nom: req.user.nom,
            prenom: req.user.prenom,
          },
        })
        console.log("Notification Socket.IO envoyée au destinataire")
      } else {
        console.warn("Instance Socket.IO non disponible")
      }
    } catch (socketError) {
      console.error("Erreur lors de l'envoi de la notification Socket.IO:", socketError)
      // Ne pas échouer si la notification échoue
    }

    res.status(201).json({
      message: "Message envoyé avec succès",
      data: newMessage,
    })
  } catch (error) {
    console.error("Erreur lors de l'envoi du message:", error)
    res.status(500).json({
      message: "Erreur serveur lors de l'envoi du message",
      error: error.message,
    })
  }
}

// Obtenir les conversations de l'utilisateur
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.id
    console.log("Récupération des conversations pour l'utilisateur:", userId)

    // Vérifier que l'ID utilisateur est valide
    if (!userId || !/^[0-9a-fA-F]{24}$/.test(userId)) {
      return res.status(400).json({ message: "ID utilisateur invalide" })
    }

    // Trouver tous les messages envoyés ou reçus par l'utilisateur
    const messages = await Message.find({
      $or: [{ expediteur: userId }, { destinataire: userId }],
    }).sort({ dateEnvoi: -1 })

    console.log(`${messages.length} messages trouvés au total`)

    // Si aucun message n'est trouvé, retourner un tableau vide au lieu de continuer
    if (messages.length === 0) {
      console.log("Aucun message trouvé, retour d'un tableau vide")
      return res.status(200).json([])
    }

    // Extraire les IDs uniques des utilisateurs avec qui l'utilisateur a conversé
    const conversationUserIds = [
      ...new Set(
        messages.map((msg) =>
          msg.expediteur.toString() === userId ? msg.destinataire.toString() : msg.expediteur.toString(),
        ),
      ),
    ]

    console.log(`${conversationUserIds.length} conversations uniques identifiées`)

    // Récupérer les informations des utilisateurs
    const users = await User.find({
      _id: { $in: conversationUserIds },
    }).select("nom prenom email photoProfil")

    console.log(`${users.length} utilisateurs récupérés pour les conversations`)

    // Créer un objet de correspondance ID -> User
    const userMap = {}
    users.forEach((user) => {
      userMap[user._id.toString()] = user
    })

    // Regrouper les messages par conversation
    const conversations = conversationUserIds.map((otherUserId) => {
      const conversationMessages = messages
        .filter(
          (msg) =>
            (msg.expediteur.toString() === userId && msg.destinataire.toString() === otherUserId) ||
            (msg.expediteur.toString() === otherUserId && msg.destinataire.toString() === userId),
        )
        .sort((a, b) => a.dateEnvoi - b.dateEnvoi)

      const lastMessage = conversationMessages[conversationMessages.length - 1]
      const unreadCount = conversationMessages.filter(
        (msg) => msg.expediteur.toString() === otherUserId && !msg.lu,
      ).length

      return {
        utilisateur: userMap[otherUserId],
        dernierMessage: lastMessage,
        nonLus: unreadCount,
      }
    })

    // Filtrer les conversations sans utilisateur valide (peut arriver si un utilisateur a été supprimé)
    const validConversations = conversations.filter((conv) => conv.utilisateur)

    if (validConversations.length < conversations.length) {
      console.log(
        `${conversations.length - validConversations.length} conversations filtrées car utilisateur non trouvé`,
      )
    }

    // Trier les conversations par date du dernier message (plus récent en premier)
    validConversations.sort((a, b) => {
      // Vérifier si les deux conversations ont un dernier message
      if (!a.dernierMessage && !b.dernierMessage) return 0
      if (!a.dernierMessage) return 1
      if (!b.dernierMessage) return -1

      return new Date(b.dernierMessage.dateEnvoi) - new Date(a.dernierMessage.dateEnvoi)
    })

    res.status(200).json(validConversations)
  } catch (error) {
    console.error("Erreur lors de la récupération des conversations:", error)
    res.status(500).json({
      message: "Erreur serveur lors de la récupération des conversations",
      error: error.message,
    })
  }
}

// Obtenir les messages d'une conversation
exports.getMessages = async (req, res) => {
  try {
    const userId = req.user.id
    const otherUserId = req.params.userId

    console.log("Récupération des messages de la conversation:")
    console.log("- Utilisateur:", userId)
    console.log("- Autre utilisateur:", otherUserId)

    // Vérifier si l'ID de l'utilisateur est valide
    if (!otherUserId || otherUserId === "undefined") {
      return res.status(400).json({ message: "ID d'utilisateur invalide ou manquant" })
    }

    // Vérifier si l'ID est au format ObjectId valide
    if (!/^[0-9a-fA-F]{24}$/.test(otherUserId)) {
      return res.status(400).json({ message: "Format d'ID utilisateur invalide" })
    }

    // Vérifier si l'autre utilisateur existe
    const otherUser = await User.findById(otherUserId)
    if (!otherUser) {
      return res.status(404).json({ message: "Utilisateur non trouvé" })
    }

    // Récupérer les messages de la conversation
    const messages = await Message.find({
      $or: [
        { expediteur: userId, destinataire: otherUserId },
        { expediteur: otherUserId, destinataire: userId },
      ],
    }).sort({ dateEnvoi: 1 })

    console.log(`${messages.length} messages trouvés dans la conversation`)

    // Marquer les messages non lus comme lus
    const updateResult = await Message.updateMany(
      { expediteur: otherUserId, destinataire: userId, lu: false },
      { $set: { lu: true } },
    )

    console.log(`${updateResult.modifiedCount} messages marqués comme lus`)

    res.status(200).json({
      utilisateur: {
        id: otherUser._id,
        nom: otherUser.nom,
        prenom: otherUser.prenom,
        email: otherUser.email,
        photoProfil: otherUser.photoProfil,
        role: otherUser.role,
      },
      messages,
    })
  } catch (error) {
    console.error("Erreur lors de la récupération des messages:", error)
    res.status(500).json({
      message: "Erreur serveur lors de la récupération des messages",
      error: error.message,
    })
  }
}

// Marquer un message comme lu
exports.markAsRead = async (req, res) => {
  try {
    const messageId = req.params.id
    const userId = req.user.id

    // Vérifier si le message existe
    const message = await Message.findById(messageId)
    if (!message) {
      return res.status(404).json({ message: "Message non trouvé" })
    }

    // Vérifier si l'utilisateur est le destinataire du message
    if (message.destinataire.toString() !== userId) {
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à marquer ce message comme lu" })
    }

    // Marquer le message comme lu
    message.lu = true
    await message.save()

    res.status(200).json({ message: "Message marqué comme lu" })
  } catch (error) {
    console.error("Erreur lors du marquage du message comme lu:", error)
    res.status(500).json({ message: "Erreur serveur lors du marquage du message comme lu" })
  }
}

// Supprimer un message
exports.deleteMessage = async (req, res) => {
  try {
    const messageId = req.params.id
    const userId = req.user.id

    // Vérifier si le message existe
    const message = await Message.findById(messageId)
    if (!message) {
      return res.status(404).json({ message: "Message non trouvé" })
    }

    // Vérifier si l'utilisateur est l'expéditeur du message
    if (message.expediteur.toString() !== userId && req.user.role !== "admin") {
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à supprimer ce message" })
    }

    // Supprimer les fichiers associés
    if (message.fichiers && message.fichiers.length > 0) {
      message.fichiers.forEach((fichier) => {
        const filePath = path.join(__dirname, "..", fichier.url)
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }
      })
    }

    // Supprimer le message
    await Message.findByIdAndDelete(messageId)

    // Notifier le destinataire de la suppression
    const io = req.app.get("io")
    io.to(message.destinataire.toString()).emit("message_deleted", {
      messageId,
    })

    res.status(200).json({ message: "Message supprimé avec succès" })
  } catch (error) {
    console.error("Erreur lors de la suppression du message:", error)
    res.status(500).json({ message: "Erreur serveur lors de la suppression du message" })
  }
}

// Obtenir le nombre de messages non lus
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id

    // Compter les messages non lus
    const unreadCount = await Message.countDocuments({
      destinataire: userId,
      lu: false,
    })

    res.status(200).json({ unreadCount })
  } catch (error) {
    console.error("Erreur lors du comptage des messages non lus:", error)
    res.status(500).json({ message: "Erreur serveur lors du comptage des messages non lus" })
  }
}
