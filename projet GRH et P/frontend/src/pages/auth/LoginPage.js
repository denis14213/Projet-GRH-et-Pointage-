"use client"

import { useState } from "react"
import { useNavigate, Link as RouterLink } from "react-router-dom"
import {
  Box,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  Link,
  Grid,
  Typography,
  InputAdornment,
  IconButton,
  Alert,
  CircularProgress,
} from "@mui/material"
import { Visibility, VisibilityOff, Login as LoginIcon } from "@mui/icons-material"
import { useAuth } from "../../contexts/AuthContext"
import { useFormik } from "formik"
import * as Yup from "yup"

// Schéma de validation
const validationSchema = Yup.object({
  email: Yup.string().email("Adresse email invalide").required("L'adresse email est requise"),
  password: Yup.string().required("Le mot de passe est requis"),
})

// Page de connexion
const LoginPage = () => {
  const navigate = useNavigate()
  const { login, error, setError } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  // Gérer la soumission du formulaire
  const handleSubmit = async (values) => {
    setLoading(true)
    try {
      const user = await login(values.email, values.password)

      // Rediriger vers la page de complétion du profil si c'est la première connexion
      if (user && user.premiereConnexion) {
        navigate("/complete-profile")
      } else if (user) {
        navigate("/dashboard")
      } else {
        // Si login retourne undefined ou null, c'est une erreur
        setLoading(false)
      }
    } catch (error) {
      console.error("Erreur de connexion:", error)
      setLoading(false)
    }
  }

  // Configuration du formulaire avec Formik
  const formik = useFormik({
    initialValues: {
      email: "",
      password: "",
      remember: false,
    },
    validationSchema,
    onSubmit: handleSubmit,
  })

  // Gérer l'affichage/masquage du mot de passe
  const handleClickShowPassword = () => {
    setShowPassword(!showPassword)
  }

  return (
    <Box component="form" onSubmit={formik.handleSubmit} noValidate sx={{ mt: 1 }}>
      <Typography variant="h5" component="h2" gutterBottom fontWeight="bold" textAlign="center">
        Connexion
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

      <TextField
        margin="normal"
        required
        fullWidth
        name="password"
        label="Mot de passe"
        type={showPassword ? "text" : "password"}
        id="password"
        autoComplete="current-password"
        value={formik.values.password}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={formik.touched.password && Boolean(formik.errors.password)}
        helperText={formik.touched.password && formik.errors.password}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton aria-label="toggle password visibility" onClick={handleClickShowPassword} edge="end">
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      <FormControlLabel
        control={
          <Checkbox name="remember" color="primary" checked={formik.values.remember} onChange={formik.handleChange} />
        }
        label="Se souvenir de moi"
      />

      <Button
        type="submit"
        fullWidth
        variant="contained"
        sx={{ mt: 3, mb: 2, py: 1.2 }}
        disabled={loading}
        startIcon={loading ? <CircularProgress size={20} /> : <LoginIcon />}
      >
        {loading ? "Connexion en cours..." : "Se connecter"}
      </Button>

      <Grid container>
        <Grid item xs>
          <Link component={RouterLink} to="/forgot-password" variant="body2">
            Mot de passe oublié ?
          </Link>
        </Grid>
      </Grid>
    </Box>
  )
}

export default LoginPage
