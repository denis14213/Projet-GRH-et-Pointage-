"use client"

import { useState } from "react"
import {
  Box,
  Typography,
  Paper,
  Divider,
  Switch,
  FormControlLabel,
  Button,
  TextField,
  Grid,
  Alert,
  Snackbar,
  Card,
  CardContent,
  CardHeader,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material"
import {
  Notifications as NotificationsIcon,
  Security as SecurityIcon,
  Language as LanguageIcon,
  Palette as PaletteIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from "@mui/icons-material"
import { useAuth } from "../../contexts/AuthContext"
import PageHeader from "../../components/common/PageHeader"

const SettingsPage = () => {
  const { user } = useAuth()
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      push: true,
      sms: false,
    },
    security: {
      twoFactorAuth: false,
      sessionTimeout: 30,
    },
    appearance: {
      theme: "light",
      fontSize: "medium",
      language: "fr",
    },
  })
  const [openSnackbar, setOpenSnackbar] = useState(false)
  const [openDialog, setOpenDialog] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")

  // Gérer les changements de paramètres
  const handleSettingChange = (category, setting, value) => {
    setSettings({
      ...settings,
      [category]: {
        ...settings[category],
        [setting]: value,
      },
    })
  }

  // Enregistrer les paramètres
  const handleSaveSettings = () => {
    // Ici, vous implémenteriez la logique pour enregistrer les paramètres dans la base de données
    console.log("Paramètres enregistrés:", settings)
    setOpenSnackbar(true)
  }

  // Gérer le changement de mot de passe
  const handlePasswordChange = () => {
    if (newPassword !== confirmPassword) {
      setPasswordError("Les mots de passe ne correspondent pas")
      return
    }

    if (newPassword.length < 8) {
      setPasswordError("Le mot de passe doit contenir au moins 8 caractères")
      return
    }

    // Ici, vous implémenteriez la logique pour changer le mot de passe
    console.log("Mot de passe changé")
    setOpenDialog(false)
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    setPasswordError("")
    setOpenSnackbar(true)
  }

  // Fermer la boîte de dialogue
  const handleCloseDialog = () => {
    setOpenDialog(false)
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    setPasswordError("")
  }

  // Fermer la notification
  const handleCloseSnackbar = () => {
    setOpenSnackbar(false)
  }

  return (
    <Box>
      <PageHeader
        title="Paramètres"
        subtitle="Personnalisez votre expérience"
        breadcrumbs={[{ label: "Paramètres", link: "/settings" }]}
      />

      <Grid container spacing={3}>
        {/* Paramètres de notifications */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardHeader
              title="Notifications"
              avatar={<NotificationsIcon color="primary" />}
              action={
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveSettings}
                >
                  Enregistrer
                </Button>
              }
            />
            <Divider />
            <CardContent>
              <List>
                <ListItem>
                  <ListItemText
                    primary="Notifications par email"
                    secondary="Recevez des notifications par email"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      edge="end"
                      checked={settings.notifications.email}
                      onChange={(e) => handleSettingChange("notifications", "email", e.target.checked)}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Notifications push"
                    secondary="Recevez des notifications dans le navigateur"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      edge="end"
                      checked={settings.notifications.push}
                      onChange={(e) => handleSettingChange("notifications", "push", e.target.checked)}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Notifications SMS"
                    secondary="Recevez des notifications par SMS"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      edge="end"
                      checked={settings.notifications.sms}
                      onChange={(e) => handleSettingChange("notifications", "sms", e.target.checked)}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Paramètres de sécurité */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardHeader
              title="Sécurité"
              avatar={<SecurityIcon color="primary" />}
              action={
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveSettings}
                >
                  Enregistrer
                </Button>
              }
            />
            <Divider />
            <CardContent>
              <List>
                <ListItem>
                  <ListItemText
                    primary="Authentification à deux facteurs"
                    secondary="Sécurisez votre compte avec une vérification supplémentaire"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      edge="end"
                      checked={settings.security.twoFactorAuth}
                      onChange={(e) => handleSettingChange("security", "twoFactorAuth", e.target.checked)}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Délai d'expiration de session"
                    secondary="Déconnexion automatique après inactivité (minutes)"
                  />
                  <ListItemSecondaryAction>
                    <TextField
                      type="number"
                      size="small"
                      value={settings.security.sessionTimeout}
                      onChange={(e) => handleSettingChange("security", "sessionTimeout", e.target.value)}
                      InputProps={{ inputProps: { min: 5, max: 120 } }}
                      sx={{ width: 80 }}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Changer le mot de passe"
                    secondary="Mettez à jour votre mot de passe régulièrement pour plus de sécurité"
                  />
                  <ListItemSecondaryAction>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => setOpenDialog(true)}
                    >
                      Modifier
                    </Button>
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Paramètres d'apparence */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardHeader
              title="Apparence"
              avatar={<PaletteIcon color="primary" />}
              action={
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveSettings}
                >
                  Enregistrer
                </Button>
              }
            />
            <Divider />
            <CardContent>
              <List>
                <ListItem>
                  <ListItemText
                    primary="Thème"
                    secondary="Choisissez entre le mode clair et sombre"
                  />
                  <ListItemSecondaryAction>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <Select
                        value={settings.appearance.theme}
                        onChange={(e) => handleSettingChange("appearance", "theme", e.target.value)}
                      >
                        <MenuItem value="light">Clair</MenuItem>
                        <MenuItem value="dark">Sombre</MenuItem>
                        <MenuItem value="system">Système</MenuItem>
                      </Select>
                    </FormControl>
                  </ListItemSecondaryAction>
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Taille de police"
                    secondary="Ajustez la taille du texte"
                  />
                  <ListItemSecondaryAction>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <Select
                        value={settings.appearance.fontSize}
                        onChange={(e) => handleSettingChange("appearance", "fontSize", e.target.value)}
                      >
                        <MenuItem value="small">Petite</MenuItem>
                        <MenuItem value="medium">Moyenne</MenuItem>
                        <MenuItem value="large">Grande</MenuItem>
                      </Select>
                    </FormControl>
                  </ListItemSecondaryAction>
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Langue"
                    secondary="Choisissez la langue de l'interface"
                  />
                  <ListItemSecondaryAction>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <Select
                        value={settings.appearance.language}
                        onChange={(e) => handleSettingChange("appearance", "language", e.target.value)}
                      >
                        <MenuItem value="fr">Français</MenuItem>
                        <MenuItem value="en">English</MenuItem>
                        <MenuItem value="es">Español</MenuItem>
                      </Select>
                    </FormControl>
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Boîte de dialogue pour changer le mot de passe */}
      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>Changer le mot de passe</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Pour changer votre mot de passe, veuillez entrer votre mot de passe actuel et votre nouveau mot de passe.
          </DialogContentText>
          {passwordError && (
            <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
              {passwordError}
            </Alert>
          )}
          <TextField
            margin="dense"
            label="Mot de passe actuel"
            type="password"
            fullWidth
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <TextField
            margin="dense"
            label="Nouveau mot de passe"
            type="password"
            fullWidth
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <TextField
            margin="dense"
            label="Confirmer le nouveau mot de passe"
            type="password"
            fullWidth
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Annuler</Button>
          <Button onClick={handlePasswordChange} variant="contained" color="primary">
            Changer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification de succès */}
      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        message="Paramètres enregistrés avec succès"
      />
    </Box>
  )
}

export default SettingsPage
