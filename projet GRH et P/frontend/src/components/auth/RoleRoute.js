"use client"

import { Navigate } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import { CircularProgress, Box, Alert } from "@mui/material"

const RoleRoute = ({ children, roles }) => {
  const { isAuthenticated, user, loading } = useAuth()

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!roles.includes(user.role)) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <Alert severity="error">Vous n'avez pas les permissions nécessaires pour accéder à cette page.</Alert>
        <Navigate to="/dashboard" replace />
      </Box>
    )
  }

  return children
}

export default RoleRoute
