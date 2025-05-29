import { Box, Typography, Breadcrumbs, Link, Paper } from "@mui/material"
import { Link as RouterLink } from "react-router-dom"
import { NavigateNext as NavigateNextIcon } from "@mui/icons-material"

// Composant d'en-tête de page avec fil d'Ariane
const PageHeader = ({ title, subtitle, breadcrumbs = [], action }) => {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        mb: 3,
        borderRadius: 2,
        backgroundColor: "background.paper",
        backgroundImage: "linear-gradient(to right, rgba(25, 118, 210, 0.05), rgba(25, 118, 210, 0))",
        borderLeft: "4px solid",
        borderColor: "primary.main",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Box>
          {breadcrumbs.length > 0 && (
            <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb" sx={{ mb: 1 }}>
              <Link component={RouterLink} to="/dashboard" color="inherit" underline="hover">
                Accueil
              </Link>
              {breadcrumbs.map((breadcrumb, index) => {
                const isLast = index === breadcrumbs.length - 1
                return isLast ? (
                  <Typography key={index} color="text.primary">
                    {breadcrumb.label}
                  </Typography>
                ) : (
                  <Link key={index} component={RouterLink} to={breadcrumb.link} color="inherit" underline="hover">
                    {breadcrumb.label}
                  </Link>
                )
              })}
            </Breadcrumbs>
          )}
          <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body1" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        {action && <Box>{action}</Box>}
      </Box>
    </Paper>
  )
}

export default PageHeader
