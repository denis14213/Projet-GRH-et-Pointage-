"use client"

import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Box, Typography, CircularProgress, Alert } from "@mui/material"
import axios from "axios"
import { API_URL } from "../../config"
import { useAuth } from "../../contexts/AuthContext"

const GoogleAuthCallback = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()

  useEffect(() => {
    const handleGoogleCallback = async () => {
      try {
        setLoading(true)
        const params = new URLSearchParams(location.search)
        const code = params.get("code")

        if (!code) {
          setError("Aucun code d'autorisation reçu de Google")
          setLoading(false)
          return
        }

        // Envoyer le code au backend pour obtenir et stocker le token de rafraîchissement
        await axios.post(
          `${API_URL}/auth/google/callback`,
          { code },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        )

        // Rafraîchir les informations de l'utilisateur
        await refreshUser()

        // Rediriger vers la page de profil avec un message de succès
        navigate("/profile", {
          state: {
            notification: {
              type: "success",
              message: "Votre compte Google Calendar a été connecté avec succès",
            },
          },
        })
      } catch (error) {
        console.error("Erreur lors de l'authentification Google:", error)
        setError("Erreur lors de la connexion à Google Calendar. Veuillez réessayer.")
      } finally {
        setLoading(false)
      }
    }

    handleGoogleCallback()
  }, [location, navigate, refreshUser])

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Connexion à Google Calendar en cours...
        </Typography>
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ p: 3, maxWidth: 600, mx: "auto", mt: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Box sx={{ mt: 2, textAlign: "center" }}>
          <Typography variant="body1">Vous allez être redirigé vers votre profil dans quelques secondes...</Typography>
        </Box>
      </Box>
    )
  }

  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh" }}
    >
      <CircularProgress />
      <Typography variant="h6" sx={{ mt: 2 }}>
        Redirection en cours...
      </Typography>
    </Box>
  )
}

export default GoogleAuthCallback
