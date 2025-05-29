// Contrôleur pour l'authentification
const User = require("../models/User")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")
const nodemailer = require("nodemailer")
const { google } = require("googleapis")

// Configuration améliorée du transporteur d'email
const createTransporter = () => {
  // Vérifier si les variables d'environnement sont définies
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.warn("ATTENTION: Variables d'environnement EMAIL_USER ou EMAIL_PASSWORD non définies")
    return null
  }

  // Créer le transporteur avec plus d'options de débogage
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    debug: true, // Active le débogage
    logger: true, // Active la journalisation
  })
}

// Fonction pour générer un mot de passe aléatoire
const generatePassword = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let password = ""
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

// Fonction améliorée pour envoyer un email avec les identifiants
const sendCredentialsEmail = async (email, password) => {
  try {
    // Vérifier si les variables d'environnement sont définies
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn("Impossible d'envoyer l'email: Variables d'environnement EMAIL_USER ou EMAIL_PASSWORD non définies")
      return false
    }

    const transporter = createTransporter()

    if (!transporter) {
      console.warn("Impossible de créer le transporteur d'email")
      return false
    }

    // Vérifier la connexion au serveur SMTP avant d'envoyer
    try {
      await transporter.verify()
      console.log("Connexion au serveur SMTP réussie")
    } catch (verifyError) {
      console.error("Erreur de connexion au serveur SMTP:", verifyError)
      return false
    }

    // Envoyer l'email
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Vos identifiants de connexion",
      html: `
        <h1>Bienvenue sur notre plateforme de gestion RH</h1>
        <p>Voici vos identifiants de connexion :</p>
        <p><strong>Email :</strong> ${email}</p>
        <p><strong>Mot de passe temporaire :</strong> ${password}</p>
        <p>Veuillez vous connecter et changer votre mot de passe dès que possible.</p>
      `,
    })

    console.log("Email envoyé avec succès:", info.messageId)
    return true
  } catch (error) {
    console.error("Erreur détaillée lors de l'envoi de l'email:", error)

    // Afficher des informations supplémentaires sur l'erreur
    if (error.code === "EAUTH") {
      console.error("Problème d'authentification avec le serveur SMTP. Vérifiez vos identifiants.")
    } else if (error.code === "ESOCKET") {
      console.error(
        "Problème de connexion au serveur SMTP. Vérifiez votre connexion internet et les paramètres du serveur.",
      )
    }

    return false
  }
}

// Modifier la fonction register pour gérer les erreurs d'envoi d'email
exports.register = async (req, res) => {
  try {
    // Afficher les données reçues pour déboguer
    console.log("Données reçues dans register:", req.body)
    console.log("Type de contenu:", req.headers["content-type"])

    const { nom, prenom, email, role, departement } = req.body

    // Vérifier si tous les champs requis sont présents
    if (!nom || !prenom || !email) {
      console.log("Champs manquants:", { nom, prenom, email })
      return res.status(400).json({
        message: "Tous les champs requis doivent être remplis",
        missingFields: {
          nom: !nom,
          prenom: !prenom,
          email: !email,
        },
      })
    }

    // Vérifier si l'utilisateur existe déjà
    const userExists = await User.findOne({ email })
    if (userExists) {
      return res.status(400).json({ message: "Cet email est déjà utilisé" })
    }

    // Générer un mot de passe temporaire
    const tempPassword = generatePassword()

    // Créer un nouvel utilisateur
    const newUser = new User({
      nom,
      prenom,
      email,
      motDePasse: tempPassword,
      role: role || "employee",
      departement,
      premiereConnexion: true,
    })

    // Sauvegarder l'utilisateur dans la base de données
    await newUser.save()

    // Si un département est spécifié lors de la création
    if (departement) {
      // Ajouter l'utilisateur au département
      const Department = require("../models/Department")
      await Department.findByIdAndUpdate(departement, {
        $addToSet: { membres: newUser._id },
      })
    }

    // Tenter d'envoyer les identifiants par email
    const emailSent = await sendCredentialsEmail(email, tempPassword)

    // Même si l'envoi d'email échoue, l'utilisateur est créé avec succès
    res.status(201).json({
      message: "Utilisateur créé avec succès",
      emailSent,
      tempPassword: emailSent ? undefined : tempPassword, // Renvoyer le mot de passe uniquement si l'email n'a pas été envoyé
      emailConfigured: !!process.env.EMAIL_USER && !!process.env.EMAIL_PASSWORD,
      user: {
        id: newUser._id,
        nom: newUser.nom,
        prenom: newUser.prenom,
        email: newUser.email,
        role: newUser.role,
      },
    })
  } catch (error) {
    console.error("Erreur lors de l'inscription:", error)
    res.status(500).json({
      message: "Erreur serveur lors de l'inscription",
      details: error.message,
      validationErrors: error.errors
        ? Object.keys(error.errors).map((key) => ({
            field: key,
            message: error.errors[key].message,
          }))
        : null,
    })
  }
}

// Connexion d'un utilisateur
exports.login = async (req, res) => {
  try {
    const { email, motDePasse } = req.body

    console.log("Tentative de connexion:", { email, passwordProvided: !!motDePasse })

    // Vérifier si l'email et le mot de passe sont fournis
    if (!email || !motDePasse) {
      return res.status(400).json({ message: "Email et mot de passe requis" })
    }

    // Vérifier si l'utilisateur existe
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(401).json({ message: "Email ou mot de passe incorrect" })
    }

    // Vérifier le mot de passe
    const isMatch = await user.comparePassword(motDePasse)
    if (!isMatch) {
      return res.status(401).json({ message: "Email ou mot de passe incorrect" })
    }

    // Générer un token JWT
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || "secret_key", {
      expiresIn: "24h",
    })

    res.status(200).json({
      message: "Connexion réussie",
      token,
      user: {
        id: user._id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
        premiereConnexion: user.premiereConnexion,
      },
    })
  } catch (error) {
    console.error("Erreur lors de la connexion:", error)
    res.status(500).json({ message: "Erreur serveur lors de la connexion" })
  }
}

// Changement de mot de passe
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    const userId = req.user.id

    // Trouver l'utilisateur
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" })
    }

    // Vérifier le mot de passe actuel
    const isMatch = await user.comparePassword(currentPassword)
    if (!isMatch) {
      return res.status(401).json({ message: "Mot de passe actuel incorrect" })
    }

    // Mettre à jour le mot de passe
    user.motDePasse = newPassword

    // Si c'est la première connexion, mettre à jour le statut
    if (user.premiereConnexion) {
      user.premiereConnexion = false
    }

    await user.save()

    res.status(200).json({ message: "Mot de passe changé avec succès" })
  } catch (error) {
    console.error("Erreur lors du changement de mot de passe:", error)
    res.status(500).json({ message: "Erreur serveur lors du changement de mot de passe" })
  }
}

// Réinitialisation du mot de passe
exports.resetPassword = async (req, res) => {
  try {
    const { email } = req.body

    // Vérifier si l'utilisateur existe
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" })
    }

    // Générer un nouveau mot de passe temporaire
    const tempPassword = generatePassword()

    // Mettre à jour le mot de passe et marquer comme première connexion
    user.motDePasse = tempPassword
    user.premiereConnexion = true
    await user.save()

    // Tenter d'envoyer le nouveau mot de passe par email
    const emailSent = await sendCredentialsEmail(email, tempPassword)

    res.status(200).json({
      message: "Mot de passe réinitialisé avec succès",
      emailSent,
      tempPassword: emailSent ? undefined : tempPassword, // Renvoyer le mot de passe uniquement si l'email n'a pas été envoyé
      emailConfigured: !!process.env.EMAIL_USER && !!process.env.EMAIL_PASSWORD,
    })
  } catch (error) {
    console.error("Erreur lors de la réinitialisation du mot de passe:", error)
    res.status(500).json({ message: "Erreur serveur lors de la réinitialisation du mot de passe" })
  }
}

// Vérification du token JWT
exports.verifyToken = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1]

    if (!token) {
      return res.status(401).json({ message: "Aucun token fourni" })
    }

    // Vérifier le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret_key")

    // Vérifier si l'utilisateur existe toujours
    const user = await User.findById(decoded.id)
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" })
    }

    res.status(200).json({
      valid: true,
      user: {
        id: user._id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("Erreur lors de la vérification du token:", error)
    res.status(401).json({ message: "Token invalide ou expiré" })
  }
}

// Générer l'URL d'autorisation Google
exports.getGoogleAuthUrl = async (req, res) => {
  try {
    const userId = req.user.id

    // Configurer le client OAuth2
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    )

    // Définir les scopes pour accéder au calendrier
    const scopes = ["https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/calendar.events"]

    // Générer l'URL d'autorisation
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      prompt: "consent", // Pour s'assurer d'obtenir un refresh_token
      state: userId, // Pour identifier l'utilisateur lors du callback
    })

    res.status(200).json({ authUrl })
  } catch (error) {
    console.error("Erreur lors de la génération de l'URL d'autorisation Google:", error)
    res.status(500).json({ message: "Erreur serveur lors de la génération de l'URL d'autorisation Google" })
  }
}

// Gérer le callback de Google
exports.handleGoogleCallback = async (req, res) => {
  try {
    const { code } = req.body
    const userId = req.user.id

    if (!code) {
      return res.status(400).json({ message: "Code d'autorisation manquant" })
    }

    // Configurer le client OAuth2
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    )

    // Échanger le code contre des tokens
    const { tokens } = await oauth2Client.getToken(code)

    if (!tokens.refresh_token) {
      return res.status(400).json({
        message:
          "Aucun refresh token reçu. Veuillez révoquer l'accès à l'application dans votre compte Google et réessayer.",
      })
    }

    // Mettre à jour l'utilisateur avec le refresh token
    await User.findByIdAndUpdate(userId, {
      googleRefreshToken: tokens.refresh_token,
    })

    res.status(200).json({ message: "Connexion à Google Calendar réussie" })
  } catch (error) {
    console.error("Erreur lors du traitement du callback Google:", error)
    res.status(500).json({ message: "Erreur serveur lors du traitement du callback Google" })
  }
}

// Déconnecter Google Calendar
exports.disconnectGoogleCalendar = async (req, res) => {
  try {
    const userId = req.user.id

    // Mettre à jour l'utilisateur pour supprimer le refresh token
    await User.findByIdAndUpdate(userId, {
      $unset: { googleRefreshToken: "" },
    })

    res.status(200).json({ message: "Déconnexion de Google Calendar réussie" })
  } catch (error) {
    console.error("Erreur lors de la déconnexion de Google Calendar:", error)
    res.status(500).json({ message: "Erreur serveur lors de la déconnexion de Google Calendar" })
  }
}
