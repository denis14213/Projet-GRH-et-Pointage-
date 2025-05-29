"use client"

import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  CircularProgress,
  Alert,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { fr } from "date-fns/locale"
import { Save as SaveIcon, ArrowBack as ArrowBackIcon, Delete as DeleteIcon } from "@mui/icons-material"
import axios from "axios"
import { API_URL } from "../../config"
import { useNotification } from "../../contexts/NotificationContext"
import { useAuth } from "../../contexts/AuthContext"
import PageHeader from "../../components/common/PageHeader"

// Page de création/édition de tâche
const TaskFormPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showNotification } = useNotification()
  const { user } = useAuth()
  const isEditMode = Boolean(id)

  // États
  const [formData, setFormData] = useState({
    titre: "",
    description: "",
    assigneA: "",
    departement: "",
    priorite: "moyenne",
    statut: "a_faire",
    dateEcheance: null,
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(isEditMode)
  const [error, setError] = useState(null)
  const [users, setUsers] = useState([])
  const [departments, setDepartments] = useState([])
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)

  // Récupérer les utilisateurs et départements
  useEffect(() => {
    const fetchData = async () => {
      try {
        setFetchLoading(true)

        // Récupérer les utilisateurs
        const usersResponse = await axios.get(`${API_URL}/users`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        })

        // Récupérer les départements
        const departmentsResponse = await axios.get(`${API_URL}/departments`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        })

        setUsers(usersResponse.data)
        setDepartments(departmentsResponse.data)

        // Si en mode édition, récupérer les détails de la tâche
        if (isEditMode) {
          const taskResponse = await axios.get(`${API_URL}/tasks/${id}`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          })

          const task = taskResponse.data
          setFormData({
            titre: task.titre,
            description: task.description,
            assigneA: task.assigneA?._id || "",
            departement: task.departement?._id || "",
            priorite: task.priorite,
            statut: task.statut,
            dateEcheance: task.dateEcheance ? new Date(task.dateEcheance) : null,
          })
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des données:", error)
        setError("Erreur lors de la récupération des données. Veuillez réessayer.")
      } finally {
        setFetchLoading(false)
      }
    }

    fetchData()
  }, [id, isEditMode])

  // Gérer les changements de champs
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })

    // Effacer l'erreur pour ce champ
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null,
      })
    }
  }

  // Gérer le changement de date d'échéance
  const handleDateChange = (date) => {
    setFormData({
      ...formData,
      dateEcheance: date,
    })

    // Effacer l'erreur pour ce champ
    if (errors.dateEcheance) {
      setErrors({
        ...errors,
        dateEcheance: null,
      })
    }
  }

  // Valider le formulaire
  const validateForm = () => {
    const newErrors = {}

    if (!formData.titre.trim()) {
      newErrors.titre = "Le titre est requis"
    }

    if (!formData.description.trim()) {
      newErrors.description = "La description est requise"
    }

    if (!formData.assigneA) {
      newErrors.assigneA = "L'assignation à un utilisateur est requise"
    }

    if (formData.dateEcheance && new Date(formData.dateEcheance) < new Date()) {
      newErrors.dateEcheance = "La date d'échéance ne peut pas être dans le passé"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Soumettre le formulaire
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      showNotification("error", "Veuillez corriger les erreurs dans le formulaire")
      return
    }

    try {
      setLoading(true)

      const payload = {
        ...formData,
        dateEcheance: formData.dateEcheance ? formData.dateEcheance.toISOString() : null,
      }

      if (isEditMode) {
        // Mettre à jour la tâche existante
        await axios.put(`${API_URL}/tasks/${id}`, payload, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        })

        showNotification("success", "Tâche mise à jour avec succès")
      } else {
        // Créer une nouvelle tâche
        await axios.post(`${API_URL}/tasks`, payload, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        })

        showNotification("success", "Tâche créée avec succès")
      }

      // Rediriger vers la liste des tâches
      navigate("/tasks")
    } catch (error) {
      console.error("Erreur lors de la soumission du formulaire:", error)
      setError("Erreur lors de la soumission du formulaire. Veuillez réessayer.")
      showNotification("error", "Erreur lors de la soumission du formulaire")
    } finally {
      setLoading(false)
    }
  }

  // Supprimer la tâche
  const handleDelete = async () => {
    try {
      setLoading(true)

      await axios.delete(`${API_URL}/tasks/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      showNotification("success", "Tâche supprimée avec succès")
      navigate("/tasks")
    } catch (error) {
      console.error("Erreur lors de la suppression de la tâche:", error)
      setError("Erreur lors de la suppression de la tâche. Veuillez réessayer.")
      showNotification("error", "Erreur lors de la suppression de la tâche")
    } finally {
      setLoading(false)
      setOpenDeleteDialog(false)
    }
  }

  // Gérer l'ouverture de la boîte de dialogue de suppression
  const handleOpenDeleteDialog = () => {
    setOpenDeleteDialog(true)
  }

  // Gérer la fermeture de la boîte de dialogue de suppression
  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false)
  }

  if (fetchLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <PageHeader
        title={isEditMode ? "Modifier la tâche" : "Créer une nouvelle tâche"}
        subtitle={
          isEditMode ? "Modifier les détails de la tâche" : "Créer une nouvelle tâche et l'assigner à un utilisateur"
        }
        breadcrumbs={[
          { label: "Tâches", link: "/tasks" },
          { label: isEditMode ? "Modifier" : "Créer", link: isEditMode ? `/tasks/${id}/edit` : "/tasks/new" },
        ]}
        action={
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate("/tasks")}>
              Retour
            </Button>
            {isEditMode && (
              <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={handleOpenDeleteDialog}>
                Supprimer
              </Button>
            )}
          </Box>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3, borderRadius: 2, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)" }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Informations de la tâche
              </Typography>
              <Divider sx={{ mb: 3 }} />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Titre"
                name="titre"
                value={formData.titre}
                onChange={handleChange}
                error={Boolean(errors.titre)}
                helperText={errors.titre}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth error={Boolean(errors.assigneA)} required>
                <InputLabel id="assigneA-label">Assigné à</InputLabel>
                <Select
                  labelId="assigneA-label"
                  name="assigneA"
                  value={formData.assigneA}
                  onChange={handleChange}
                  label="Assigné à"
                >
                  {users.map((user) => (
                    <MenuItem key={user._id} value={user._id}>
                      {user.prenom} {user.nom}
                    </MenuItem>
                  ))}
                </Select>
                {errors.assigneA && <FormHelperText>{errors.assigneA}</FormHelperText>}
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                error={Boolean(errors.description)}
                helperText={errors.description}
                required
                multiline
                rows={4}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="departement-label">Département</InputLabel>
                <Select
                  labelId="departement-label"
                  name="departement"
                  value={formData.departement}
                  onChange={handleChange}
                  label="Département"
                >
                  <MenuItem value="">Aucun</MenuItem>
                  {departments.map((dept) => (
                    <MenuItem key={dept._id} value={dept._id}>
                      {dept.nom}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
                <DatePicker
                  label="Date d'échéance"
                  value={formData.dateEcheance}
                  onChange={handleDateChange}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      fullWidth
                      error={Boolean(errors.dateEcheance)}
                      helperText={errors.dateEcheance}
                    />
                  )}
                  disablePast
                />
              </LocalizationProvider>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel id="priorite-label">Priorité</InputLabel>
                <Select
                  labelId="priorite-label"
                  name="priorite"
                  value={formData.priorite}
                  onChange={handleChange}
                  label="Priorité"
                >
                  <MenuItem value="basse">Basse</MenuItem>
                  <MenuItem value="moyenne">Moyenne</MenuItem>
                  <MenuItem value="haute">Haute</MenuItem>
                  <MenuItem value="urgente">Urgente</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {isEditMode && (
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel id="statut-label">Statut</InputLabel>
                  <Select
                    labelId="statut-label"
                    name="statut"
                    value={formData.statut}
                    onChange={handleChange}
                    label="Statut"
                  >
                    <MenuItem value="a_faire">À faire</MenuItem>
                    <MenuItem value="en_cours">En cours</MenuItem>
                    <MenuItem value="en_revue">En revue</MenuItem>
                    <MenuItem value="terminee">Terminée</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}

            <Grid item xs={12} sx={{ mt: 2 }}>
              <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
                <Button variant="outlined" onClick={() => navigate("/tasks")} disabled={loading}>
                  Annuler
                </Button>
                <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={loading}>
                  {loading ? <CircularProgress size={24} /> : isEditMode ? "Mettre à jour" : "Créer"}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>

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
            Êtes-vous sûr de vouloir supprimer cette tâche ? Cette action est irréversible.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="primary">
            Annuler
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : "Supprimer"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default TaskFormPage
