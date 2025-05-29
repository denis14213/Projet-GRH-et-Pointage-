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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Card,
  CardContent,
} from "@mui/material"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import { Save as SaveIcon, ArrowBack as ArrowBackIcon } from "@mui/icons-material"
import { format, isWeekend, addDays } from "date-fns"
import { fr } from "date-fns/locale"
import { useFormik } from "formik"
import * as Yup from "yup"
import axios from "axios"
import { API_URL } from "../../config"
import PageHeader from "../../components/common/PageHeader"
import { useNotification } from "../../contexts/NotificationContext"
import { useAuth } from "../../contexts/AuthContext"

// Schéma de validation pour la demande de congé
const leaveSchema = Yup.object({
  typeConge: Yup.string().required("Le type de congé est requis"),
  dateDebut: Yup.date().required("La date de début est requise"),
  dateFin: Yup.date()
    .required("La date de fin est requise")
    .min(Yup.ref("dateDebut"), "La date de fin doit être postérieure à la date de début"),
  motif: Yup.string().required("Le motif est requis"),
})

// Page de demande de congé
const LeaveRequestPage = () => {
  const navigate = useNavigate()
  const { showNotification } = useNotification()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [workingDays, setWorkingDays] = useState(0)

  // Calculer le nombre de jours ouvrables entre deux dates
  const calculateWorkingDays = (startDate, endDate) => {
    if (!startDate || !endDate) return 0
    if (endDate < startDate) return 0

    let count = 0
    let currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      // Ne pas compter les weekends (samedi et dimanche)
      if (!isWeekend(currentDate)) {
        count++
      }
      currentDate = addDays(currentDate, 1)
    }

    return count
  }

  // Formulaire avec Formik
  const formik = useFormik({
    initialValues: {
      typeConge: "",
      dateDebut: null,
      dateFin: null,
      motif: "",
    },
    validationSchema: leaveSchema,
    onSubmit: handleSubmit,
  })

  // Mettre à jour le nombre de jours ouvrables lorsque les dates changent
  useEffect(() => {
    if (formik.values.dateDebut && formik.values.dateFin) {
      const days = calculateWorkingDays(formik.values.dateDebut, formik.values.dateFin)
      setWorkingDays(days)
    } else {
      setWorkingDays(0)
    }
  }, [formik.values.dateDebut, formik.values.dateFin])

  // Gérer la soumission du formulaire
  async function handleSubmit(values) {
    setLoading(true)
    setError(null)

    try {
      await axios.post(
        `${API_URL}/leaves`,
        {
          typeConge: values.typeConge,
          dateDebut: values.dateDebut,
          dateFin: values.dateFin,
          motif: values.motif,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      )

      showNotification("success", "Demande de congé créée avec succès")
      navigate("/leaves")
    } catch (error) {
      console.error("Erreur lors de la création de la demande de congé:", error)
      setError(
        error.response?.data?.message || "Erreur lors de la création de la demande de congé. Veuillez réessayer.",
      )
    } finally {
      setLoading(false)
    }
  }

  // Calculer le solde de congés
  const leaveBalance = user?.soldeConges || 0

  return (
    <Box>
      <PageHeader
        title="Nouvelle demande de congé"
        subtitle="Créez une nouvelle demande de congé"
        breadcrumbs={[
          { label: "Congés", link: "/leaves" },
          { label: "Nouvelle demande", link: "/leaves/request" },
        ]}
        action={
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate("/leaves")}>
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
        {/* Formulaire de demande */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, borderRadius: 2, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)" }}>
            <Typography variant="h6" gutterBottom>
              Informations de la demande
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Box component="form" onSubmit={formik.handleSubmit} noValidate>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth required error={formik.touched.typeConge && Boolean(formik.errors.typeConge)}>
                    <InputLabel id="type-conge-label">Type de congé</InputLabel>
                    <Select
                      labelId="type-conge-label"
                      id="typeConge"
                      name="typeConge"
                      value={formik.values.typeConge}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      label="Type de congé"
                    >
                      <MenuItem value="annuel">Congé annuel</MenuItem>
                      <MenuItem value="maladie">Congé maladie</MenuItem>
                      <MenuItem value="maternite">Congé maternité</MenuItem>
                      <MenuItem value="paternite">Congé paternité</MenuItem>
                      <MenuItem value="special">Congé spécial</MenuItem>
                      <MenuItem value="autre">Autre</MenuItem>
                    </Select>
                    {formik.touched.typeConge && formik.errors.typeConge && (
                      <Typography variant="caption" color="error">
                        {formik.errors.typeConge}
                      </Typography>
                    )}
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
                    <DatePicker
                      label="Date de début"
                      value={formik.values.dateDebut}
                      onChange={(date) => formik.setFieldValue("dateDebut", date)}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          required: true,
                          error: formik.touched.dateDebut && Boolean(formik.errors.dateDebut),
                          helperText: formik.touched.dateDebut && formik.errors.dateDebut,
                        },
                      }}
                    />
                  </LocalizationProvider>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
                    <DatePicker
                      label="Date de fin"
                      value={formik.values.dateFin}
                      onChange={(date) => formik.setFieldValue("dateFin", date)}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          required: true,
                          error: formik.touched.dateFin && Boolean(formik.errors.dateFin),
                          helperText: formik.touched.dateFin && formik.errors.dateFin,
                        },
                      }}
                    />
                  </LocalizationProvider>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    id="motif"
                    name="motif"
                    label="Motif"
                    multiline
                    rows={4}
                    value={formik.values.motif}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.motif && Boolean(formik.errors.motif)}
                    helperText={formik.touched.motif && formik.errors.motif}
                  />
                </Grid>
              </Grid>

              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
                <Button variant="outlined" onClick={() => navigate("/leaves")} sx={{ mr: 1 }}>
                  Annuler
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
                  disabled={loading || (formik.values.typeConge === "annuel" && workingDays > leaveBalance)}
                >
                  {loading ? "Envoi en cours..." : "Soumettre la demande"}
                </Button>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Informations complémentaires */}
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 2, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)", mb: 3 }}>
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

          <Card sx={{ borderRadius: 2, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)" }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Récapitulatif de la demande
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Type de congé
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" fontWeight="medium">
                    {formik.values.typeConge
                      ? {
                          annuel: "Congé annuel",
                          maladie: "Congé maladie",
                          maternite: "Congé maternité",
                          paternite: "Congé paternité",
                          special: "Congé spécial",
                          autre: "Autre",
                        }[formik.values.typeConge]
                      : "-"}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Date de début
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" fontWeight="medium">
                    {formik.values.dateDebut ? format(formik.values.dateDebut, "dd/MM/yyyy") : "-"}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Date de fin
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" fontWeight="medium">
                    {formik.values.dateFin ? format(formik.values.dateFin, "dd/MM/yyyy") : "-"}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Jours ouvrables
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" fontWeight="medium">
                    {workingDays} jour{workingDays > 1 ? "s" : ""}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>

                {formik.values.typeConge === "annuel" && workingDays > leaveBalance && (
                  <Grid item xs={12}>
                    <Alert severity="warning">Votre solde de congés est insuffisant pour cette demande.</Alert>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>

          <Box sx={{ mt: 3 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Note :</strong> Les demandes de congés sont soumises à l'approbation de votre responsable. Vous
              serez notifié par email lorsque votre demande sera traitée.
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Box>
  )
}

export default LeaveRequestPage
