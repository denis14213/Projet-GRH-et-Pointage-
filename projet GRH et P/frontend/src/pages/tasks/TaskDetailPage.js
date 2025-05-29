"use client"

import { useState, useEffect, useRef } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  Box,
  Button,
  Typography,
  Paper,
  Grid,
  Chip,
  Avatar,
  Divider,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
} from "@mui/material"
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  Assignment as AssignmentIcon,
  CalendarToday as CalendarIcon,
  AccessTime as AccessTimeIcon,
  Business as BusinessIcon,
  Flag as FlagIcon,
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  Comment as CommentIcon,
  InsertDriveFile as FileIcon,
  Download as DownloadIcon,
} from "@mui/icons-material"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import axios from "axios"
import { API_URL } from "../../config"
import { useNotification } from "../../contexts/NotificationContext"
import { useAuth } from "../../contexts/AuthContext"
import PageHeader from "../../components/common/PageHeader"

// Page de détail d'une tâche
const TaskDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showNotification } = useNotification()
  const { user } = useAuth()

  // États
  const [task, setTask] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [openStatusDialog, setOpenStatusDialog] = useState(false)
  const [newStatus, setNewStatus] = useState("")
  const [statusLoading, setStatusLoading] = useState(false)

  // Ajouter les états pour les commentaires et fichiers
  const [commentText, setCommentText] = useState("")
  const [files, setFiles] = useState([])
  const [commentLoading, setCommentLoading] = useState(false)
  const [fileLoading, setFileLoading] = useState(false)
  const fileInputRef = useRef(null)

  // Récupérer les détails de la tâche
  useEffect(() => {
    const fetchTask = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await axios.get(`${API_URL}/tasks/${id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        })

        setTask(response.data)
      } catch (error) {
        console.error("Erreur lors de la récupération de la tâche:", error)
        setError("Erreur lors de la récupération de la tâche. Veuillez réessayer.")
      } finally {
        setLoading(false)
      }
    }

    fetchTask()
  }, [id])

  // Gérer l'ouverture de la boîte de dialogue de suppression
  const handleOpenDeleteDialog = () => {
    setOpenDeleteDialog(true)
  }

  // Gérer la fermeture de la boîte de dialogue de suppression
  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false)
  }

  // Supprimer la tâche
  const handleDelete = async () => {
    try {
      setLoading(true)

      await axios.delete(`${API_URL}/tasks/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      showNotification("success", "Tâche supprimée avec succès")
      navigate("/tasks")
    } catch (error) {
      console.error("Erreur lors de la suppression de la tâche:", error)
      setError("Erreur lors de la suppression de la tâche. Veuillez réessayer.")
      showNotification("error", "Erreur lors de la suppression de la tâche")
    } finally {
      setLoading(false)
      setOpenDeleteDialog(false)
    }
  }

  // Gérer l'ouverture de la boîte de dialogue de changement de statut
  const handleOpenStatusDialog = (status) => {
    setNewStatus(status)
    setOpenStatusDialog(true)
  }

  // Gérer la fermeture de la boîte de dialogue de changement de statut
  const handleCloseStatusDialog = () => {
    setOpenStatusDialog(false)
    setNewStatus("")
  }

  // Changer le statut d'une tâche
  const handleChangeStatus = async () => {
    if (!newStatus) return

    try {
      setStatusLoading(true)

      const response = await axios.put(
        `${API_URL}/tasks/${id}`,
        {
          statut: newStatus,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      )

      setTask({ ...task, statut: newStatus })
      showNotification("success", "Statut de la tâche mis à jour avec succès")
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut de la tâche:", error)
      setError("Erreur lors de la mise à jour du statut de la tâche. Veuillez réessayer.")
      showNotification("error", "Erreur lors de la mise à jour du statut de la tâche")
    } finally {
      setStatusLoading(false)
      handleCloseStatusDialog()
    }
  }

  // Vérifier si l'utilisateur est autorisé à modifier la tâche
  const canEdit = () => {
    if (!task || !user) return false

    return (
      user.role === "admin" ||
      task.creePar._id === user.id ||
      (user.role === "manager" && task.departement && task.departement.manager === user.id)
    )
  }

  // Vérifier si l'utilisateur est autorisé à supprimer la tâche
  const canDelete = () => {
    if (!task || !user) return false

    return user.role === "admin" || task.creePar._id === user.id
  }

  // Vérifier si l'utilisateur est assigné à la tâche
  const isAssigned = () => {
    if (!task || !user) return false

    // Les assistants peuvent changer le statut de n'importe quelle tâche
    if (user.role === "assistant" || "employee") return true

    // Les employés peuvent changer le statut s'ils sont assignés
    return task.assigneA._id === user.id
  }

  // Ajouter la fonction pour gérer l'upload de fichiers
  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files))
  }

  // Ajouter la fonction pour ajouter un commentaire
  const handleAddComment = async () => {
    if (!commentText.trim() && files.length === 0) return

    try {
      setCommentLoading(true)

      const formData = new FormData()
      formData.append("contenu", commentText)

      // Ajouter les fichiers s'il y en a
      files.forEach((file) => {
        formData.append("fichiers", file)
      })

      console.log("Envoi du commentaire avec les données:", {
        contenu: commentText,
        fichiers: files.map((f) => f.name),
      })

      const response = await axios.post(`${API_URL}/tasks/${id}/comments`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      console.log("Réponse du serveur:", response.data)

      // Mettre à jour la tâche avec le nouveau commentaire
      setTask({
        ...task,
        commentaires: [...(task.commentaires || []), response.data.comment],
      })

      // Réinitialiser le formulaire
      setCommentText("")
      setFiles([])

      showNotification("success", "Commentaire ajouté avec succès")
    } catch (error) {
      console.error("Erreur lors de l'ajout du commentaire:", error)
      setError(error.response?.data?.message || "Erreur lors de l'ajout du commentaire. Veuillez réessayer.")
    } finally {
      setCommentLoading(false)
    }
  }

  // Ajouter la fonction pour ajouter des fichiers
  const handleAddFiles = async () => {
    if (files.length === 0) return

    try {
      setFileLoading(true)

      const formData = new FormData()

      // Ajouter les fichiers
      files.forEach((file) => {
        formData.append("fichiers", file)
      })

      console.log(
        "Envoi des fichiers:",
        files.map((f) => f.name),
      )

      const response = await axios.post(`${API_URL}/tasks/${id}/files`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      console.log("Réponse du serveur:", response.data)

      // Mettre à jour la tâche avec les nouveaux fichiers
      setTask({
        ...task,
        fichiers: [...(task.fichiers || []), ...response.data.files],
      })

      // Réinitialiser le formulaire
      setFiles([])

      showNotification("success", "Fichiers ajoutés avec succès")
    } catch (error) {
      console.error("Erreur lors de l'ajout des fichiers:", error)
      setError(error.response?.data?.message || "Erreur lors de l'ajout des fichiers. Veuillez réessayer.")
    } finally {
      setFileLoading(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ mt: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    )
  }

  if (!task) {
    return (
      <Box sx={{ mt: 3 }}>
        <Alert severity="info">Tâche non trouvée</Alert>
      </Box>
    )
  }

  // Obtenir le statut formaté
  const getStatusChip = () => {
    let color
    let label
    let icon

    switch (task.statut) {
      case "a_faire":
        color = "default"
        label = "À faire"
        icon = <AssignmentIcon fontSize="small" />
        break
      case "en_cours":
        color = "primary"
        label = "En cours"
        icon = <PlayArrowIcon fontSize="small" />
        break
      case "en_revue":
        color = "warning"
        label = "En revue"
        icon = <PauseIcon fontSize="small" />
        break
      case "terminee":
        color = "success"
        label = "Terminée"
        icon = <CheckCircleIcon fontSize="small" />
        break
      default:
        color = "default"
        label = task.statut
        icon = null
    }

    return <Chip label={label} color={color} size="small" icon={icon} sx={{ "& .MuiChip-icon": { ml: 0.5 } }} />
  }

  // Obtenir la priorité formatée
  const getPriorityChip = () => {
    let color
    let label

    switch (task.priorite) {
      case "basse":
        color = "success"
        label = "Basse"
        break
      case "moyenne":
        color = "info"
        label = "Moyenne"
        break
      case "haute":
        color = "warning"
        label = "Haute"
        break
      case "urgente":
        color = "error"
        label = "Urgente"
        break
      default:
        color = "default"
        label = task.priorite
    }

    return <Chip label={label} color={color} size="small" />
  }

  return (
    <Box>
      <PageHeader
        title={task.titre}
        subtitle="Détails de la tâche"
        breadcrumbs={[
          { label: "Tâches", link: "/tasks" },
          { label: task.titre, link: `/tasks/${id}` },
        ]}
        action={
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button variant="outlined" onClick={() => navigate("/tasks")}>
              Retour à la liste
            </Button>
            {canEdit() && (
              <Button
                variant="outlined"
                color="primary"
                startIcon={<EditIcon />}
                onClick={() => navigate(`/tasks/${id}/edit`)}
              >
                Modifier
              </Button>
            )}
            {canDelete() && (
              <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={handleOpenDeleteDialog}>
                Supprimer
              </Button>
            )}
          </Box>
        }
      />

      <Paper sx={{ p: 3, borderRadius: 2, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)", mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h5">{task.titre}</Typography>
              <Box>
                {getStatusChip()}
                {isAssigned() && task.statut !== "terminee" && (
                  <Box sx={{ display: "inline-flex", ml: 2 }}>
                    {task.statut === "a_faire" && (
                      <Tooltip title="Démarrer">
                        <IconButton color="primary" size="small" onClick={() => handleOpenStatusDialog("en_cours")}>
                          <PlayArrowIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    {task.statut === "en_cours" && (
                      <Tooltip title="Mettre en revue">
                        <IconButton color="warning" size="small" onClick={() => handleOpenStatusDialog("en_revue")}>
                          <PauseIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    {task.statut === "en_revue" && (
                      <Tooltip title="Terminer">
                        <IconButton color="success" size="small" onClick={() => handleOpenStatusDialog("terminee")}>
                          <CheckCircleIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                )}
              </Box>
            </Box>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid item xs={12} md={8}>
            <Typography variant="h6" gutterBottom>
              Description
            </Typography>
            <Typography variant="body1" sx={{ whiteSpace: "pre-line", mb: 3 }}>
              {task.description}
            </Typography>

            <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
              <FlagIcon sx={{ mr: 1, color: "text.secondary" }} />
              <Typography variant="body2" sx={{ mr: 1 }}>
                Priorité:
              </Typography>
              {getPriorityChip()}
            </Box>

            {task.dateEcheance && (
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <CalendarIcon sx={{ mr: 1, color: "text.secondary" }} />
                <Typography variant="body2">
                  Date d'échéance: {format(new Date(task.dateEcheance), "dd MMMM yyyy", { locale: fr })}
                </Typography>
              </Box>
            )}

            <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
              <AccessTimeIcon sx={{ mr: 1, color: "text.secondary" }} />
              <Typography variant="body2">
                Créée le: {format(new Date(task.dateCreation), "dd MMMM yyyy à HH:mm", { locale: fr })}
              </Typography>
            </Box>

            {task.derniereMiseAJour && (
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <AccessTimeIcon sx={{ mr: 1, color: "text.secondary" }} />
                <Typography variant="body2">
                  Dernière mise à jour:{" "}
                  {format(new Date(task.derniereMiseAJour), "dd MMMM yyyy à HH:mm", { locale: fr })}
                </Typography>
              </Box>
            )}
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, borderRadius: 2, bgcolor: "background.default" }}>
              <Typography variant="h6" gutterBottom>
                Informations
              </Typography>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Assigné à
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
                  <Avatar
                    src={task.assigneA.photoProfil ? `${API_URL.replace("/api", "")}${task.assigneA.photoProfil}` : ""}
                    alt={`${task.assigneA.prenom} ${task.assigneA.nom}`}
                    sx={{ width: 32, height: 32, mr: 1 }}
                  >
                    {task.assigneA.prenom?.charAt(0)}
                    {task.assigneA.nom?.charAt(0)}
                  </Avatar>
                  <Typography variant="body2">
                    {task.assigneA.prenom} {task.assigneA.nom}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Créée par
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
                  <Avatar
                    src={task.creePar.photoProfil ? `${API_URL.replace("/api", "")}${task.creePar.photoProfil}` : ""}
                    alt={`${task.creePar.prenom} ${task.creePar.nom}`}
                    sx={{ width: 32, height: 32, mr: 1 }}
                  >
                    {task.creePar.prenom?.charAt(0)}
                    {task.creePar.nom?.charAt(0)}
                  </Avatar>
                  <Typography variant="body2">
                    {task.creePar.prenom} {task.creePar.nom}
                  </Typography>
                </Box>
              </Box>

              {task.departement && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Département
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
                    <BusinessIcon sx={{ mr: 1, fontSize: 20 }} />
                    <Typography variant="body2">{task.departement.nom}</Typography>
                  </Box>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Section des fichiers */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3, borderRadius: 2, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)", mb: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="h6">
                  <FileIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                  Fichiers
                </Typography>
                <Button variant="outlined" startIcon={<AttachFileIcon />} onClick={() => fileInputRef.current.click()}>
                  Ajouter des fichiers
                </Button>
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
              </Box>
              <Divider sx={{ mb: 2 }} />

              {files.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Fichiers sélectionnés:
                  </Typography>
                  <List dense>
                    {files.map((file, index) => (
                      <ListItem key={index}>
                        <ListItemAvatar>
                          <Avatar>
                            <FileIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText primary={file.name} secondary={`${(file.size / 1024).toFixed(2)} KB`} />
                      </ListItem>
                    ))}
                  </List>
                  <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
                    <Button
                      variant="contained"
                      onClick={handleAddFiles}
                      disabled={fileLoading}
                      startIcon={fileLoading ? <CircularProgress size={20} /> : <SendIcon />}
                    >
                      {fileLoading ? "Envoi en cours..." : "Envoyer les fichiers"}
                    </Button>
                  </Box>
                </Box>
              )}

              {task.fichiers && task.fichiers.length > 0 ? (
                <List>
                  {task.fichiers.map((file, index) => (
                    <ListItem key={index} divider={index < task.fichiers.length - 1}>
                      <ListItemAvatar>
                        <Avatar>
                          <FileIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={file.nom}
                        secondary={
                          <>
                            <Typography variant="body2" component="span">
                              Ajouté par {file.ajoutePar?.prenom} {file.ajoutePar?.nom} le{" "}
                              {format(new Date(file.dateAjout), "dd MMMM yyyy à HH:mm", { locale: fr })}
                            </Typography>
                          </>
                        }
                      />
                      <Tooltip title="Télécharger">
                        <IconButton
                          edge="end"
                          color="primary"
                          component="a"
                          href={`${API_URL.replace("/api", "")}${file.url}`}
                          target="_blank"
                          download
                        >
                          <DownloadIcon />
                        </IconButton>
                      </Tooltip>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 2 }}>
                  Aucun fichier attaché à cette tâche
                </Typography>
              )}
            </Paper>
          </Grid>

          {/* Section des commentaires */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3, borderRadius: 2, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)" }}>
              <Typography variant="h6" gutterBottom>
                <CommentIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                Commentaires
              </Typography>
              <Divider sx={{ mb: 2 }} />

              {task.commentaires && task.commentaires.length > 0 ? (
                <List>
                  {task.commentaires.map((comment, index) => (
                    <ListItem
                      key={index}
                      alignItems="flex-start"
                      divider={index < task.commentaires.length - 1}
                      sx={{ flexDirection: "column" }}
                    >
                      <Box sx={{ display: "flex", width: "100%", mb: 1 }}>
                        <ListItemAvatar>
                          <Avatar
                            src={
                              comment.utilisateur?.photoProfil
                                ? `${API_URL.replace("/api", "")}${comment.utilisateur.photoProfil}`
                                : ""
                            }
                            alt={`${comment.utilisateur?.prenom} ${comment.utilisateur?.nom}`}
                          >
                            {comment.utilisateur?.prenom?.charAt(0)}
                            {comment.utilisateur?.nom?.charAt(0)}
                          </Avatar>
                        </ListItemAvatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle2">
                            {comment.utilisateur?.prenom} {comment.utilisateur?.nom}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {format(new Date(comment.date), "dd MMMM yyyy à HH:mm", { locale: fr })}
                          </Typography>
                          <Typography variant="body2" sx={{ mt: 1, whiteSpace: "pre-wrap" }}>
                            {comment.contenu}
                          </Typography>
                        </Box>
                      </Box>

                      {comment.fichiers && comment.fichiers.length > 0 && (
                        <Box sx={{ pl: 7, width: "100%" }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Fichiers joints:
                          </Typography>
                          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                            {comment.fichiers.map((file, fileIndex) => (
                              <Button
                                key={fileIndex}
                                variant="outlined"
                                size="small"
                                startIcon={<FileIcon />}
                                component="a"
                                href={`${API_URL.replace("/api", "")}${file.url}`}
                                target="_blank"
                                download
                              >
                                {file.nom}
                              </Button>
                            ))}
                          </Box>
                        </Box>
                      )}
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 2 }}>
                  Aucun commentaire pour cette tâche
                </Typography>
              )}

              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Ajouter un commentaire
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="Écrivez votre commentaire ici..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  sx={{ mb: 2 }}
                />
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Button
                    variant="outlined"
                    startIcon={<AttachFileIcon />}
                    onClick={() => fileInputRef.current.click()}
                  >
                    Joindre des fichiers
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={commentLoading ? <CircularProgress size={20} /> : <SendIcon />}
                    onClick={handleAddComment}
                    disabled={(!commentText.trim() && files.length === 0) || commentLoading}
                  >
                    {commentLoading ? "Envoi en cours..." : "Envoyer"}
                  </Button>
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* Section de l'historique */}
          {task.historique && task.historique.length > 0 && (
            <Grid item xs={12}>
              <Paper sx={{ p: 3, borderRadius: 2, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)", mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  <AccessTimeIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                  Historique
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <List dense>
                  {task.historique.map((event, index) => (
                    <ListItem key={index} divider={index < task.historique.length - 1}>
                      <ListItemAvatar>
                        <Avatar
                          src={
                            event.utilisateur?.photoProfil
                              ? `${API_URL.replace("/api", "")}${event.utilisateur.photoProfil}`
                              : ""
                          }
                          alt={`${event.utilisateur?.prenom} ${event.utilisateur?.nom}`}
                        >
                          {event.utilisateur?.prenom?.charAt(0)}
                          {event.utilisateur?.nom?.charAt(0)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={`${event.action}: ${event.ancienStatut} → ${event.nouveauStatut}`}
                        secondary={`${event.utilisateur?.prenom} ${event.utilisateur?.nom} - ${format(new Date(event.date), "dd MMMM yyyy à HH:mm", { locale: fr })}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* Boîte de dialogue de suppression */}
      <Dialog
        open={openDeleteDialog}
        onClose={handleCloseDeleteDialog}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">Confirmer la suppression</DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Êtes-vous sûr de vouloir supprimer la tâche "{task.titre}" ? Cette action est irréversible.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="primary">
            Annuler
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : "Supprimer"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Boîte de dialogue de changement de statut */}
      <Dialog
        open={openStatusDialog}
        onClose={handleCloseStatusDialog}
        aria-labelledby="status-dialog-title"
        aria-describedby="status-dialog-description"
      >
        <DialogTitle id="status-dialog-title">Changer le statut</DialogTitle>
        <DialogContent>
          <DialogContentText id="status-dialog-description">
            Êtes-vous sûr de vouloir changer le statut de la tâche "{task.titre}" ?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseStatusDialog} color="primary">
            Annuler
          </Button>
          <Button onClick={handleChangeStatus} color="primary" variant="contained" disabled={statusLoading}>
            {statusLoading ? <CircularProgress size={24} /> : "Confirmer"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default TaskDetailPage
