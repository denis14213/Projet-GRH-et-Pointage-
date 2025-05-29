"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  Box,
  Button,
  Typography,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Paper,
  Tabs,
  Tab,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
} from "@mui/material"
import {
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  Assignment as AssignmentIcon,
} from "@mui/icons-material"
import axios from "axios"
import { API_URL } from "../../config"
import PageHeader from "../../components/common/PageHeader"
import { useNotification } from "../../contexts/NotificationContext"
import { useAuth } from "../../contexts/AuthContext"
import DataTable from "../../components/common/DataTable"

// Page de gestion des tâches
const TasksPage = () => {
  const navigate = useNavigate()
  const { showNotification } = useNotification()
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const [openStatusDialog, setOpenStatusDialog] = useState(false)
  const [newStatus, setNewStatus] = useState("")
  const [tabValue, setTabValue] = useState(0)
  const [filters, setFilters] = useState({
    statut: "",
    priorite: "",
    search: "",
  })

  // Récupérer les tâches
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true)
        setError(null)

        let endpoint = "/tasks"

        // Si l'utilisateur est un employé ou un assistant, récupérer seulement ses tâches
        if (user && (user.role === "employee" || user.role === "assistant")) {
          endpoint = "/tasks/me"
        }

        const response = await axios.get(`${API_URL}${endpoint}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        })

        setTasks(response.data)
      } catch (error) {
        console.error("Erreur lors de la récupération des tâches:", error)
        setError("Erreur lors de la récupération des tâches. Veuillez réessayer.")
      } finally {
        setLoading(false)
      }
    }

    fetchTasks()
  }, [user])

  // Colonnes du tableau
  const columns = [
    { id: "id", label: "ID", disablePadding: false, sortable: true },
    {
      id: "titre",
      label: "Titre",
      disablePadding: false,
      sortable: true,
    },
    {
      id: "description",
      label: "Description",
      disablePadding: false,
      sortable: true,
      render: (value) => (value.length > 50 ? value.substring(0, 50) + "..." : value),
    },
    {
      id: "assigneA",
      label: "Assigné à",
      disablePadding: false,
      sortable: true,
      render: (value) =>
        value ? (
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Avatar
              src={value.photoProfil ? `${API_URL}${value.photoProfil}` : ""}
              alt={`${value.prenom} ${value.nom}`}
              sx={{ width: 32, height: 32, mr: 1 }}
            >
              {value.prenom?.charAt(0)}
              {value.nom?.charAt(0)}
            </Avatar>
            <Typography variant="body2">
              {value.prenom} {value.nom}
            </Typography>
          </Box>
        ) : (
          "Non assigné"
        ),
    },
    {
      id: "priorite",
      label: "Priorité",
      disablePadding: false,
      sortable: true,
      render: (value) => {
        let color
        let label
        switch (value) {
          case "basse":
            color = "success"
            label = "Basse"
            break
          case "moyenne":
            color = "info"
            label = "Moyenne"
            break
          case "haute":
            color = "warning"
            label = "Haute"
            break
          case "urgente":
            color = "error"
            label = "Urgente"
            break
          default:
            color = "default"
            label = value
        }
        return <Chip label={label} color={color} size="small" />
      },
    },
    {
      id: "statut",
      label: "Statut",
      disablePadding: false,
      sortable: true,
      render: (value) => {
        let color
        let label
        let icon
        switch (value) {
          case "a_faire":
            color = "default"
            label = "À faire"
            icon = <AssignmentIcon fontSize="small" />
            break
          case "en_cours":
            color = "primary"
            label = "En cours"
            icon = <PlayArrowIcon fontSize="small" />
            break
          case "en_revue":
            color = "warning"
            label = "En revue"
            icon = <PauseIcon fontSize="small" />
            break
          case "terminee":
            color = "success"
            label = "Terminée"
            icon = <CheckCircleIcon fontSize="small" />
            break
          default:
            color = "default"
            label = value
            icon = null
        }
        return <Chip label={label} color={color} size="small" icon={icon} sx={{ "& .MuiChip-icon": { ml: 0.5 } }} />
      },
    },
    {
      id: "dateEcheance",
      label: "Date d'échéance",
      disablePadding: false,
      sortable: true,
      type: "date",
    },
    {
      id: "dateCreation",
      label: "Date de création",
      disablePadding: false,
      sortable: true,
      type: "date",
    },
  ]

  // Formater les données des tâches pour le tableau
  const formattedTasks = tasks.map((task) => ({
    id: task._id,
    titre: task.titre,
    description: task.description,
    assigneA: task.assigneA,
    creePar: task.creePar,
    departement: task.departement,
    priorite: task.priorite,
    statut: task.statut,
    dateEcheance: task.dateEcheance,
    dateCreation: task.dateCreation,
    derniereMiseAJour: task.derniereMiseAJour,
  }))

  // Filtrer les tâches
  const filteredTasks = formattedTasks.filter((task) => {
    // Filtre par statut
    if (filters.statut && task.statut !== filters.statut) {
      return false
    }

    // Filtre par priorité
    if (filters.priorite && task.priorite !== filters.priorite) {
      return false
    }

    // Filtre par recherche (titre, description)
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      return (
        task.titre.toLowerCase().includes(searchTerm) ||
        task.description.toLowerCase().includes(searchTerm) ||
        (task.assigneA && `${task.assigneA.prenom} ${task.assigneA.nom}`.toLowerCase().includes(searchTerm))
      )
    }

    return true
  })

  // Gérer le changement d'onglet
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue)
  }

  // Gérer l'ouverture de la boîte de dialogue de suppression
  const handleOpenDeleteDialog = (taskId) => {
    const task = tasks.find((t) => t._id === taskId)
    setSelectedTask(task)
    setOpenDeleteDialog(true)
  }

  // Gérer la fermeture de la boîte de dialogue de suppression
  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false)
    setSelectedTask(null)
  }

  // Supprimer une tâche
  const handleDeleteTask = async () => {
    if (!selectedTask) return

    try {
      setLoading(true)
      await axios.delete(`${API_URL}/tasks/${selectedTask._id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      // Mettre à jour la liste des tâches
      setTasks(tasks.filter((task) => task._id !== selectedTask._id))
      showNotification("success", "Tâche supprimée avec succès")
    } catch (error) {
      console.error("Erreur lors de la suppression de la tâche:", error)
      showNotification("error", "Erreur lors de la suppression de la tâche")
    } finally {
      setLoading(false)
      handleCloseDeleteDialog()
    }
  }

  // Gérer l'ouverture de la boîte de dialogue de changement de statut
  const handleOpenStatusDialog = (taskId, status) => {
    const task = tasks.find((t) => t._id === taskId)
    setSelectedTask(task)
    setNewStatus(status)
    setOpenStatusDialog(true)
  }

  // Gérer la fermeture de la boîte de dialogue de changement de statut
  const handleCloseStatusDialog = () => {
    setOpenStatusDialog(false)
    setSelectedTask(null)
    setNewStatus("")
  }

  // Changer le statut d'une tâche
  const handleChangeStatus = async () => {
    if (!selectedTask || !newStatus) return

    try {
      setLoading(true)
      const response = await axios.put(
        `${API_URL}/tasks/${selectedTask._id}`,
        {
          statut: newStatus,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      )

      // Mettre à jour la liste des tâches
      const updatedTasks = tasks.map((task) => (task._id === selectedTask._id ? { ...task, statut: newStatus } : task))
      setTasks(updatedTasks)
      showNotification("success", "Statut de la tâche mis à jour avec succès")
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut de la tâche:", error)
      showNotification("error", "Erreur lors de la mise à jour du statut de la tâche")
    } finally {
      setLoading(false)
      handleCloseStatusDialog()
    }
  }

  // Réinitialiser les filtres
  const handleResetFilters = () => {
    setFilters({
      statut: "",
      priorite: "",
      search: "",
    })
  }

  // Rafraîchir les données
  const handleRefresh = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await axios.get(`${API_URL}/tasks`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      setTasks(response.data)
    } catch (error) {
      console.error("Erreur lors de la récupération des tâches:", error)
      setError("Erreur lors de la récupération des tâches. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  // Actions personnalisées pour le tableau
  const renderActions = (id) => {
    const task = tasks.find((t) => t._id === id)
    if (!task) return null

    // Si l'utilisateur est l'assigné, il peut changer le statut
    if (task.assigneA?._id === user?.id) {
      return (
        <Box sx={{ display: "flex", gap: 1 }}>
          {task.statut === "a_faire" && (
            <Tooltip title="Démarrer">
              <IconButton color="primary" size="small" onClick={() => handleOpenStatusDialog(id, "en_cours")}>
                <PlayArrowIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {task.statut === "en_cours" && (
            <Tooltip title="Mettre en revue">
              <IconButton color="warning" size="small" onClick={() => handleOpenStatusDialog(id, "en_revue")}>
                <PauseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {task.statut === "en_revue" && (
            <Tooltip title="Terminer">
              <IconButton color="success" size="small" onClick={() => handleOpenStatusDialog(id, "terminee")}>
                <CheckCircleIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      )
    }

    return null
  }

  return (
    <Box>
      <PageHeader
        title="Gestion des tâches"
        subtitle="Créez, assignez et suivez les tâches"
        breadcrumbs={[{ label: "Tâches", link: "/tasks" }]}
        action={
          user && (user.role === "admin" || user.role === "manager") ? (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate("/tasks/new")} sx={{ px: 3 }}>
              Nouvelle tâche
            </Button>
          ) : null
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ mb: 3, borderRadius: 2, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)" }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="onglets de tâches" sx={{ px: 2 }}>
          <Tab label="Toutes les tâches" />
          <Tab label="À faire" />
          <Tab label="En cours" />
          <Tab label="En revue" />
          <Tab label="Terminées" />
        </Tabs>
      </Paper>

      <Box sx={{ mt: 3 }}>
        {tabValue === 0 && (
          <DataTable
            columns={columns}
            data={filteredTasks}
            loading={loading}
            onRowClick={(id) => navigate(`/tasks/${id}`)}
            renderActions={renderActions}
            onDelete={handleOpenDeleteDialog}
            onRefresh={handleRefresh}
            searchPlaceholder="Rechercher une tâche..."
            filters={[
              {
                id: "statut",
                label: "Statut",
                type: "select",
                options: [
                  { value: "", label: "Tous" },
                  { value: "a_faire", label: "À faire" },
                  { value: "en_cours", label: "En cours" },
                  { value: "en_revue", label: "En revue" },
                  { value: "terminee", label: "Terminée" },
                ],
                value: filters.statut,
                onChange: (value) => setFilters({ ...filters, statut: value }),
              },
              {
                id: "priorite",
                label: "Priorité",
                type: "select",
                options: [
                  { value: "", label: "Toutes" },
                  { value: "basse", label: "Basse" },
                  { value: "moyenne", label: "Moyenne" },
                  { value: "haute", label: "Haute" },
                  { value: "urgente", label: "Urgente" },
                ],
                value: filters.priorite,
                onChange: (value) => setFilters({ ...filters, priorite: value }),
              },
            ]}
            onSearch={(value) => setFilters({ ...filters, search: value })}
            onResetFilters={handleResetFilters}
          />
        )}
        {tabValue === 1 && (
          <DataTable
            columns={columns}
            data={filteredTasks.filter((task) => task.statut === "a_faire")}
            loading={loading}
            onRowClick={(id) => navigate(`/tasks/${id}`)}
            renderActions={renderActions}
            onDelete={handleOpenDeleteDialog}
            onRefresh={handleRefresh}
          />
        )}
        {tabValue === 2 && (
          <DataTable
            columns={columns}
            data={filteredTasks.filter((task) => task.statut === "en_cours")}
            loading={loading}
            onRowClick={(id) => navigate(`/tasks/${id}`)}
            renderActions={renderActions}
            onDelete={handleOpenDeleteDialog}
            onRefresh={handleRefresh}
          />
        )}
        {tabValue === 3 && (
          <DataTable
            columns={columns}
            data={filteredTasks.filter((task) => task.statut === "en_revue")}
            loading={loading}
            onRowClick={(id) => navigate(`/tasks/${id}`)}
            renderActions={renderActions}
            onDelete={handleOpenDeleteDialog}
            onRefresh={handleRefresh}
          />
        )}
        {tabValue === 4 && (
          <DataTable
            columns={columns}
            data={filteredTasks.filter((task) => task.statut === "terminee")}
            loading={loading}
            onRowClick={(id) => navigate(`/tasks/${id}`)}
            renderActions={renderActions}
            onDelete={handleOpenDeleteDialog}
            onRefresh={handleRefresh}
          />
        )}
      </Box>

      {/* Boîte de dialogue de suppression */}
      <Dialog
        open={openDeleteDialog}
        onClose={handleCloseDeleteDialog}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">Confirmer la suppression</DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Êtes-vous sûr de vouloir supprimer la tâche "{selectedTask?.titre}" ? Cette action est irréversible.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="primary">
            Annuler
          </Button>
          <Button onClick={handleDeleteTask} color="error" variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : "Supprimer"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Boîte de dialogue de changement de statut */}
      <Dialog
        open={openStatusDialog}
        onClose={handleCloseStatusDialog}
        aria-labelledby="status-dialog-title"
        aria-describedby="status-dialog-description"
      >
        <DialogTitle id="status-dialog-title">Changer le statut</DialogTitle>
        <DialogContent>
          <DialogContentText id="status-dialog-description">
            Êtes-vous sûr de vouloir changer le statut de la tâche "{selectedTask?.titre}" ?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseStatusDialog} color="primary">
            Annuler
          </Button>
          <Button onClick={handleChangeStatus} color="primary" variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : "Confirmer"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default TasksPage
