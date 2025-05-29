"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Divider,
  Paper,
  TextField,
  InputAdornment,
  IconButton,
  Badge,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material"
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Refresh as RefreshIcon,
  Message as MessageIcon,
} from "@mui/icons-material"
import axios from "axios"
import { API_URL } from "../../config"
import PageHeader from "../../components/common/PageHeader"
import { useNotification } from "../../contexts/NotificationContext"
import { format } from "date-fns"
import { useAuth } from "../../contexts/AuthContext"

// Page de messagerie
const MessagesPage = () => {
  const navigate = useNavigate()
  const { showNotification } = useNotification()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const { user } = useAuth()

  // Ajouter un état pour gérer la boîte de dialogue de sélection d'utilisateur
  const [openNewMessageDialog, setOpenNewMessageDialog] = useState(false)
  const [selectedUser, setSelectedUser] = useState("")
  const [filteredUsers, setFilteredUsers] = useState([])
  const [userSearchTerm, setUserSearchTerm] = useState("")

  // Récupérer les conversations
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true)
        setError(null)

        const token = localStorage.getItem("token")
        if (!token) {
          setError("Session expirée. Veuillez vous reconnecter.")
          setLoading(false)
          return
        }

        console.log("Récupération des conversations...")

        const response = await axios.get(`${API_URL}/messages/conversations`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        console.log(`${response.data.length} conversations récupérées`)
        setConversations(response.data)
      } catch (error) {
        console.error("Erreur lors de la récupération des conversations:", error)

        if (error.response) {
          setError(`Erreur: ${error.response.data.message || "Problème lors de la récupération des conversations"}`)
        } else if (error.request) {
          setError("Aucune réponse du serveur. Vérifiez votre connexion.")
        } else {
          setError("Erreur lors de la récupération des conversations. Veuillez réessayer.")
        }
      } finally {
        setLoading(false)
      }
    }

    fetchConversations()
  }, [])

  // Modifier la fonction fetchUsers pour filtrer les utilisateurs et mettre à jour l'état
  const fetchUsers = async () => {
    try {
      setLoadingUsers(true)

      const token = localStorage.getItem("token")
      if (!token) {
        showNotification("error", "Session expirée. Veuillez vous reconnecter.")
        setLoadingUsers(false)
        return
      }

      console.log("Récupération de la liste des utilisateurs...")

      const response = await axios.get(`${API_URL}/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      console.log(`${response.data.length} utilisateurs récupérés`)

      // Filtrer pour exclure l'utilisateur actuel
      const otherUsers = response.data.filter((u) => u._id !== user.id)
      console.log(`${otherUsers.length} autres utilisateurs disponibles pour la messagerie`)

      setUsers(otherUsers)
      setFilteredUsers(otherUsers)
      setOpenNewMessageDialog(true)
    } catch (error) {
      console.error("Erreur lors de la récupération des utilisateurs:", error)

      if (error.response) {
        console.error("Détails de l'erreur:", error.response.data)
        showNotification(
          "error",
          `Erreur: ${error.response.data.message || "Problème lors de la récupération des utilisateurs"}`,
        )
      } else if (error.request) {
        showNotification("error", "Aucune réponse du serveur. Vérifiez votre connexion.")
      } else {
        showNotification("error", "Erreur lors de la récupération des utilisateurs")
      }
    } finally {
      setLoadingUsers(false)
    }
  }

  // Ajouter une fonction pour filtrer les utilisateurs lors de la recherche
  const handleUserSearch = (e) => {
    const searchTerm = e.target.value
    setUserSearchTerm(searchTerm)

    if (!searchTerm.trim()) {
      setFilteredUsers(users)
      return
    }

    const filtered = users.filter(
      (user) =>
        user.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()),
    )

    setFilteredUsers(filtered)
  }

  // Ajouter une fonction pour gérer la fermeture de la boîte de dialogue
  const handleCloseNewMessageDialog = () => {
    setOpenNewMessageDialog(false)
    setSelectedUser("")
    setUserSearchTerm("")
  }

  // Ajouter une fonction pour démarrer une nouvelle conversation
  const handleStartConversation = () => {
    if (!selectedUser) {
      showNotification("error", "Veuillez sélectionner un utilisateur valide")
      return
    }

    // Vérifier que l'ID est valide avant de naviguer
    if (!/^[0-9a-fA-F]{24}$/.test(selectedUser)) {
      showNotification("error", "ID d'utilisateur invalide")
      return
    }

    console.log("Démarrage d'une conversation avec l'utilisateur:", selectedUser)
    handleCloseNewMessageDialog()
    navigate(`/messages/${selectedUser}`)
  }

  // Filtrer les conversations
  const filteredConversations = conversations.filter((conversation) => {
    if (!searchTerm) return true
    const user = conversation.utilisateur
    return (
      user.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  // Rafraîchir les conversations
  const handleRefresh = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = localStorage.getItem("token")
      if (!token) {
        setError("Session expirée. Veuillez vous reconnecter.")
        setLoading(false)
        return
      }

      console.log("Rafraîchissement de la liste des conversations...")

      const response = await axios.get(`${API_URL}/messages/conversations`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      console.log(`${response.data.length} conversations récupérées`)
      setConversations(response.data)
    } catch (error) {
      console.error("Erreur lors de la récupération des conversations:", error)

      if (error.response) {
        console.error("Détails de l'erreur:", error.response.data)
        setError(
          `Erreur (${error.response.status}): ${error.response.data.message || "Erreur lors de la récupération des conversations"}`,
        )
      } else if (error.request) {
        setError("Aucune réponse reçue du serveur. Vérifiez votre connexion internet.")
      } else {
        setError("Erreur lors de la récupération des conversations. Veuillez réessayer.")
      }
    } finally {
      setLoading(false)
    }
  }

  // Ouvrir une conversation
  const handleOpenConversation = (userId) => {
    navigate(`/messages/${userId}`)
  }

  // Formater la date du dernier message
  const formatLastMessageDate = (date) => {
    const messageDate = new Date(date)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (messageDate.toDateString() === today.toDateString()) {
      return format(messageDate, "HH:mm")
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return "Hier"
    } else {
      return format(messageDate, "dd/MM/yyyy")
    }
  }

  // Tronquer le texte
  const truncateText = (text, maxLength = 50) => {
    if (!text) return ""
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + "..."
  }

  return (
    <Box>
      <PageHeader
        title="Messagerie"
        subtitle="Consultez et envoyez des messages"
        breadcrumbs={[{ label: "Messages", link: "/messages" }]}
        action={
          <Button variant="contained" startIcon={<MessageIcon />} onClick={fetchUsers}>
            Nouveau message
          </Button>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ borderRadius: 2, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)", height: "calc(100vh - 200px)" }}>
            <Box sx={{ p: 2 }}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Rechercher une conversation"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchTerm("")}>
                        <ClearIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                size="small"
              />
            </Box>
            <Divider />

            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 2, py: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Conversations
              </Typography>
              <IconButton size="small" onClick={handleRefresh} disabled={loading}>
                {loading ? <CircularProgress size={20} /> : <RefreshIcon fontSize="small" />}
              </IconButton>
            </Box>

            <Divider />

            <Box sx={{ overflow: "auto", height: "calc(100% - 120px)" }}>
              {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                  <CircularProgress />
                </Box>
              ) : filteredConversations.length === 0 ? (
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                  <Typography variant="body2" color="text.secondary">
                    Aucune conversation trouvée
                  </Typography>
                </Box>
              ) : (
                <List disablePadding>
                  {filteredConversations.map((conversation) => (
                    <ListItem
                      key={conversation.utilisateur._id}
                      button
                      divider
                      onClick={() => handleOpenConversation(conversation.utilisateur._id)}
                      sx={{
                        backgroundColor: conversation.nonLus > 0 ? "rgba(25, 118, 210, 0.05)" : "transparent",
                        "&:hover": {
                          backgroundColor: conversation.nonLus > 0 ? "rgba(25, 118, 210, 0.1)" : "rgba(0, 0, 0, 0.04)",
                        },
                      }}
                    >
                      <ListItemAvatar>
                        <Badge
                          color="primary"
                          badgeContent={conversation.nonLus}
                          invisible={conversation.nonLus === 0}
                          overlap="circular"
                        >
                          <Avatar
                            src={
                              conversation.utilisateur.photoProfil
                                ? `${API_URL.replace("/api", "")}${conversation.utilisateur.photoProfil}`
                                : ""
                            }
                            alt={`${conversation.utilisateur.prenom} ${conversation.utilisateur.nom}`}
                          >
                            {conversation.utilisateur.prenom?.charAt(0)}
                            {conversation.utilisateur.nom?.charAt(0)}
                          </Avatar>
                        </Badge>
                      </ListItemAvatar>
                      <ListItemText
                        primary={`${conversation.utilisateur.prenom} ${conversation.utilisateur.nom}`}
                        secondary={truncateText(conversation.dernierMessage?.contenu || "")}
                        primaryTypographyProps={{
                          fontWeight: conversation.nonLus > 0 ? "bold" : "normal",
                        }}
                        secondaryTypographyProps={{
                          fontWeight: conversation.nonLus > 0 ? "medium" : "normal",
                        }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {conversation.dernierMessage
                          ? formatLastMessageDate(conversation.dernierMessage.dateEnvoi)
                          : ""}
                      </Typography>
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={8}>
          <Paper
            sx={{
              borderRadius: 2,
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
              height: "calc(100vh - 200px)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <MessageIcon sx={{ fontSize: 60, color: "text.secondary", opacity: 0.3, mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              Sélectionnez une conversation
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Choisissez une conversation dans la liste ou démarrez une nouvelle conversation
            </Typography>
            <Button variant="outlined" startIcon={<MessageIcon />} sx={{ mt: 3 }} onClick={fetchUsers}>
              Nouveau message
            </Button>
          </Paper>
        </Grid>
      </Grid>

      {/* Boîte de dialogue pour sélectionner un utilisateur */}
      <Dialog open={openNewMessageDialog} onClose={handleCloseNewMessageDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Nouvelle conversation</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2, mt: 1 }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Rechercher un utilisateur"
              value={userSearchTerm}
              onChange={handleUserSearch}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: userSearchTerm && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setUserSearchTerm("")}>
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              size="small"
            />
          </Box>

          {loadingUsers ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
              <CircularProgress />
            </Box>
          ) : filteredUsers.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 3 }}>
              Aucun utilisateur trouvé
            </Typography>
          ) : (
            <List sx={{ maxHeight: "300px", overflow: "auto" }}>
              {filteredUsers.map((user) => (
                <ListItem
                  key={user._id}
                  button
                  selected={selectedUser === user._id}
                  onClick={() => setSelectedUser(user._id)}
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    "&.Mui-selected": {
                      backgroundColor: "rgba(25, 118, 210, 0.08)",
                    },
                    "&.Mui-selected:hover": {
                      backgroundColor: "rgba(25, 118, 210, 0.12)",
                    },
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      src={user.photoProfil ? `${API_URL.replace("/api", "")}${user.photoProfil}` : ""}
                      alt={`${user.prenom} ${user.nom}`}
                    >
                      {user.prenom?.charAt(0)}
                      {user.nom?.charAt(0)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText primary={`${user.prenom} ${user.nom}`} secondary={user.email} />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseNewMessageDialog}>Annuler</Button>
          <Button
            onClick={handleStartConversation}
            variant="contained"
            disabled={!selectedUser || loadingUsers}
            startIcon={<MessageIcon />}
          >
            Démarrer la conversation
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default MessagesPage
