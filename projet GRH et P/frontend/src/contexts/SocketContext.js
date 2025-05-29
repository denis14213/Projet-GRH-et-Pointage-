"use client"

import { createContext, useContext, useEffect, useState } from "react"
import io from "socket.io-client"
import { useAuth } from "./AuthContext"
import { useNotification } from "./NotificationContext"
import { SOCKET_URL } from "../config"

// Création du contexte Socket
const SocketContext = createContext()

// Hook personnalisé pour utiliser le contexte Socket
export const useSocket = () => useContext(SocketContext)

// Fournisseur du contexte Socket
export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)
  const { isAuthenticated, user } = useAuth()
  const { showNotification } = useNotification()

  // Initialiser la connexion Socket.IO
  useEffect(() => {
    let socketInstance = null

    if (isAuthenticated && user) {
      // Créer une nouvelle instance Socket.IO
      socketInstance = io(SOCKET_URL, {
        auth: {
          token: localStorage.getItem("token"),
        },
      })

      // Gérer les événements de connexion
      socketInstance.on("connect", () => {
        console.log("Connecté au serveur Socket.IO")
        setConnected(true)

        // Rejoindre la salle personnelle
        socketInstance.emit("join", user.id)
      })

      socketInstance.on("disconnect", () => {
        console.log("Déconnecté du serveur Socket.IO")
        setConnected(false)
      })

      socketInstance.on("connect_error", (error) => {
        console.error("Erreur de connexion Socket.IO:", error)
        setConnected(false)
      })

      // Gérer les notifications
      socketInstance.on("profile_updated", (data) => {
        showNotification("info", data.message)
      })

      socketInstance.on("account_deleted", (data) => {
        showNotification("error", data.message)
      })

      socketInstance.on("attendance_recorded", (data) => {
        showNotification("success", data.message)
      })

      socketInstance.on("attendance_updated", (data) => {
        showNotification("info", data.message)
      })

      socketInstance.on("attendance_deleted", (data) => {
        showNotification("warning", data.message)
      })

      socketInstance.on("leave_requested", (data) => {
        showNotification("success", data.message)
      })

      socketInstance.on("leave_status_updated", (data) => {
        console.log("Notification de mise à jour de congé reçue:", data)
        showNotification(
          data.statut === "approuve" ? "success" : "warning",
          data.message + (data.commentaire ? ` - Commentaire: ${data.commentaire}` : ""),
        )
      })

      socketInstance.on("leave_canceled", (data) => {
        showNotification("warning", data.message)
      })

      socketInstance.on("new_message", (data) => {
        console.log("Nouvelle notification de message reçue:", data)
        if (data && data.expediteur) {
          showNotification("info", `Nouveau message de ${data.expediteur.prenom} ${data.expediteur.nom}`, 5000)
        } else {
          showNotification("info", "Vous avez reçu un nouveau message")
        }
      })

      socketInstance.on("message_deleted", (data) => {
        console.log("Notification de suppression de message reçue:", data)
        showNotification("warning", "Un message a été supprimé")
      })

      socketInstance.on("task_assigned", (data) => {
        showNotification("info", data.message)
      })

      socketInstance.on("task_updated", (data) => {
        showNotification("info", data.message)
      })

      socketInstance.on("task_status_updated", (data) => {
        showNotification("info", data.message)
      })

      socketInstance.on("task_deleted", (data) => {
        showNotification("warning", data.message)
      })

      setSocket(socketInstance)
    }

    // Nettoyer la connexion lors du démontage
    return () => {
      if (socketInstance) {
        socketInstance.disconnect()
      }
    }
  }, [isAuthenticated, user, showNotification])

  // Valeurs exposées par le contexte
  const value = {
    socket,
    connected,
  }

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
}
