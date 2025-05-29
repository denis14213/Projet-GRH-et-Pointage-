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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Paper,
  Tabs,
  Tab,
  Divider,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
} from "@mui/material"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  FilterList as FilterListIcon,
  AccessTime as AccessTimeIcon,
  FileDownload as FileDownloadIcon,
  FileUpload as FileUploadIcon,
} from "@mui/icons-material"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import axios from "axios"
import { API_URL } from "../../config"
import PageHeader from "../../components/common/PageHeader"
import DataTable from "../../components/common/DataTable"
import { useNotification } from "../../contexts/NotificationContext"
import { useAuth } from "../../contexts/AuthContext"

// Page de gestion des pointages
const AttendancePage = () => {
  const navigate = useNavigate()
  const { showNotification } = useNotification()
  const { user } = useAuth()
  const [attendances, setAttendances] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [selectedAttendance, setSelectedAttendance] = useState(null)
  const [openRecordDialog, setOpenRecordDialog] = useState(false)
  const [openImportDialog, setOpenImportDialog] = useState(false)
  const [tabValue, setTabValue] = useState(0)
  const [users, setUsers] = useState([])
  const [departments, setDepartments] = useState([])
  const [filters, setFilters] = useState({
    startDate: null,
    endDate: null,
    departement: "",
    statut: "",
    search: "",
  })
  const [recordForm, setRecordForm] = useState({
    userId: "",
    type: "arrivee",
    date: new Date(),
    commentaire: "",
  })
  const [importFile, setImportFile] = useState(null)

  // Récupérer les pointages, utilisateurs et départements
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Récupérer les pointages
        const attendancesResponse = await axios.get(`${API_URL}/attendance`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        })

        // Récupérer les utilisateurs
        const usersResponse = await axios.get(`${API_URL}/users`, {
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

        setAttendances(attendancesResponse.data)
        setUsers(usersResponse.data)
        setDepartments(departmentsResponse.data)
      } catch (error) {
        console.error("Erreur lors de la récupération des données:", error)
        setError("Erreur lors de la récupération des données. Veuillez réessayer.")
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
          <Typography variant="body2">
            {value.prenom} {value.nom}
          </Typography>
        ) : (
          "Inconnu"
        ),
    },
    {
      id: "date",
      label: "Date",
      disablePadding: false,
      sortable: true,
      type: "date",
    },
    {
      id: "heureArrivee",
      label: "Heure d'arrivée",
      disablePadding: false,
      sortable: true,
      render: (value) => (value ? format(new Date(value), "HH:mm") : "-"),
    },
    {
      id: "heureDepart",
      label: "Heure de départ",
      disablePadding: false,
      sortable: true,
      render: (value) => (value ? format(new Date(value), "HH:mm") : "-"),
    },
    {
      id: "statut",
      label: "Statut",
      disablePadding: false,
      sortable: true,
      render: (value) => {
        let color
        let label
        switch (value) {
          case "present":
            color = "success"
            label = "Présent"
            break
          case "absent":
            color = "error"
            label = "Absent"
            break
          case "retard":
            color = "warning"
            label = "Retard"
            break
          case "conge":
            color = "info"
            label = "Congé"
            break
          default:
            color = "default"
            label = value
        }
        return <Chip label={label} color={color} size="small" />
      },
    },
    {
      id: "commentaire",
      label: "Commentaire",
      disablePadding: false,
      sortable: true,
    },
    {
      id: "enregistrePar",
      label: "Enregistré par",
      disablePadding: false,
      sortable: true,
      render: (value) =>
        value ? (
          <Typography variant="body2">
            {value.prenom} {value.nom}
          </Typography>
        ) : (
          "Système"
        ),
    },
  ]

  // Formater les données des pointages pour le tableau
  const formattedAttendances = attendances.map((attendance) => ({
    id: attendance._id,
    utilisateur: attendance.utilisateur,
    date: attendance.date,
    heureArrivee: attendance.heureArrivee,
    heureDepart: attendance.heureDepart,
    statut: attendance.statut,
    commentaire: attendance.commentaire,
    enregistrePar: attendance.enregistrePar,
  }))

  // Filtrer les pointages
  const filteredAttendances = formattedAttendances.filter((attendance) => {
    // Filtre par date de début
    if (filters.startDate && new Date(attendance.date) < filters.startDate) {
      return false
    }

    // Filtre par date de fin
    if (filters.endDate) {
      const endDate = new Date(filters.endDate)
      endDate.setHours(23, 59, 59, 999)
      if (new Date(attendance.date) > endDate) {
        return false
      }
    }

    // Filtre par département
    if (filters.departement && attendance.utilisateur?.departement?._id !== filters.departement) {
      return false
    }

    // Filtre par statut
    if (filters.statut && attendance.statut !== filters.statut) {
      return false
    }

    // Filtre par recherche (nom, prénom de l'utilisateur)
    if (filters.search && attendance.utilisateur) {
      const searchTerm = filters.search.toLowerCase()
      return (
        attendance.utilisateur.nom.toLowerCase().includes(searchTerm) ||
        attendance.utilisateur.prenom.toLowerCase().includes(searchTerm)
      )
    }

    return true
  })

  // Gérer le changement d'onglet
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue)
  }

  // Gérer l'ouverture de la boîte de dialogue de suppression
  const handleOpenDeleteDialog = (attendanceId) => {
    const attendance = attendances.find((a) => a._id === attendanceId)
    setSelectedAttendance(attendance)
    setOpenDeleteDialog(true)
  }

  // Gérer la fermeture de la boîte de dialogue de suppression
  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false)
    setSelectedAttendance(null)
  }

  // Supprimer un pointage
  const handleDeleteAttendance = async () => {
    if (!selectedAttendance) return

    try {
      setLoading(true)
      await axios.delete(`${API_URL}/attendance/${selectedAttendance._id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      // Mettre à jour la liste des pointages
      setAttendances(attendances.filter((attendance) => attendance._id !== selectedAttendance._id))
      showNotification("success", "Pointage supprimé avec succès")
    } catch (error) {
      console.error("Erreur lors de la suppression du pointage:", error)
      showNotification("error", "Erreur lors de la suppression du pointage")
    } finally {
      setLoading(false)
      handleCloseDeleteDialog()
    }
  }

  // Gérer l'ouverture de la boîte de dialogue d'enregistrement
  const handleOpenRecordDialog = () => {
    setRecordForm({
      userId: "",
      type: "arrivee",
      date: new Date(),
      commentaire: "",
    })
    setOpenRecordDialog(true)
  }

  // Gérer la fermeture de la boîte de dialogue d'enregistrement
  const handleCloseRecordDialog = () => {
    setOpenRecordDialog(false)
  }

  // Gérer le changement des champs du formulaire d'enregistrement
  const handleRecordFormChange = (field, value) => {
    setRecordForm({
      ...recordForm,
      [field]: value,
    })
  }

  // Enregistrer un pointage
  const handleRecordAttendance = async () => {
    try {
      setLoading(true)
      const response = await axios.post(
        `${API_URL}/attendance`,
        {
          userId: recordForm.userId,
          type: recordForm.type,
          date: recordForm.date,
          commentaire: recordForm.commentaire,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      )

      // Mettre à jour la liste des pointages
      const updatedAttendances = [...attendances]
      const existingIndex = updatedAttendances.findIndex(
        (a) =>
          a.utilisateur?._id === recordForm.userId &&
          new Date(a.date).toDateString() === new Date(recordForm.date).toDateString(),
      )

      if (existingIndex !== -1) {
        // Mettre à jour le pointage existant
        if (recordForm.type === "arrivee") {
          updatedAttendances[existingIndex].heureArrivee = recordForm.date
        } else {
          updatedAttendances[existingIndex].heureDepart = recordForm.date
        }
        updatedAttendances[existingIndex].commentaire = recordForm.commentaire
      } else {
        // Ajouter un nouveau pointage
        const newAttendance = response.data.attendance
        updatedAttendances.push(newAttendance)
      }

      setAttendances(updatedAttendances)
      showNotification("success", "Pointage enregistré avec succès")
      handleCloseRecordDialog()
    } catch (error) {
      console.error("Erreur lors de l'enregistrement du pointage:", error)
      setError(error.response?.data?.message || "Erreur lors de l'enregistrement du pointage. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  // Gérer l'ouverture de la boîte de dialogue d'importation
  const handleOpenImportDialog = () => {
    setImportFile(null)
    setOpenImportDialog(true)
  }

  // Gérer la fermeture de la boîte de dialogue d'importation
  const handleCloseImportDialog = () => {
    setOpenImportDialog(false)
  }

  // Gérer le changement de fichier d'importation
  const handleFileChange = (event) => {
    setImportFile(event.target.files[0])
  }

  // Importer des pointages
  const handleImportAttendance = async () => {
    if (!importFile) return

    try {
      setLoading(true)
      const formData = new FormData()
      formData.append("file", importFile)

      const response = await axios.post(`${API_URL}/attendance/import`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      // Rafraîchir la liste des pointages
      const attendancesResponse = await axios.get(`${API_URL}/attendance`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      setAttendances(attendancesResponse.data)

      showNotification("success", "Pointages importés avec succès")
      handleCloseImportDialog()
    } catch (error) {
      console.error("Erreur lors de l'importation des pointages:", error)
      setError(error.response?.data?.message || "Erreur lors de l'importation des pointages. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  // Générer un rapport
  const handleGenerateReport = async () => {
    try {
      setLoading(true)
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
      if (filters.statut) {
        params.append("statut", filters.statut)
      }
      params.append("format", "excel")

      // Télécharger le fichier
      window.location.href = `${API_URL}/attendance/report?${params.toString()}&token=${localStorage.getItem("token")}`
      setLoading(false)
    } catch (error) {
      console.error("Erreur lors de la génération du rapport:", error)
      setError("Erreur lors de la génération du rapport. Veuillez réessayer.")
      setLoading(false)
    }
  }

  // Réinitialiser les filtres
  const handleResetFilters = () => {
    setFilters({
      startDate: null,
      endDate: null,
      departement: "",
      statut: "",
      search: "",
    })
  }

  // Rafraîchir les données
  const handleRefresh = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await axios.get(`${API_URL}/attendance`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      setAttendances(response.data)
    } catch (error) {
      console.error("Erreur lors de la récupération des pointages:", error)
      setError("Erreur lors de la récupération des pointages. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box>
      <PageHeader
        title="Gestion des pointages"
        subtitle="Enregistrez et suivez les présences des employés"
        breadcrumbs={[{ label: "Pointage", link: "/attendance" }]}
        action={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<FileDownloadIcon />}
              onClick={handleGenerateReport}
              disabled={loading}
            >
              Exporter
            </Button>
            <Button variant="outlined" startIcon={<FileUploadIcon />} onClick={handleOpenImportDialog}>
              Importer
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenRecordDialog}>
              Enregistrer un pointage
            </Button>
          </Box>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ mb: 3, borderRadius: 2, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)" }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="onglets de pointage" sx={{ px: 2 }}>
          <Tab label="Tous les pointages" />
          <Tab label="Filtres avancés" />
        </Tabs>
        <Divider />

        {tabValue === 0 ? (
          <Box sx={{ p: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Rechercher par nom ou prénom"
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
                    <MenuItem value="present">Présent</MenuItem>
                    <MenuItem value="absent">Absent</MenuItem>
                    <MenuItem value="retard">Retard</MenuItem>
                    <MenuItem value="conge">Congé</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
                  <DatePicker
                    label="Date"
                    value={filters.startDate}
                    onChange={(date) => setFilters({ ...filters, startDate: date })}
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
                      disabled={!filters.statut && !filters.search && !filters.startDate}
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
        ) : (
          <Box sx={{ p: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
                  <DatePicker
                    label="Date de début"
                    value={filters.startDate}
                    onChange={(date) => setFilters({ ...filters, startDate: date })}
                    slotProps={{ textField: { size: "small", fullWidth: true } }}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
                  <DatePicker
                    label="Date de fin"
                    value={filters.endDate}
                    onChange={(date) => setFilters({ ...filters, endDate: date })}
                    slotProps={{ textField: { size: "small", fullWidth: true } }}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel id="departement-filter-label">Département</InputLabel>
                  <Select
                    labelId="departement-filter-label"
                    id="departement-filter"
                    value={filters.departement}
                    label="Département"
                    onChange={(e) => setFilters({ ...filters, departement: e.target.value })}
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
                    <MenuItem value="present">Présent</MenuItem>
                    <MenuItem value="absent">Absent</MenuItem>
                    <MenuItem value="retard">Retard</MenuItem>
                    <MenuItem value="conge">Congé</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={handleResetFilters}
                    startIcon={<FilterListIcon />}
                  >
                    Réinitialiser les filtres
                  </Button>
                  <Button variant="contained" onClick={handleGenerateReport} startIcon={<FileDownloadIcon />}>
                    Générer un rapport
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>

      {/* Tableau des pointages */}
      <DataTable
        columns={columns}
        data={filteredAttendances}
        loading={loading}
        onEdit={(id) => {
          // Implémenter la modification d'un pointage
          const attendance = attendances.find((a) => a._id === id)
          if (attendance) {
            // Ouvrir une boîte de dialogue de modification
          }
        }}
        onDelete={handleOpenDeleteDialog}
      />

      {/* Boîte de dialogue de suppression */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Supprimer le pointage</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Êtes-vous sûr de vouloir supprimer ce pointage ? Cette action est irréversible.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Annuler</Button>
          <Button onClick={handleDeleteAttendance} color="error" startIcon={<DeleteIcon />}>
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Boîte de dialogue d'enregistrement */}
      <Dialog open={openRecordDialog} onClose={handleCloseRecordDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Enregistrer un pointage</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel id="user-label">Utilisateur</InputLabel>
                  <Select
                    labelId="user-label"
                    id="userId"
                    value={recordForm.userId}
                    onChange={(e) => handleRecordFormChange("userId", e.target.value)}
                    label="Utilisateur"
                  >
                    {users.map((user) => (
                      <MenuItem key={user._id} value={user._id}>
                        {user.prenom} {user.nom} ({user.email})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl component="fieldset" required>
                  <FormLabel component="legend">Type de pointage</FormLabel>
                  <RadioGroup
                    row
                    value={recordForm.type}
                    onChange={(e) => handleRecordFormChange("type", e.target.value)}
                  >
                    <FormControlLabel value="arrivee" control={<Radio />} label="Arrivée" />
                    <FormControlLabel value="depart" control={<Radio />} label="Départ" />
                  </RadioGroup>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
                  <DatePicker
                    label="Date"
                    value={recordForm.date}
                    onChange={(date) => handleRecordFormChange("date", date)}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  id="commentaire"
                  label="Commentaire"
                  multiline
                  rows={2}
                  value={recordForm.commentaire}
                  onChange={(e) => handleRecordFormChange("commentaire", e.target.value)}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRecordDialog}>Annuler</Button>
          <Button
            onClick={handleRecordAttendance}
            variant="contained"
            startIcon={<AccessTimeIcon />}
            disabled={!recordForm.userId}
          >
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Boîte de dialogue d'importation */}
      <Dialog open={openImportDialog} onClose={handleCloseImportDialog}>
        <DialogTitle>Importer des pointages</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Sélectionnez un fichier Excel contenant les pointages à importer. Le fichier doit contenir les colonnes
            suivantes : Email, Date, Heure d'arrivée, Heure de départ, Statut, Commentaire.
          </DialogContentText>
          <Box sx={{ mt: 2 }}>
            <input
              accept=".xlsx,.xls"
              id="import-file"
              type="file"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            <label htmlFor="import-file">
              <Button variant="outlined" component="span" startIcon={<FileUploadIcon />}>
                Sélectionner un fichier
              </Button>
            </label>
            {importFile && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Fichier sélectionné : {importFile.name}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseImportDialog}>Annuler</Button>
          <Button
            onClick={handleImportAttendance}
            variant="contained"
            startIcon={<FileUploadIcon />}
            disabled={!importFile}
          >
            Importer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default AttendancePage
