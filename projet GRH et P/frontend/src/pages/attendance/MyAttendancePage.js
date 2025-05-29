"use client"

import { useState, useEffect } from "react"
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Divider,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  IconButton,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
} from "@mui/material"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import { fr } from "date-fns/locale"
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
  EventBusy as EventBusyIcon,
} from "@mui/icons-material"
import { format, isValid, startOfMonth, endOfMonth } from "date-fns"
import axios from "axios"
import { API_URL } from "../../config"
import PageHeader from "../../components/common/PageHeader"
import { useAuth } from "../../contexts/AuthContext"
import { useNotification } from "../../contexts/NotificationContext"

// Composant pour afficher les statistiques de pointage
const StatCard = ({ title, value, icon, color }) => (
  <Card sx={{ height: "100%", borderRadius: 2, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)" }}>
    <CardContent>
      <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            width: 40,
            height: 40,
            backgroundColor: `${color}.light`,
            color: `${color}.main`,
            mr: 2,
          }}
        >
          {icon}
        </Box>
        <Typography variant="h6" component="div" sx={{ fontWeight: "medium" }}>
          {title}
        </Typography>
      </Box>
      <Typography variant="h4" component="div" sx={{ fontWeight: "bold", mt: 2 }}>
        {value}
      </Typography>
    </CardContent>
  </Card>
)

// Page de visualisation des pointages personnels
const MyAttendancePage = () => {
  const { user } = useAuth()
  const { showNotification } = useNotification()
  const [attendances, setAttendances] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tabValue, setTabValue] = useState(0)
  const [filters, setFilters] = useState({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
    search: "",
  })
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [stats, setStats] = useState({
    present: 0,
    absent: 0,
    retard: 0,
    conge: 0,
  })

  // Au début du composant, après les déclarations de state
  useEffect(() => {
    if (!user) {
      setError("Veuillez vous connecter pour voir vos pointages.")
      setLoading(false)
    }
  }, [user])

  // Récupérer les pointages de l'utilisateur connecté
  useEffect(() => {
    if (!user) return

    const fetchAttendances = async () => {
      try {
        setLoading(true)
        setError(null)

        // Vérifier que l'utilisateur a un ID valide
        if (!user._id) {
          console.error("ID utilisateur non disponible:", user)
          setError("Impossible de récupérer votre ID utilisateur. Veuillez vous reconnecter.")
          setLoading(false)
          return
        }

        // Construire les paramètres de requête
        const params = new URLSearchParams()
        if (filters.startDate) {
          params.append("startDate", filters.startDate.toISOString())
        }
        if (filters.endDate) {
          params.append("endDate", filters.endDate.toISOString())
        }

        // Récupérer les pointages avec l'ID correct (_id au lieu de id)
        const response = await axios.get(`${API_URL}/attendance/user/${user._id}?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        })

        setAttendances(response.data)

        // Calculer les statistiques
        const stats = {
          present: 0,
          absent: 0,
          retard: 0,
          conge: 0,
        }

        response.data.forEach((attendance) => {
          if (attendance.statut) {
            stats[attendance.statut] = (stats[attendance.statut] || 0) + 1
          }
        })

        setStats(stats)
      } catch (error) {
        console.error("Erreur lors de la récupération des pointages:", error)
        if (error.response) {
          console.error("Détails de l'erreur:", error.response.data)
          if (error.response.status === 403) {
            setError("Vous n'avez pas les permissions nécessaires pour accéder à ces données.")
          } else {
            setError(
              `Erreur lors de la récupération des pointages: ${error.response.data.message || "Veuillez réessayer."}`,
            )
          }
        } else {
          setError("Erreur de connexion au serveur. Veuillez réessayer.")
        }
      } finally {
        setLoading(false)
      }
    }

    fetchAttendances()
  }, [user, filters.startDate, filters.endDate])

  // Gérer le changement d'onglet
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue)
  }

  // Gérer le changement de page
  const handleChangePage = (event, newPage) => {
    setPage(newPage)
  }

  // Gérer le changement de lignes par page
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(Number.parseInt(event.target.value, 10))
    setPage(0)
  }

  // Filtrer les pointages par recherche
  const filteredAttendances = attendances.filter((attendance) => {
    if (!filters.search) return true

    const searchTerm = filters.search.toLowerCase()
    const date = isValid(new Date(attendance.date)) ? format(new Date(attendance.date), "dd/MM/yyyy") : "Date invalide"
    const statut = attendance.statut || ""

    return (
      date.toLowerCase().includes(searchTerm) ||
      statut.toLowerCase().includes(searchTerm) ||
      (attendance.commentaire || "").toLowerCase().includes(searchTerm)
    )
  })

  // Paginer les pointages
  const paginatedAttendances = filteredAttendances.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  // Rafraîchir les données
  const handleRefresh = () => {
    if (!user) return
    setLoading(true)
    setError(null)

    const fetchAttendances = async () => {
      try {
        // Vérifier que l'utilisateur a un ID valide
        if (!user._id) {
          console.error("ID utilisateur non disponible:", user)
          setError("Impossible de récupérer votre ID utilisateur. Veuillez vous reconnecter.")
          setLoading(false)
          return
        }

        // Construire les paramètres de requête
        const params = new URLSearchParams()
        if (filters.startDate) {
          params.append("startDate", filters.startDate.toISOString())
        }
        if (filters.endDate) {
          params.append("endDate", filters.endDate.toISOString())
        }

        // Récupérer les pointages avec l'ID correct (_id au lieu de id)
        const response = await axios.get(`${API_URL}/attendance/user/${user._id}?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        })

        setAttendances(response.data)

        // Calculer les statistiques
        const stats = {
          present: 0,
          absent: 0,
          retard: 0,
          conge: 0,
        }

        response.data.forEach((attendance) => {
          if (attendance.statut) {
            stats[attendance.statut] = (stats[attendance.statut] || 0) + 1
          }
        })

        setStats(stats)
        showNotification("success", "Données actualisées avec succès")
      } catch (error) {
        console.error("Erreur lors de la récupération des pointages:", error)
        if (error.response) {
          console.error("Détails de l'erreur:", error.response.data)
          if (error.response.status === 403) {
            setError("Vous n'avez pas les permissions nécessaires pour accéder à ces données.")
          } else {
            setError(
              `Erreur lors de la récupération des pointages: ${error.response.data.message || "Veuillez réessayer."}`,
            )
          }
        } else {
          setError("Erreur de connexion au serveur. Veuillez réessayer.")
        }
      } finally {
        setLoading(false)
      }
    }

    fetchAttendances()
  }

  // Réinitialiser les filtres
  const handleResetFilters = () => {
    setFilters({
      startDate: startOfMonth(new Date()),
      endDate: endOfMonth(new Date()),
      search: "",
    })
  }

  // Rendu du statut sous forme de puce
  const renderStatus = (status) => {
    let color
    let label
    let icon

    switch (status) {
      case "present":
        color = "success"
        label = "Présent"
        icon = <CheckCircleIcon fontSize="small" />
        break
      case "absent":
        color = "error"
        label = "Absent"
        icon = <CancelIcon fontSize="small" />
        break
      case "retard":
        color = "warning"
        label = "Retard"
        icon = <WarningIcon fontSize="small" />
        break
      case "conge":
        color = "info"
        label = "Congé"
        icon = <EventBusyIcon fontSize="small" />
        break
      default:
        color = "default"
        label = status || "Inconnu"
        icon = null
    }

    return <Chip icon={icon} label={label} color={color} size="small" sx={{ fontWeight: "medium" }} />
  }

  return (
    <Box>
      <PageHeader
        title="Mes pointages"
        subtitle="Consultez l'historique de vos pointages"
        breadcrumbs={[
          { label: "Pointage", link: "/attendance" },
          { label: "Mes pointages", link: "/attendance/my" },
        ]}
        action={
          <IconButton color="primary" onClick={handleRefresh} disabled={loading}>
            {loading ? <CircularProgress size={24} /> : <RefreshIcon />}
          </IconButton>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Statistiques */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Jours présent" value={stats.present} icon={<CheckCircleIcon />} color="success" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Jours absent" value={stats.absent} icon={<CancelIcon />} color="error" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Jours en retard" value={stats.retard} icon={<WarningIcon />} color="warning" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Jours de congé" value={stats.conge} icon={<EventBusyIcon />} color="info" />
        </Grid>
      </Grid>

      {/* Filtres et tableau */}
      <Paper sx={{ borderRadius: 2, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)", mb: 4 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="onglets de pointage" sx={{ px: 2 }}>
          <Tab label="Mes pointages" />
          <Tab label="Filtres" />
        </Tabs>
        <Divider />

        {tabValue === 0 ? (
          <Box sx={{ p: 2 }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Rechercher..."
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
              sx={{ mb: 2 }}
            />
          </Box>
        ) : (
          <Box sx={{ p: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={5}>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
                  <DatePicker
                    label="Date de début"
                    value={filters.startDate}
                    onChange={(date) => setFilters({ ...filters, startDate: date })}
                    slotProps={{ textField: { size: "small", fullWidth: true } }}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12} sm={5}>
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
                <IconButton color="secondary" onClick={handleResetFilters}>
                  <ClearIcon />
                </IconButton>
              </Grid>
            </Grid>
          </Box>
        )}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        ) : filteredAttendances.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="body1" color="textSecondary">
              Aucun pointage trouvé pour la période sélectionnée.
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table sx={{ minWidth: 650 }} aria-label="tableau des pointages">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Heure d'arrivée</TableCell>
                    <TableCell>Heure de départ</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell>Commentaire</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedAttendances.map((attendance) => (
                    <TableRow key={attendance._id} hover>
                      <TableCell>
                        {isValid(new Date(attendance.date))
                          ? format(new Date(attendance.date), "dd/MM/yyyy")
                          : "Date invalide"}
                      </TableCell>
                      <TableCell>
                        {attendance.heureArrivee ? format(new Date(attendance.heureArrivee), "HH:mm") : "-"}
                      </TableCell>
                      <TableCell>
                        {attendance.heureDepart ? format(new Date(attendance.heureDepart), "HH:mm") : "-"}
                      </TableCell>
                      <TableCell>{renderStatus(attendance.statut)}</TableCell>
                      <TableCell>{attendance.commentaire || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredAttendances.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              labelRowsPerPage="Lignes par page:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count}`}
            />
          </>
        )}
      </Paper>

      {/* Informations supplémentaires */}
      <Paper sx={{ p: 3, borderRadius: 2, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)" }}>
        <Typography variant="h6" gutterBottom>
          Informations sur les pointages
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
              <CheckCircleIcon color="success" sx={{ mr: 1 }} />
              <Typography variant="body1">
                <strong>Présent</strong> : Vous avez pointé à l'arrivée et au départ
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
              <CancelIcon color="error" sx={{ mr: 1 }} />
              <Typography variant="body1">
                <strong>Absent</strong> : Aucun pointage n'a été enregistré
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
              <WarningIcon color="warning" sx={{ mr: 1 }} />
              <Typography variant="body1">
                <strong>Retard</strong> : Vous êtes arrivé après l'heure prévue
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
              <EventBusyIcon color="info" sx={{ mr: 1 }} />
              <Typography variant="body1">
                <strong>Congé</strong> : Vous étiez en congé ce jour-là
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  )
}

export default MyAttendancePage
