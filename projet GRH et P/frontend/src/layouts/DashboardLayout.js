"use client"

import { useState, useEffect } from "react"
import { Outlet, useNavigate, useLocation } from "react-router-dom"
import { styled, useTheme } from "@mui/material/styles"
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  useMediaQuery,
  Tooltip,
  CircularProgress,
} from "@mui/material"
import {
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Business as BusinessIcon,
  AccessTime as AccessTimeIcon,
  EventNote as EventNoteIcon,
  Message as MessageIcon,
  Task as TaskIcon,
  Assessment as AssessmentIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  CalendarMonth as CalendarIcon,
  SmartToy as SmartToyIcon,
} from "@mui/icons-material"
import { useAuth } from "../contexts/AuthContext"
import { useSocket } from "../contexts/SocketContext"
import axios from "axios"
import { API_URL } from "../config"

// Largeur du tiroir
const drawerWidth = 260

// Styles pour le contenu principal
const Main = styled("main", { shouldForwardProp: (prop) => prop !== "open" })(({ theme, open }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  transition: theme.transitions.create("margin", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  marginLeft: `-${drawerWidth}px`,
  ...(open && {
    transition: theme.transitions.create("margin", {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginLeft: 0,
  }),
}))

// Styles pour la barre d'application
const AppBarStyled = styled(AppBar, { shouldForwardProp: (prop) => prop !== "open" })(({ theme, open }) => ({
  transition: theme.transitions.create(["margin", "width"], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    width: `calc(100% - ${drawerWidth}px)`,
    marginLeft: `${drawerWidth}px`,
    transition: theme.transitions.create(["margin", "width"], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}))

// Styles pour l'en-tête du tiroir
const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
  justifyContent: "flex-end",
}))

// Fonction pour construire l'URL de l'image de profil
const getProfileImageUrl = (photoPath) => {
  if (!photoPath) return ""
  // Extraire le chemin relatif à partir de l'URL complète si nécessaire
  const baseUrl = API_URL.includes("/api") ? API_URL.substring(0, API_URL.indexOf("/api")) : API_URL
  return `${baseUrl}${photoPath}`
}

// Composant de mise en page du tableau de bord
const DashboardLayout = () => {
  const theme = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const { connected } = useSocket()
  const isMobile = useMediaQuery(theme.breakpoints.down("md"))

  const [open, setOpen] = useState(!isMobile)
  const [anchorElUser, setAnchorElUser] = useState(null)
  const [anchorElNotifications, setAnchorElNotifications] = useState(null)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)

  // Fermer le tiroir sur mobile
  useEffect(() => {
    if (isMobile) {
      setOpen(false)
    } else {
      setOpen(true)
    }
  }, [isMobile])

  // Récupérer le nombre de messages non lus
  useEffect(() => {
    const fetchUnreadMessages = async () => {
      try {
        const response = await axios.get(`${API_URL}/messages/unread`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        })
        setUnreadMessages(response.data.unreadCount)
      } catch (error) {
        console.error("Erreur lors de la récupération des messages non lus:", error)
      }
    }

    if (user) {
      fetchUnreadMessages()
      // Mettre à jour toutes les 30 secondes
      const interval = setInterval(fetchUnreadMessages, 30000)
      return () => clearInterval(interval)
    }
  }, [user])

  // Gérer l'ouverture/fermeture du tiroir
  const handleDrawerOpen = () => {
    setOpen(true)
  }

  const handleDrawerClose = () => {
    setOpen(false)
  }

  // Gérer l'ouverture/fermeture du menu utilisateur
  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget)
  }

  const handleCloseUserMenu = () => {
    setAnchorElUser(null)
  }

  // Gérer l'ouverture/fermeture du menu de notifications
  const handleOpenNotificationsMenu = (event) => {
    setAnchorElNotifications(event.currentTarget)
  }

  const handleCloseNotificationsMenu = () => {
    setAnchorElNotifications(null)
  }

  // Gérer la déconnexion
  const handleLogout = () => {
    setLoading(true)
    setTimeout(() => {
      logout()
      navigate("/login")
      setLoading(false)
    }, 500)
  }

  // Gérer la navigation
  const handleNavigation = (path) => {
    navigate(path)
    if (isMobile) {
      setOpen(false)
    }
  }

  // Vérifier si un chemin est actif
  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + "/")
  }

  // Éléments de menu pour l'administrateur
  const adminMenuItems = [
    { text: "Tableau de bord", icon: <DashboardIcon />, path: "/dashboard" },
    { text: "Utilisateurs", icon: <PeopleIcon />, path: "/admin/users" },
    { text: "Départements", icon: <BusinessIcon />, path: "/admin/departments" },
    { text: "Pointage", icon: <AccessTimeIcon />, path: "/attendance" },
    { text: "Approbation congés", icon: <EventNoteIcon />, path: "/leaves/approval" },
    { text: "Congés", icon: <EventNoteIcon />, path: "/leaves" },
    { text: "Messages", icon: <MessageIcon />, path: "/messages", badge: unreadMessages },
    { text: "Tâches", icon: <TaskIcon />, path: "/tasks" },
    { text: "Calendrier", icon: <CalendarIcon />, path: "/calendar" },
    { text: "Rapports", icon: <AssessmentIcon />, path: "/reports" },
    {
      text: "Mes pointages",
      path: "/attendance/my",
      icon: <AccessTimeIcon />,
    },
  ]

  // Éléments de menu pour le manager
  const managerMenuItems = [
    { text: "Tableau de bord", icon: <DashboardIcon />, path: "/dashboard" },
    { text: "Équipe", icon: <PeopleIcon />, path: "/team" },
    { text: "Pointage", icon: <AccessTimeIcon />, path: "/attendance" },
    { text: "Approbation congés", icon: <EventNoteIcon />, path: "/leaves/approval" },
    { text: "Mes congés", icon: <EventNoteIcon />, path: "/leaves" },
    { text: "Messages", icon: <MessageIcon />, path: "/messages", badge: unreadMessages },
    { text: "Tâches", icon: <TaskIcon />, path: "/tasks" },
    { text: "Calendrier", icon: <CalendarIcon />, path: "/calendar" },
    { text: "Rapports", icon: <AssessmentIcon />, path: "/reports" },
    {
      text: "Mes pointages",
      path: "/attendance/my",
      icon: <AccessTimeIcon />,
    },
  ]

  // Éléments de menu pour l'assistant
  const assistantMenuItems = [
    { text: "Tableau de bord", icon: <DashboardIcon />, path: "/dashboard" },
    { text: "Pointage", icon: <AccessTimeIcon />, path: "/attendance" },
    { text: "Congés", icon: <EventNoteIcon />, path: "/leaves" },
    { text: "Messages", icon: <MessageIcon />, path: "/messages", badge: unreadMessages },
    { text: "Calendrier", icon: <CalendarIcon />, path: "/calendar" },
    { text: "Rapports", icon: <AssessmentIcon />, path: "/reports" },
    {
      text: "Mes pointages",
      path: "/attendance/my",
      icon: <AccessTimeIcon />,
    },
  ]

  // Éléments de menu pour l'employé
  const employeeMenuItems = [
    { text: "Tableau de bord", icon: <DashboardIcon />, path: "/dashboard" },
    { text: "Mes congés", icon: <EventNoteIcon />, path: "/leaves" },
    { text: "Messages", icon: <MessageIcon />, path: "/messages", badge: unreadMessages },
    { text: "Mes tâches", icon: <TaskIcon />, path: "/tasks" },
    { text: "Calendrier", icon: <CalendarIcon />, path: "/calendar" },
    {
      text: "Mes pointages",
      path: "/attendance/my",
      icon: <AccessTimeIcon />,
    },
  ]

  // Sélectionner les éléments de menu en fonction du rôle
  const getMenuItems = () => {
    if (!user) return []

    const menuItems = [
      {
        text: "Tableau de bord",
        icon: <DashboardIcon />,
        path: "/dashboard",
        roles: ["admin", "manager", "employee", "assistant"],
      },
      { text: "Utilisateurs", icon: <PeopleIcon />, path: "/admin/users", roles: ["admin"] },
      { text: "Départements", icon: <BusinessIcon />, path: "/admin/departments", roles: ["admin"] },
      { text: "Équipe", icon: <PeopleIcon />, path: "/team", roles: ["manager"] },
      { text: "Pointage", icon: <AccessTimeIcon />, path: "/attendance", roles: ["admin", "manager", "assistant"] },
      { text: "Approbation congés", icon: <EventNoteIcon />, path: "/leaves/approval", roles: ["admin", "manager"] },
      {
        text: "Congés",
        icon: <EventNoteIcon />,
        path: "/leaves",
        roles: ["admin", "manager", "employee", "assistant"],
      },
      {
        text: "Messages",
        icon: <MessageIcon />,
        path: "/messages",
        badge: unreadMessages,
        roles: ["admin", "manager", "employee", "assistant"],
      },
      { text: "Tâches", icon: <TaskIcon />, path: "/tasks", roles: ["admin", "manager", "employee"] },
      {
        text: "Calendrier",
        icon: <CalendarIcon />,
        path: "/calendar",
        roles: ["admin", "manager", "employee", "assistant"],
      },
      { text: "Rapports", icon: <AssessmentIcon />, path: "/reports", roles: ["admin", "manager", "assistant"] },
      {
        text: "Mes pointages",
        path: "/attendance/my",
        icon: <AccessTimeIcon />,
        roles: ["admin", "manager", "employee", "assistant"],
      },
      {
        text: "Assistant RH",
        icon: <SmartToyIcon />,
        path: "/ai-assistant",
        roles: ["admin", "manager", "employee", "assistant"],
      },
      {
        text: "Analyse des performances",
        icon: <AssessmentIcon />,
        path: "/ai-assistant/performance",
        roles: ["admin", "manager"],
      },
    ]

    return menuItems.filter((item) => item.roles.includes(user.role))
  }

  // Obtenir l'URL de l'image de profil
  const profileImageUrl = user && user.photoProfil ? getProfileImageUrl(user.photoProfil) : ""

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <CircularProgress size={60} />
        <Typography variant="h6">Déconnexion en cours...</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ display: "flex" }}>
      {/* Barre d'application */}
      <AppBarStyled position="fixed" open={open} sx={{ backgroundColor: "#1976d2" }}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="ouvrir le tiroir"
            onClick={handleDrawerOpen}
            edge="start"
            sx={{ mr: 2, ...(open && { display: "none" }) }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Système de Gestion RH
          </Typography>

          {/* Indicateur de connexion Socket.IO */}
          <Tooltip title={connected ? "Connecté au serveur" : "Déconnecté du serveur"}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                backgroundColor: connected ? "success.main" : "error.main",
                mr: 2,
              }}
            />
          </Tooltip>

          {/* Bouton de notifications */}
          <IconButton color="inherit" onClick={handleOpenNotificationsMenu} sx={{ mr: 1 }}>
            <Badge badgeContent={notifications.length} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>

          {/* Menu de notifications */}
          <Menu
            sx={{ mt: "45px" }}
            id="notifications-menu"
            anchorEl={anchorElNotifications}
            anchorOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
            keepMounted
            transformOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
            open={Boolean(anchorElNotifications)}
            onClose={handleCloseNotificationsMenu}
          >
            {notifications.length === 0 ? (
              <MenuItem>
                <Typography textAlign="center">Aucune notification</Typography>
              </MenuItem>
            ) : (
              notifications.map((notification, index) => (
                <MenuItem key={index} onClick={handleCloseNotificationsMenu}>
                  <Typography textAlign="center">{notification.message}</Typography>
                </MenuItem>
              ))
            )}
          </Menu>

          {/* Bouton de profil utilisateur */}
          <Box sx={{ flexGrow: 0 }}>
            <Tooltip title="Ouvrir les paramètres">
              <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                <Avatar
                  alt={user ? `${user.prenom} ${user.nom}` : ""}
                  src={profileImageUrl}
                  sx={{ bgcolor: "secondary.main" }}
                >
                  {user ? user.prenom?.charAt(0) + user.nom?.charAt(0) : ""}
                </Avatar>
              </IconButton>
            </Tooltip>
            <Menu
              sx={{ mt: "45px" }}
              id="menu-appbar"
              anchorEl={anchorElUser}
              anchorOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              keepMounted
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              open={Boolean(anchorElUser)}
              onClose={handleCloseUserMenu}
            >
              <MenuItem onClick={() => handleNavigation("/profile")}>
                <ListItemIcon>
                  <PersonIcon fontSize="small" />
                </ListItemIcon>
                <Typography textAlign="center">Profil</Typography>
              </MenuItem>
              <MenuItem onClick={() => handleNavigation("/settings")}>
                <ListItemIcon>
                  <SettingsIcon fontSize="small" />
                </ListItemIcon>
                <Typography textAlign="center">Paramètres</Typography>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                <Typography textAlign="center">Déconnexion</Typography>
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBarStyled>

      {/* Tiroir de navigation */}
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
          },
        }}
        variant={isMobile ? "temporary" : "persistent"}
        anchor="left"
        open={open}
        onClose={handleDrawerClose}
      >
        <DrawerHeader sx={{ backgroundColor: "#1976d2", color: "white" }}>
          <Typography variant="h6" sx={{ flexGrow: 1, ml: 2 }}>
            Menu
          </Typography>
          <IconButton onClick={handleDrawerClose} sx={{ color: "white" }}>
            {theme.direction === "ltr" ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </IconButton>
        </DrawerHeader>
        <Divider />

        {/* Informations utilisateur */}
        <Box sx={{ p: 2, textAlign: "center" }}>
          <Avatar
            alt={user ? `${user.prenom} ${user.nom}` : ""}
            src={profileImageUrl}
            sx={{ width: 80, height: 80, mx: "auto", mb: 1, bgcolor: "secondary.main" }}
          >
            {user ? user.prenom?.charAt(0) + user.nom?.charAt(0) : ""}
          </Avatar>
          <Typography variant="h6">{user ? `${user.prenom} ${user.nom}` : ""}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ textTransform: "capitalize" }}>
            {user ? user.role : ""}
          </Typography>
        </Box>
        <Divider />

        {/* Liste des éléments de menu */}
        <List>
          {getMenuItems().map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                onClick={() => handleNavigation(item.path)}
                selected={isActive(item.path)}
                sx={{
                  "&.Mui-selected": {
                    backgroundColor: "rgba(25, 118, 210, 0.1)",
                    borderLeft: "4px solid #1976d2",
                    "&:hover": {
                      backgroundColor: "rgba(25, 118, 210, 0.2)",
                    },
                  },
                  "&:hover": {
                    backgroundColor: "rgba(25, 118, 210, 0.05)",
                  },
                  pl: isActive(item.path) ? 1 : 2,
                }}
              >
                <ListItemIcon
                  sx={{
                    color: isActive(item.path) ? "primary.main" : "inherit",
                  }}
                >
                  {item.badge ? (
                    <Badge badgeContent={item.badge} color="error">
                      {item.icon}
                    </Badge>
                  ) : (
                    item.icon
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  sx={{
                    "& .MuiTypography-root": {
                      fontWeight: isActive(item.path) ? "bold" : "normal",
                      color: isActive(item.path) ? "primary.main" : "inherit",
                    },
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>

      {/* Contenu principal */}
      <Main open={open}>
        <DrawerHeader />
        <Outlet />
      </Main>
    </Box>
  )
}

export default DashboardLayout
