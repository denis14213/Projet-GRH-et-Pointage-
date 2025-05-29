"use client"

import { createContext, useContext, useState } from "react"
import { Snackbar, Alert } from "@mui/material"

// Création du contexte de notification
const NotificationContext = createContext()

// Hook personnalisé pour utiliser le contexte de notification
export const useNotification = () => useContext(NotificationContext)

// Fournisseur du contexte de notification
export const NotificationProvider = ({ children }) => {
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "info", // 'error', 'warning', 'info', 'success'
  })

  // Fonction pour afficher une notification
  const showNotification = (severity, message) => {
    setNotification({
      open: true,
      message,
      severity,
    })
  }

  // Fonction pour fermer la notification
  const closeNotification = () => {
    setNotification({
      ...notification,
      open: false,
    })
  }

  // Valeurs exposées par le contexte
  const value = {
    showNotification,
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={closeNotification}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert onClose={closeNotification} severity={notification.severity} variant="filled" sx={{ width: "100%" }}>
          {notification.message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  )
}
