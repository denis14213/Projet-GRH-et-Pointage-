"use client"

import { useState, useEffect } from "react"
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material"
import {
  Add as AddIcon,
  Today as TodayIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from "@mui/icons-material"
import { Calendar, momentLocalizer } from "react-big-calendar"
import moment from "moment"
import "moment/locale/fr"
import "react-big-calendar/lib/css/react-big-calendar.css"
import axios from "axios"
import { API_URL } from "../../config"
import { useNotification } from "../../contexts/NotificationContext"
import { useAuth } from "../../contexts/AuthContext"
import PageHeader from "../../components/common/PageHeader"
import { useNavigate } from "react-router-dom"

// Configuration du localisateur pour le calendrier
moment.locale("fr")
const localizer = momentLocalizer(moment)

// Page de calendrier
const CalendarPage = () => {
  const { showNotification } = useNotification()
  const { user } = useAuth()
  const navigate = useNavigate()

  // États
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedView, setSelectedView] = useState("month")
  const [openEventDialog, setOpenEventDialog] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [openAddEventDialog, setOpenAddEventDialog] = useState(false)
  const [newEvent, setNewEvent] = useState({
    title: "",
    start: new Date(),
    end: new Date(new Date().setHours(new Date().getHours() + 1)),
    allDay: false,
    type: "task",
    notes: "",
  })

  // Récupérer les événements
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true)
        setError(null)

        // Récupérer les tâches
        const tasksResponse = await axios.get(`${API_URL}/tasks`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        })

        // Récupérer les congés
        const leavesResponse = await axios.get(`${API_URL}/leaves`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        })

        // Formater les tâches en événements
        const taskEvents = tasksResponse.data
          .map((task) => ({
            id: `task-${task._id}`,
            title: task.titre,
            start: task.dateEcheance ? new Date(task.dateEcheance) : null,
            end: task.dateEcheance ? new Date(task.dateEcheance) : null,
            allDay: true,
            type: "task",
            resource: task,
            color: getTaskColor(task.priorite),
          }))
          .filter((event) => event.start !== null)

        // Formater les congés en événements
        const leaveEvents = leavesResponse.data.map((leave) => ({
          id: `leave-${leave._id}`,
          title: `Congé: ${leave.type}`,
          start: new Date(leave.dateDebut),
          end: new Date(leave.dateFin),
          allDay: true,
          type: "leave",
          resource: leave,
          color: "#9c27b0",
        }))

        // Combiner les événements
        setEvents([...taskEvents, ...leaveEvents])
      } catch (error) {
        console.error("Erreur lors de la récupération des événements:", error)
        setError("Erreur lors de la récupération des événements. Veuillez réessayer.")
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [])

  // Obtenir la couleur en fonction de la priorité de la tâche
  const getTaskColor = (priority) => {
    switch (priority) {
      case "basse":
        return "#4caf50"
      case "moyenne":
        return "#2196f3"
      case "haute":
        return "#ff9800"
      case "urgente":
        return "#f44336"
      default:
        return "#9e9e9e"
    }
  }

  // Gérer le changement de date
  const handleNavigate = (date) => {
    setSelectedDate(date)
  }

  // Gérer le changement de vue
  const handleViewChange = (view) => {
    setSelectedView(view)
  }

  // Gérer la sélection d'un événement
  const handleSelectEvent = (event) => {
    setSelectedEvent(event)
    setOpenEventDialog(true)
  }

  // Gérer la fermeture de la boîte de dialogue d'événement
  const handleCloseEventDialog = () => {
    setOpenEventDialog(false)
    setSelectedEvent(null)
  }

  // Gérer la sélection d'un créneau
  const handleSelectSlot = ({ start, end }) => {
    setNewEvent({
      ...newEvent,
      start,
      end,
    })
    setOpenAddEventDialog(true)
  }

  // Gérer la fermeture de la boîte de dialogue d'ajout d'événement
  const handleCloseAddEventDialog = () => {
    setOpenAddEventDialog(false)
    setNewEvent({
      title: "",
      start: new Date(),
      end: new Date(new Date().setHours(new Date().getHours() + 1)),
      allDay: false,
      type: "task",
      notes: "",
    })
  }

  // Gérer les changements dans le formulaire d'ajout d'événement
  const handleNewEventChange = (e) => {
    const { name, value, checked } = e.target
    setNewEvent({
      ...newEvent,
      [name]: name === "allDay" ? checked : value,
    })
  }

  // Ajouter un nouvel événement
  const handleAddEvent = async () => {
    try {
      setLoading(true)

      if (newEvent.type === "task") {
        // Créer une nouvelle tâche
        const response = await axios.post(
          `${API_URL}/tasks`,
          {
            titre: newEvent.title,
            description: newEvent.notes || "Tâche créée depuis le calendrier",
            assigneA: user.id,
            priorite: "moyenne",
            dateEcheance: newEvent.start,
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        )

        // Ajouter la tâche aux événements
        const newTaskEvent = {
          id: `task-${response.data.task._id}`,
          title: response.data.task.titre,
          start: new Date(response.data.task.dateEcheance),
          end: new Date(response.data.task.dateEcheance),
          allDay: true,
          type: "task",
          resource: response.data.task,
          color: getTaskColor(response.data.task.priorite),
        }

        setEvents([...events, newTaskEvent])
        showNotification("success", "Tâche créée avec succès")
      } else if (newEvent.type === "leave") {
        // Créer une nouvelle demande de congé
        const response = await axios.post(
          `${API_URL}/leaves`,
          {
            type: "congé",
            dateDebut: newEvent.start,
            dateFin: newEvent.end,
            raison: newEvent.notes || "Congé créé depuis le calendrier",
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        )

        // Ajouter le congé aux événements
        const newLeaveEvent = {
          id: `leave-${response.data.leave._id}`,
          title: `Congé: ${response.data.leave.type}`,
          start: new Date(response.data.leave.dateDebut),
          end: new Date(response.data.leave.dateFin),
          allDay: true,
          type: "leave",
          resource: response.data.leave,
          color: "#9c27b0",
        }

        setEvents([...events, newLeaveEvent])
        showNotification("success", "Demande de congé créée avec succès")
      }

      handleCloseAddEventDialog()
    } catch (error) {
      console.error("Erreur lors de la création de l'événement:", error)
      showNotification("error", "Erreur lors de la création de l'événement")
    } finally {
      setLoading(false)
    }
  }

  // Personnaliser l'apparence des événements
  const eventStyleGetter = (event) => {
    return {
      style: {
        backgroundColor: event.color,
        borderRadius: "4px",
        opacity: 0.8,
        color: "white",
        border: "none",
        display: "block",
      },
    }
  }

  // Personnaliser les messages du calendrier
  const messages = {
    allDay: "Journée",
    previous: "Précédent",
    next: "Suivant",
    today: "Aujourd'hui",
    month: "Mois",
    week: "Semaine",
    day: "Jour",
    agenda: "Agenda",
    date: "Date",
    time: "Heure",
    event: "Événement",
    noEventsInRange: "Aucun événement dans cette période",
  }

  return (
    <Box>
      <PageHeader
        title="Calendrier"
        subtitle="Visualisez vos tâches et congés dans un calendrier"
        breadcrumbs={[{ label: "Calendrier", link: "/calendar" }]}
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setNewEvent({
                ...newEvent,
                start: new Date(),
                end: new Date(new Date().setHours(new Date().getHours() + 1)),
              })
              setOpenAddEventDialog(true)
            }}
          >
            Nouvel événement
          </Button>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3, borderRadius: 2, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)", mb: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant={selectedView === "month" ? "contained" : "outlined"}
              onClick={() => handleViewChange("month")}
            >
              Mois
            </Button>
            <Button
              variant={selectedView === "week" ? "contained" : "outlined"}
              onClick={() => handleViewChange("week")}
            >
              Semaine
            </Button>
            <Button variant={selectedView === "day" ? "contained" : "outlined"} onClick={() => handleViewChange("day")}>
              Jour
            </Button>
            <Button
              variant={selectedView === "agenda" ? "contained" : "outlined"}
              onClick={() => handleViewChange("agenda")}
            >
              Agenda
            </Button>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<ChevronLeftIcon />}
              onClick={() => {
                const date = new Date(selectedDate)
                date.setMonth(date.getMonth() - 1)
                handleNavigate(date)
              }}
            >
              Précédent
            </Button>
            <Button variant="outlined" startIcon={<TodayIcon />} onClick={() => handleNavigate(new Date())}>
              Aujourd'hui
            </Button>
            <Button
              variant="outlined"
              endIcon={<ChevronRightIcon />}
              onClick={() => {
                const date = new Date(selectedDate)
                date.setMonth(date.getMonth() + 1)
                handleNavigate(date)
              }}
            >
              Suivant
            </Button>
          </Box>
        </Box>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ height: "70vh" }}>
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: "100%" }}
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
              selectable
              views={["month", "week", "day", "agenda"]}
              view={selectedView}
              onView={handleViewChange}
              date={selectedDate}
              onNavigate={handleNavigate}
              eventPropGetter={eventStyleGetter}
              messages={messages}
              popup
              components={{
                toolbar: () => null, // Désactiver la barre d'outils par défaut
              }}
            />
          </Box>
        )}
      </Paper>

      {/* Légende */}
      <Paper sx={{ p: 3, borderRadius: 2, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)" }}>
        <Typography variant="h6" gutterBottom>
          Légende
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6} md={3}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  borderRadius: 1,
                  bgcolor: "#4caf50",
                  mr: 1,
                }}
              />
              <Typography variant="body2">Tâche (Priorité basse)</Typography>
            </Box>
          </Grid>
          <Grid item xs={6} md={3}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  borderRadius: 1,
                  bgcolor: "#2196f3",
                  mr: 1,
                }}
              />
              <Typography variant="body2">Tâche (Priorité moyenne)</Typography>
            </Box>
          </Grid>
          <Grid item xs={6} md={3}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  borderRadius: 1,
                  bgcolor: "#ff9800",
                  mr: 1,
                }}
              />
              <Typography variant="body2">Tâche (Priorité haute)</Typography>
            </Box>
          </Grid>
          <Grid item xs={6} md={3}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  borderRadius: 1,
                  bgcolor: "#f44336",
                  mr: 1,
                }}
              />
              <Typography variant="body2">Tâche (Priorité urgente)</Typography>
            </Box>
          </Grid>
          <Grid item xs={6} md={3}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  borderRadius: 1,
                  bgcolor: "#9c27b0",
                  mr: 1,
                }}
              />
              <Typography variant="body2">Congé</Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Boîte de dialogue d'événement */}
      <Dialog
        open={openEventDialog}
        onClose={handleCloseEventDialog}
        aria-labelledby="event-dialog-title"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="event-dialog-title">{selectedEvent?.title}</DialogTitle>
        <DialogContent>
          {selectedEvent?.type === "task" && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Détails de la tâche
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Description:</strong> {selectedEvent?.resource?.description}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Priorité:</strong> {selectedEvent?.resource?.priorite}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Statut:</strong> {selectedEvent?.resource?.statut}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Date d'échéance:</strong> {moment(selectedEvent?.resource?.dateEcheance).format("DD/MM/YYYY")}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Assigné à:</strong>{" "}
                {`${selectedEvent?.resource?.assigneA?.prenom} ${selectedEvent?.resource?.assigneA?.nom}`}
              </Typography>
            </Box>
          )}
          {selectedEvent?.type === "leave" && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Détails du congé
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Type:</strong> {selectedEvent?.resource?.type}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Raison:</strong> {selectedEvent?.resource?.raison}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Date de début:</strong> {moment(selectedEvent?.resource?.dateDebut).format("DD/MM/YYYY")}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Date de fin:</strong> {moment(selectedEvent?.resource?.dateFin).format("DD/MM/YYYY")}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Statut:</strong> {selectedEvent?.resource?.statut}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEventDialog} color="primary">
            Fermer
          </Button>
          {selectedEvent?.type === "task" && (
            <Button
              onClick={() => {
                handleCloseEventDialog()
                navigate(`/tasks/${selectedEvent.resource._id}`)
              }}
              color="primary"
              variant="contained"
            >
              Voir la tâche
            </Button>
          )}
          {selectedEvent?.type === "leave" && (
            <Button
              onClick={() => {
                handleCloseEventDialog()
                navigate(`/leaves/${selectedEvent.resource._id}`)
              }}
              color="primary"
              variant="contained"
            >
              Voir le congé
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Boîte de dialogue d'ajout d'événement */}
      <Dialog
        open={openAddEventDialog}
        onClose={handleCloseAddEventDialog}
        aria-labelledby="add-event-dialog-title"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="add-event-dialog-title">Ajouter un événement</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel id="event-type-label">Type d'événement</InputLabel>
                  <Select
                    labelId="event-type-label"
                    name="type"
                    value={newEvent.type}
                    onChange={handleNewEventChange}
                    label="Type d'événement"
                  >
                    <MenuItem value="task">Tâche</MenuItem>
                    <MenuItem value="leave">Congé</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Titre"
                  name="title"
                  value={newEvent.title}
                  onChange={handleNewEventChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Date de début"
                  type="datetime-local"
                  name="start"
                  value={moment(newEvent.start).format("YYYY-MM-DDTHH:mm")}
                  onChange={(e) => {
                    const date = new Date(e.target.value)
                    setNewEvent({
                      ...newEvent,
                      start: date,
                    })
                  }}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Date de fin"
                  type="datetime-local"
                  name="end"
                  value={moment(newEvent.end).format("YYYY-MM-DDTHH:mm")}
                  onChange={(e) => {
                    const date = new Date(e.target.value)
                    setNewEvent({
                      ...newEvent,
                      end: date,
                    })
                  }}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  name="notes"
                  value={newEvent.notes}
                  onChange={handleNewEventChange}
                  multiline
                  rows={4}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddEventDialog} color="primary">
            Annuler
          </Button>
          <Button onClick={handleAddEvent} color="primary" variant="contained" disabled={loading || !newEvent.title}>
            {loading ? <CircularProgress size={24} /> : "Ajouter"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default CalendarPage
