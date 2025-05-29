// Contrôleur pour la gestion des départements
const Department = require("../models/Department")
const User = require("../models/User")

// Créer un nouveau département
exports.createDepartment = async (req, res) => {
  try {
    const { nom, description, manager } = req.body

    // Vérifier si le département existe déjà
    const departmentExists = await Department.findOne({ nom })
    if (departmentExists) {
      return res.status(400).json({ message: "Un département avec ce nom existe déjà" })
    }

    // Créer le département
    const newDepartment = new Department({
      nom,
      description,
      manager,
    })

    // Si un manager est spécifié, l'ajouter comme membre et mettre à jour son rôle
    if (manager) {
      newDepartment.membres.push(manager)

      // Mettre à jour l'utilisateur pour qu'il soit manager
      await User.findByIdAndUpdate(manager, {
        role: "manager",
        departement: newDepartment._id,
      })
    }

    await newDepartment.save()

    res.status(201).json({
      message: "Département créé avec succès",
      department: newDepartment,
    })
  } catch (error) {
    console.error("Erreur lors de la création du département:", error)
    res.status(500).json({ message: "Erreur serveur lors de la création du département" })
  }
}

// Obtenir tous les départements
exports.getAllDepartments = async (req, res) => {
  try {
    const departments = await Department.find()
      .populate("manager", "nom prenom email")
      .populate("membres", "nom prenom email role")

    res.status(200).json(departments)
  } catch (error) {
    console.error("Erreur lors de la récupération des départements:", error)
    res.status(500).json({ message: "Erreur serveur lors de la récupération des départements" })
  }
}

// Obtenir un département par ID
exports.getDepartmentById = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id)
      .populate("manager", "nom prenom email")
      .populate("membres", "nom prenom email role")

    if (!department) {
      return res.status(404).json({ message: "Département non trouvé" })
    }

    res.status(200).json(department)
  } catch (error) {
    console.error("Erreur lors de la récupération du département:", error)
    res.status(500).json({ message: "Erreur serveur lors de la récupération du département" })
  }
}

// Mettre à jour un département
exports.updateDepartment = async (req, res) => {
  try {
    const { nom, description, manager } = req.body
    const departmentId = req.params.id

    // Vérifier si le département existe
    const department = await Department.findById(departmentId)
    if (!department) {
      return res.status(404).json({ message: "Département non trouvé" })
    }

    // Mettre à jour les champs
    if (nom) department.nom = nom
    if (description) department.description = description

    // Si le manager change, mettre à jour les références
    if (manager && department.manager?.toString() !== manager) {
      // Rétrograder l'ancien manager si nécessaire
      if (department.manager) {
        const oldManager = await User.findById(department.manager)
        if (oldManager && oldManager.role === "manager") {
          // Vérifier s'il gère d'autres départements
          const otherDepts = await Department.find({
            _id: { $ne: departmentId },
            manager: department.manager,
          })

          if (otherDepts.length === 0) {
            // S'il ne gère pas d'autres départements, le rétrograder en employé
            oldManager.role = "employee"
            await oldManager.save()
          }
        }
      }

      // Promouvoir le nouveau manager
      const newManager = await User.findById(manager)
      if (newManager) {
        newManager.role = "manager"
        newManager.departement = departmentId
        await newManager.save()

        // Ajouter le manager aux membres s'il n'y est pas déjà
        if (!department.membres.includes(manager)) {
          department.membres.push(manager)
        }
      }

      department.manager = manager
    }

    await department.save()

    res.status(200).json({
      message: "Département mis à jour avec succès",
      department,
    })
  } catch (error) {
    console.error("Erreur lors de la mise à jour du département:", error)
    res.status(500).json({ message: "Erreur serveur lors de la mise à jour du département" })
  }
}

// Supprimer un département
exports.deleteDepartment = async (req, res) => {
  try {
    const departmentId = req.params.id

    // Vérifier si le département existe
    const department = await Department.findById(departmentId)
    if (!department) {
      return res.status(404).json({ message: "Département non trouvé" })
    }

    // Mettre à jour tous les utilisateurs du département
    await User.updateMany({ departement: departmentId }, { $unset: { departement: 1 } })

    // Rétrograder le manager si nécessaire
    if (department.manager) {
      const manager = await User.findById(department.manager)
      if (manager && manager.role === "manager") {
        // Vérifier s'il gère d'autres départements
        const otherDepts = await Department.find({
          _id: { $ne: departmentId },
          manager: department.manager,
        })

        if (otherDepts.length === 0) {
          // S'il ne gère pas d'autres départements, le rétrograder en employé
          manager.role = "employee"
          await manager.save()
        }
      }
    }

    // Supprimer le département
    await Department.findByIdAndDelete(departmentId)

    res.status(200).json({ message: "Département supprimé avec succès" })
  } catch (error) {
    console.error("Erreur lors de la suppression du département:", error)
    res.status(500).json({ message: "Erreur serveur lors de la suppression du département" })
  }
}

// Ajouter un membre au département
exports.addMember = async (req, res) => {
  try {
    const { userId } = req.body
    const departmentId = req.params.id

    // Vérifier si le département existe
    const department = await Department.findById(departmentId)
    if (!department) {
      return res.status(404).json({ message: "Département non trouvé" })
    }

    // Vérifier si l'utilisateur existe
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" })
    }

    // Vérifier si l'utilisateur est déjà membre du département
    if (department.membres.includes(userId)) {
      return res.status(400).json({ message: "L'utilisateur est déjà membre de ce département" })
    }

    // Retirer l'utilisateur de son ancien département s'il en a un
    if (user.departement) {
      await Department.findByIdAndUpdate(user.departement, { $pull: { membres: userId } })
    }

    // Ajouter l'utilisateur au département
    department.membres.push(userId)
    await department.save()

    // Mettre à jour le département de l'utilisateur
    user.departement = departmentId
    await user.save()

    res.status(200).json({
      message: "Membre ajouté au département avec succès",
      department,
    })
  } catch (error) {
    console.error("Erreur lors de l'ajout du membre au département:", error)
    res.status(500).json({ message: "Erreur serveur lors de l'ajout du membre au département" })
  }
}

// Retirer un membre du département
exports.removeMember = async (req, res) => {
  try {
    const { userId } = req.body
    const departmentId = req.params.id

    // Vérifier si le département existe
    const department = await Department.findById(departmentId)
    if (!department) {
      return res.status(404).json({ message: "Département non trouvé" })
    }

    // Vérifier si l'utilisateur existe
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" })
    }

    // Vérifier si l'utilisateur est membre du département
    if (!department.membres.includes(userId)) {
      return res.status(400).json({ message: "L'utilisateur n'est pas membre de ce département" })
    }

    // Vérifier si l'utilisateur est le manager du département
    if (department.manager && department.manager.toString() === userId) {
      return res.status(400).json({ message: "Vous ne pouvez pas retirer le manager du département" })
    }

    // Retirer l'utilisateur du département
    department.membres.pull(userId)
    await department.save()

    // Mettre à jour le département de l'utilisateur
    user.departement = undefined
    await user.save()

    res.status(200).json({
      message: "Membre retiré du département avec succès",
      department,
    })
  } catch (error) {
    console.error("Erreur lors du retrait du membre du département:", error)
    res.status(500).json({ message: "Erreur serveur lors du retrait du membre du département" })
  }
}
