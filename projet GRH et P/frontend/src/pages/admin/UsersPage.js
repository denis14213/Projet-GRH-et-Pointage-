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
  Avatar,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from "@mui/material"
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Clear as ClearIcon,
} from "@mui/icons-material"
import axios from "axios"
import { API_URL } from "../../config"
import PageHeader from "../../components/common/PageHeader"
import DataTable from "../../components/common/DataTable"
import { useNotification } from "../../contexts/NotificationContext"

// Page de gestion des utilisateurs
const UsersPage = () => {
  const navigate = useNavigate()
  const { showNotification } = useNotification()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [filters, setFilters] = useState({
    role: "",
    search: "",
    departement: "",
  })
  const [departments, setDepartments] = useState([])

  // Récupérer les utilisateurs et les départements
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

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
      id: "nom",
      label: "Nom",
      disablePadding: false,
      sortable: true,
      render: (value, row) => (
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Avatar
            src={row.photoProfil ? `${API_URL.replace("/api", "")}${row.photoProfil}` : ""}
            alt={`${row.prenom} ${row.nom}`}
            sx={{ width: 32, height: 32, mr: 2 }}
          >
            {row.prenom?.charAt(0)}
            {row.nom?.charAt(0)}
          </Avatar>
          <Typography variant="body2">
            {row.prenom} {row.nom}
          </Typography>
        </Box>
      ),
    },
    { id: "email", label: "Email", disablePadding: false, sortable: true },
    {
      id: "role",
      label: "Rôle",
      disablePadding: false,
      sortable: true,
      render: (value) => {
        let color
        switch (value) {
          case "admin":
            color = "error"
            break
          case "manager":
            color = "primary"
            break
          case "assistant":
            color = "info"
            break
          default:
            color = "default"
        }
        return <Chip label={value} color={color} size="small" sx={{ textTransform: "capitalize" }} />
      },
    },
    {
      id: "departement",
      label: "Département",
      disablePadding: false,
      sortable: true,
      render: (value) => (value?.nom ? value.nom : "Non assigné"),
    },
    {
      id: "dateCreation",
      label: "Date de création",
      disablePadding: false,
      sortable: true,
      type: "date",
    },
  ]

  // Formater les données des utilisateurs pour le tableau
  const formattedUsers = users.map((user) => ({
    id: user._id,
    nom: user.nom,
    prenom: user.prenom,
    email: user.email,
    role: user.role,
    departement: user.departement,
    dateCreation: user.dateCreation,
    photoProfil: user.photoProfil,
  }))

  // Filtrer les utilisateurs
  const filteredUsers = formattedUsers.filter((user) => {
    // Filtre par rôle
    if (filters.role && user.role !== filters.role) {
      return false
    }

    // Filtre par département
    if (filters.departement && (!user.departement || user.departement._id !== filters.departement)) {
      return false
    }

    // Filtre par recherche (nom, prénom, email)
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      return (
        user.nom.toLowerCase().includes(searchTerm) ||
        user.prenom.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm)
      )
    }

    return true
  })

  // Gérer l'ouverture de la boîte de dialogue de suppression
  const handleOpenDeleteDialog = (userId) => {
    const user = users.find((u) => u._id === userId)
    setSelectedUser(user)
    setOpenDeleteDialog(true)
  }

  // Gérer la fermeture de la boîte de dialogue de suppression
  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false)
    setSelectedUser(null)
  }

  // Supprimer un utilisateur
  const handleDeleteUser = async () => {
    if (!selectedUser) return

    try {
      setLoading(true)
      await axios.delete(`${API_URL}/users/${selectedUser._id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      // Mettre à jour la liste des utilisateurs
      setUsers(users.filter((user) => user._id !== selectedUser._id))
      showNotification("success", "Utilisateur supprimé avec succès")
    } catch (error) {
      console.error("Erreur lors de la suppression de l'utilisateur:", error)
      showNotification("error", "Erreur lors de la suppression de l'utilisateur")
    } finally {
      setLoading(false)
      handleCloseDeleteDialog()
    }
  }

  // Rafraîchir la liste des utilisateurs
  const handleRefresh = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await axios.get(`${API_URL}/users`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      setUsers(response.data)
    } catch (error) {
      console.error("Erreur lors de la récupération des utilisateurs:", error)
      setError("Erreur lors de la récupération des utilisateurs. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  // Réinitialiser les filtres
  const handleResetFilters = () => {
    setFilters({
      role: "",
      search: "",
      departement: "",
    })
  }

  return (
    <Box>
      <PageHeader
        title="Gestion des utilisateurs"
        subtitle="Créez, modifiez et supprimez des utilisateurs"
        breadcrumbs={[{ label: "Utilisateurs", link: "/users" }]}
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate("/admin/users/new")}
            sx={{ px: 3 }}
          >
            Nouvel utilisateur
          </Button>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filtres */}
      <Box sx={{ mb: 3 }}>
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
            <FormControl fullWidth size="small">
              <InputLabel id="role-filter-label">Filtrer par rôle</InputLabel>
              <Select
                labelId="role-filter-label"
                id="role-filter"
                value={filters.role}
                label="Filtrer par rôle"
                onChange={(e) => setFilters({ ...filters, role: e.target.value })}
              >
                <MenuItem value="">Tous les rôles</MenuItem>
                <MenuItem value="admin">Administrateur</MenuItem>
                <MenuItem value="manager">Manager</MenuItem>
                <MenuItem value="assistant">Assistant</MenuItem>
                <MenuItem value="employee">Employé</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="department-filter-label">Filtrer par département</InputLabel>
              <Select
                labelId="department-filter-label"
                id="department-filter"
                value={filters.departement}
                label="Filtrer par département"
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
          <Grid item xs={12} sm={2}>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Tooltip title="Réinitialiser les filtres">
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={handleResetFilters}
                  disabled={!filters.role && !filters.search && !filters.departement}
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

      {/* Tableau des utilisateurs */}
      <DataTable
        columns={columns}
        data={filteredUsers}
        loading={loading}
        onEdit={(id) => navigate(`/admin/users/${id}`)}
        onDelete={handleOpenDeleteDialog}
        onView={(id) => navigate(`/admin/users/${id}`)}
      />

      {/* Boîte de dialogue de confirmation de suppression */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Supprimer l'utilisateur</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Êtes-vous sûr de vouloir supprimer l'utilisateur{" "}
            <strong>
              {selectedUser?.prenom} {selectedUser?.nom}
            </strong>{" "}
            ? Cette action est irréversible.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Annuler</Button>
          <Button onClick={handleDeleteUser} color="error" startIcon={<DeleteIcon />}>
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default UsersPage
