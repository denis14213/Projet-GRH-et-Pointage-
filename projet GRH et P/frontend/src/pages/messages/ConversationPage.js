"use client"

import { useState, useEffect, useRef } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  TextField,
  IconButton,
  Avatar,
  Button,
  List,
  ListItem,
  Chip,
} from "@mui/material"
import {
  Send as SendIcon,
  ArrowBack as ArrowBackIcon,
  AttachFile as AttachFileIcon,
  InsertEmoticon as EmojiIcon,
  MoreVert as MoreVertIcon,
  DoneAll as DoneAllIcon,
  Download as DownloadIcon,
} from "@mui/icons-material"
import axios from "axios"
import { API_URL } from "../../config"
import { useNotification } from "../../contexts/NotificationContext"
import { useAuth } from "../../contexts/AuthContext"
import { format } from "date-fns"

// Page de conversation
const ConversationPage = () => {
  const navigate = useNavigate()
  const params = useParams()
  const userId = params.id // Utiliser params.id au lieu de params.userId
  const { showNotification } = useNotification()
  const { user } = useAuth()
  const [conversation, setConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [messageText, setMessageText] = useState("")
  const [files, setFiles] = useState([])
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  // Récupérer la conversation
  useEffect(() => {
    const fetchConversation = async () => {
      try {
        setLoading(true)
        setError(null)

        // Vérifier si le token est disponible
        const token = localStorage.getItem("token")
        if (!token) {
          setError("Session expirée. Veuillez vous reconnecter.")
          setLoading(false)
          return
        }

        // Vérifier si l'ID de l'utilisateur est valide
        if (!userId) {
          setError("ID d'utilisateur manquant. Veuillez sélectionner un utilisateur valide.")
          setLoading(false)
          return
        }

        // Vérifier le format de l'ID
        if (!/^[0-9a-fA-F]{24}$/.test(userId)) {
          setError("Format d'ID utilisateur invalide. Veuillez sélectionner un utilisateur valide.")
          setLoading(false)
          return
        }

        console.log("Tentative de récupération de la conversation avec l'utilisateur:", userId)

        const response = await axios.get(`${API_URL}/messages/user/${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        console.log("Réponse reçue:", response.data)

        // Vérifier que la réponse contient les données attendues
        if (!response.data || !response.data.utilisateur) {
          setError("Format de réponse invalide du serveur.")
          setLoading(false)
          return
        }

        setConversation(response.data.utilisateur)
        setMessages(response.data.messages || [])

        // Afficher les informations de débogage
        console.log("ID utilisateur actuel:", user?.id)
        if (response.data.messages && response.data.messages.length > 0) {
          console.log("ID expéditeur premier message:", response.data.messages[0].expediteur)
          console.log("Est l'utilisateur actuel?", response.data.messages[0].expediteur === user?.id)
        }
      } catch (error) {
        console.error("Erreur lors de la récupération de la conversation:", error)

        // Message d'erreur plus spécifique basé sur le code d'état
        if (error.response) {
          console.error("Détails de l'erreur:", error.response.data)
          if (error.response.status === 401) {
            setError("Session expirée ou non autorisée. Veuillez vous reconnecter.")
          } else if (error.response.status === 404) {
            setError("Utilisateur non trouvé. Veuillez sélectionner un autre utilisateur.")
          } else if (error.response.status === 400) {
            setError("Requête invalide. Veuillez réessayer avec un utilisateur valide.")
          } else if (error.response.status === 500) {
            setError("Erreur serveur. Veuillez réessayer plus tard.")
          } else {
            setError(
              `Erreur (${error.response.status}): ${error.response.data.message || "Erreur lors de la récupération de la conversation"}`,
            )
          }
        } else if (error.request) {
          setError("Aucune réponse reçue du serveur. Vérifiez votre connexion internet.")
        } else {
          setError("Erreur de connexion. Vérifiez votre connexion internet.")
        }
      } finally {
        setLoading(false)
      }
    }

    fetchConversation()
  }, [userId, params, user])

  // Faire défiler vers le bas lorsque de nouveaux messages sont ajoutés
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Gérer l'envoi d'un message
  const handleSendMessage = async () => {
    if ((!messageText.trim() && files.length === 0) || sending) return

    try {
      setSending(true)
      const formData = new FormData()
      formData.append("destinataire", userId)
      formData.append("contenu", messageText)

      // Ajouter les fichiers s'il y en a
      files.forEach((file) => {
        formData.append("fichiers", file)
      })

      console.log("Envoi du message à l'utilisateur:", userId)
      console.log("Contenu:", messageText)
      console.log("Nombre de fichiers:", files.length)

      const token = localStorage.getItem("token")
      if (!token) {
        showNotification("error", "Session expirée. Veuillez vous reconnecter.")
        setSending(false)
        return
      }

      const response = await axios.post(`${API_URL}/messages`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      })

      console.log("Réponse d'envoi de message:", response.data)

      // Vérifier que la réponse contient les données attendues
      if (!response.data || !response.data.data) {
        showNotification("warning", "Message envoyé mais la réponse du serveur est incomplète")
      } else {
        // Ajouter le nouveau message à la liste
        setMessages((prevMessages) => [...prevMessages, response.data.data])
      }

      setMessageText("")
      setFiles([])
      showNotification("success", "Message envoyé avec succès")
    } catch (error) {
      console.error("Erreur lors de l'envoi du message:", error)

      if (error.response) {
        console.error("Détails de l'erreur:", error.response.data)
        showNotification("error", `Erreur: ${error.response.data.message || "Problème lors de l'envoi du message"}`)
      } else if (error.request) {
        showNotification("error", "Aucune réponse du serveur. Vérifiez votre connexion.")
      } else {
        showNotification("error", "Erreur lors de l'envoi du message")
      }
    } finally {
      setSending(false)
    }
  }

  // Gérer l'appui sur la touche Entrée
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Gérer le téléchargement de fichiers
  const handleFileUpload = (e) => {
    const newFiles = Array.from(e.target.files)
    setFiles([...files, ...newFiles])
  }

  // Supprimer un fichier
  const handleRemoveFile = (index) => {
    const newFiles = [...files]
    newFiles.splice(index, 1)
    setFiles(newFiles)
  }

  // Formater la date du message
  const formatMessageDate = (date) => {
    const messageDate = new Date(date)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (messageDate.toDateString() === today.toDateString()) {
      return format(messageDate, "HH:mm")
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return `Hier, ${format(messageDate, "HH:mm")}`
    } else {
      return format(messageDate, "dd/MM/yyyy HH:mm")
    }
  }

  // Vérifier si un message est de l'utilisateur actuel

  // Fonction pour regrouper les messages par date
  const groupMessagesByDate = (messages) => {
    const groups = {}

    messages.forEach((message) => {
      const date = new Date(message.dateEnvoi).toLocaleDateString()
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(message)
    })

    return Object.entries(groups).map(([date, messages]) => ({
      date,
      messages,
    }))
  }

  // Grouper les messages par date
  const groupedMessages = groupMessagesByDate(messages)

  return (
    <Box sx={{ height: "calc(100vh - 100px)", display: "flex", flexDirection: "column" }}>
      {/* En-tête de la conversation */}
      <Paper
        sx={{
          p: 2,
          borderRadius: "12px 12px 0 0",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <IconButton onClick={() => navigate("/messages")} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          {loading ? (
            <CircularProgress size={24} />
          ) : (
            <>
              <Avatar
                src={conversation?.photoProfil ? `${API_URL.replace("/api", "")}${conversation.photoProfil}` : ""}
                alt={conversation ? `${conversation.prenom} ${conversation.nom}` : ""}
                sx={{ width: 40, height: 40, mr: 2 }}
              >
                {conversation?.prenom?.charAt(0)}
                {conversation?.nom?.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="subtitle1">
                  {conversation?.prenom} {conversation?.nom}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {conversation?.role ? conversation.role.charAt(0).toUpperCase() + conversation.role.slice(1) : ""}
                </Typography>
              </Box>
            </>
          )}
        </Box>
        <IconButton>
          <MoreVertIcon />
        </IconButton>
      </Paper>

      {/* Corps de la conversation - Style WhatsApp */}
      <Paper
        sx={{
          flex: 1,
          borderRadius: 0,
          boxShadow: "none",
          overflow: "auto",
          p: 2,
          backgroundColor: "#e5ded8", // Couleur de fond style WhatsApp
          backgroundImage:
            'url(\'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="chat-bg" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="50" cy="50" r="1" fill="%23ffffff" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23chat-bg)"/></svg>\')',
        }}
      >
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        ) : messages.length === 0 ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ backgroundColor: "rgba(255,255,255,0.7)", p: 2, borderRadius: 2 }}
            >
              Aucun message. Commencez la conversation !
            </Typography>
          </Box>
        ) : (
          <List sx={{ width: "100%" }}>
            {groupedMessages.map((group, groupIndex) => (
              <Box key={groupIndex} sx={{ mb: 2 }}>
                {/* Séparateur de date style WhatsApp */}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    mb: 2,
                    mt: 2,
                  }}
                >
                  <Chip
                    label={group.date}
                    size="small"
                    sx={{
                      backgroundColor: "rgba(225, 245, 254, 0.92)",
                      borderColor: "transparent",
                      fontWeight: 500,
                      fontSize: "0.75rem",
                      py: 0.5,
                    }}
                  />
                </Box>

                {/* Messages du groupe */}
                {group.messages.map((message) => {
                  // Améliorer la logique de comparaison des IDs
                  const currentUserId = user?.id || user?._id
                  const messageExpediteId = message.expediteur?._id || message.expediteur

                  // Conversion en string et nettoyage pour la comparaison
                  const isSender = String(messageExpediteId).trim() === String(currentUserId).trim()

                  // Debug pour vérifier la comparaison
                  console.log("Comparaison message:", {
                    messageId: message._id,
                    expediteur: messageExpediteId,
                    currentUser: currentUserId,
                    isSender: isSender,
                    messageContent: message.contenu.substring(0, 20) + "...",
                  })

                  return (
                    <ListItem
                      key={message._id}
                      sx={{
                        display: "flex",
                        justifyContent: isSender ? "flex-end" : "flex-start",
                        p: 0.5,
                        width: "100%",
                      }}
                    >
                      {/* Bulle de message style WhatsApp */}
                      <Box
                        sx={{
                          maxWidth: "75%",
                          backgroundColor: isSender ? "#dcf8c6" : "#ffffff", // Vert pour l'expéditeur, blanc pour le destinataire
                          borderRadius: isSender ? "18px 18px 4px 18px" : "18px 18px 18px 4px", // Bordures asymétriques style WhatsApp
                          p: 1.5,
                          position: "relative",
                          boxShadow: "0 1px 0.5px rgba(0, 0, 0, 0.13)",
                          border: isSender ? "none" : "1px solid #e0e0e0",
                        }}
                      >
                        {/* Afficher le nom de l'expéditeur si ce n'est pas l'utilisateur actuel */}
                        {!isSender && (
                          <Typography
                            variant="caption"
                            sx={{
                              color: "#00a884",
                              fontWeight: 600,
                              fontSize: "0.75rem",
                              mb: 0.5,
                              display: "block",
                            }}
                          >
                            {message.expediteur?.prenom} {message.expediteur?.nom}
                          </Typography>
                        )}

                        {/* Contenu du message */}
                        <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word", mb: 1 }}>
                          {message.contenu}
                        </Typography>

                        {/* Fichiers joints */}
                        {message.fichiers && message.fichiers.length > 0 && (
                          <Box sx={{ mt: 1 }}>
                            {message.fichiers.map((fichier, index) => (
                              <Button
                                key={index}
                                variant="text"
                                size="small"
                                href={`${API_URL.replace("/api", "")}${fichier.url}`}
                                target="_blank"
                                startIcon={<DownloadIcon />}
                                sx={{
                                  mt: 0.5,
                                  textTransform: "none",
                                  color: "text.primary",
                                  p: 0.5,
                                  fontSize: "0.8rem",
                                }}
                              >
                                {fichier.nom}
                              </Button>
                            ))}
                          </Box>
                        )}

                        {/* Heure et statut du message */}
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "flex-end",
                            alignItems: "center",
                            mt: 0.5,
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              color: isSender ? "#4a4a4a" : "text.secondary",
                              fontSize: "0.7rem",
                              mr: isSender ? 0.5 : 0,
                            }}
                          >
                            {formatMessageDate(message.dateEnvoi)}
                          </Typography>

                          {/* Indicateurs de statut pour les messages envoyés (style WhatsApp) */}
                          {isSender && (
                            <DoneAllIcon
                              sx={{
                                fontSize: "0.8rem",
                                color: "#4fc3f7", // Bleu pour les messages lus
                              }}
                            />
                          )}
                        </Box>
                      </Box>
                    </ListItem>
                  )
                })}
              </Box>
            ))}
            <div ref={messagesEndRef} />
          </List>
        )}
      </Paper>

      {/* Fichiers sélectionnés */}
      {files.length > 0 && (
        <Paper sx={{ p: 1, borderRadius: 0, boxShadow: "none", backgroundColor: "#f0f0f0" }}>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {files.map((file, index) => (
              <Chip
                key={index}
                label={file.name}
                onDelete={() => handleRemoveFile(index)}
                variant="outlined"
                size="small"
              />
            ))}
          </Box>
        </Paper>
      )}

      {/* Pied de page de la conversation - Style WhatsApp */}
      <Paper
        sx={{
          p: 1.5,
          borderRadius: "0 0 12px 12px",
          boxShadow: "0 -1px 4px rgba(0, 0, 0, 0.1)",
          display: "flex",
          alignItems: "center",
          backgroundColor: "#f0f0f0",
        }}
      >
        <IconButton onClick={() => fileInputRef.current.click()} sx={{ color: "#919191" }}>
          <AttachFileIcon />
        </IconButton>
        <input type="file" multiple ref={fileInputRef} style={{ display: "none" }} onChange={handleFileUpload} />
        <IconButton sx={{ color: "#919191" }}>
          <EmojiIcon />
        </IconButton>
        <TextField
          fullWidth
          placeholder="Écrivez votre message..."
          variant="outlined"
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onKeyPress={handleKeyPress}
          multiline
          maxRows={4}
          sx={{
            mx: 1,
            "& .MuiOutlinedInput-root": {
              borderRadius: "20px",
              backgroundColor: "#fff",
              "& fieldset": {
                borderColor: "transparent",
              },
              "&:hover fieldset": {
                borderColor: "transparent",
              },
              "&.Mui-focused fieldset": {
                borderColor: "transparent",
              },
            },
          }}
        />
        <IconButton
          color="primary"
          onClick={handleSendMessage}
          disabled={(!messageText.trim() && files.length === 0) || sending}
          sx={{
            backgroundColor: "#00a884",
            color: "#fff",
            "&:hover": {
              backgroundColor: "#008f73",
            },
            "&.Mui-disabled": {
              backgroundColor: "#e0e0e0",
              color: "#a6a6a6",
            },
          }}
        >
          {sending ? <CircularProgress size={24} color="inherit" /> : <SendIcon />}
        </IconButton>
      </Paper>
    </Box>
  )
}

export default ConversationPage
