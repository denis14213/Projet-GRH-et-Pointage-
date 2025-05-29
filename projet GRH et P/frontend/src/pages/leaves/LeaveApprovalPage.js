"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Grid,
  Paper,
  Tabs,
  Tab,
  Divider,
  Avatar,
} from "@mui/material"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import {
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  FilterList as FilterListIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  HourglassEmpty as HourglassEmptyIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
} from "@mui/icons-material"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import axios from "axios"
import { API_URL } from "../../config"
import PageHeader from "../../components/common/PageHeader"
import DataTable from "../../components/common/DataTable"
import { useNotification } from "../../contexts/NotificationContext"
import { useAuth } from "../../contexts/AuthContext"

// Page d'approbation des congés
const LeaveApprovalPage = () => {
  const navigate = useNavigate()
  const { showNotification } = useNotification()
  const { user } = useAuth()
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tabValue, setTabValue] = useState(0)
  const [filters, setFilters] = useState({
    statut: "",
    search: "",
    startDate: null,
    endDate: null,
  })
  const [openApproveDialog, setOpenApproveDialog] = useState(false)
  const [openRejectDialog, setOpenRejectDialog] = useState(false)
  const [selectedLeave, setSelectedLeave] = useState(null)
  const [comment, setComment] = useState("")
  const [departments, setDepartments] = useState([])

  // Compter les demandes approuvées par manager en attente d'approbation finale
  const pendingAdminApprovalCount = leaves.filter((leave) => leave.statut === "approuve_manager").length

  // Récupérer les congés à approuver
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Construire les paramètres de requête
        const params = new URLSearchParams()
        if (user.role === "manager" && user.departement) {
          params.append("departement", user.departement)
        }

        // Récupérer les congés
        const leavesResponse = await axios.get(`${API_URL}/leaves?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        })

        // Récupérer les départements
        const departmentsResponse = await axios.get(`${API_URL}/departments`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        })

        setLeaves(leavesResponse.data)
        setDepartments(departmentsResponse.data)
      } catch (error) {
        console.error("Erreur lors de la récupération des congés:", error)
        setError("Erreur lors de la récupération des congés. Veuillez réessayer.")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Colonnes du tableau
  const columns = [
    { id: "id", label: "ID", disablePadding: false, sortable: true },
    {
      id: "utilisateur",
      label: "Utilisateur",
      disablePadding: false,
      sortable: true,
      render: (value) =>
        value ? (
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Avatar
              src={value.photoProfil ? `${API_URL.replace("/api", "")}${value.photoProfil}` : ""}
              alt={`${value.prenom} ${value.nom}`}
              sx={{ width: 32, height: 32, mr: 2 }}
            >
              {value.prenom?.charAt(0)}
              {value.nom?.charAt(0)}
            </Avatar>
            <Typography variant="body2">
              {value.prenom} {value.nom}
            </Typography>
          </Box>
        ) : (
          "Inconnu"
        ),
    },
    {
      id: "typeConge",
      label: "Type de congé",
      disablePadding: false,
      sortable: true,
      render: (value) => {
        let label = value
        switch (value) {
          case "annuel":
            label = "Congé annuel"
            break
          case "maladie":
            label = "Congé maladie"
            break
          case "maternite":
            label = "Congé maternité"
            break
          case "paternite":
            label = "Congé paternité"
            break
          case "special":
            label = "Congé spécial"
            break
          case "autre":
            label = "Autre congé"
            break
        }
        return label
      },
    },
    {
      id: "dateDebut",
      label: "Date de début",
      disablePadding: false,
      sortable: true,
      type: "date",
    },
    {
      id: "dateFin",
      label: "Date de fin",
      disablePadding: false,
      sortable: true,
      type: "date",
    },
    {
      id: "nombreJours",
      label: "Nombre de jours",
      disablePadding: false,
      sortable: true,
    },
    {
      id: "statut",
      label: "Statut",
      disablePadding: false,
      sortable: true,
      render: (value) => {
        let color
        let label
        let icon
        switch (value) {
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
            label = value
            icon = null
        }
        return <Chip label={label} color={color} size="small" icon={icon} sx={{ "& .MuiChip-icon": { ml: 0.5 } }} />
      },
    },
    {
      id: "motif",
      label: "Motif",
      disablePadding: false,
      sortable: true,
    },
  ]

  // Formater les données des congés pour le tableau
  const formattedLeaves = leaves.map((leave) => ({
    id: leave._id,
    utilisateur: leave.utilisateur,
    typeConge: leave.typeConge,
    dateDebut: leave.dateDebut,
    dateFin: leave.dateFin,
    nombreJours: leave.nombreJours,
    statut: leave.statut,
    motif: leave.motif,
    commentaire: leave.commentaire,
    approuvePar: leave.approuvePar,
    dateApprobation: leave.dateApprobation,
  }))

  // Filtrer les congés
  const filteredLeaves = formattedLeaves.filter((leave) => {
    // Filtre par statut
    if (filters.statut && leave.statut !== filters.statut) {
      return false
    }

    // Filtre par date de début
    if (filters.startDate && new Date(leave.dateDebut) < filters.startDate) {
      return false
    }

    // Filtre par date de fin
    if (filters.endDate) {
      const endDate = new Date(filters.endDate)
      endDate.setHours(23, 59, 59, 999)
      if (new Date(leave.dateFin) > endDate) {
        return false
      }
    }

    // Filtre par recherche (nom, prénom, email de l'utilisateur, type de congé, motif)
    if (filters.search && leave.utilisateur) {
      const searchTerm = filters.search.toLowerCase()
      return (
        leave.utilisateur.nom.toLowerCase().includes(searchTerm) ||
        leave.utilisateur.prenom.toLowerCase().includes(searchTerm) ||
        leave.utilisateur.email.toLowerCase().includes(searchTerm) ||
        leave.typeConge.toLowerCase().includes(searchTerm) ||
        leave.motif.toLowerCase().includes(searchTerm)
      )
    }

    return true
  })

  // Gérer le changement d'onglet
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue)
  }

  // Gérer l'ouverture de la boîte de dialogue d'approbation
  const handleOpenApproveDialog = (leaveId) => {
    const leave = leaves.find((l) => l._id === leaveId)
    setSelectedLeave(leave)
    setComment("")
    setOpenApproveDialog(true)
  }

  // Gérer la fermeture de la boîte de dialogue d'approbation
  const handleCloseApproveDialog = () => {
    setOpenApproveDialog(false)
    setSelectedLeave(null)
    setComment("")
  }

  // Gérer l'ouverture de la boîte de dialogue de refus
  const handleOpenRejectDialog = (leaveId) => {
    const leave = leaves.find((l) => l._id === leaveId)
    setSelectedLeave(leave)
    setComment("")
    setOpenRejectDialog(true)
  }

  // Gérer la fermeture de la boîte de dialogue de refus
  const handleCloseRejectDialog = () => {
    setOpenRejectDialog(false)
    setSelectedLeave(null)
    setComment("")
  }

  // Approuver une demande de congé
  const handleApproveLeave = async () => {
    if (!selectedLeave) return

    try {
      setLoading(true)

      // Vérifier si l'utilisateur est autorisé à approuver cette demande
      if (user.role === "manager") {
        // Vérifier si l'employé appartient au département du manager
        const employeeDept = selectedLeave.utilisateur.departement?._id
        const managerDept = user.departement

        if (!employeeDept || employeeDept !== managerDept) {
          showNotification("error", "Vous ne pouvez approuver que les congés des membres de votre département")
          setLoading(false)
          handleCloseApproveDialog()
          return
        }

        // Les managers approuvent au premier niveau
        await axios.put(
          `${API_URL}/leaves/${selectedLeave._id}/status`,
          {
            statut: "approuve_manager",
            commentaire: comment,
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        )

        // Mettre à jour la liste des congés
        const updatedLeaves = leaves.map((leave) =>
          leave._id === selectedLeave._id
            ? {
                ...leave,
                statut: "approuve_manager",
                commentaire: comment,
                approuvePar: user,
                dateApprobation: new Date(),
              }
            : leave,
        )
        setLeaves(updatedLeaves)
        showNotification("success", "Demande de congé approuvée par le manager avec succès")
      } else if (user.role === "admin") {
        // Les admins peuvent approuver définitivement
        if (selectedLeave.statut !== "approuve_manager") {
          showNotification("error", "La demande doit d'abord être approuvée par un manager")
          setLoading(false)
          handleCloseApproveDialog()
          return
        }

        await axios.put(
          `${API_URL}/leaves/${selectedLeave._id}/status`,
          {
            statut: "approuve",
            commentaire: comment,
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        )

        // Mettre à jour la liste des congés
        const updatedLeaves = leaves.map((leave) =>
          leave._id === selectedLeave._id
            ? {
                ...leave,
                statut: "approuve",
                commentaire: comment,
                approuvePar: user,
                dateApprobation: new Date(),
              }
            : leave,
        )
        setLeaves(updatedLeaves)
        showNotification("success", "Demande de congé définitivement approuvée avec succès")
      }
    } catch (error) {
      console.error("Erreur lors de l'approbation de la demande de congé:", error)
      showNotification("error", "Erreur lors de l'approbation de la demande de congé")
    } finally {
      setLoading(false)
      handleCloseApproveDialog()
    }
  }

  // Refuser une demande de congé
  const handleRejectLeave = async () => {
    if (!selectedLeave) return

    try {
      setLoading(true)

      // Vérifier si l'utilisateur est autorisé à refuser cette demande
      if (user.role === "manager") {
        // Vérifier si l'employé appartient au département du manager
        const employeeDept = selectedLeave.utilisateur.departement?._id
        const managerDept = user.departement

        if (!employeeDept || employeeDept !== managerDept) {
          showNotification("error", "Vous ne pouvez refuser que les congés des membres de votre département")
          setLoading(false)
          handleCloseRejectDialog()
          return
        }
      }

      // Vérifier que le commentaire est fourni pour le refus
      if (!comment.trim()) {
        showNotification("error", "Un motif de refus est requis")
        setLoading(false)
        return
      }

      await axios.put(
        `${API_URL}/leaves/${selectedLeave._id}/status`,
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

      // Mettre à jour la liste des congés
      const updatedLeaves = leaves.map((leave) =>
        leave._id === selectedLeave._id
          ? {
              ...leave,
              statut: "refuse",
              commentaire: comment,
              approuvePar: user,
              dateApprobation: new Date(),
            }
          : leave,
      )
      setLeaves(updatedLeaves)
      showNotification("success", "Demande de congé refusée avec succès")
    } catch (error) {
      console.error("Erreur lors du refus de la demande de congé:", error)
      showNotification("error", "Erreur lors du refus de la demande de congé")
    } finally {
      setLoading(false)
      handleCloseRejectDialog()
    }
  }

  // Réinitialiser les filtres
  const handleResetFilters = () => {
    setFilters({
      statut: "",
      search: "",
      startDate: null,
      endDate: null,
    })
  }

  // Rafraîchir les données
  const handleRefresh = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await axios.get(`${API_URL}/leaves`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      setLeaves(response.data)
    } catch (error) {
      console.error("Erreur lors de la récupération des congés:", error)
      setError("Erreur lors de la récupération des congés. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  // Ajouter cette fonction pour vérifier si l'utilisateur peut approuver/refuser une demande
  const canManageLeave = (leave) => {
    if (!leave || !user) return false

    // Les administrateurs peuvent gérer toutes les demandes
    if (user.role === "admin") return true

    // Les managers ne peuvent gérer que les demandes des membres de leur département
    if (user.role === "manager") {
      const employeeDept = leave.utilisateur?.departement?._id
      const managerDept = user.departement
      return employeeDept && managerDept && employeeDept === managerDept
    }

    return false
  }

  // Actions personnalisées pour le tableau
  const renderActions = (id) => {
    const leave = leaves.find((l) => l._id === id)
    if (!leave) return null

    // Si la demande est refusée ou définitivement approuvée, pas d'actions disponibles
    if (leave.statut === "refuse" || leave.statut === "approuve") return null

    // Si la demande est approuvée par le manager, seul l'admin peut agir
    if (leave.statut === "approuve_manager" && user.role !== "admin") return null

    // Si la demande est en attente, seul le manager du département peut agir
    if (leave.statut === "en_attente" && !canManageLeave(leave)) return null

    return (
      <Box sx={{ display: "flex", gap: 1 }}>
        <Tooltip title={user.role === "admin" ? "Approuver définitivement" : "Approuver"}>
          <IconButton color="success" size="small" onClick={() => handleOpenApproveDialog(id)}>
            <ThumbUpIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Refuser">
          <IconButton color="error" size="small" onClick={() => handleOpenRejectDialog(id)}>
            <ThumbDownIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    )
  }

  return (
    <Box>
      <PageHeader
        title="Approbation des congés"
        subtitle="Gérez les demandes de congés des employés"
        breadcrumbs={[
          { label: "Congés", link: "/leaves" },
          { label: "Approbation", link: "/leaves/approval" },
        ]}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ mb: 3, borderRadius: 2, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)" }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="onglets d'approbation" sx={{ px: 2 }}>
          <Tab label="En attente" />
          <Tab
            label={
              <Box sx={{ display: "flex", alignItems: "center" }}>
                Approuvés par manager
                {user.role === "admin" && pendingAdminApprovalCount > 0 && (
                  <Chip
                    label={pendingAdminApprovalCount}
                    color="primary"
                    size="small"
                    sx={{ ml: 1, height: 20, minWidth: 20 }}
                  />
                )}
              </Box>
            }
          />
          <Tab label="Approuvés" />
          <Tab label="Refusés" />
          <Tab label="Tous" />
        </Tabs>
        <Divider />

        <Box sx={{ p: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Rechercher par nom, prénom ou email"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: filters.search && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setFilters({ ...filters, search: "" })}>
                        <ClearIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
                <DatePicker
                  label="Date de début"
                  value={filters.startDate}
                  onChange={(date) => setFilters({ ...filters, startDate: date })}
                  slotProps={{ textField: { size: "small", fullWidth: true } }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} sm={3}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
                <DatePicker
                  label="Date de fin"
                  value={filters.endDate}
                  onChange={(date) => setFilters({ ...filters, endDate: date })}
                  slotProps={{ textField: { size: "small", fullWidth: true } }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} sm={2}>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Tooltip title="Réinitialiser les filtres">
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={handleResetFilters}
                    disabled={!filters.search && !filters.startDate && !filters.endDate}
                    startIcon={<FilterListIcon />}
                  >
                    Réinitialiser
                  </Button>
                </Tooltip>
                <Tooltip title="Rafraîchir">
                  <IconButton onClick={handleRefresh} disabled={loading} color="primary">
                    {loading ? <CircularProgress size={24} /> : <RefreshIcon />}
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* Tableau des congés */}
      <DataTable
        columns={columns}
        data={
          tabValue === 0
            ? filteredLeaves.filter((leave) => leave.statut === "en_attente")
            : tabValue === 1
              ? filteredLeaves.filter((leave) => leave.statut === "approuve_manager")
              : tabValue === 2
                ? filteredLeaves.filter((leave) => leave.statut === "approuve")
                : tabValue === 3
                  ? filteredLeaves.filter((leave) => leave.statut === "refuse")
                  : filteredLeaves
        }
        loading={loading}
        actions={false}
        renderActions={renderActions}
        onRowClick={(id) => navigate(`/leaves/${id}`)}
        emptyMessage="Aucune demande de congé trouvée"
      />

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
              {selectedLeave?.utilisateur?.prenom} {selectedLeave?.utilisateur?.nom}
            </strong>{" "}
            pour la période du {selectedLeave && format(new Date(selectedLeave.dateDebut), "dd/MM/yyyy")} au{" "}
            {selectedLeave && format(new Date(selectedLeave.dateFin), "dd/MM/yyyy")}.
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
          <Button onClick={handleApproveLeave} color="success" startIcon={<ThumbUpIcon />}>
            {user.role === "admin" ? "Approuver définitivement" : "Approuver"}
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
              {selectedLeave?.utilisateur?.prenom} {selectedLeave?.utilisateur?.nom}
            </strong>{" "}
            pour la période du {selectedLeave && format(new Date(selectedLeave.dateDebut), "dd/MM/yyyy")} au{" "}
            {selectedLeave && format(new Date(selectedLeave.dateFin), "dd/MM/yyyy")}.
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
          <Button onClick={handleRejectLeave} color="error" startIcon={<ThumbDownIcon />} disabled={!comment}>
            Refuser
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default LeaveApprovalPage
