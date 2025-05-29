"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Avatar,
  IconButton,
  InputAdornment,
} from "@mui/material"
import {
  Person as PersonIcon,
  Save as SaveIcon,
  Visibility,
  VisibilityOff,
  PhotoCamera as PhotoCameraIcon,
} from "@mui/icons-material"
import { useFormik } from "formik"
import * as Yup from "yup"
import axios from "axios"
import { API_URL } from "../../config"
import { useAuth } from "../../contexts/AuthContext"

// Étapes du formulaire
const steps = ["Informations personnelles", "Changement de mot de passe", "Photo de profil"]

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

// Page de complétion du profil
const CompleteProfilePage = () => {
  const navigate = useNavigate()
  const { user, updateProfile } = useAuth()
  const [activeStep, setActiveStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showPassword, setShowPassword] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  })
  const [profileImage, setProfileImage] = useState(null)
  const [previewImage, setPreviewImage] = useState(null)

  // Formulaire pour les informations personnelles
  const personalInfoFormik = useFormik({
    initialValues: {
      nom: user?.nom || "",
      prenom: user?.prenom || "",
      age: user?.age || "",
      sexe: user?.sexe || "",
      adresse: user?.adresse || "",
      telephone: user?.telephone || "",
    },
    validationSchema: personalInfoSchema,
    onSubmit: (values) => {
      handleNext()
    },
  })

  // Formulaire pour le changement de mot de passe
  const passwordFormik = useFormik({
    initialValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    validationSchema: passwordSchema,
    onSubmit: (values) => {
      handleNext()
    },
  })

  // Gérer le changement d'étape
  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1)
  }

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1)
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

  // Soumettre le formulaire complet
  const handleSubmit = async () => {
    setLoading(true)
    setError(null)

    try {
      // Créer un objet FormData pour l'envoi de fichiers
      const formData = new FormData()
      formData.append("nom", personalInfoFormik.values.nom)
      formData.append("prenom", personalInfoFormik.values.prenom)
      formData.append("age", personalInfoFormik.values.age)
      formData.append("sexe", personalInfoFormik.values.sexe)
      formData.append("adresse", personalInfoFormik.values.adresse)
      formData.append("telephone", personalInfoFormik.values.telephone)

      if (profileImage) {
        formData.append("photoProfil", profileImage)
      }

      // Mettre à jour le profil
      const profileResponse = await axios.put(`${API_URL}/users/profile/me`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      // Changer le mot de passe
      await axios.post(
        `${API_URL}/auth/change-password`,
        {
          currentPassword: passwordFormik.values.currentPassword,
          newPassword: passwordFormik.values.newPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      )

      // Mettre à jour les informations de l'utilisateur dans le contexte
      updateProfile(profileResponse.data.user)

      // Rediriger vers le tableau de bord
      navigate("/dashboard")
    } catch (error) {
      console.error("Erreur lors de la mise à jour du profil:", error)
      setError(error.response?.data?.message || "Une erreur est survenue. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  // Contenu des étapes
  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
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
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl
                  fullWidth
                  required
                  error={personalInfoFormik.touched.sexe && Boolean(personalInfoFormik.errors.sexe)}
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
                />
              </Grid>
            </Grid>
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
              <Button type="submit" variant="contained" sx={{ mt: 3, ml: 1 }}>
                Suivant
              </Button>
            </Box>
          </Box>
        )
      case 1:
        return (
          <Box component="form" onSubmit={passwordFormik.handleSubmit} noValidate>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Veuillez changer votre mot de passe temporaire pour un mot de passe sécurisé.
            </Typography>
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
                      {showPassword.currentPassword ? <VisibilityOff /> : <Visibility />}
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
                      {showPassword.newPassword ? <VisibilityOff /> : <Visibility />}
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
                      {showPassword.confirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Box sx={{ display: "flex", justifyContent: "space-between", mt: 3 }}>
              <Button onClick={handleBack}>Retour</Button>
              <Button type="submit" variant="contained" sx={{ mt: 3, ml: 1 }}>
                Suivant
              </Button>
            </Box>
          </Box>
        )
      case 2:
        return (
          <Box sx={{ mt: 2, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Ajoutez une photo de profil pour personnaliser votre compte.
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <Avatar
                alt={`${personalInfoFormik.values.prenom} ${personalInfoFormik.values.nom}`}
                src={previewImage}
                sx={{ width: 120, height: 120, mb: 2 }}
              >
                {!previewImage && <PersonIcon sx={{ fontSize: 60 }} />}
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
                  Choisir une photo
                </Button>
              </label>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                Formats acceptés: JPG, JPEG, PNG. Taille maximale: 5 MB.
              </Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", mt: 3 }}>
              <Button onClick={handleBack}>Retour</Button>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
              >
                {loading ? "Enregistrement..." : "Terminer"}
              </Button>
            </Box>
          </Box>
        )
      default:
        return "Étape inconnue"
    }
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        p: 2,
        backgroundColor: "#f5f5f5",
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          width: "100%",
          maxWidth: 600,
          borderRadius: 2,
        }}
      >
        <Typography variant="h5" component="h1" gutterBottom fontWeight="bold" textAlign="center">
          Compléter votre profil
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4, textAlign: "center" }}>
          Veuillez compléter votre profil pour continuer à utiliser l'application.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {getStepContent(activeStep)}
      </Paper>
    </Box>
  )
}

export default CompleteProfilePage
