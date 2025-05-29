"use client"

import { Outlet } from "react-router-dom"
import { Container, Paper, Typography } from "@mui/material"
import { styled } from "@mui/material/styles"

// Style pour le conteneur d'authentification
const AuthContainer = styled(Container)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  padding: theme.spacing(2),
  backgroundImage: "linear-gradient(135deg, #1976d2 0%, #64b5f6 100%)",
}))

// Style pour le papier contenant le formulaire
const AuthPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  maxWidth: 450,
  width: "100%",
  borderRadius: theme.spacing(1),
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
}))

// Style pour le logo
const Logo = styled("div")(({ theme }) => ({
  marginBottom: theme.spacing(4),
  textAlign: "center",
}))

// Composant de mise en page pour l'authentification
const AuthLayout = () => {
  return (
    <AuthContainer maxWidth={false}>
      <AuthPaper elevation={6}>
        <Logo>
          <Typography variant="h4" component="h1" fontWeight="bold" color="primary">
            Gestion RH
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Système de gestion des ressources humaines et pointage
          </Typography>
        </Logo>
        <Outlet />
      </AuthPaper>
      <Typography variant="body2" color="white" sx={{ mt: 4, opacity: 0.8 }}>
        © {new Date().getFullYear()} Système de Gestion RH. Tous droits réservés.
      </Typography>
    </AuthContainer>
  )
}

export default AuthLayout
