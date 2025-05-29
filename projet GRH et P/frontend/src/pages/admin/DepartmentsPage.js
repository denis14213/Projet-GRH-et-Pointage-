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
} from "@mui/material"
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Business as BusinessIcon,
} from "@mui/icons-material"
import axios from "axios"
import { API_URL } from "../../config"
import PageHeader from "../../components/common/PageHeader"
import DataTable from "../../components/common/DataTable"
import { useNotification } from "../../contexts/NotificationContext"

// Page de gestion des départements
const DepartmentsPage = () => {
  const navigate = useNavigate()
  const { showNotification } = useNotification()
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [selectedDepartment, setSelectedDepartment] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")

  // Récupérer les départements
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await axios.get(`${API_URL}/departments`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        })

        setDepartments(response.data)
      } catch (error) {
        console.error("Erreur lors de la récupération des départements:", error)
        setError("Erreur lors de la récupération des départements. Veuillez réessayer.")
      } finally {
        setLoading(false)
      }
    }

    fetchDepartments()
  }, [])

  // Colonnes du tableau
  const columns = [
    { id: "id", label: "ID", disablePadding: false, sortable: true },
    {
      id: "nom",
      label: "Nom",
      disablePadding: false,
      sortable: true,
      render: (value) => (
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Avatar sx={{ width: 32, height: 32, mr: 2, bgcolor: "primary.main" }}>
            <BusinessIcon />
          </Avatar>
          <Typography variant="body2">{value}</Typography>
        </Box>
      ),
    },
    { id: "description", label: "Description", disablePadding: false, sortable: true },
    {
      id: "manager",
      label: "Manager",
      disablePadding: false,
      sortable: true,
      render: (value) =>
        value ? (
          <Chip
            avatar={<Avatar>{value.prenom?.charAt(0)}</Avatar>}
            label={`${value.prenom} ${value.nom}`}
            size="small"
            color="primary"
            variant="outlined"
          />
        ) : (
          <Chip label="Non assigné" size="small" variant="outlined" />
        ),
    },
    {
      id: "membres",
      label: "Membres",
      disablePadding: false,
      sortable: true,
      render: (value) => value?.length || 0,
    },
    {
      id: "dateCreation",
      label: "Date de création",
      disablePadding: false,
      sortable: true,
      type: "date",
    },
  ]

  // Formater les données des départements pour le tableau
  const formattedDepartments = departments.map((dept) => ({
    id: dept._id,
    nom: dept.nom,
    description: dept.description,
    manager: dept.manager,
    membres: dept.membres,
    dateCreation: dept.dateCreation,
  }))

  // Filtrer les départements par recherche
  const filteredDepartments = formattedDepartments.filter((dept) => {
    if (!searchTerm) return true
    return (
      dept.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (dept.description && dept.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (dept.manager && `${dept.manager.prenom} ${dept.manager.nom}`.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  })

  // Gérer l'ouverture de la boîte de dialogue de suppression
  const handleOpenDeleteDialog = (deptId) => {
    const dept = departments.find((d) => d._id === deptId)
    setSelectedDepartment(dept)
    setOpenDeleteDialog(true)
  }

  // Gérer la fermeture de la boîte de dialogue de suppression
  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false)
    setSelectedDepartment(null)
  }

  // Supprimer un département
  const handleDeleteDepartment = async () => {
    if (!selectedDepartment) return

    try {
      setLoading(true)
      await axios.delete(`${API_URL}/departments/${selectedDepartment._id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      // Mettre à jour la liste des départements
      setDepartments(departments.filter((dept) => dept._id !== selectedDepartment._id))
      showNotification("success", "Département supprimé avec succès")
    } catch (error) {
      console.error("Erreur lors de la suppression du département:", error)
      showNotification("error", "Erreur lors de la suppression du département")
    } finally {
      setLoading(false)
      handleCloseDeleteDialog()
    }
  }

  // Rafraîchir la liste des départements
  const handleRefresh = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await axios.get(`${API_URL}/departments`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      setDepartments(response.data)
    } catch (error) {
      console.error("Erreur lors de la récupération des départements:", error)
      setError("Erreur lors de la récupération des départements. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box>
      <PageHeader
        title="Gestion des départements"
        subtitle="Créez, modifiez et supprimez des départements"
        breadcrumbs={[{ label: "Départements", link: "/departments" }]}
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate("/admin/departments/new")}
            sx={{ px: 3 }}
          >
            Nouveau département
          </Button>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Barre de recherche */}
      <Box sx={{ mb: 3, display: "flex", alignItems: "center" }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Rechercher par nom, description ou manager"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchTerm("")}>
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
          size="small"
          sx={{ maxWidth: 500 }}
        />
        <Tooltip title="Rafraîchir">
          <IconButton onClick={handleRefresh} disabled={loading} color="primary" sx={{ ml: 1 }}>
            {loading ? <CircularProgress size={24} /> : <RefreshIcon />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Tableau des départements */}
      <DataTable
        columns={columns}
        data={filteredDepartments}
        loading={loading}
        onEdit={(id) => navigate(`/admin/departments/${id}`)}
        onDelete={handleOpenDeleteDialog}
        onView={(id) => navigate(`/admin/departments/${id}`)}
      />

      {/* Boîte de dialogue de confirmation de suppression */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Supprimer le département</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Êtes-vous sûr de vouloir supprimer le département <strong>{selectedDepartment?.nom}</strong> ? Cette action
            est irréversible et tous les utilisateurs associés à ce département seront désassociés.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Annuler</Button>
          <Button onClick={handleDeleteDepartment} color="error" startIcon={<DeleteIcon />}>
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default DepartmentsPage
