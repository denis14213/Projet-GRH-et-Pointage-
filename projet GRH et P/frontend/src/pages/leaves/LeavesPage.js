"use client"

import { useState, useEffect } from "react"
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Paper,
  Tabs,
  Tab,
  Divider,
  Card,
  CardContent,
  CardActions,
} from "@mui/material"
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  FilterList as FilterListIcon,
  EventNote as EventNoteIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  HourglassEmpty as HourglassEmptyIcon,
} from "@mui/icons-material"
import axios from "axios"
import { API_URL } from "../../config"
import PageHeader from "../../components/common/PageHeader"
import DataTable from "../../components/common/DataTable"
import { useNotification } from "../../contexts/NotificationContext"
import { useAuth } from "../../contexts/AuthContext"
import { useNavigate } from "react-router-dom"

// Page de gestion des congés
const LeavesPage = () => {
  const { showNotification } = useNotification()
  const { user } = useAuth()
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [selectedLeave, setSelectedLeave] = useState(null)
  const [tabValue, setTabValue] = useState(0)
  const [filters, setFilters] = useState({
    statut: "",
    search: "",
  })
  const navigate = useNavigate()

  // Récupérer les congés de l'utilisateur
  useEffect(() => {
    const fetchLeaves = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await axios.get(`${API_URL}/leaves/me`, {
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

    fetchLeaves()
  }, [])

  // Colonnes du tableau
  const columns = [
    { id: "id", label: "ID", disablePadding: false, sortable: true },
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
    {
      id: "commentaire",
      label: "Commentaire",
      disablePadding: false,
      sortable: true,
    },
  ]

  // Formater les données des congés pour le tableau
  const formattedLeaves = leaves.map((leave) => ({
    id: leave._id,
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

    // Filtre par recherche (type de congé, motif)
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      return (
        leave.typeConge.toLowerCase().includes(searchTerm) ||
        leave.motif.toLowerCase().includes(searchTerm) ||
        (leave.commentaire && leave.commentaire.toLowerCase().includes(searchTerm))
      )
    }

    return true
  })

  // Gérer le changement d'onglet
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue)
  }

  // Gérer l'ouverture de la boîte de dialogue de suppression
  const handleOpenDeleteDialog = (leaveId) => {
    const leave = leaves.find((l) => l._id === leaveId)
    setSelectedLeave(leave)
    setOpenDeleteDialog(true)
  }

  // Gérer la fermeture de la boîte de dialogue de suppression
  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false)
    setSelectedLeave(null)
  }

  // Annuler une demande de congé
  const handleCancelLeave = async () => {
    if (!selectedLeave) return

    try {
      setLoading(true)
      await axios.delete(`${API_URL}/leaves/${selectedLeave._id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      // Mettre à jour la liste des congés
      setLeaves(leaves.filter((leave) => leave._id !== selectedLeave._id))
      showNotification("success", "Demande de congé annulée avec succès")
    } catch (error) {
      console.error("Erreur lors de l'annulation de la demande de congé:", error)
      showNotification("error", "Erreur lors de l'annulation de la demande de congé")
    } finally {
      setLoading(false)
      handleCloseDeleteDialog()
    }
  }

  // Réinitialiser les filtres
  const handleResetFilters = () => {
    setFilters({
      statut: "",
      search: "",
    })
  }

  // Rafraîchir les données
  const handleRefresh = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await axios.get(`${API_URL}/leaves/me`, {
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

  // Calculer le solde de congés
  const leaveBalance = user?.soldeConges || 0
  const pendingLeaves = leaves.filter((leave) => leave.statut === "en_attente" && leave.typeConge === "annuel")
  const pendingDays = pendingLeaves.reduce((total, leave) => total + leave.nombreJours, 0)
  const availableBalance = leaveBalance - pendingDays

  return (
    <Box>
      <PageHeader
        title="Mes congés"
        subtitle="Gérez vos demandes de congés"
        breadcrumbs={[{ label: "Congés", link: "/leaves" }]}
        action={
          <Button variant="contained" startIcon={<AddIcon />} href="/leaves/request" sx={{ px: 3 }}>
            Nouvelle demande
          </Button>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Solde de congés */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ borderRadius: 2, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)" }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Solde de congés
              </Typography>
              <Typography variant="h3" color="primary" fontWeight="bold">
                {leaveBalance}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                jours disponibles
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ borderRadius: 2, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)" }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Congés en attente
              </Typography>
              <Typography variant="h3" color="warning.main" fontWeight="bold">
                {pendingDays}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                jours en attente d'approbation
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ borderRadius: 2, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)" }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Solde disponible
              </Typography>
              <Typography variant="h3" color="success.main" fontWeight="bold">
                {availableBalance}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                jours disponibles après approbation
              </Typography>
            </CardContent>
            <CardActions sx={{ justifyContent: "flex-end", p: 2 }}>
              <Button variant="outlined" size="small" startIcon={<EventNoteIcon />} href="/leaves/request">
                Demander un congé
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ mb: 3, borderRadius: 2, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)" }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="onglets de congés" sx={{ px: 2 }}>
          <Tab label="Tous les congés" />
          <Tab label="En attente" />
          <Tab label="Approuvés" />
          <Tab label="Refusés" />
        </Tabs>
        <Divider />

        <Box sx={{ p: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Rechercher par type ou motif"
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
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel id="statut-filter-label">Statut</InputLabel>
                <Select
                  labelId="statut-filter-label"
                  id="statut-filter"
                  value={filters.statut}
                  label="Statut"
                  onChange={(e) => setFilters({ ...filters, statut: e.target.value })}
                >
                  <MenuItem value="">Tous les statuts</MenuItem>
                  <MenuItem value="en_attente">En attente</MenuItem>
                  <MenuItem value="approuve">Approuvé</MenuItem>
                  <MenuItem value="refuse">Refusé</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={2}>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Tooltip title="Réinitialiser les filtres">
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={handleResetFilters}
                    disabled={!filters.statut && !filters.search}
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
            ? filteredLeaves
            : tabValue === 1
              ? filteredLeaves.filter((leave) => leave.statut === "en_attente")
              : tabValue === 2
                ? filteredLeaves.filter((leave) => leave.statut === "approuve")
                : filteredLeaves.filter((leave) => leave.statut === "refuse")
        }
        loading={loading}
        onDelete={handleOpenDeleteDialog}
        onRowClick={(id) => navigate(`/leaves/${id}`)}
        emptyMessage="Aucune demande de congé trouvée"
      />

      {/* Boîte de dialogue de suppression */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Annuler la demande de congé</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Êtes-vous sûr de vouloir annuler cette demande de congé ? Cette action est irréversible.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Non</Button>
          <Button onClick={handleCancelLeave} color="error" startIcon={<DeleteIcon />}>
            Oui, annuler
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default LeavesPage
