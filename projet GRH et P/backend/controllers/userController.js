// Contrôleur pour la gestion des utilisateurs
const User = require("../models/User")
const Department = require("../models/Department")
const multer = require("multer")
const path = require("path")
const fs = require("fs")

// Configuration de multer pour le stockage des images de profil
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/profiles"
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`)
  },
})

// Filtre pour les types de fichiers acceptés
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png"]
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error("Type de fichier non supporté. Seuls JPEG, JPG et PNG sont acceptés."), false)
  }
}

exports.upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter,
})

// Obtenir tous les utilisateurs (pour l'administrateur)
exports.getAllUsers = async (req, res) => {
  try {
    const { role, email, nom, departement } = req.query
    const query = {}

    // Filtres optionnels
    if (role) query.role = role
    if (email) query.email = { $regex: email, $options: "i" }
    if (nom) query.nom = { $regex: nom, $options: "i" }
    if (departement) query.departement = departement

    // Modifier cette partie pour permettre à tous les utilisateurs authentifiés d'accéder à la liste
    // Mais ne pas renvoyer les informations sensibles pour les non-administrateurs
    const users = await User.find(query).select("-motDePasse").populate("departement", "nom")

    res.status(200).json(users)
  } catch (error) {
    console.error("Erreur lors de la récupération des utilisateurs:", error)
    res.status(500).json({ message: "Erreur serveur lors de la récupération des utilisateurs" })
  }
}

// Obtenir un utilisateur par ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-motDePasse").populate("departement", "nom")

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" })
    }

    res.status(200).json(user)
  } catch (error) {
    console.error("Erreur lors de la récupération de l'utilisateur:", error)
    res.status(500).json({ message: "Erreur serveur lors de la récupération de l'utilisateur" })
  }
}

// Mettre à jour un utilisateur
exports.updateUser = async (req, res) => {
  try {
    const { nom, prenom, age, sexe, adresse, telephone, role, departement } = req.body
    const userId = req.params.id

    // Vérifier si l'utilisateur existe
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" })
    }

    // Mettre à jour les champs
    if (nom) user.nom = nom
    if (prenom) user.prenom = prenom
    if (age) user.age = age
    if (sexe) user.sexe = sexe
    if (adresse) user.adresse = adresse
    if (telephone) user.telephone = telephone

    // Seul l'administrateur peut changer le rôle et le département
    if (req.user.role === "admin") {
      if (role) user.role = role

      // Si le département change, mettre à jour les références
      if (departement && user.departement?.toString() !== departement) {
        // Retirer l'utilisateur de l'ancien département s'il existe
        if (user.departement) {
          await Department.findByIdAndUpdate(user.departement, {
            $pull: { membres: userId },
          })

          // Si l'utilisateur était manager de l'ancien département, le retirer aussi
          const oldDept = await Department.findById(user.departement)
          if (oldDept && oldDept.manager && oldDept.manager.toString() === userId) {
            oldDept.manager = null
            await oldDept.save()
          }
        }

        // Ajouter l'utilisateur au nouveau département
        await Department.findByIdAndUpdate(departement, {
          $addToSet: { membres: userId },
        })

        user.departement = departement
      }
    }

    // Mettre à jour la photo de profil si fournie
    if (req.file) {
      // Supprimer l'ancienne photo si elle existe
      if (user.photoProfil) {
        const oldPhotoPath = path.join(__dirname, "..", user.photoProfil)
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath)
        }
      }

      user.photoProfil = `/uploads/profiles/${req.file.filename}`
    }

    user.derniereMiseAJour = Date.now()
    await user.save()

    // Notifier l'utilisateur si son profil a été modifié par quelqu'un d'autre
    if (req.user.id !== userId) {
      const io = req.app.get("io")
      io.to(userId).emit("profile_updated", {
        message: "Votre profil a été mis à jour par un administrateur",
      })
    }

    res.status(200).json({
      message: "Utilisateur mis à jour avec succès",
      user: {
        id: user._id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
        departement: user.departement,
      },
    })
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'utilisateur:", error)
    res.status(500).json({ message: "Erreur serveur lors de la mise à jour de l'utilisateur" })
  }
}

// Supprimer un utilisateur
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id

    // Vérifier si l'utilisateur existe
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" })
    }

    // Retirer l'utilisateur du département
    if (user.departement) {
      await Department.findByIdAndUpdate(user.departement, { $pull: { membres: userId } })

      // Si l'utilisateur était manager du département, retirer cette référence aussi
      const dept = await Department.findById(user.departement)
      if (dept && dept.manager && dept.manager.toString() === userId) {
        dept.manager = null
        await dept.save()
      }
    }

    // Supprimer la photo de profil si elle existe
    if (user.photoProfil) {
      const photoPath = path.join(__dirname, "..", user.photoProfil)
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath)
      }
    }

    // Supprimer l'utilisateur
    await User.findByIdAndDelete(userId)

    // Notifier l'utilisateur de la suppression
    const io = req.app.get("io")
    io.to(userId).emit("account_deleted", {
      message: "Votre compte a été supprimé par un administrateur",
    })

    res.status(200).json({ message: "Utilisateur supprimé avec succès" })
  } catch (error) {
    console.error("Erreur lors de la suppression de l'utilisateur:", error)
    res.status(500).json({ message: "Erreur serveur lors de la suppression de l'utilisateur" })
  }
}

// Mettre à jour le profil de l'utilisateur connecté
exports.updateProfile = async (req, res) => {
  try {
    const { nom, prenom, age, sexe, adresse, telephone } = req.body
    const userId = req.user.id

    // Vérifier si l'utilisateur existe
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" })
    }

    // Mettre à jour les champs
    if (nom) user.nom = nom
    if (prenom) user.prenom = prenom
    if (age) user.age = age
    if (sexe) user.sexe = sexe
    if (adresse) user.adresse = adresse
    if (telephone) user.telephone = telephone

    // Mettre à jour la photo de profil si fournie
    if (req.file) {
      // Supprimer l'ancienne photo si elle existe
      if (user.photoProfil) {
        const oldPhotoPath = path.join(__dirname, "..", user.photoProfil)
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath)
        }
      }

      user.photoProfil = `/uploads/profiles/${req.file.filename}`
    }

    user.derniereMiseAJour = Date.now()
    await user.save()

    res.status(200).json({
      message: "Profil mis à jour avec succès",
      user: {
        id: user._id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        age: user.age,
        sexe: user.sexe,
        adresse: user.adresse,
        telephone: user.telephone,
        photoProfil: user.photoProfil,
      },
    })
  } catch (error) {
    console.error("Erreur lors de la mise à jour du profil:", error)
    res.status(500).json({ message: "Erreur serveur lors de la mise à jour du profil" })
  }
}

// Obtenir le profil de l'utilisateur connecté
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id

    const user = await User.findById(userId).select("-motDePasse").populate("departement", "nom")

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" })
    }

    res.status(200).json(user)
  } catch (error) {
    console.error("Erreur lors de la récupération du profil:", error)
    res.status(500).json({ message: "Erreur serveur lors de la récupération du profil" })
  }
}

// Fonction d'enregistrement d'un nouvel utilisateur (à titre d'exemple, si elle existe)
exports.register = async (req, res) => {
  try {
    const { nom, prenom, email, motDePasse, departement } = req.body

    // Créer un nouvel utilisateur
    const newUser = new User({
      nom,
      prenom,
      email,
      motDePasse,
    })

    await newUser.save()

    // Si un département est spécifié lors de la création
    if (departement) {
      // Ajouter l'utilisateur au département
      await Department.findByIdAndUpdate(departement, {
        $addToSet: { membres: newUser._id },
      })
    }

    res.status(201).json({ message: "Utilisateur enregistré avec succès" })
  } catch (error) {
    console.error("Erreur lors de l'enregistrement de l'utilisateur:", error)
    res.status(500).json({ message: "Erreur serveur lors de l'enregistrement de l'utilisateur" })
  }
}
