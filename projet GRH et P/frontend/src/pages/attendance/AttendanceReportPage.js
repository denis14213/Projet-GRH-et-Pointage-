"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Grid,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
} from "@mui/material"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import {
  FileDownload as FileDownloadIcon,
  ArrowBack as ArrowBackIcon,
  TableChart as ExcelIcon,
} from "@mui/icons-material"
import { format, startOfMonth, endOfMonth } from "date-fns"
import { fr } from "date-fns/locale"
import axios from "axios"
import { API_URL } from "../../config"
import PageHeader from "../../components/common/PageHeader"
import CustomChart from "../../components/common/CustomChart"
import { useNotification } from "../../contexts/NotificationContext"

// Page de rapport de pointage
const AttendanceReportPage = () => {
  const navigate = useNavigate()
  const { showNotification } = useNotification()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [departments, setDepartments] = useState([])
  const [reportData, setReportData] = useState(null)
  const [filters, setFilters] = useState({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
    departement: "",
    format: "json",
  })
  const [attendanceData, setAttendanceData] = useState([])
  const [statusData, setStatusData] = useState([])

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
        setError("Erreur lors de la récupération des départements. Veuillez réessayer.")
      }
    }

    fetchDepartments()
  }, [])

  // Générer un rapport
  const handleGenerateReport = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (filters.startDate) {
        params.append("startDate", filters.startDate.toISOString())
      }
      if (filters.endDate) {
        params.append("endDate", filters.endDate.toISOString())
      }
      if (filters.departement) {
        params.append("departement", filters.departement)
      }
      params.append("format", "json")

      const response = await axios.get(`${API_URL}/attendance/report?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      setReportData(response.data)

      // Préparer les données pour les graphiques
      prepareChartData(response.data)

      showNotification("success", "Rapport généré avec succès")
    } catch (error) {
      console.error("Erreur lors de la génération du rapport:", error)
      setError("Erreur lors de la génération du rapport. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  // Préparer les données pour les graphiques
  const prepareChartData = (data) => {
    // Données pour le graphique de présence par jour
    const attendanceByDay = {}
    data.forEach((attendance) => {
      const date = format(new Date(attendance.date), "yyyy-MM-dd")
      if (!attendanceByDay[date]) {
        attendanceByDay[date] = {
          date,
          present: 0,
          absent: 0,
          retard: 0,
          conge: 0,
        }
      }
      attendanceByDay[date][attendance.statut]++
    })

    const attendanceData = Object.values(attendanceByDay).sort((a, b) => new Date(a.date) - new Date(b.date))
    setAttendanceData(
      attendanceData.map((item) => ({
        ...item,
        date: format(new Date(item.date), "dd/MM"),
      })),
    )

    // Données pour le graphique de statut
    const statusCount = {
      present: 0,
      absent: 0,
      retard: 0,
      conge: 0,
    }
    data.forEach((attendance) => {
      statusCount[attendance.statut]++
    })

    setStatusData([
      { name: "Présent", value: statusCount.present },
      { name: "Absent", value: statusCount.absent },
      { name: "Retard", value: statusCount.retard },
      { name: "Congé", value: statusCount.conge },
    ])
  }

  // Télécharger le rapport
  const handleDownloadReport = async (format) => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (filters.startDate) {
        params.append("startDate", filters.startDate.toISOString())
      }
      if (filters.endDate) {
        params.append("endDate", filters.endDate.toISOString())
      }
      if (filters.departement) {
        params.append("departement", filters.departement)
      }
      params.append("format", format)

      const token = localStorage.getItem("token")
      if (!token) {
        setError("Authentification requise. Veuillez vous reconnecter.")
        setLoading(false)
        return
      }

      // Télécharger le fichier en utilisant fetch
      const response = await fetch(`${API_URL}/attendance/report?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `rapport_pointage_${new Date().toISOString()}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      showNotification("success", "Rapport téléchargé avec succès")
    } catch (error) {
      console.error("Erreur lors du téléchargement du rapport:", error)
      setError("Erreur lors du téléchargement du rapport. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box>
      <PageHeader
        title="Rapport de pointage"
        subtitle="Générez et analysez les rapports de présence"
        breadcrumbs={[
          { label: "Pointage", link: "/attendance" },
          { label: "Rapport", link: "/attendance/report" },
        ]}
        action={
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate("/attendance")}>
            Retour
          </Button>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Filtres */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, borderRadius: 2, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)" }}>
            <Typography variant="h6" gutterBottom>
              Filtres du rapport
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={3}>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
                  <DatePicker
                    label="Date de début"
                    value={filters.startDate}
                    onChange={(date) => setFilters({ ...filters, startDate: date })}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
                  <DatePicker
                    label="Date de fin"
                    value={filters.endDate}
                    onChange={(date) => setFilters({ ...filters, endDate: date })}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel id="departement-label">Département</InputLabel>
                  <Select
                    labelId="departement-label"
                    id="departement"
                    value={filters.departement}
                    onChange={(e) => setFilters({ ...filters, departement: e.target.value })}
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
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleGenerateReport}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : null}
                >
                  {loading ? "Génération..." : "Générer le rapport"}
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Graphiques et statistiques */}
        {reportData && (
          <>
            <Grid item xs={12} md={8}>
              <CustomChart
                type="bar"
                title="Présences par jour"
                data={attendanceData}
                xAxisDataKey="date"
                series={[
                  { dataKey: "present", name: "Présent", color: "#4caf50" },
                  { dataKey: "absent", name: "Absent", color: "#f44336" },
                  { dataKey: "retard", name: "Retard", color: "#ff9800" },
                  { dataKey: "conge", name: "Congé", color: "#2196f3" },
                ]}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <CustomChart
                type="pie"
                title="Répartition des statuts"
                data={statusData}
                colors={["#4caf50", "#f44336", "#ff9800", "#2196f3"]}
              />
            </Grid>
            <Grid item xs={12}>
              <Paper sx={{ p: 3, borderRadius: 2, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)" }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                  <Typography variant="h6">Télécharger le rapport</Typography>
                  <Box sx={{ display: "flex", gap: 2 }}>
                    <Button
                      variant="outlined"
                      startIcon={<ExcelIcon />}
                      onClick={() => handleDownloadReport("excel")}
                      disabled={!reportData}
                    >
                      Excel
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<FileDownloadIcon />}
                      onClick={() => handleDownloadReport("excel")}
                      disabled={!reportData}
                    >
                      Télécharger
                    </Button>
                  </Box>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  Le rapport contient les données de pointage pour la période du{" "}
                  {filters.startDate ? format(filters.startDate, "dd/MM/yyyy") : ""} au{" "}
                  {filters.endDate ? format(filters.endDate, "dd/MM/yyyy") : ""}.
                  {filters.departement
                    ? ` Filtré par département: ${
                        departments.find((d) => d._id === filters.departement)?.nom || "Inconnu"
                      }.`
                    : ""}
                </Typography>
              </Paper>
            </Grid>
          </>
        )}
      </Grid>
    </Box>
  )
}

export default AttendanceReportPage
