"use client"

import { useState, useEffect } from "react"
import {
  Box,
  Typography,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  CircularProgress,
  Alert,
  Divider,
  Card,
  CardContent,
} from "@mui/material"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import { Download as DownloadIcon, Refresh as RefreshIcon } from "@mui/icons-material"
import PersonIcon from "@mui/icons-material/Person"
import BusinessIcon from "@mui/icons-material/Business"
import EventBusyIcon from "@mui/icons-material/EventBusy"
import AssignmentIcon from "@mui/icons-material/Assignment"
import axios from "axios"
import { API_URL } from "../../config"
import { useNotification } from "../../contexts/NotificationContext"
import { useAuth } from "../../contexts/AuthContext"
import PageHeader from "../../components/common/PageHeader"
import StatsCard from "../../components/common/StatsCard"
import CustomChart from "../../components/common/CustomChart"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

// Page de rapports
const ReportsPage = () => {
  const { showNotification } = useNotification()
  const { user } = useAuth()

  // États
  const [reportType, setReportType] = useState("attendance")
  const [timeRange, setTimeRange] = useState("month")
  const [departmentFilter, setDepartmentFilter] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [reportData, setReportData] = useState(null)
  const [departments, setDepartments] = useState([])
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    totalDepartments: 0,
    averageAttendance: 0,
    leaveRequests: 0,
    pendingTasks: 0,
  })
  const [filters, setFilters] = useState({
    startDate: null,
    endDate: null,
  })
  const [chartData, setChartData] = useState(null)

  // Récupérer les départements
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await axios.get(`${API_URL}/departments`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        })

        setDepartments(response.data)
      } catch (error) {
        console.error("Erreur lors de la récupération des départements:", error)
      }
    }

    fetchDepartments()
  }, [])

  // Récupérer les statistiques générales
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${API_URL}/reports/dashboard`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        })

        // Extraire les statistiques du tableau de bord
        const { stats, userStats } = response.data

        // Mettre à jour l'état avec les statistiques extraites
        setStats({
          totalEmployees: stats.utilisateurs.total,
          activeEmployees: stats.utilisateurs.total, // Mettre à jour avec la logique appropriée si nécessaire
          totalDepartments: stats.departements.total,
          averageAttendance: 80, // Mettre à jour avec la logique appropriée si nécessaire
          leaveRequests: stats.conges.enAttente,
          pendingTasks: 5, // Mettre à jour avec la logique appropriée si nécessaire
        })
      } catch (error) {
        console.error("Erreur lors de la récupération des statistiques:", error)
      }
    }

    fetchStats()
  }, [])

  const prepareChartData = (data) => {
    try {
      if (reportType === "attendance" && data?.utilisateurs) {
        // Aggregate attendance data
        const attendanceData = data.utilisateurs.reduce((acc, user) => {
          acc.present = (acc.present || 0) + (user.presence?.present || 0)
          acc.absent = (acc.absent || 0) + (user.presence?.absent || 0)
          acc.retard = (acc.retard || 0) + (user.presence?.retard || 0)
          return acc
        }, {})

        setChartData({
          attendanceRate: {
            labels: ["Présent", "Absent", "Retard"],
            datasets: [
              {
                data: [attendanceData.present || 0, attendanceData.absent || 0, attendanceData.retard || 0],
                backgroundColor: ["#4caf50", "#f44336", "#ff9800"],
              },
            ],
          },
        })
      } else if (reportType === "task" && Array.isArray(data)) {
        const taskStatusData = data.reduce(
          (acc, task) => {
            acc[task.statut] = (acc[task.statut] || 0) + 1
            return acc
          },
          { a_faire: 0, en_cours: 0, en_revue: 0, terminee: 0 },
        )

        setChartData({
          taskStatus: {
            labels: ["À faire", "En cours", "En revue", "Terminée"],
            datasets: [
              {
                data: [
                  taskStatusData.a_faire || 0,
                  taskStatusData.en_cours || 0,
                  taskStatusData.en_revue || 0,
                  taskStatusData.terminee || 0,
                ],
                backgroundColor: ["#9e9e9e", "#2196f3", "#ff9800", "#4caf50"],
              },
            ],
          },
        })
      } else if (reportType === "leave" && Array.isArray(data)) {
        const leaveStatusData = data.reduce(
          (acc, leave) => {
            acc[leave.statut] = (acc[leave.statut] || 0) + 1
            return acc
          },
          { en_attente: 0, approuve: 0, refuse: 0 },
        )

        setChartData({
          leaveStatus: {
            labels: ["En attente", "Approuvé", "Refusé"],
            datasets: [
              {
                data: [leaveStatusData.en_attente, leaveStatusData.approuve, leaveStatusData.refuse],
                backgroundColor: ["#ff9800", "#4caf50", "#f44336"],
              },
            ],
          },
        })
      } else if (reportType === "employee" && Array.isArray(data)) {
        const roleDistributionData = data.reduce(
          (acc, employee) => {
            acc[employee.role] = (acc[employee.role] || 0) + 1
            return acc
          },
          { admin: 0, manager: 0, employee: 0 },
        )

        setChartData({
          roleDistribution: {
            labels: ["Admin", "Manager", "Employé"],
            datasets: [
              {
                data: [
                  roleDistributionData.admin || 0,
                  roleDistributionData.manager || 0,
                  roleDistributionData.employee || 0,
                ],
                backgroundColor: ["#9c27b0", "#2196f3", "#4caf50"],
              },
            ],
          },
        })
      } else {
        console.warn("Unsupported report type or invalid data format")
        setChartData(null)
      }
    } catch (error) {
      console.error("Error preparing chart data:", error)
      setError("Error preparing chart data. Please check the data format.")
      setChartData(null)
    }
  }

  // Générer le rapport
  const generateReport = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      params.append("format", "json") // Ensure format is always JSON

      if (filters.startDate) {
        params.append("startDate", format(filters.startDate, "yyyy-MM-dd"))
      }
      if (filters.endDate) {
        params.append("endDate", format(filters.endDate, "yyyy-MM-dd"))
      }
      if (departmentFilter) {
        params.append("departement", departmentFilter)
      }

      let reportUrl = ""
      switch (reportType) {
        case "attendance":
          reportUrl = `${API_URL}/reports/global?${params.toString()}`
          break
        case "leave":
          reportUrl = `${API_URL}/reports/leaves?${params.toString()}`
          break
        case "task":
          reportUrl = `${API_URL}/reports/tasks?${params.toString()}`
          break
        case "employee":
          reportUrl = `${API_URL}/reports/employees?${params.toString()}`
          break
        default:
          throw new Error("Type de rapport non pris en charge")
      }

      const response = await axios.get(reportUrl, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      setReportData(response.data)
      prepareChartData(response.data)
    } catch (error) {
      console.error("Erreur lors de la génération du rapport:", error)
      setError(error.response?.data?.message || "Erreur lors de la génération du rapport. Veuillez réessayer.")
      showNotification("error", "Erreur lors de la génération du rapport")
    } finally {
      setLoading(false)
    }
  }

  // Télécharger le rapport
  const downloadReport = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (filters.startDate) {
        params.append("startDate", format(filters.startDate, "yyyy-MM-dd"))
      }
      if (filters.endDate) {
        params.append("endDate", format(filters.endDate, "yyyy-MM-dd"))
      }
      if (departmentFilter) {
        params.append("departement", departmentFilter)
      }
      params.append("format", "excel")

      let reportUrl = ""
      switch (reportType) {
        case "attendance":
          reportUrl = `${API_URL}/reports/global?${params.toString()}`
          break
        case "leave":
          reportUrl = `${API_URL}/reports/leaves?${params.toString()}`
          break
        case "task":
          reportUrl = `${API_URL}/reports/tasks?${params.toString()}`
          break
        case "employee":
          reportUrl = `${API_URL}/reports/employees?${params.toString()}`
          break
        default:
          throw new Error("Type de rapport non pris en charge")
      }

      // Télécharger le fichier en utilisant fetch
      window.location.href = `${reportUrl}&token=${localStorage.getItem("token")}`
    } catch (error) {
      console.error("Erreur lors du téléchargement du rapport:", error)
      setError("Erreur lors du téléchargement du rapport. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  // Obtenir le titre du rapport
  const getReportTitle = () => {
    let title = ""

    switch (reportType) {
      case "attendance":
        title = "Rapport de présence"
        break
      case "leave":
        title = "Rapport de congés"
        break
      case "task":
        title = "Rapport de tâches"
        break
      case "employee":
        title = "Rapport d'employés"
        break
      default:
        title = "Rapport"
    }

    return title
  }

  // Obtenir la période du rapport
  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case "week":
        return "Cette semaine"
      case "month":
        return "Ce mois"
      case "quarter":
        return "Ce trimestre"
      case "year":
        return "Cette année"
      default:
        return ""
    }
  }

  return (
    <Box>
      <PageHeader
        title="Rapports"
        subtitle="Générez et téléchargez des rapports sur les présences, congés, tâches et employés"
        breadcrumbs={[{ label: "Rapports", link: "/reports" }]}
      />

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard title="Employés" value={stats.totalEmployees} icon={<PersonIcon />} color="primary" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard title="Départements" value={stats.totalDepartments} icon={<BusinessIcon />} color="success" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard title="Demandes de congés" value={stats.leaveRequests} icon={<EventBusyIcon />} color="warning" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard title="Tâches en attente" value={stats.pendingTasks} icon={<AssignmentIcon />} color="error" />
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, borderRadius: 2, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)", mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Générer un rapport
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel id="report-type-label">Type de rapport</InputLabel>
              <Select
                labelId="report-type-label"
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                label="Type de rapport"
              >
                <MenuItem value="attendance">Présences</MenuItem>
                <MenuItem value="leave">Congés</MenuItem>
                <MenuItem value="task">Tâches</MenuItem>
                <MenuItem value="employee">Employés</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={4}>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
              <DatePicker
                label="Date de début"
                value={filters.startDate}
                onChange={(date) => setFilters({ ...filters, startDate: date })}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </LocalizationProvider>
          </Grid>

          <Grid item xs={12} md={4}>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
              <DatePicker
                label="Date de fin"
                value={filters.endDate}
                onChange={(date) => setFilters({ ...filters, endDate: date })}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </LocalizationProvider>
          </Grid>

          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel id="department-filter-label">Département</InputLabel>
              <Select
                labelId="department-filter-label"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                label="Département"
              >
                <MenuItem value="">Tous les départements</MenuItem>
                {departments.map((dept) => (
                  <MenuItem key={dept._id} value={dept._id}>
                    {dept.nom}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => {
                  setReportType("attendance")
                  setTimeRange("month")
                  setDepartmentFilter("")
                  setReportData(null)
                }}
              >
                Réinitialiser
              </Button>
              <Button variant="contained" onClick={generateReport} disabled={loading}>
                {loading ? <CircularProgress size={24} /> : "Générer le rapport"}
              </Button>
              <Button variant="outlined" startIcon={<DownloadIcon />} onClick={downloadReport} disabled={loading}>
                Télécharger
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {reportData && (
        <Paper sx={{ p: 3, borderRadius: 2, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h6">
              {getReportTitle()} - {getTimeRangeLabel()}
              {departmentFilter && ` - ${departments.find((d) => d._id === departmentFilter)?.nom}`}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Généré le {new Date().toLocaleDateString("fr-FR")}
            </Typography>
          </Box>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={3}>
            {reportType === "attendance" && chartData?.attendanceRate && (
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Taux de présence
                    </Typography>
                    <CustomChart
                      type="pie"
                      data={chartData.attendanceRate.datasets[0].data.map((value, index) => ({
                        name: chartData.attendanceRate.labels[index],
                        value,
                      }))}
                      dataKey="value"
                      nameKey="name"
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                      }}
                      height={300}
                    />
                  </CardContent>
                </Card>
              </Grid>
            )}
            {reportType === "task" && chartData?.taskStatus && (
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Statut des tâches
                    </Typography>
                    <CustomChart
                      type="pie"
                      data={chartData.taskStatus.datasets[0].data.map((value, index) => ({
                        name: chartData.taskStatus.labels[index],
                        value,
                      }))}
                      dataKey="value"
                      nameKey="name"
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                      }}
                      height={300}
                    />
                  </CardContent>
                </Card>
              </Grid>
            )}

            {reportType === "leave" && chartData?.leaveStatus && (
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Statut des congés
                    </Typography>
                    <CustomChart
                      type="pie"
                      data={chartData.leaveStatus.datasets[0].data.map((value, index) => ({
                        name: chartData.leaveStatus.labels[index],
                        value,
                      }))}
                      dataKey="value"
                      nameKey="name"
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                      }}
                      height={300}
                    />
                  </CardContent>
                </Card>
              </Grid>
            )}

            {reportType === "employee" && chartData?.roleDistribution && (
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Distribution des rôles
                    </Typography>
                    <CustomChart
                      type="pie"
                      data={chartData.roleDistribution.datasets[0].data.map((value, index) => ({
                        name: chartData.roleDistribution.labels[index],
                        value,
                      }))}
                      dataKey="value"
                      nameKey="name"
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                      }}
                      height={300}
                    />
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </Paper>
      )}
    </Box>
  )
}

export default ReportsPage
