"use client"

import { useState, useEffect, useRef } from "react"
import {
  Box,
  Typography,
  Paper,
  TextField,
  IconButton,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  CircularProgress,
  Alert,
  Drawer,
  Tooltip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material"
import {
  Send as SendIcon,
  ChatBubbleOutline as ChatIcon,
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Close as CloseIcon,
  SmartToy as BotIcon,
  Person as PersonIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material"
import axios from "axios"
import { API_URL } from "../../config"
import { useAuth } from "../../contexts/AuthContext"
import { useNotification } from "../../contexts/NotificationContext"
import PageHeader from "../../components/common/PageHeader"
import { format } from "date-fns"
import ReactMarkdown from "react-markdown"

// Page de l'assistant IA
const AssistantPage = () => {
  const { user } = useAuth()
  const { showNotification } = useNotification()
  const [conversations, setConversations] = useState([])
  const [currentConversation, setCurrentConversation] = useState(null)
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingConversations, setLoadingConversations] = useState(false)
  const [error, setError] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)
  const [menuAnchorEl, setMenuAnchorEl] = useState(null)
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [newTitle, setNewTitle] = useState("")

  // Référence pour faire défiler jusqu'au dernier message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [currentConversation])

  // Récupérer les conversations
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoadingConversations(true)
        setError(null)

        const token = localStorage.getItem("token")
        if (!token) {
          setError("Session expirée. Veuillez vous reconnecter.")
          setLoadingConversations(false)
          return
        }

        const response = await axios.get(`${API_URL}/ai/conversations`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        setConversations(response.data)

        // Si des conversations existent et qu'aucune n'est sélectionnée, sélectionner la première
        if (response.data.length > 0 && !currentConversation) {
          await fetchConversation(response.data[0]._id)
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des conversations:", error)
        if (error.response) {
          setError(`Erreur: ${error.response.data.message || "Problème lors de la récupération des conversations"}`)
        } else if (error.request) {
          setError("Aucune réponse du serveur. Vérifiez votre connexion.")
        } else {
          setError("Erreur lors de la récupération des conversations")
        }
      } finally {
        setLoadingConversations(false)
      }
    }

    fetchConversations()
  }, [])

  // Récupérer une conversation spécifique
  const fetchConversation = async (conversationId) => {
    try {
      setLoading(true)
      setError(null)

      const token = localStorage.getItem("token")
      if (!token) {
        setError("Session expirée. Veuillez vous reconnecter.")
        setLoading(false)
        return
      }

      const response = await axios.get(`${API_URL}/ai/conversations/${conversationId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      setCurrentConversation(response.data)
    } catch (error) {
      console.error("Erreur lors de la récupération de la conversation:", error)
      if (error.response) {
        setError(`Erreur: ${error.response.data.message || "Problème lors de la récupération de la conversation"}`)
      } else if (error.request) {
        setError("Aucune réponse du serveur. Vérifiez votre connexion.")
      } else {
        setError("Erreur lors de la récupération de la conversation")
      }
    } finally {
      setLoading(false)
    }
  }

  // Créer une nouvelle conversation
  const createNewConversation = async () => {
    if (!message.trim()) {
      showNotification("warning", "Veuillez entrer un message")
      return
    }

    try {
      setSending(true)
      setError(null)

      const token = localStorage.getItem("token")
      if (!token) {
        setError("Session expirée. Veuillez vous reconnecter.")
        setSending(false)
        return
      }

      const response = await axios.post(
        `${API_URL}/ai/conversations`,
        { message },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      // Ajouter la nouvelle conversation à la liste
      setConversations((prev) => [response.data.conversation, ...prev])
      setCurrentConversation(response.data.conversation)
      setMessage("")
      showNotification("success", "Nouvelle conversation créée")
    } catch (error) {
      console.error("Erreur lors de la création de la conversation:", error)
      if (error.response) {
        setError(`Erreur: ${error.response.data.message || "Problème lors de la création de la conversation"}`)
      } else if (error.request) {
        setError("Aucune réponse du serveur. Vérifiez votre connexion.")
      } else {
        setError("Erreur lors de la création de la conversation")
      }
    } finally {
      setSending(false)
    }
  }

  // Envoyer un message dans la conversation actuelle
  const sendMessage = async () => {
    if (!message.trim() || !currentConversation) {
      showNotification("warning", "Veuillez entrer un message et sélectionner une conversation")
      return
    }

    try {
      setSending(true)
      setError(null)

      const token = localStorage.getItem("token")
      if (!token) {
        setError("Session expirée. Veuillez vous reconnecter.")
        setSending(false)
        return
      }

      const response = await axios.post(
        `${API_URL}/ai/conversations/${currentConversation._id}/messages`,
        { message },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      // Mettre à jour la conversation actuelle
      setCurrentConversation(response.data.conversation)

      // Mettre à jour la liste des conversations
      setConversations((prev) =>
        prev.map((conv) => (conv._id === response.data.conversation._id ? response.data.conversation : conv)),
      )

      setMessage("")
    } catch (error) {
      console.error("Erreur lors de l'envoi du message:", error)
      if (error.response) {
        // Gérer spécifiquement les erreurs d'autorisation
        if (error.response.status === 403) {
          setError("Erreur d'autorisation: Vous n'avez pas les droits nécessaires pour cette conversation")
          // Rafraîchir la liste des conversations pour éviter d'autres erreurs
          const token = localStorage.getItem("token")
          if (token) {
            try {
              const response = await axios.get(`${API_URL}/ai/conversations`, {
                headers: { Authorization: `Bearer ${token}` },
              })
              setConversations(response.data)
              // Réinitialiser la conversation courante
              setCurrentConversation(null)
            } catch (refreshError) {
              console.error("Erreur lors du rafraîchissement des conversations:", refreshError)
            }
          }
        } else {
          setError(`Erreur: ${error.response.data.message || "Problème lors de l'envoi du message"}`)
        }
      } else if (error.request) {
        setError("Aucune réponse du serveur. Vérifiez votre connexion.")
      } else {
        setError("Erreur lors de l'envoi du message")
      }
    }
  }

  // Gérer l'appui sur la touche Entrée
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (currentConversation) {
        sendMessage()
      } else {
        createNewConversation()
      }
    }
  }

  // Ouvrir le menu contextuel
  const handleMenuOpen = (event, conversation) => {
    event.stopPropagation()
    setMenuAnchorEl(event.currentTarget)
    setSelectedConversation(conversation)
  }

  // Fermer le menu contextuel
  const handleMenuClose = () => {
    setMenuAnchorEl(null)
  }

  // Supprimer une conversation
  const handleDeleteConversation = async () => {
    if (!selectedConversation) return

    try {
      setLoadingConversations(true)
      setError(null)

      const token = localStorage.getItem("token")
      if (!token) {
        setError("Session expirée. Veuillez vous reconnecter.")
        setLoadingConversations(false)
        return
      }

      await axios.delete(`${API_URL}/ai/conversations/${selectedConversation._id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      // Supprimer la conversation de la liste
      setConversations((prev) => prev.filter((conv) => conv._id !== selectedConversation._id))

      // Si la conversation supprimée était la conversation actuelle, réinitialiser
      if (currentConversation && currentConversation._id === selectedConversation._id) {
        setCurrentConversation(null)
      }

      showNotification("success", "Conversation supprimée avec succès")
    } catch (error) {
      console.error("Erreur lors de la suppression de la conversation:", error)
      if (error.response) {
        setError(`Erreur: ${error.response.data.message || "Problème lors de la suppression de la conversation"}`)
      } else if (error.request) {
        setError("Aucune réponse du serveur. Vérifiez votre connexion.")
      } else {
        setError("Erreur lors de la suppression de la conversation")
      }
    } finally {
      setLoadingConversations(false)
      handleMenuClose()
    }
  }

  // Ouvrir la boîte de dialogue de renommage
  const handleOpenRenameDialog = () => {
    if (!selectedConversation) return
    setNewTitle(selectedConversation.titre)
    setRenameDialogOpen(true)
    handleMenuClose()
  }

  // Renommer une conversation
  const handleRenameConversation = async () => {
    if (!selectedConversation || !newTitle.trim()) return

    try {
      setLoadingConversations(true)
      setError(null)

      const token = localStorage.getItem("token")
      if (!token) {
        setError("Session expirée. Veuillez vous reconnecter.")
        setLoadingConversations(false)
        return
      }

      const response = await axios.put(
        `${API_URL}/ai/conversations/${selectedConversation._id}`,
        { titre: newTitle },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      // Mettre à jour la conversation dans la liste
      setConversations((prev) =>
        prev.map((conv) => (conv._id === selectedConversation._id ? response.data.conversation : conv)),
      )

      // Si la conversation renommée était la conversation actuelle, mettre à jour
      if (currentConversation && currentConversation._id === selectedConversation._id) {
        setCurrentConversation(response.data.conversation)
      }

      showNotification("success", "Conversation renommée avec succès")
    } catch (error) {
      console.error("Erreur lors du renommage de la conversation:", error)
      if (error.response) {
        setError(`Erreur: ${error.response.data.message || "Problème lors du renommage de la conversation"}`)
      } else if (error.request) {
        setError("Aucune réponse du serveur. Vérifiez votre connexion.")
      } else {
        setError("Erreur lors du renommage de la conversation")
      }
    } finally {
      setLoadingConversations(false)
      setRenameDialogOpen(false)
    }
  }

  // Formater la date
  const formatDate = (date) => {
    return format(new Date(date), "dd/MM/yyyy HH:mm")
  }

  return (
    <Box sx={{ height: "calc(100vh - 100px)", display: "flex", flexDirection: "column" }}>
      <PageHeader
        title="Assistant RH"
        subtitle="Posez vos questions sur les congés, les tâches et plus encore"
        breadcrumbs={[{ label: "Assistant RH", link: "/ai-assistant" }]}
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setCurrentConversation(null)
              setMessage("")
            }}
          >
            Nouvelle conversation
          </Button>
        }
      />

      <Box sx={{ display: "flex", flex: 1, mt: 2 }}>
        {/* Tiroir des conversations */}
        <Drawer
          variant="persistent"
          anchor="left"
          open={drawerOpen}
          sx={{
            width: 320,
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: 320,
              position: "relative",
              height: "calc(100vh - 180px)",
              border: "1px solid rgba(0, 0, 0, 0.12)",
              borderRadius: 2,
            },
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 2 }}>
            <Typography variant="h6">Conversations</Typography>
            <IconButton onClick={() => setDrawerOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
          <Divider />

          <Box sx={{ p: 2 }}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => {
                setCurrentConversation(null)
                setMessage("")
              }}
            >
              Nouvelle conversation
            </Button>
          </Box>

          <List sx={{ overflow: "auto", flex: 1 }}>
            {loadingConversations ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                <CircularProgress />
              </Box>
            ) : conversations.length === 0 ? (
              <Box sx={{ p: 3, textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary">
                  Aucune conversation
                </Typography>
              </Box>
            ) : (
              conversations.map((conversation) => (
                <ListItem
                  key={conversation._id}
                  button
                  selected={currentConversation && currentConversation._id === conversation._id}
                  onClick={() => fetchConversation(conversation._id)}
                  secondaryAction={
                    <IconButton edge="end" onClick={(e) => handleMenuOpen(e, conversation)}>
                      <MoreVertIcon />
                    </IconButton>
                  }
                >
                  <ListItemAvatar>
                    <Avatar>
                      <ChatIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={conversation.titre}
                    secondary={format(new Date(conversation.derniereMiseAJour), "dd/MM/yyyy HH:mm")}
                    primaryTypographyProps={{
                      noWrap: true,
                      style: { maxWidth: "180px" },
                    }}
                  />
                </ListItem>
              ))
            )}
          </List>
        </Drawer>

        {/* Zone principale */}
        <Box
          sx={{
            flex: 1,
            ml: drawerOpen ? 2 : 0,
            display: "flex",
            flexDirection: "column",
            height: "calc(100vh - 180px)",
          }}
        >
          {!drawerOpen && (
            <Button
              variant="outlined"
              startIcon={<ChatIcon />}
              onClick={() => setDrawerOpen(true)}
              sx={{ mb: 2, alignSelf: "flex-start" }}
            >
              Afficher les conversations
            </Button>
          )}

          <Paper
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            {/* En-tête */}
            <Box
              sx={{
                p: 2,
                borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="h6">
                {currentConversation ? currentConversation.titre : "Nouvelle conversation"}
              </Typography>
              {currentConversation && (
                <Tooltip title="Rafraîchir">
                  <IconButton onClick={() => fetchConversation(currentConversation._id)}>
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Box>

            {/* Zone des messages */}
            <Box
              sx={{
                flex: 1,
                overflow: "auto",
                p: 2,
                backgroundColor: "#f5f5f5",
              }}
            >
              {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                  <CircularProgress />
                </Box>
              ) : error ? (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              ) : !currentConversation ? (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100%",
                  }}
                >
                  <BotIcon sx={{ fontSize: 60, color: "primary.main", mb: 2 }} />
                  <Typography variant="h6">Assistant RH</Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mt: 1, textAlign: "center" }}>
                    Posez vos questions sur les congés, les tâches, ou toute autre question RH.
                  </Typography>
                </Box>
              ) : currentConversation.messages.length === 0 ? (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100%",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Aucun message dans cette conversation
                  </Typography>
                </Box>
              ) : (
                currentConversation.messages.map((msg, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: "flex",
                      mb: 2,
                      flexDirection: msg.role === "user" ? "row-reverse" : "row",
                    }}
                  >
                    <Avatar
                      sx={{
                        bgcolor: msg.role === "user" ? "primary.main" : "secondary.main",
                        ml: msg.role === "user" ? 1 : 0,
                        mr: msg.role === "user" ? 0 : 1,
                      }}
                    >
                      {msg.role === "user" ? <PersonIcon /> : <BotIcon />}
                    </Avatar>
                    <Paper
                      sx={{
                        p: 2,
                        maxWidth: "70%",
                        borderRadius: 2,
                        backgroundColor: msg.role === "user" ? "primary.light" : "white",
                        color: msg.role === "user" ? "white" : "text.primary",
                      }}
                    >
                      {msg.role === "assistant" ? (
                        <Box sx={{ "& p": { mt: 0, mb: 1 } }}>
                          <ReactMarkdown>{msg.contenu}</ReactMarkdown>
                        </Box>
                      ) : (
                        <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
                          {msg.contenu}
                        </Typography>
                      )}
                      <Typography
                        variant="caption"
                        color={msg.role === "user" ? "rgba(255,255,255,0.7)" : "text.secondary"}
                      >
                        {formatDate(msg.date)}
                      </Typography>
                    </Paper>
                  </Box>
                ))
              )}
              <div ref={messagesEndRef} />
            </Box>

            {/* Zone de saisie */}
            <Box sx={{ p: 2, borderTop: "1px solid rgba(0, 0, 0, 0.12)" }}>
              <Box sx={{ display: "flex" }}>
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Posez votre question..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  multiline
                  maxRows={4}
                  disabled={sending}
                />
                <Button
                  variant="contained"
                  color="primary"
                  endIcon={sending ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                  onClick={currentConversation ? sendMessage : createNewConversation}
                  disabled={!message.trim() || sending}
                  sx={{ ml: 1, height: 56 }}
                >
                  Envoyer
                </Button>
              </Box>
            </Box>
          </Paper>
        </Box>
      </Box>

      {/* Menu contextuel pour les conversations */}
      <Menu anchorEl={menuAnchorEl} open={Boolean(menuAnchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={handleOpenRenameDialog}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Renommer
        </MenuItem>
        <MenuItem onClick={handleDeleteConversation}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Supprimer
        </MenuItem>
      </Menu>

      {/* Boîte de dialogue pour renommer une conversation */}
      <Dialog open={renameDialogOpen} onClose={() => setRenameDialogOpen(false)}>
        <DialogTitle>Renommer la conversation</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nouveau titre"
            fullWidth
            variant="outlined"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameDialogOpen(false)}>Annuler</Button>
          <Button onClick={handleRenameConversation} variant="contained">
            Renommer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default AssistantPage
