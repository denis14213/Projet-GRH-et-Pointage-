// Routes pour la gestion des départements
const express = require("express")
const router = express.Router()
const departmentController = require("../controllers/departmentController")
const { auth, checkRole } = require("../middleware/auth")

// Routes pour l'administrateur
router.post("/", auth, checkRole("admin"), departmentController.createDepartment)
router.get("/", auth, departmentController.getAllDepartments)
router.get("/:id", auth, departmentController.getDepartmentById)
router.put("/:id", auth, checkRole("admin"), departmentController.updateDepartment)
router.delete("/:id", auth, checkRole("admin"), departmentController.deleteDepartment)

// Routes pour la gestion des membres
router.post("/:id/members", auth, checkRole("admin"), departmentController.addMember)
router.delete("/:id/members", auth, checkRole("admin"), departmentController.removeMember)

module.exports = router
