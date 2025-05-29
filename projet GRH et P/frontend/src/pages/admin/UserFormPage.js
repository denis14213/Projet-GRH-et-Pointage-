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
  Avatar,
  IconButton,
  InputAdornment,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
} from "@mui/material"
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  PhotoCamera as PhotoCameraIcon,
  Person as PersonIcon,
  ContentCopy as ContentCopyIcon,
} from "@mui/icons-material"
import { useFormik } from "formik"
import * as Yup from "yup"
import axios from "axios"
import { API_URL } from "../../config"
import PageHeader from "../../components/common/PageHeader"
import { useNotification } from "../../contexts/NotificationContext"

// Schéma de validation pour la création d'un utilisateur
const createUserSchema = Yup.object({
  nom: Yup.string().required("Le nom est requis"),
  prenom: Yup.string().required("Le prénom est requis"),
  email: Yup.string().email("Adresse email invalide").required("L'adresse email est requise"),
  role: Yup.string().required("Le rôle est requis"),
  departement: Yup.string(),
})

// Schéma de validation pour la modification d'un utilisateur
const updateUserSchema = Yup.object({
  nom: Yup.string().required("Le nom est requis"),
  prenom: Yup.string().required("Le prénom est requis"),
  email: Yup.string().email("Adresse email invalide").required("L'adresse email est requise"),
  role: Yup.string().required("Le rôle est requis"),
  departement: Yup.string(),
  age: Yup.number().min(18, "Vous devez avoir au moins 18 ans").max(100, "Âge invalide"),
  sexe: Yup.string(),
  adresse: Yup.string(),
  telephone: Yup.string(),
})

// Page de formulaire d'utilisateur (création/modification)
const UserFormPage = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const { showNotification } = useNotification()
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(id ? true : false)
  const [error, setError] = useState(null)
  const [departments, setDepartments] = useState([])
  const [showPassword, setShowPassword] = useState(false)
  const [profileImage, setProfileImage] = useState(null)
  const [previewImage, setPreviewImage] = useState(null)
  const [generatedPassword, setGeneratedPassword] = useState("")
  const [openPasswordDialog, setOpenPasswordDialog] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const isEditMode = Boolean(id)

  // Récupérer les départements et l'utilisateur si en mode édition
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Récupérer les départements
        const departmentsResponse = await axios.get(`${API_URL}/departments`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        })
        setDepartments(departmentsResponse.data)

        // Si en mode édition, récupérer les données de l'utilisateur
        if (isEditMode) {
          const userResponse = await axios.get(`${API_URL}/users/${id}`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          })
          const userData = userResponse.data

          // Mettre à jour les valeurs du formulaire
          formik.setValues({
            nom: userData.nom || "",
            prenom: userData.prenom || "",
            email: userData.email || "",
            role: userData.role || "",
            departement: userData.departement?._id || "",
            age: userData.age || "",
            sexe: userData.sexe || "",
            adresse: userData.adresse || "",
            telephone: userData.telephone || "",
          })

          // Mettre à jour l'aperçu de l'image de profil
          if (userData.photoProfil) {
            setPreviewImage(`${API_URL}${userData.photoProfil}`)
          }
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
      prenom: "",
      email: "",
      role: "employee",
      departement: "",
      age: "",
      sexe: "",
      adresse: "",
      telephone: "",
    },
    validationSchema: isEditMode ? updateUserSchema : createUserSchema,
    onSubmit: handleSubmit,
  })

  // Gérer la soumission du formulaire
  async function handleSubmit(values) {
    setLoading(true)
    setError(null)

    try {
      // Créer un objet FormData pour l'envoi de fichiers
      const formData = new FormData()

      // Ajouter des logs pour déboguer
      console.log("Valeurs du formulaire:", values)

      // S'assurer que les champs requis sont bien ajoutés
      formData.append("nom", values.nom || "")
      formData.append("prenom", values.prenom || "")
      formData.append("email", values.email || "")
      formData.append("role", values.role || "employee")

      if (values.departement) {
        formData.append("departement", values.departement)
      }

      if (values.age) {
        formData.append("age", String(values.age))
      }

      if (values.sexe) {
        formData.append("sexe", values.sexe)
      }

      if (values.adresse) {
        formData.append("adresse", values.adresse)
      }

      if (values.telephone) {
        formData.append("telephone", values.telephone)
      }

      if (profileImage) {
        formData.append("photoProfil", profileImage)
      }

      let response

      if (isEditMode) {
        // Mettre à jour l'utilisateur
        response = await axios.put(`${API_URL}/users/${id}`, formData, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        })
        showNotification("success", "Utilisateur mis à jour avec succès")
      } else {
        // Créer un nouvel utilisateur
        response = await axios.post(`${API_URL}/auth/register`, formData, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        })

        // Vérifier si l'email a été envoyé
        if (response.data.emailSent) {
          showNotification("success", "Utilisateur créé avec succès. Un email avec les identifiants a été envoyé.")
        } else {
          // Si l'email n'a pas été envoyé, afficher le mot de passe généré
          setGeneratedPassword(response.data.tempPassword || "")
          setOpenPasswordDialog(true)
          showNotification("success", "Utilisateur créé avec succès. Veuillez noter le mot de passe temporaire.")
        }
      }

      // Si pas de dialogue de mot de passe, rediriger vers la liste des utilisateurs
      if (!response.data.tempPassword) {
        navigate("/admin/users")
      }
    } catch (error) {
      console.error("Erreur lors de la soumission du formulaire:", error)
      setError(error.response?.data?.message || "Erreur lors de la soumission du formulaire. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  // Gérer l'affichage/masquage du mot de passe
  const handleClickShowPassword = () => {
    setShowPassword(!showPassword)
  }

  // Gérer le téléchargement de l'image de profil
  const handleImageUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      setProfileImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewImage(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  // Copier le mot de passe dans le presse-papiers
  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPassword)
    setCopySuccess(true)
    setTimeout(() => setCopySuccess(false), 2000)
  }

  // Fermer le dialogue de mot de passe et rediriger
  const handleClosePasswordDialog = () => {
    setOpenPasswordDialog(false)
    navigate("/admin/users")
  }

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
        title={isEditMode ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
        subtitle={
          isEditMode ? "Modifier les informations de l'utilisateur" : "Créer un nouvel utilisateur dans le système"
        }
        breadcrumbs={[
          { label: "Utilisateurs", link: "/admin/users" },
          { label: isEditMode ? "Modifier" : "Nouveau", link: isEditMode ? `/admin/users/${id}` : "/admin/users/new" },
        ]}
        action={
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate("/admin/users")}>
            Retour
          </Button>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3, borderRadius: 2, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)" }}>
        <Box component="form" onSubmit={formik.handleSubmit} noValidate>
          <Grid container spacing={3}>
            {/* Informations de base */}
            <Grid item xs={12} md={8}>
              <Typography variant="h6" gutterBottom>
                Informations de base
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    id="prenom"
                    name="prenom"
                    label="Prénom"
                    value={formik.values.prenom}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.prenom && Boolean(formik.errors.prenom)}
                    helperText={formik.touched.prenom && formik.errors.prenom}
                    inputProps={{ maxLength: 50 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    id="nom"
                    name="nom"
                    label="Nom"
                    value={formik.values.nom}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.nom && Boolean(formik.errors.nom)}
                    helperText={formik.touched.nom && formik.errors.nom}
                    inputProps={{ maxLength: 50 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    id="email"
                    name="email"
                    label="Adresse email"
                    type="email"
                    value={formik.values.email}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.email && Boolean(formik.errors.email)}
                    helperText={formik.touched.email && formik.errors.email}
                    disabled={isEditMode} // Désactiver la modification de l'email en mode édition
                    inputProps={{ maxLength: 100 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required error={formik.touched.role && Boolean(formik.errors.role)}>
                    <InputLabel id="role-label">Rôle</InputLabel>
                    <Select
                      labelId="role-label"
                      id="role"
                      name="role"
                      value={formik.values.role}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      label="Rôle"
                    >
                      <MenuItem value="admin">Administrateur</MenuItem>
                      <MenuItem value="manager">Manager</MenuItem>
                      <MenuItem value="assistant">Assistant</MenuItem>
                      <MenuItem value="employee">Employé</MenuItem>
                    </Select>
                    {formik.touched.role && formik.errors.role && (
                      <Typography variant="caption" color="error">
                        {formik.errors.role}
                      </Typography>
                    )}
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth error={formik.touched.departement && Boolean(formik.errors.departement)}>
                    <InputLabel id="departement-label">Département</InputLabel>
                    <Select
                      labelId="departement-label"
                      id="departement"
                      name="departement"
                      value={formik.values.departement}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      label="Département"
                    >
                      <MenuItem value="">Aucun département</MenuItem>
                      {departments.map((dept) => (
                        <MenuItem key={dept._id} value={dept._id}>
                          {dept.nom}
                        </MenuItem>
                      ))}
                    </Select>
                    {formik.touched.departement && formik.errors.departement && (
                      <Typography variant="caption" color="error">
                        {formik.errors.departement}
                      </Typography>
                    )}
                  </FormControl>
                </Grid>
              </Grid>

              {/* Informations supplémentaires */}
              {isEditMode && (
                <>
                  <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
                    Informations supplémentaires
                  </Typography>
                  <Divider sx={{ mb: 3 }} />

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        id="age"
                        name="age"
                        label="Âge"
                        type="number"
                        value={formik.values.age}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.touched.age && Boolean(formik.errors.age)}
                        helperText={formik.touched.age && formik.errors.age}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth error={formik.touched.sexe && Boolean(formik.errors.sexe)}>
                        <InputLabel id="sexe-label">Sexe</InputLabel>
                        <Select
                          labelId="sexe-label"
                          id="sexe"
                          name="sexe"
                          value={formik.values.sexe}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          label="Sexe"
                        >
                          <MenuItem value="">Non spécifié</MenuItem>
                          <MenuItem value="M">Homme</MenuItem>
                          <MenuItem value="F">Femme</MenuItem>
                        </Select>
                        {formik.touched.sexe && formik.errors.sexe && (
                          <Typography variant="caption" color="error">
                            {formik.errors.sexe}
                          </Typography>
                        )}
                      </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        id="adresse"
                        name="adresse"
                        label="Adresse"
                        value={formik.values.adresse}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.touched.adresse && Boolean(formik.errors.adresse)}
                        helperText={formik.touched.adresse && formik.errors.adresse}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        id="telephone"
                        name="telephone"
                        label="Numéro de téléphone"
                        value={formik.values.telephone}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.touched.telephone && Boolean(formik.errors.telephone)}
                        helperText={formik.touched.telephone && formik.errors.telephone}
                      />
                    </Grid>
                  </Grid>
                </>
              )}
            </Grid>

            {/* Photo de profil */}
            <Grid item xs={12} md={4}>
              <Typography variant="h6" gutterBottom>
                Photo de profil
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Avatar
                  alt={`${formik.values.prenom} ${formik.values.nom}`}
                  src={previewImage}
                  sx={{ width: 150, height: 150, mb: 2 }}
                >
                  {!previewImage && <PersonIcon sx={{ fontSize: 80 }} />}
                </Avatar>
                <label htmlFor="profile-image">
                  <input
                    accept="image/*"
                    id="profile-image"
                    type="file"
                    style={{ display: "none" }}
                    onChange={handleImageUpload}
                  />
                  <Button variant="outlined" component="span" startIcon={<PhotoCameraIcon />}>
                    {isEditMode ? "Changer la photo" : "Ajouter une photo"}
                  </Button>
                </label>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, textAlign: "center" }}>
                  Formats acceptés: JPG, JPEG, PNG. Taille maximale: 5 MB.
                </Typography>
              </Box>
            </Grid>
          </Grid>

          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 4 }}>
            <Button variant="outlined" onClick={() => navigate("/admin/users")} sx={{ mr: 1 }}>
              Annuler
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
              disabled={loading}
            >
              {loading ? "Enregistrement..." : isEditMode ? "Mettre à jour" : "Créer l'utilisateur"}
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Dialogue pour afficher le mot de passe généré */}
      <Dialog open={openPasswordDialog} onClose={handleClosePasswordDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Mot de passe temporaire généré</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            L'envoi d'email n'a pas pu être effectué. Veuillez noter le mot de passe temporaire pour cet utilisateur:
          </DialogContentText>
          <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
            <TextField
              value={generatedPassword}
              variant="outlined"
              size="medium"
              fullWidth
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="Copier le mot de passe">
                      <IconButton onClick={copyToClipboard} edge="end">
                        <ContentCopyIcon />
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
          <Typography variant="caption" color="error" sx={{ mt: 2, display: "block" }}>
            IMPORTANT: Ce mot de passe ne sera plus affiché ultérieurement. Veuillez le noter ou le communiquer à
            l'utilisateur.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePasswordDialog} variant="contained">
            J'ai noté le mot de passe
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification de copie réussie */}
      <Snackbar
        open={copySuccess}
        autoHideDuration={2000}
        onClose={() => setCopySuccess(false)}
        message="Mot de passe copié dans le presse-papiers"
      />
    </Box>
  )
}

export default UserFormPage
