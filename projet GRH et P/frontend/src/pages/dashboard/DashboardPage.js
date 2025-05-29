"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  Button,
  Divider,
  CircularProgress,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  IconButton,
  Tooltip,
} from "@mui/material"
import {
  People as PeopleIcon,
  Business as BusinessIcon,
  AccessTime as AccessTimeIcon,
  EventNote as EventNoteIcon,
  Message as MessageIcon,
  Task as TaskIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  HourglassEmpty as HourglassEmptyIcon,
  Person as PersonIcon,
} from "@mui/icons-material"
import { useAuth } from "../../contexts/AuthContext"
import axios from "axios"
import { API_URL } from "../../config"
import PageHeader from "../../components/common/PageHeader"
import StatsCard from "../../components/common/StatsCard"
import CustomChart from "../../components/common/CustomChart"

// Page du tableau de bord
const DashboardPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState(null)
  const [userStats, setUserStats] = useState(null)
  const [recentLeaves, setRecentLeaves] = useState([])
  const [recentTasks, setRecentTasks] = useState([])
  const [attendanceData, setAttendanceData] = useState([])
  const [leaveData, setLeaveData] = useState([])

  // Récupérer les statistiques du tableau de bord
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Récupérer les statistiques
        const statsResponse = await axios.get(`${API_URL}/reports/dashboard`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        })

        setStats(statsResponse.data.stats)
        setUserStats(statsResponse.data.userStats)

        // Récupérer les congés récents
        const leavesResponse = await axios.get(`${API_URL}/leaves/me`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        })

        setRecentLeaves(leavesResponse.data.slice(0, 5))

        // Récupérer les tâches récentes
        const tasksResponse = await axios.get(`${API_URL}/tasks/me`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        })

        setRecentTasks(tasksResponse.data.slice(0, 5))

        // Préparer les données pour les graphiques
        prepareChartData(statsResponse.data)
      } catch (error) {
        console.error("Erreur lors de la récupération des données du tableau de bord:", error)
        setError("Erreur lors de la récupération des données. Veuillez réessayer.")
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  // Préparer les données pour les graphiques
  const prepareChartData = (data) => {
    // Pour les employés, utiliser userStats, pour les autres utiliser stats
    const presenceData = user?.role === "employee" ? data.userStats.presences.mois : data.stats.presences.mois
    const congeData = user?.role === "employee" ? data.userStats.conges : data.stats.conges

    // Données pour le graphique de présence
    const attendanceData = [
      { name: "Présent", value: presenceData.present || 0 },
      { name: "Absent", value: presenceData.absent || 0 },
      { name: "Retard", value: presenceData.retard || 0 },
      { name: "Congé", value: presenceData.conge || 0 },
    ]
    setAttendanceData(attendanceData)

    // Données pour le graphique de congés
    const leaveData = [
      { name: "En attente", value: congeData.enAttente || 0 },
      { name: "Approuvés", value: congeData.approuves || 0 },
      { name: "Refusés", value: congeData.refuses || 0 },
    ]
    setLeaveData(leaveData)
  }

  // Rafraîchir les données
  const handleRefresh = () => {
    setLoading(true)
    // Réexécuter l'effet useEffect
    const fetchDashboardData = async () => {
      try {
        // Récupérer les statistiques
        const statsResponse = await axios.get(`${API_URL}/reports/dashboard`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        })

        setStats(statsResponse.data.stats)
        setUserStats(statsResponse.data.userStats)

        // Récupérer les congés récents
        const leavesResponse = await axios.get(`${API_URL}/leaves/me`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        })

        setRecentLeaves(leavesResponse.data.slice(0, 5))

        // Récupérer les tâches récentes
        const tasksResponse = await axios.get(`${API_URL}/tasks/me`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        })

        setRecentTasks(tasksResponse.data.slice(0, 5))

        // Préparer les données pour les graphiques
        prepareChartData(statsResponse.data)
      } catch (error) {
        console.error("Erreur lors de la récupération des données du tableau de bord:", error)
        setError("Erreur lors de la récupération des données. Veuillez réessayer.")
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }

  // Obtenir le statut de congé
  const getLeaveStatusChip = (status) => {
    switch (status) {
      case "approuve":
        return <Chip label="Approuvé" color="success" size="small" icon={<CheckCircleIcon />} />
      case "refuse":
        return <Chip label="Refusé" color="error" size="small" icon={<CancelIcon />} />
      case "en_attente":
        return <Chip label="En attente" color="warning" size="small" icon={<HourglassEmptyIcon />} />
      default:
        return <Chip label="Inconnu" color="default" size="small" />
    }
  }

  // Obtenir le statut de tâche
  const getTaskStatusChip = (status) => {
    switch (status) {
      case "terminee":
        return <Chip label="Terminée" color="success" size="small" />
      case "en_cours":
        return <Chip label="En cours" color="primary" size="small" />
      case "en_revue":
        return <Chip label="En revue" color="info" size="small" />
      case "a_faire":
        return <Chip label="À faire" color="warning" size="small" />
      default:
        return <Chip label="Inconnu" color="default" size="small" />
    }
  }

  if (loading && !stats) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "80vh" }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <PageHeader
        title={`Bonjour, ${user?.prenom || "Utilisateur"} !`}
        subtitle="Bienvenue sur votre tableau de bord"
        action={
          <Tooltip title="Rafraîchir les données">
            <IconButton onClick={handleRefresh} disabled={loading}>
              {loading ? <CircularProgress size={24} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Cartes de statistiques */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {user?.role === "admin" && (
          <>
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard
                title="Utilisateurs"
                value={stats?.utilisateurs.total || 0}
                icon={<PeopleIcon />}
                color="primary"
                onClick={() => navigate("/admin/users")}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard
                title="Départements"
                value={stats?.departements.total || 0}
                icon={<BusinessIcon />}
                color="secondary"
                onClick={() => navigate("/admin/departments")}
              />
            </Grid>
          </>
        )}

        {(user?.role === "admin" || user?.role === "assistant" || user?.role === "manager") && (
          <>
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard
                title="Présences aujourd'hui"
                value={stats?.presences.aujourd_hui.present || 0}
                icon={<AccessTimeIcon />}
                color="success"
                onClick={() => navigate("/attendance")}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard
                title="Congés en attente"
                value={stats?.conges.enAttente || 0}
                icon={<EventNoteIcon />}
                color="warning"
                onClick={() => navigate("/leaves/approval")}
              />
            </Grid>
          </>
        )}

        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Mes tâches"
            value={recentTasks.length}
            icon={<TaskIcon />}
            color="info"
            onClick={() => navigate("/tasks")}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Messages non lus"
            value={userStats?.messages.nonLus || 0}
            icon={<MessageIcon />}
            color="error"
            onClick={() => navigate("/messages")}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Solde de congés"
            value={userStats?.conges.solde || 0}
            icon={<EventNoteIcon />}
            color="primary"
            subtitle="jours restants"
            onClick={() => navigate("/leaves")}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Mes congés approuvés"
            value={userStats?.conges.approuves || 0}
            icon={<CheckCircleIcon />}
            color="success"
            onClick={() => navigate("/leaves")}
          />
        </Grid>
      </Grid>

      {/* Graphiques et listes */}
      <Grid container spacing={3}>
        {/* Graphiques */}
        <Grid item xs={12} md={8}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <CustomChart
                type="bar"
                title={
                  user?.role === "employee"
                    ? "Mes statistiques de présence du mois"
                    : "Statistiques de présence du mois"
                }
                data={attendanceData}
                loading={loading}
                colors={["#4caf50", "#f44336", "#ff9800", "#2196f3"]}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <CustomChart
                type="pie"
                title={user?.role === "employee" ? "Mes congés" : "Répartition des congés"}
                data={leaveData}
                loading={loading}
                colors={["#ff9800", "#4caf50", "#f44336"]}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Card sx={{ height: "100%", borderRadius: 2, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)" }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Actions rapides
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<EventNoteIcon />}
                        onClick={() => navigate("/leaves/request")}
                      >
                        Demander un congé
                      </Button>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<MessageIcon />}
                        onClick={() => navigate("/messages")}
                      >
                        Messages
                      </Button>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Button variant="outlined" fullWidth startIcon={<TaskIcon />} onClick={() => navigate("/tasks")}>
                        Mes tâches
                      </Button>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<PersonIcon />}
                        onClick={() => navigate("/profile")}
                      >
                        Mon profil
                      </Button>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>

        {/* Listes */}
        <Grid item xs={12} md={4}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper sx={{ p: 2, borderRadius: 2, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)" }}>
                <Typography variant="h6" gutterBottom>
                  Mes congés récents
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {recentLeaves.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                    Aucun congé récent
                  </Typography>
                ) : (
                  <List>
                    {recentLeaves.map((leave) => (
                      <ListItem key={leave._id} secondaryAction={getLeaveStatusChip(leave.statut)} sx={{ px: 0 }}>
                        <ListItemIcon>
                          <EventNoteIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText
                          primary={`${leave.typeConge.charAt(0).toUpperCase() + leave.typeConge.slice(1)}`}
                          secondary={`Du ${new Date(leave.dateDebut).toLocaleDateString()} au ${new Date(leave.dateFin).toLocaleDateString()}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
                <Box sx={{ mt: 2, textAlign: "right" }}>
                  <Button variant="text" size="small" onClick={() => navigate("/leaves")}>
                    Voir tous les congés
                  </Button>
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12}>
              <Paper sx={{ p: 2, borderRadius: 2, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)" }}>
                <Typography variant="h6" gutterBottom>
                  Mes tâches récentes
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {recentTasks.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                    Aucune tâche récente
                  </Typography>
                ) : (
                  <List>
                    {recentTasks.map((task) => (
                      <ListItem key={task._id} secondaryAction={getTaskStatusChip(task.statut)} sx={{ px: 0 }}>
                        <ListItemIcon>
                          <TaskIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText
                          primary={task.titre}
                          secondary={`Échéance: ${task.dateEcheance ? new Date(task.dateEcheance).toLocaleDateString() : "Non définie"}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
                <Box sx={{ mt: 2, textAlign: "right" }}>
                  <Button variant="text" size="small" onClick={() => navigate("/tasks")}>
                    Voir toutes les tâches
                  </Button>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  )
}

export default DashboardPage
