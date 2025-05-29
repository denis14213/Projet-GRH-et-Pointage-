// Middleware d'authentification
const jwt = require("jsonwebtoken")
const User = require("../models/User")

// Middleware pour vérifier le token JWT
exports.auth = async (req, res, next) => {
  try {
    // Récupérer le token du header Authorization ou des query parameters
    const token = req.header("Authorization")?.replace("Bearer ", "") || req.query.token

    if (!token) {
      return res.status(401).json({ message: "Authentification requise" })
    }

    try {
      // Vérifier le token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret_key")

      // Trouver l'utilisateur
      const user = await User.findById(decoded.id)
      if (!user) {
        return res.status(401).json({ message: "Utilisateur non trouvé" })
      }

      // Ajouter l'utilisateur à la requête
      req.user = {
        id: user._id,
        role: user.role,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
      }

      next()
    } catch (jwtError) {
      console.error("Erreur JWT:", jwtError)
      return res.status(401).json({ message: "Token invalide ou expiré" })
    }
  } catch (error) {
    console.error("Erreur d'authentification:", error)
    res.status(500).json({ message: "Erreur serveur lors de l'authentification" })
  }
}

// Middleware pour vérifier les rôles
exports.checkRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentification requise" })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Accès non autorisé" })
    }

    next()
  }
}
