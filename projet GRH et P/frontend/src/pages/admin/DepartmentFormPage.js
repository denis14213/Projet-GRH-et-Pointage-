"use client"

import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  Box,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Divider,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material"
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
  PersonRemove as PersonRemoveIcon,
} from "@mui/icons-material"
import { useFormik } from "formik"
import * as Yup from "yup"
import axios from "axios"
import { API_URL } from "../../config"
import PageHeader from "../../components/common/PageHeader"
import { useNotification } from "../../contexts/NotificationContext"

// Schéma de validation pour le département
const departmentSchema = Yup.object({
  nom: Yup.string().required("Le nom est requis"),
  description: Yup.string(),
  manager: Yup.string(),
})

// Page de formulaire de département (création/modification)
const DepartmentFormPage = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const { showNotification } = useNotification()
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(id ? true : false)
  const [error, setError] = useState(null)
  const [users, setUsers] = useState([])
  const [members, setMembers] = useState([])
  const [openAddMemberDialog, setOpenAddMemberDialog] = useState(false)
  const [selectedUser, setSelectedUser] = useState("")
  const [openRemoveMemberDialog, setOpenRemoveMemberDialog] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState(null)
  const isEditMode = Boolean(id)

  // Récupérer les utilisateurs et le département si en mode édition
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Récupérer les utilisateurs
        const usersResponse = await axios.get(`${API_URL}/users`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        })
        setUsers(usersResponse.data)

        // Si en mode édition, récupérer les données du département
        if (isEditMode) {
          const departmentResponse = await axios.get(`${API_URL}/departments/${id}`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          })
          const departmentData = departmentResponse.data

          // Mettre à jour les valeurs du formulaire
          formik.setValues({
            nom: departmentData.nom || "",
            description: departmentData.description || "",
            manager: departmentData.manager?._id || "",
          })

          // Mettre à jour la liste des membres
          setMembers(departmentData.membres || [])
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des données:", error)
        setError("Erreur lors de la récupération des données. Veuillez réessayer.")
      } finally {
        setInitialLoading(false)
      }
    }

    fetchData()
  }, [id, isEditMode])

  // Formulaire avec Formik
  const formik = useFormik({
    initialValues: {
      nom: "",
      description: "",
      manager: "",
    },
    validationSchema: departmentSchema,
    onSubmit: handleSubmit,
  })

  // Gérer la soumission du formulaire
  async function handleSubmit(values) {
    setLoading(true)
    setError(null)

    try {
      let response

      if (isEditMode) {
        // Mettre à jour le département
        response = await axios.put(
          `${API_URL}/departments/${id}`,
          {
            nom: values.nom,
            description: values.description,
            manager: values.manager || null,
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        )
        showNotification("success", "Département mis à jour avec succès")
      } else {
        // Créer un nouveau département
        response = await axios.post(
          `${API_URL}/departments`,
          {
            nom: values.nom,
            description: values.description,
            manager: values.manager || null,
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        )
        showNotification("success", "Département créé avec succès")
      }

      // Rediriger vers la liste des départements
      navigate("/departments")
    } catch (error) {
      console.error("Erreur lors de la soumission du formulaire:", error)
      setError(error.response?.data?.message || "Erreur lors de la soumission du formulaire. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  // Ouvrir la boîte de dialogue d'ajout de membre
  const handleOpenAddMemberDialog = () => {
    setOpenAddMemberDialog(true)
  }

  // Fermer la boîte de dialogue d'ajout de membre
  const handleCloseAddMemberDialog = () => {
    setOpenAddMemberDialog(false)
    setSelectedUser("")
  }

  // Ajouter un membre au département
  const handleAddMember = async () => {
    if (!selectedUser) return

    try {
      setLoading(true)
      const response = await axios.post(
        `${API_URL}/departments/${id}/members`,
        {
          userId: selectedUser,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      )

      // Mettre à jour la liste des membres
      const departmentResponse = await axios.get(`${API_URL}/departments/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      setMembers(departmentResponse.data.membres || [])

      showNotification("success", "Membre ajouté avec succès")
    } catch (error) {
      console.error("Erreur lors de l'ajout du membre:", error)
      setError(error.response?.data?.message || "Erreur lors de l'ajout du membre. Veuillez réessayer.")
    } finally {
      setLoading(false)
      handleCloseAddMemberDialog()
    }
  }

  // Ouvrir la boîte de dialogue de suppression de membre
  const handleOpenRemoveMemberDialog = (member) => {
    setMemberToRemove(member)
    setOpenRemoveMemberDialog(true)
  }

  // Fermer la boîte de dialogue de suppression de membre
  const handleCloseRemoveMemberDialog = () => {
    setOpenRemoveMemberDialog(false)
    setMemberToRemove(null)
  }

  // Supprimer un membre du département
  const handleRemoveMember = async () => {
    if (!memberToRemove) return

    try {
      setLoading(true)
      const response = await axios.delete(`${API_URL}/departments/${id}/members`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        data: {
          userId: memberToRemove._id,
        },
      })

      // Mettre à jour la liste des membres
      const departmentResponse = await axios.get(`${API_URL}/departments/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      setMembers(departmentResponse.data.membres || [])

      showNotification("success", "Membre retiré avec succès")
    } catch (error) {
      console.error("Erreur lors de la suppression du membre:", error)
      setError(error.response?.data?.message || "Erreur lors de la suppression du membre. Veuillez réessayer.")
    } finally {
      setLoading(false)
      handleCloseRemoveMemberDialog()
    }
  }

  // Filtrer les utilisateurs qui ne sont pas déjà membres
  const filteredUsers = users.filter(
    (user) => !members.some((member) => member._id === user._id) && user._id !== formik.values.manager,
  )

  if (initialLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "80vh" }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <PageHeader
        title={isEditMode ? "Modifier le département" : "Nouveau département"}
        subtitle={
          isEditMode ? "Modifier les informations du département" : "Créer un nouveau département dans le système"
        }
        breadcrumbs={[
          { label: "Départements", link: "/admin/departments" },
          { label: isEditMode ? "Modifier" : "Nouveau", link: isEditMode ? `/admin/departments/${id}` : "/admin/departments/new" },
        ]}
        action={
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate("/admin/departments")}>
            Retour
          </Button>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Informations du département */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 2, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)" }}>
            <Typography variant="h6" gutterBottom>
              Informations du département
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Box component="form" onSubmit={formik.handleSubmit} noValidate>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    id="nom"
                    name="nom"
                    label="Nom du département"
                    value={formik.values.nom}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.nom && Boolean(formik.errors.nom)}
                    helperText={formik.touched.nom && formik.errors.nom}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    id="description"
                    name="description"
                    label="Description"
                    multiline
                    rows={4}
                    value={formik.values.description}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.description && Boolean(formik.errors.description)}
                    helperText={formik.touched.description && formik.errors.description}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth error={formik.touched.manager && Boolean(formik.errors.manager)}>
                    <InputLabel id="manager-label">Manager</InputLabel>
                    <Select
                      labelId="manager-label"
                      id="manager"
                      name="manager"
                      value={formik.values.manager}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      label="Manager"
                    >
                      <MenuItem value="">Aucun manager</MenuItem>
                      {users
                        .filter((user) => user.role === "manager" || user.role === "admin")
                        .map((user) => (
                          <MenuItem key={user._id} value={user._id}>
                            {user.prenom} {user.nom} ({user.email})
                          </MenuItem>
                        ))}
                    </Select>
                    {formik.touched.manager && formik.errors.manager && (
                      <Typography variant="caption" color="error">
                        {formik.errors.manager}
                      </Typography>
                    )}
                  </FormControl>
                </Grid>
              </Grid>

              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
                <Button variant="outlined" onClick={() => navigate("/departments")} sx={{ mr: 1 }}>
                  Annuler
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
                  disabled={loading}
                >
                  {loading ? "Enregistrement..." : isEditMode ? "Mettre à jour" : "Créer le département"}
                </Button>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Membres du département (uniquement en mode édition) */}
        {isEditMode && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 2, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="h6">Membres du département</Typography>
                <Button
                  variant="outlined"
                  startIcon={<PersonAddIcon />}
                  onClick={handleOpenAddMemberDialog}
                  disabled={filteredUsers.length === 0}
                >
                  Ajouter un membre
                </Button>
              </Box>
              <Divider sx={{ mb: 3 }} />

              {members.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
                  Aucun membre dans ce département
                </Typography>
              ) : (
                <List>
                  {members.map((member) => (
                    <ListItem key={member._id} divider>
                      <ListItemAvatar>
                        <Avatar
                          src={member.photoProfil ? `${API_URL}${member.photoProfil}` : ""}
                          alt={`${member.prenom} ${member.nom}`}
                        >
                          {member.prenom?.charAt(0)}
                          {member.nom?.charAt(0)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={`${member.prenom} ${member.nom}`}
                        secondary={
                          <>
                            {member.email}
                            <br />
                            <Chip
                              label={member.role}
                              size="small"
                              color={
                                member.role === "admin"
                                  ? "error"
                                  : member.role === "manager"
                                    ? "primary"
                                    : member.role === "assistant"
                                      ? "info"
                                      : "default"
                              }
                              sx={{ mt: 0.5, textTransform: "capitalize" }}
                            />
                          </>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          aria-label="delete"
                          onClick={() => handleOpenRemoveMemberDialog(member)}
                          disabled={member._id === formik.values.manager}
                          color="error"
                        >
                          <PersonRemoveIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Boîte de dialogue d'ajout de membre */}
      <Dialog open={openAddMemberDialog} onClose={handleCloseAddMemberDialog}>
        <DialogTitle>Ajouter un membre</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>Sélectionnez un utilisateur à ajouter au département.</DialogContentText>
          <FormControl fullWidth>
            <InputLabel id="add-member-label">Utilisateur</InputLabel>
            <Select
              labelId="add-member-label"
              id="add-member"
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              label="Utilisateur"
            >
              {filteredUsers.map((user) => (
                <MenuItem key={user._id} value={user._id}>
                  {user.prenom} {user.nom} ({user.email})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddMemberDialog}>Annuler</Button>
          <Button onClick={handleAddMember} variant="contained" startIcon={<AddIcon />} disabled={!selectedUser}>
            Ajouter
          </Button>
        </DialogActions>
      </Dialog>

      {/* Boîte de dialogue de suppression de membre */}
      <Dialog open={openRemoveMemberDialog} onClose={handleCloseRemoveMemberDialog}>
        <DialogTitle>Retirer le membre</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Êtes-vous sûr de vouloir retirer{" "}
            <strong>
              {memberToRemove?.prenom} {memberToRemove?.nom}
            </strong>{" "}
            du département ?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRemoveMemberDialog}>Annuler</Button>
          <Button onClick={handleRemoveMember} color="error" startIcon={<DeleteIcon />}>
            Retirer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default DepartmentFormPage
