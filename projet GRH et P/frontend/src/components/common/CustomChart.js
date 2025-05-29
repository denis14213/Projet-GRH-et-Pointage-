"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, Box, Typography, CircularProgress, useTheme } from "@mui/material"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

// Composant de graphique personnalisé
const CustomChart = ({
  type = "bar",
  data = [],
  title,
  subtitle,
  loading = false,
  height = 300,
  colors,
  dataKey = "value",
  nameKey = "name",
  xAxisDataKey = "name",
  yAxisDataKey = "value",
  series = [],
}) => {
  const theme = useTheme()
  const [chartData, setChartData] = useState([])

  // Définir les couleurs par défaut
  const defaultColors = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.error.main,
    theme.palette.warning.main,
    theme.palette.info.main,
  ]

  // Utiliser les couleurs personnalisées ou les couleurs par défaut
  const chartColors = colors || defaultColors

  // Mettre à jour les données du graphique
  useEffect(() => {
    setChartData(data)
  }, [data])

  // Rendu du graphique en fonction du type
  const renderChart = () => {
    switch (type) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
              <XAxis dataKey={xAxisDataKey} tick={{ fill: theme.palette.text.secondary }} />
              <YAxis tick={{ fill: theme.palette.text.secondary }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 8,
                }}
              />
              <Legend />
              {series.length > 0 ? (
                series.map((serie, index) => (
                  <Bar
                    key={serie.dataKey}
                    dataKey={serie.dataKey}
                    name={serie.name}
                    fill={serie.color || chartColors[index % chartColors.length]}
                    radius={[4, 4, 0, 0]}
                  />
                ))
              ) : (
                <Bar dataKey={yAxisDataKey} fill={chartColors[0]} radius={[4, 4, 0, 0]} />
              )}
            </BarChart>
          </ResponsiveContainer>
        )
      case "line":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
              <XAxis dataKey={xAxisDataKey} tick={{ fill: theme.palette.text.secondary }} />
              <YAxis tick={{ fill: theme.palette.text.secondary }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 8,
                }}
              />
              <Legend />
              {series.length > 0 ? (
                series.map((serie, index) => (
                  <Line
                    key={serie.dataKey}
                    type="monotone"
                    dataKey={serie.dataKey}
                    name={serie.name}
                    stroke={serie.color || chartColors[index % chartColors.length]}
                    activeDot={{ r: 8 }}
                  />
                ))
              ) : (
                <Line type="monotone" dataKey={yAxisDataKey} stroke={chartColors[0]} activeDot={{ r: 8 }} />
              )}
            </LineChart>
          </ResponsiveContainer>
        )
      case "pie":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey={dataKey}
                nameKey={nameKey}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 8,
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )
      default:
        return <Typography>Type de graphique non pris en charge</Typography>
    }
  }

  return (
    <Card sx={{ height: "100%", borderRadius: 2, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)" }}>
      <CardHeader
        title={
          <Typography variant="h6" fontWeight="medium">
            {title}
          </Typography>
        }
        subheader={subtitle}
      />
      <CardContent>
        {loading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: height,
            }}
          >
            <CircularProgress />
          </Box>
        ) : chartData.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: height,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Aucune donnée disponible
            </Typography>
          </Box>
        ) : (
          renderChart()
        )}
      </CardContent>
    </Card>
  )
}

export default CustomChart
