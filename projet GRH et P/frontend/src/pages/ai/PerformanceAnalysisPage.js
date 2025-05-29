"use client"

import { useState, useEffect } from "react"
import {
  Box,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  LinearProgress,
} from "@mui/material"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { Person as PersonIcon } from "@mui/icons-material"
import axios from "axios"
import { API_URL } from "../../config"
import { useAuth } from "../../contexts/AuthContext"
import { useNotification } from "../../contexts/NotificationContext"
import PageHeader from "../../components/common/PageHeader"

// Couleurs pour les graphiques
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"]

// Page d'analyse des performances
const PerformanceAnalysisPage = () => {
  const { user } = useAuth()
  const { showNotification } = useNotification()
  const [performance, setPerformance] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [periode, setPeriode] = useState("mois")
  const [departements, setDepartements] = useState([])
  const [selectedDepartement, setSelectedDepartement] = useState("")
  const [loadingDepartements, setLoadingDepartements] = useState(false)

  // Récupérer les départements
  useEffect(() => {
    const fetchDepartements = async () => {
      try {
        setLoadingDepartements(true)
        setError(null)

        const token = localStorage.getItem("token")
        if (!token) {
          setError("Session expirée. Veuillez vous reconnecter.")
          setLoadingDepartements(false)
          return
        }

        const response = await axios.get(`${API_URL}/departments`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        setDepartements(response.data)
      } catch (error) {
        console.error("Erreur lors de la récupération des départements:", error)
        if (error.response) {
          setError(`Erreur: ${error.response.data.message || "Problème lors de la récupération des départements"}`)
        } else if (error.request) {
          setError("Aucune réponse du serveur. Vérifiez votre connexion.")
        } else {
          setError("Erreur lors de la récupération des départements")
        }
      } finally {
        setLoadingDepartements(false)
      }
    }

    if (user && user.role === "admin") {
      fetchDepartements()
    }
  }, [user])

  // Récupérer les données de performance
  useEffect(() => {
    const fetchPerformanceData = async () => {
      try {
        setLoading(true)
        setError(null)

        const token = localStorage.getItem("token")
        if (!token) {
          setError("Session expirée. Veuillez vous reconnecter.")
          setLoading(false)
          return
        }

        let url = `${API_URL}/ai/analyze/tasks?periode=${periode}`
        if (selectedDepartement) {
          url += `&departementId=${selectedDepartement}`
        }

        const response = await axios.get(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        setPerformance(response.data.performance)
      } catch (error) {
        console.error("Erreur lors de la récupération des données de performance:", error)
        if (error.response) {
          setError(`Erreur: ${error.response.data.message || "Problème lors de la récupération des données"}`)
        } else if (error.request) {
          setError("Aucune réponse du serveur. Vérifiez votre connexion.")
        } else {
          setError("Erreur lors de la récupération des données")
        }
      } finally {
        setLoading(false)
      }
    }

    fetchPerformanceData()
  }, [periode, selectedDepartement])

  // Préparer les données pour les graphiques
  const prepareStatusData = () => {
    if (!performance || !performance.tasksByStatus) return []

    return Object.entries(performance.tasksByStatus).map(([status, count]) => ({
      name: formatStatus(status),
      value: count,
    }))
  }

  const preparePriorityData = () => {
    if (!performance || !performance.tasksByPriority) return []

    return Object.entries(performance.tasksByPriority).map(([priority, count]) => ({
      name: formatPriority(priority),
      value: count,
    }))
  }

  // Formater les statuts pour l'affichage
  const formatStatus = (status) => {
    switch (status) {
      case "a_faire":
        return "À faire"
      case "en_cours":
        return "En cours"
      case "en_revue":
        return "En revue"
      case "terminee":
        return "Terminée"
      default:
        return status
    }
  }

  // Formater les priorités pour l'affichage
  const formatPriority = (priority) => {
    switch (priority) {
      case "basse":
        return "Basse"
      case "moyenne":
        return "Moyenne"
      case "haute":
        return "Haute"
      case "urgente":
        return "Urgente"
      default:
        return priority
    }
  }

  return (
    <Box>
      <PageHeader
        title="Analyse des performances"
        subtitle="Suivez les performances des tâches et des équipes"
        breadcrumbs={[
          { label: "Assistant RH", link: "/ai-assistant" },
          { label: "Analyse des performances", link: "/ai-assistant/performance" },
        ]}
      />

      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Période</InputLabel>
              <Select value={periode} onChange={(e) => setPeriode(e.target.value)} label="Période">
                <MenuItem value="semaine">Dernière semaine</MenuItem>
                <MenuItem value="mois">Dernier mois</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          {user && user.role === "admin" && (
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Département</InputLabel>
                <Select
                  value={selectedDepartement}
                  onChange={(e) => setSelectedDepartement(e.target.value)}
                  label="Département"
                  disabled={loadingDepartements}
                >
                  <MenuItem value="">Tous les départements</MenuItem>
                  {departements.map((dept) => (
                    <MenuItem key={dept._id} value={dept._id}>
                      {dept.nom}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}
        </Grid>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
          <CircularProgress />
        </Box>
      ) : performance ? (
        <Grid container spacing={3}>
          {/* Cartes de statistiques */}
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent sx={{ textAlign: "center" }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Tâches totales
                </Typography>
                <Typography variant="h3">{performance.totalTasks}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent sx={{ textAlign: "center" }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Tâches terminées
                </Typography>
                <Typography variant="h3">{performance.completedTasks}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent sx={{ textAlign: "center" }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Taux de complétion
                </Typography>
                <Typography variant="h3">{performance.completionRate}%</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent sx={{ textAlign: "center" }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Temps moyen de complétion
                </Typography>
                <Typography variant="h3">{performance.averageCompletionTime} jours</Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Graphiques */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: "100%" }}>
              <Typography variant="h6" gutterBottom>
                Tâches par statut
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={prepareStatusData()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {prepareStatusData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: "100%" }}>
              <Typography variant="h6" gutterBottom>
                Tâches par priorité
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={preparePriorityData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" name="Nombre de tâches" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* Performance par utilisateur */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Performance par utilisateur
              </Typography>
              {performance.tasksByUser && performance.tasksByUser.length > 0 ? (
                <List>
                  {performance.tasksByUser.map((user, index) => (
                    <Box key={index} sx={{ mb: 2 }}>
                      <ListItem>
                        <ListItemAvatar>
                          <Avatar>
                            <PersonIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={user.name}
                          secondary={
                            <Box sx={{ mt: 1 }}>
                              <Grid container spacing={2}>
                                <Grid item xs={12} sm={6} md={3}>
                                  <Typography variant="body2">
                                    Tâches totales: <strong>{user.total}</strong>
                                  </Typography>
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                  <Typography variant="body2">
                                    Terminées: <strong>{user.completed}</strong>
                                  </Typography>
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                  <Typography variant="body2">
                                    En cours: <strong>{user.inProgress}</strong>
                                  </Typography>
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                  <Typography variant="body2">
                                    En retard: <strong>{user.overdue}</strong>
                                  </Typography>
                                </Grid>
                              </Grid>
                              <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
                                <Typography variant="body2" sx={{ mr: 1, minWidth: 180 }}>
                                  Taux de complétion:
                                </Typography>
                                <Box sx={{ width: "100%" }}>
                                  <LinearProgress
                                    variant="determinate"
                                    value={(user.completed / user.total) * 100}
                                    sx={{ height: 10, borderRadius: 5 }}
                                  />
                                </Box>
                                <Typography variant="body2" sx={{ ml: 1 }}>
                                  {((user.completed / user.total) * 100).toFixed(0)}%
                                </Typography>
                              </Box>
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < performance.tasksByUser.length - 1 && <Divider />}
                    </Box>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 3 }}>
                  Aucune donnée disponible
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      ) : (
        <Box sx={{ textAlign: "center", p: 5 }}>
          <Typography variant="body1" color="text.secondary">
            Aucune donnée disponible pour la période sélectionnée
          </Typography>
        </Box>
      )}
    </Box>
  )
}

export default PerformanceAnalysisPage
