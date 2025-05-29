"use client"

import { useState } from "react"
import { Link as RouterLink } from "react-router-dom"
import { Box, Button, TextField, Link, Typography, Alert, CircularProgress } from "@mui/material"
import { ArrowBack, Email as EmailIcon } from "@mui/icons-material"
import { useFormik } from "formik"
import * as Yup from "yup"
import axios from "axios"
import { API_URL } from "../../config"

// Schéma de validation
const validationSchema = Yup.object({
  email: Yup.string().email("Adresse email invalide").required("L'adresse email est requise"),
})

// Page de récupération de mot de passe
const ForgotPasswordPage = () => {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)

  // Gérer la soumission du formulaire
  const handleSubmit = async (values) => {
    setLoading(true)
    setError(null)
    try {
      await axios.post(`${API_URL}/auth/reset-password`, { email: values.email })
      setSuccess(true)
    } catch (error) {
      setError(error.response?.data?.message || "Une erreur est survenue. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  // Configuration du formulaire avec Formik
  const formik = useFormik({
    initialValues: {
      email: "",
    },
    validationSchema,
    onSubmit: handleSubmit,
  })

  return (
    <Box sx={{ width: "100%" }}>
      <Typography variant="h5" component="h2" gutterBottom fontWeight="bold" textAlign="center">
        Récupération de mot de passe
      </Typography>

      {success ? (
        <Box sx={{ mt: 3 }}>
          <Alert severity="success" sx={{ mb: 3 }}>
            Un email contenant les instructions pour réinitialiser votre mot de passe a été envoyé à l'adresse indiquée.
          </Alert>
          <Button component={RouterLink} to="/login" fullWidth variant="outlined" startIcon={<ArrowBack />}>
            Retour à la connexion
          </Button>
        </Box>
      ) : (
        <Box component="form" onSubmit={formik.handleSubmit} noValidate sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Adresse email"
            name="email"
            autoComplete="email"
            autoFocus
            value={formik.values.email}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.email && Boolean(formik.errors.email)}
            helperText={formik.touched.email && formik.errors.email}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2, py: 1.2 }}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <EmailIcon />}
          >
            {loading ? "Envoi en cours..." : "Envoyer le lien de réinitialisation"}
          </Button>

          <Box sx={{ textAlign: "center", mt: 2 }}>
            <Link component={RouterLink} to="/login" variant="body2">
              Retour à la connexion
            </Link>
          </Box>
        </Box>
      )}
    </Box>
  )
}

export default ForgotPasswordPage
