"use client"

import { useState, useEffect } from "react"
import {
  Box,
  Grid,
  Typography,
  Paper,
  Avatar,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  IconButton,
  InputAdornment,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material"
import {
  Person as PersonIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  PhotoCamera as PhotoCameraIcon,
  Lock as LockIcon,
  Link as LinkIcon,
  LinkOff as LinkOffIcon,
  CalendarMonth as CalendarMonthIcon,
} from "@mui/icons-material"
import { useAuth } from "../../contexts/AuthContext"
import { useFormik } from "formik"
import * as Yup from "yup"
import axios from "axios"
import { API_URL } from "../../config"
import PageHeader from "../../components/common/PageHeader"

// Schéma de validation pour les informations personnelles
const personalInfoSchema = Yup.object({
  nom: Yup.string().required("Le nom est requis"),
  prenom: Yup.string().required("Le prénom est requis"),
  age: Yup.number().min(18, "Vous devez avoir au moins 18 ans").max(100, "Âge invalide").required("L'âge est requis"),
  sexe: Yup.string().required("Le sexe est requis"),
  adresse: Yup.string().required("L'adresse est requise"),
  telephone: Yup.string().required("Le numéro de téléphone est requis"),
})

// Schéma de validation pour le changement de mot de passe
const passwordSchema = Yup.object({
  currentPassword: Yup.string().required("Le mot de passe actuel est requis"),
  newPassword: Yup.string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Le mot de passe doit contenir au moins une lettre majuscule, une lettre minuscule et un chiffre",
    )
    .required("Le nouveau mot de passe est requis"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("newPassword"), null], "Les mots de passe ne correspondent pas")
    .required("La confirmation du mot de passe est requise"),
})

// Page de profil utilisateur
const ProfilePage = () => {
  const { user, updateProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [profileLoading, setProfileLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [editing, setEditing] = useState(false)
  const [tabValue, setTabValue] = useState(0)
  const [showPassword, setShowPassword] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  })
  const [profileImage, setProfileImage] = useState(null)
  const [previewImage, setPreviewImage] = useState(null)
  const [profileData, setProfileData] = useState(null)
  const [openDialog, setOpenDialog] = useState(false)

  // Récupérer les données du profil
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setProfileLoading(true)
        const response = await axios.get(`${API_URL}/users/profile/me`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        })
        setProfileData(response.data)
        if (response.data.photoProfil) {
          setPreviewImage(`${API_URL.replace("/api", "")}${response.data.photoProfil}`)
        }
      } catch (error) {
        console.error("Erreur lors de la récupération du profil:", error)
        setError("Erreur lors de la récupération du profil. Veuillez réessayer.")
      } finally {
        setProfileLoading(false)
      }
    }

    fetchProfileData()
  }, [])

  // Formulaire pour les informations personnelles
  const personalInfoFormik = useFormik({
    initialValues: {
      nom: "",
      prenom: "",
      age: "",
      sexe: "",
      adresse: "",
      telephone: "",
    },
    validationSchema: personalInfoSchema,
    onSubmit: handleUpdateProfile,
  })

  // Mettre à jour les valeurs du formulaire lorsque les données du profil sont chargées
  useEffect(() => {
    if (profileData) {
      personalInfoFormik.setValues({
        nom: profileData.nom || "",
        prenom: profileData.prenom || "",
        age: profileData.age || "",
        sexe: profileData.sexe || "",
        adresse: profileData.adresse || "",
        telephone: profileData.telephone || "",
      })
    }
  }, [profileData])

  // Formulaire pour le changement de mot de passe
  const passwordFormik = useFormik({
    initialValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    validationSchema: passwordSchema,
    onSubmit: handleChangePassword,
  })

  // Gérer le changement d'onglet
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue)
  }

  // Gérer l'affichage/masquage des mots de passe
  const handleClickShowPassword = (field) => {
    setShowPassword({
      ...showPassword,
      [field]: !showPassword[field],
    })
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

  // Mettre à jour le profil
  async function handleUpdateProfile(values) {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Créer un objet FormData pour l'envoi de fichiers
      const formData = new FormData()
      formData.append("nom", values.nom)
      formData.append("prenom", values.prenom)
      formData.append("age", values.age)
      formData.append("sexe", values.sexe)
      formData.append("adresse", values.adresse)
      formData.append("telephone", values.telephone)

      if (profileImage) {
        formData.append("photoProfil", profileImage)
      }

      // Mettre à jour le profil
      const response = await axios.put(`${API_URL}/users/profile/me`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      // Mettre à jour les informations de l'utilisateur dans le contexte
      updateProfile(response.data.user)
      setProfileData(response.data.user)
      setSuccess("Profil mis à jour avec succès")
      setEditing(false)
    } catch (error) {
      console.error("Erreur lors de la mise à jour du profil:", error)
      setError(error.response?.data?.message || "Erreur lors de la mise à jour du profil. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  // Changer le mot de passe
  async function handleChangePassword(values) {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Changer le mot de passe
      await axios.post(
        `${API_URL}/auth/change-password`,
        {
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      )

      setSuccess("Mot de passe changé avec succès")
      passwordFormik.resetForm()
    } catch (error) {
      console.error("Erreur lors du changement de mot de passe:", error)
      setError(error.response?.data?.message || "Erreur lors du changement de mot de passe. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  // Ouvrir la boîte de dialogue de confirmation
  const handleOpenDialog = () => {
    setOpenDialog(true)
  }

  // Fermer la boîte de dialogue de confirmation
  const handleCloseDialog = () => {
    setOpenDialog(false)
  }

  // Annuler les modifications
  const handleCancelEdit = () => {
    setEditing(false)
    setProfileImage(null)
    if (profileData) {
      personalInfoFormik.setValues({
        nom: profileData.nom || "",
        prenom: profileData.prenom || "",
        age: profileData.age || "",
        sexe: profileData.sexe || "",
        adresse: profileData.adresse || "",
        telephone: profileData.telephone || "",
      })
    }
    if (profileData?.photoProfil) {
      setPreviewImage(`${API_URL.replace("/api", "")}${profileData.photoProfil}`)
    } else {
      setPreviewImage(null)
    }
  }

  const handleConnectGoogleCalendar = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_URL}/auth/google/auth-url`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      // Rediriger vers l'URL d'autorisation Google
      window.location.href = response.data.authUrl
    } catch (error) {
      console.error("Erreur lors de la connexion à Google Calendar:", error)
      setError("Erreur lors de la connexion à Google Calendar")
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnectGoogleCalendar = async () => {
    try {
      setLoading(true)
      await axios.post(
        `${API_URL}/auth/google/disconnect`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      )

      // Rafraîchir les informations de l'utilisateur
      window.location.reload()
      setSuccess("Déconnexion de Google Calendar réussie")
    } catch (error) {
      console.error("Erreur lors de la déconnexion de Google Calendar:", error)
      setError("Erreur lors de la déconnexion de Google Calendar")
    } finally {
      setLoading(false)
    }
  }

  if (profileLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "80vh" }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <PageHeader
        title="Mon profil"
        subtitle="Gérez vos informations personnelles et vos paramètres de sécurité"
        breadcrumbs={[{ label: "Mon profil", link: "/profile" }]}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Informations de base */}
        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 3,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              borderRadius: 2,
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
            }}
          >
            <Avatar
              alt={profileData?.prenom + " " + profileData?.nom}
              src={previewImage}
              sx={{ width: 120, height: 120, mb: 2 }}
            >
              {!previewImage && <PersonIcon sx={{ fontSize: 60 }} />}
            </Avatar>

            {editing && (
              <Box sx={{ mt: 2, mb: 3 }}>
                <label htmlFor="profile-image">
                  <input
                    accept="image/*"
                    id="profile-image"
                    type="file"
                    style={{ display: "none" }}
                    onChange={handleImageUpload}
                  />
                  <Button variant="outlined" component="span" startIcon={<PhotoCameraIcon />}>
                    Changer la photo
                  </Button>
                </label>
              </Box>
            )}

            <Typography variant="h5" gutterBottom>
              {profileData?.prenom} {profileData?.nom}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ textTransform: "capitalize" }}>
              {profileData?.role}
            </Typography>
            {profileData?.departement && (
              <Typography variant="body2" color="text.secondary">
                Département: {profileData.departement.nom}
              </Typography>
            )}

            <Divider sx={{ my: 2, width: "100%" }} />

            <Box sx={{ width: "100%" }}>
              <Typography variant="subtitle2" gutterBottom>
                Email
              </Typography>
              <Typography variant="body1" gutterBottom>
                {profileData?.email}
              </Typography>

              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                Téléphone
              </Typography>
              <Typography variant="body1" gutterBottom>
                {profileData?.telephone || "Non renseigné"}
              </Typography>

              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                Adresse
              </Typography>
              <Typography variant="body1" gutterBottom>
                {profileData?.adresse || "Non renseignée"}
              </Typography>
            </Box>

            {!editing && (
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                sx={{ mt: 3 }}
                fullWidth
                onClick={() => setEditing(true)}
              >
                Modifier le profil
              </Button>
            )}
          </Paper>
        </Grid>

        {/* Onglets de profil */}
        <Grid item xs={12} md={8}>
          <Paper
            sx={{
              borderRadius: 2,
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
            }}
          >
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              aria-label="onglets de profil"
              sx={{ borderBottom: 1, borderColor: "divider" }}
            >
              <Tab label="Informations personnelles" />
              <Tab label="Sécurité" />
            </Tabs>

            {/* Onglet des informations personnelles */}
            {tabValue === 0 && (
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Informations personnelles
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Mettez à jour vos informations personnelles
                </Typography>

                <Box component="form" onSubmit={personalInfoFormik.handleSubmit} noValidate>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        required
                        fullWidth
                        id="nom"
                        label="Nom"
                        name="nom"
                        value={personalInfoFormik.values.nom}
                        onChange={personalInfoFormik.handleChange}
                        onBlur={personalInfoFormik.handleBlur}
                        error={personalInfoFormik.touched.nom && Boolean(personalInfoFormik.errors.nom)}
                        helperText={personalInfoFormik.touched.nom && personalInfoFormik.errors.nom}
                        disabled={!editing}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        required
                        fullWidth
                        id="prenom"
                        label="Prénom"
                        name="prenom"
                        value={personalInfoFormik.values.prenom}
                        onChange={personalInfoFormik.handleChange}
                        onBlur={personalInfoFormik.handleBlur}
                        error={personalInfoFormik.touched.prenom && Boolean(personalInfoFormik.errors.prenom)}
                        helperText={personalInfoFormik.touched.prenom && personalInfoFormik.errors.prenom}
                        disabled={!editing}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        required
                        fullWidth
                        id="age"
                        label="Âge"
                        name="age"
                        type="number"
                        value={personalInfoFormik.values.age}
                        onChange={personalInfoFormik.handleChange}
                        onBlur={personalInfoFormik.handleBlur}
                        error={personalInfoFormik.touched.age && Boolean(personalInfoFormik.errors.age)}
                        helperText={personalInfoFormik.touched.age && personalInfoFormik.errors.age}
                        disabled={!editing}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl
                        fullWidth
                        required
                        error={personalInfoFormik.touched.sexe && Boolean(personalInfoFormik.errors.sexe)}
                        disabled={!editing}
                      >
                        <InputLabel id="sexe-label">Sexe</InputLabel>
                        <Select
                          labelId="sexe-label"
                          id="sexe"
                          name="sexe"
                          value={personalInfoFormik.values.sexe}
                          onChange={personalInfoFormik.handleChange}
                          onBlur={personalInfoFormik.handleBlur}
                          label="Sexe"
                        >
                          <MenuItem value="M">Homme</MenuItem>
                          <MenuItem value="F">Femme</MenuItem>
                        </Select>
                        {personalInfoFormik.touched.sexe && personalInfoFormik.errors.sexe && (
                          <Typography variant="caption" color="error">
                            {personalInfoFormik.errors.sexe}
                          </Typography>
                        )}
                      </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        required
                        fullWidth
                        id="adresse"
                        label="Adresse"
                        name="adresse"
                        value={personalInfoFormik.values.adresse}
                        onChange={personalInfoFormik.handleChange}
                        onBlur={personalInfoFormik.handleBlur}
                        error={personalInfoFormik.touched.adresse && Boolean(personalInfoFormik.errors.adresse)}
                        helperText={personalInfoFormik.touched.adresse && personalInfoFormik.errors.adresse}
                        disabled={!editing}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        required
                        fullWidth
                        id="telephone"
                        label="Numéro de téléphone"
                        name="telephone"
                        value={personalInfoFormik.values.telephone}
                        onChange={personalInfoFormik.handleChange}
                        onBlur={personalInfoFormik.handleBlur}
                        error={personalInfoFormik.touched.telephone && Boolean(personalInfoFormik.errors.telephone)}
                        helperText={personalInfoFormik.touched.telephone && personalInfoFormik.errors.telephone}
                        disabled={!editing}
                      />
                    </Grid>
                  </Grid>

                  {editing && (
                    <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
                      <Button
                        variant="outlined"
                        onClick={handleCancelEdit}
                        sx={{ mr: 1 }}
                        startIcon={<CancelIcon />}
                        disabled={loading}
                      >
                        Annuler
                      </Button>
                      <Button
                        type="submit"
                        variant="contained"
                        startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
                        disabled={loading}
                      >
                        {loading ? "Enregistrement..." : "Enregistrer"}
                      </Button>
                    </Box>
                  )}
                </Box>
              </Box>
            )}

            {/* Onglet de sécurité */}
            {tabValue === 1 && (
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Sécurité
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Mettez à jour votre mot de passe
                </Typography>

                <Box component="form" onSubmit={passwordFormik.handleSubmit} noValidate>
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    name="currentPassword"
                    label="Mot de passe actuel"
                    type={showPassword.currentPassword ? "text" : "password"}
                    id="currentPassword"
                    value={passwordFormik.values.currentPassword}
                    onChange={passwordFormik.handleChange}
                    onBlur={passwordFormik.handleBlur}
                    error={passwordFormik.touched.currentPassword && Boolean(passwordFormik.errors.currentPassword)}
                    helperText={passwordFormik.touched.currentPassword && passwordFormik.errors.currentPassword}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={() => handleClickShowPassword("currentPassword")}
                            edge="end"
                          >
                            {showPassword.currentPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    name="newPassword"
                    label="Nouveau mot de passe"
                    type={showPassword.newPassword ? "text" : "password"}
                    id="newPassword"
                    value={passwordFormik.values.newPassword}
                    onChange={passwordFormik.handleChange}
                    onBlur={passwordFormik.handleBlur}
                    error={passwordFormik.touched.newPassword && Boolean(passwordFormik.errors.newPassword)}
                    helperText={passwordFormik.touched.newPassword && passwordFormik.errors.newPassword}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={() => handleClickShowPassword("newPassword")}
                            edge="end"
                          >
                            {showPassword.newPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    name="confirmPassword"
                    label="Confirmer le mot de passe"
                    type={showPassword.confirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    value={passwordFormik.values.confirmPassword}
                    onChange={passwordFormik.handleChange}
                    onBlur={passwordFormik.handleBlur}
                    error={passwordFormik.touched.confirmPassword && Boolean(passwordFormik.errors.confirmPassword)}
                    helperText={passwordFormik.touched.confirmPassword && passwordFormik.errors.confirmPassword}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={() => handleClickShowPassword("confirmPassword")}
                            edge="end"
                          >
                            {showPassword.confirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      startIcon={loading ? <CircularProgress size={20} /> : <LockIcon />}
                      disabled={loading}
                    >
                      {loading ? "Changement en cours..." : "Changer le mot de passe"}
                    </Button>
                  </Box>
                </Box>

                <Divider sx={{ my: 4 }} />

                <Typography variant="h6" gutterBottom color="error">
                  Zone de danger
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Actions irréversibles pour votre compte
                </Typography>

                <Button variant="outlined" color="error" onClick={handleOpenDialog}>
                  Supprimer mon compte
                </Button>

                {/* Boîte de dialogue de confirmation */}
                <Dialog open={openDialog} onClose={handleCloseDialog}>
                  <DialogTitle>Supprimer votre compte ?</DialogTitle>
                  <DialogContent>
                    <DialogContentText>
                      Cette action est irréversible. Toutes vos données personnelles seront supprimées définitivement.
                      Êtes-vous sûr de vouloir continuer ?
                    </DialogContentText>
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={handleCloseDialog}>Annuler</Button>
                    <Button color="error" onClick={handleCloseDialog}>
                      Supprimer mon compte
                    </Button>
                  </DialogActions>
                </Dialog>
              </Box>
            )}
          </Paper>
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Intégrations
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Avatar sx={{ mr: 2, bgcolor: "primary.main" }}>
                  <CalendarMonthIcon />
                </Avatar>
                <Box>
                  <Typography variant="subtitle1">Google Calendar</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {user?.googleRefreshToken
                      ? "Connecté - Vos congés seront automatiquement ajoutés à votre calendrier"
                      : "Non connecté - Connectez votre compte pour synchroniser vos congés"}
                  </Typography>
                </Box>
              </Box>

              <Button
                variant={user?.googleRefreshToken ? "outlined" : "contained"}
                color={user?.googleRefreshToken ? "error" : "primary"}
                onClick={user?.googleRefreshToken ? handleDisconnectGoogleCalendar : handleConnectGoogleCalendar}
                startIcon={user?.googleRefreshToken ? <LinkOffIcon /> : <LinkIcon />}
                disabled={loading}
              >
                {user?.googleRefreshToken ? "Déconnecter" : "Connecter"}
              </Button>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  )
}

export default ProfilePage
