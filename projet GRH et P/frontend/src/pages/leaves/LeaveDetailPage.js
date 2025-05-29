"use client"

import { useState, useEffect } from "react"
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
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Card,
  CardContent,
} from "@mui/material"
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  HourglassEmpty as HourglassEmptyIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  ArrowBack as ArrowBackIcon,
  CalendarMonth as CalendarIcon,
  AccessTime as AccessTimeIcon,
  EventNote as EventNoteIcon,
} from "@mui/icons-material"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import axios from "axios"
import { API_URL } from "../../config"
import PageHeader from "../../components/common/PageHeader"
import { useNotification } from "../../contexts/NotificationContext"
import { useAuth } from "../../contexts/AuthContext"

// Page de détail d'une demande de congé
const LeaveDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showNotification } = useNotification()
  const { user } = useAuth()

  const [leave, setLeave] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [openApproveDialog, setOpenApproveDialog] = useState(false)
  const [openRejectDialog, setOpenRejectDialog] = useState(false)
  const [comment, setComment] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  // Récupérer les détails de la demande de congé
  useEffect(() => {
    const fetchLeaveDetails = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await axios.get(`${API_URL}/leaves/${id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        })

        setLeave(response.data)
      } catch (error) {
        console.error("Erreur lors de la récupération des détails du congé:", error)
        setError("Erreur lors de la récupération des détails du congé. Veuillez réessayer.")
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchLeaveDetails()
    }
  }, [id])

  // Vérifier si l'utilisateur peut approuver/refuser la demande
  const canManageLeave = () => {
    if (!leave || !user) return false

    // Les administrateurs peuvent gérer toutes les demandes
    if (user.role === "admin" || user.role === "manager") return true

    // Les managers ne peuvent gérer que les demandes des membres de leur département
    if (user.role === "manager") {
      const employeeDept = leave.utilisateur?.departement?._id
      const managerDept = user.departement
      return employeeDept && managerDept && employeeDept === managerDept
    }

    return false
  }

  // Gérer l'ouverture de la boîte de dialogue d'approbation
  const handleOpenApproveDialog = () => {
    setComment("")
    setOpenApproveDialog(true)
  }

  // Gérer la fermeture de la boîte de dialogue d'approbation
  const handleCloseApproveDialog = () => {
    setOpenApproveDialog(false)
    setComment("")
  }

  // Gérer l'ouverture de la boîte de dialogue de refus
  const handleOpenRejectDialog = () => {
    setComment("")
    setOpenRejectDialog(true)
  }

  // Gérer la fermeture de la boîte de dialogue de refus
  const handleCloseRejectDialog = () => {
    setOpenRejectDialog(false)
    setComment("")
  }

  // Approuver une demande de congé
  const handleApproveLeave = async () => {
    try {
      setActionLoading(true)

      // Déterminer le statut en fonction du rôle de l'utilisateur
      const newStatus = user.role === "admin" ? "approuve" : "approuve_manager"

      // Vérifier si l'admin peut approuver définitivement
      if (user.role === "admin" && leave.statut !== "approuve_manager") {
        showNotification("error", "La demande doit d'abord être approuvée par un manager")
        setActionLoading(false)
        handleCloseApproveDialog()
        return
      }

      await axios.put(
        `${API_URL}/leaves/${id}/status`,
        {
          statut: newStatus,
          commentaire: comment,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      )

      // Mettre à jour l'état local
      setLeave({
        ...leave,
        statut: newStatus,
        commentaire: comment,
        approuvePar: user,
        dateApprobation: new Date(),
      })

      showNotification(
        "success",
        user.role === "admin"
          ? "Demande de congé définitivement approuvée avec succès"
          : "Demande de congé approuvée par le manager avec succès",
      )
      handleCloseApproveDialog()
    } catch (error) {
      console.error("Erreur lors de l'approbation de la demande de congé:", error)
      showNotification("error", "Erreur lors de l'approbation de la demande de congé")
    } finally {
      setActionLoading(false)
    }
  }

  // Refuser une demande de congé
  const handleRejectLeave = async () => {
    try {
      // Vérifier que le commentaire est fourni pour le refus
      if (!comment.trim()) {
        showNotification("error", "Un motif de refus est requis")
        return
      }

      setActionLoading(true)

      await axios.put(
        `${API_URL}/leaves/${id}/status`,
        {
          statut: "refuse",
          commentaire: comment,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      )

      // Mettre à jour l'état local
      setLeave({
        ...leave,
        statut: "refuse",
        commentaire: comment,
        approuvePar: user,
        dateApprobation: new Date(),
      })

      showNotification("success", "Demande de congé refusée avec succès")
      handleCloseRejectDialog()
    } catch (error) {
      console.error("Erreur lors du refus de la demande de congé:", error)
      showNotification("error", "Erreur lors du refus de la demande de congé")
    } finally {
      setActionLoading(false)
    }
  }

  // Annuler une demande de congé
  const handleCancelLeave = async () => {
    try {
      setActionLoading(true)

      await axios.delete(`${API_URL}/leaves/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      showNotification("success", "Demande de congé annulée avec succès")
      navigate("/leaves")
    } catch (error) {
      console.error("Erreur lors de l'annulation de la demande de congé:", error)
      showNotification("error", "Erreur lors de l'annulation de la demande de congé")
      setActionLoading(false)
    }
  }

  // Obtenir le statut formaté
  const getStatusChip = (status) => {
    let color
    let label
    let icon
    switch (status) {
      case "approuve":
        color = "success"
        label = "Approuvé"
        icon = <CheckCircleIcon fontSize="small" />
        break
      case "approuve_manager":
        color = "info"
        label = "Approuvé par manager"
        icon = <HourglassEmptyIcon fontSize="small" />
        break
      case "refuse":
        color = "error"
        label = "Refusé"
        icon = <CancelIcon fontSize="small" />
        break
      case "en_attente":
        color = "warning"
        label = "En attente"
        icon = <HourglassEmptyIcon fontSize="small" />
        break
      default:
        color = "default"
        label = status
        icon = null
    }
    return <Chip label={label} color={color} size="small" icon={icon} sx={{ "& .MuiChip-icon": { ml: 0.5 } }} />
  }

  // Formater le type de congé
  const formatLeaveType = (type) => {
    switch (type) {
      case "annuel":
        return "Congé annuel"
      case "maladie":
        return "Congé maladie"
      case "maternite":
        return "Congé maternité"
      case "paternite":
        return "Congé paternité"
      case "special":
        return "Congé spécial"
      case "autre":
        return "Autre congé"
      case "conge_paye":
        return "Congé payé"
      case "sans_solde":
        return "Congé sans solde"
      case "familial":
        return "Congé familial"
      case "formation":
        return "Congé formation"
      default:
        return type
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

  if (!leave) {
    return (
      <Box sx={{ mt: 3 }}>
        <Alert severity="info">Demande de congé non trouvée</Alert>
      </Box>
    )
  }

  return (
    <Box>
      <PageHeader
        title="Détails de la demande de congé"
        subtitle={`Demande de ${leave.utilisateur?.prenom} ${leave.utilisateur?.nom}`}
        breadcrumbs={[
          { label: "Congés", link: "/leaves" },
          { label: "Détails", link: `/leaves/${id}` },
        ]}
        action={
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>
            Retour
          </Button>
        }
      />

      <Grid container spacing={3}>
        {/* Informations principales */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, borderRadius: 2, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h5">{formatLeaveType(leave.typeConge)}</Typography>
              {getStatusChip(leave.statut)}
            </Box>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <CalendarIcon sx={{ mr: 1, color: "primary.main" }} />
                  <Box>
                    <Typography variant="subtitle2">Date de début</Typography>
                    <Typography variant="body1">
                      {format(new Date(leave.dateDebut), "dd MMMM yyyy", { locale: fr })}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <CalendarIcon sx={{ mr: 1, color: "primary.main" }} />
                  <Box>
                    <Typography variant="subtitle2">Date de fin</Typography>
                    <Typography variant="body1">
                      {format(new Date(leave.dateFin), "dd MMMM yyyy", { locale: fr })}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <AccessTimeIcon sx={{ mr: 1, color: "primary.main" }} />
                  <Box>
                    <Typography variant="subtitle2">Nombre de jours</Typography>
                    <Typography variant="body1">{leave.nombreJours} jours</Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <EventNoteIcon sx={{ mr: 1, color: "primary.main" }} />
                  <Box>
                    <Typography variant="subtitle2">Date de demande</Typography>
                    <Typography variant="body1">
                      {format(new Date(leave.dateCreation), "dd MMMM yyyy", { locale: fr })}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">Motif</Typography>
                  <Typography variant="body1" sx={{ mt: 1, p: 2, bgcolor: "background.default", borderRadius: 1 }}>
                    {leave.motif}
                  </Typography>
                </Box>
              </Grid>
              {leave.commentaire && (
                <Grid item xs={12}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2">Commentaire</Typography>
                    <Typography variant="body1" sx={{ mt: 1, p: 2, bgcolor: "background.default", borderRadius: 1 }}>
                      {leave.commentaire}
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>

            {/* Actions */}
            {(leave.statut === "en_attente" || leave.statut === "approuve_manager") && (
              <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end", gap: 2 }}>
                {/* Si l'utilisateur est le propriétaire de la demande */}
                {leave.utilisateur?._id === user?.id && (user.role === "employee" || user.role === "assistant") && (
                  <Button variant="outlined" color="error" onClick={handleCancelLeave} disabled={actionLoading}>
                    Annuler la demande
                  </Button>
                )}

                {/* Si l'utilisateur peut gérer la demande */}
                {canManageLeave() && (
                  <>
                    {/* Pour les managers, seulement si la demande est en attente */}
                    {user.role === "manager" && leave.statut === "en_attente" && (
                      <>
                        <Button
                          variant="outlined"
                          color="error"
                          startIcon={<ThumbDownIcon />}
                          onClick={handleOpenRejectDialog}
                          disabled={actionLoading}
                        >
                          Refuser
                        </Button>
                        <Button
                          variant="contained"
                          color="success"
                          startIcon={<ThumbUpIcon />}
                          onClick={handleOpenApproveDialog}
                          disabled={actionLoading}
                        >
                          Approuver
                        </Button>
                      </>
                    )}

                    {/* Pour les admins, seulement si la demande est approuvée par le manager */}
                    {user.role === "admin" && leave.statut === "approuve_manager" && (
                      <>
                        <Button
                          variant="outlined"
                          color="error"
                          startIcon={<ThumbDownIcon />}
                          onClick={handleOpenRejectDialog}
                          disabled={actionLoading}
                        >
                          Refuser
                        </Button>
                        <Button
                          variant="contained"
                          color="success"
                          startIcon={<ThumbUpIcon />}
                          onClick={handleOpenApproveDialog}
                          disabled={actionLoading}
                        >
                          Approuver définitivement
                        </Button>
                      </>
                    )}
                  </>
                )}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Informations complémentaires */}
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 2, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)", mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Demandeur
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Avatar
                  src={
                    leave.utilisateur?.photoProfil
                      ? `${API_URL.replace("/api", "")}${leave.utilisateur.photoProfil}`
                      : ""
                  }
                  alt={`${leave.utilisateur?.prenom} ${leave.utilisateur?.nom}`}
                  sx={{ width: 50, height: 50, mr: 2 }}
                >
                  {leave.utilisateur?.prenom?.charAt(0)}
                  {leave.utilisateur?.nom?.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="subtitle1">
                    {leave.utilisateur?.prenom} {leave.utilisateur?.nom}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {leave.utilisateur?.email}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {leave.utilisateur?.departement?.nom || "Aucun département"}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {leave.statut !== "en_attente" && (
            <Card sx={{ borderRadius: 2, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)" }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Décision
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">Statut</Typography>
                  <Box sx={{ mt: 1 }}>{getStatusChip(leave.statut)}</Box>
                </Box>
                {leave.approuvePar && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2">Décidé par</Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {leave.approuvePar.prenom} {leave.approuvePar.nom}
                    </Typography>
                  </Box>
                )}
                {leave.dateApprobation && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2">Date de décision</Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {format(new Date(leave.dateApprobation), "dd MMMM yyyy", { locale: fr })}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Boîte de dialogue d'approbation */}
      <Dialog open={openApproveDialog} onClose={handleCloseApproveDialog}>
        <DialogTitle>
          {user.role === "admin" ? "Approuver définitivement la demande de congé" : "Approuver la demande de congé"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Vous êtes sur le point d'{user.role === "admin" ? "approuver définitivement" : "approuver"} la demande de
            congé de{" "}
            <strong>
              {leave.utilisateur?.prenom} {leave.utilisateur?.nom}
            </strong>{" "}
            pour la période du {format(new Date(leave.dateDebut), "dd/MM/yyyy")} au{" "}
            {format(new Date(leave.dateFin), "dd/MM/yyyy")}.
            {user.role === "manager" && (
              <p>Cette demande devra ensuite être approuvée définitivement par un administrateur.</p>
            )}
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="comment"
            label="Commentaire (optionnel)"
            fullWidth
            multiline
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            variant="outlined"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseApproveDialog}>Annuler</Button>
          <Button
            onClick={handleApproveLeave}
            color="success"
            startIcon={actionLoading ? <CircularProgress size={20} /> : <ThumbUpIcon />}
            disabled={actionLoading}
          >
            {actionLoading ? "Traitement..." : user.role === "admin" ? "Approuver définitivement" : "Approuver"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Boîte de dialogue de refus */}
      <Dialog open={openRejectDialog} onClose={handleCloseRejectDialog}>
        <DialogTitle>Refuser la demande de congé</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Vous êtes sur le point de refuser la demande de congé de{" "}
            <strong>
              {leave.utilisateur?.prenom} {leave.utilisateur?.nom}
            </strong>{" "}
            pour la période du {format(new Date(leave.dateDebut), "dd/MM/yyyy")} au{" "}
            {format(new Date(leave.dateFin), "dd/MM/yyyy")}.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="comment"
            label="Motif du refus"
            fullWidth
            multiline
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            variant="outlined"
            sx={{ mt: 2 }}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRejectDialog}>Annuler</Button>
          <Button
            onClick={handleRejectLeave}
            color="error"
            startIcon={actionLoading ? <CircularProgress size={20} /> : <ThumbDownIcon />}
            disabled={!comment || actionLoading}
          >
            {actionLoading ? "Traitement..." : "Refuser"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default LeaveDetailPage
