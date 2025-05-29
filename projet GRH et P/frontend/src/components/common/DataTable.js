"use client"

import { useState } from "react"
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Paper,
  Checkbox,
  IconButton,
  Tooltip,
  Typography,
  TextField,
  InputAdornment,
  Chip,
  CircularProgress,
} from "@mui/material"
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material"

// Fonction pour trier les données
function descendingComparator(a, b, orderBy) {
  if (b[orderBy] < a[orderBy]) {
    return -1
  }
  if (b[orderBy] > a[orderBy]) {
    return 1
  }
  return 0
}

function getComparator(order, orderBy) {
  return order === "desc"
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy)
}

function stableSort(array, comparator) {
  const stabilizedThis = array.map((el, index) => [el, index])
  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0])
    if (order !== 0) return order
    return a[1] - b[1]
  })
  return stabilizedThis.map((el) => el[0])
}

// Composant d'en-tête de tableau
function EnhancedTableHead(props) {
  const { columns, order, orderBy, onRequestSort, onSelectAllClick, numSelected, rowCount } = props

  const createSortHandler = (property) => (event) => {
    onRequestSort(event, property)
  }

  return (
    <TableHead>
      <TableRow>
        {props.selectable && (
          <TableCell padding="checkbox">
            <Checkbox
              color="primary"
              indeterminate={numSelected > 0 && numSelected < rowCount}
              checked={rowCount > 0 && numSelected === rowCount}
              onChange={onSelectAllClick}
              inputProps={{
                "aria-label": "sélectionner toutes les lignes",
              }}
            />
          </TableCell>
        )}
        {columns.map((column) => (
          <TableCell
            key={column.id}
            align={column.numeric ? "right" : "left"}
            padding={column.disablePadding ? "none" : "normal"}
            sortDirection={orderBy === column.id ? order : false}
            sx={{ fontWeight: "bold" }}
          >
            {column.sortable ? (
              <TableSortLabel
                active={orderBy === column.id}
                direction={orderBy === column.id ? order : "asc"}
                onClick={createSortHandler(column.id)}
              >
                {column.label}
              </TableSortLabel>
            ) : (
              column.label
            )}
          </TableCell>
        ))}
        {props.actions && <TableCell align="right">Actions</TableCell>}
      </TableRow>
    </TableHead>
  )
}

// Composant de tableau de données
const DataTable = ({
  columns,
  data,
  loading = false,
  selectable = false,
  onRowClick,
  onEdit,
  onDelete,
  onView,
  actions = true,
  searchable = true,
  searchPlaceholder = "Rechercher...",
  emptyMessage = "Aucune donnée disponible",
}) => {
  const [order, setOrder] = useState("asc")
  const [orderBy, setOrderBy] = useState("")
  const [selected, setSelected] = useState([])
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [searchTerm, setSearchTerm] = useState("")

  // Gérer le changement d'ordre
  const handleRequestSort = (event, property) => {
    const isAsc = orderBy === property && order === "asc"
    setOrder(isAsc ? "desc" : "asc")
    setOrderBy(property)
  }

  // Gérer la sélection de toutes les lignes
  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const newSelected = data.map((n) => n.id)
      setSelected(newSelected)
      return
    }
    setSelected([])
  }

  // Gérer la sélection d'une ligne
  const handleClick = (event, id) => {
    if (!selectable) {
      if (onRowClick) onRowClick(id)
      return
    }

    const selectedIndex = selected.indexOf(id)
    let newSelected = []

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id)
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1))
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1))
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(selected.slice(0, selectedIndex), selected.slice(selectedIndex + 1))
    }

    setSelected(newSelected)
  }

  // Gérer le changement de page
  const handleChangePage = (event, newPage) => {
    setPage(newPage)
  }

  // Gérer le changement de lignes par page
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(Number.parseInt(event.target.value, 10))
    setPage(0)
  }

  // Vérifier si une ligne est sélectionnée
  const isSelected = (id) => selected.indexOf(id) !== -1

  // Filtrer les données en fonction du terme de recherche
  const filteredData = data.filter((row) => {
    if (!searchTerm) return true
    return columns.some((column) => {
      const value = row[column.id]
      if (value === null || value === undefined) return false
      return String(value).toLowerCase().includes(searchTerm.toLowerCase())
    })
  })

  // Trier et paginer les données
  const sortedData = stableSort(filteredData, getComparator(order, orderBy))
  const paginatedData = sortedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  // Rendu des cellules avec formatage personnalisé
  const renderCell = (row, column) => {
    const value = row[column.id]

    if (column.render) {
      return column.render(value, row)
    }

    if (column.type === "date" && value) {
      return new Date(value).toLocaleDateString()
    }

    if (column.type === "datetime" && value) {
      return new Date(value).toLocaleString()
    }

    if (column.type === "boolean") {
      return value ? "Oui" : "Non"
    }

    if (column.type === "status") {
      const statusConfig = column.statusConfig || {
        default: { label: "Inconnu", color: "default" },
      }
      const status = statusConfig[value] || statusConfig.default
      return <Chip label={status.label} color={status.color} size="small" />
    }

    return value
  }

  return (
    <Box sx={{ width: "100%" }}>
      {searchable && (
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder={searchPlaceholder}
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
                    <FilterListIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            size="small"
          />
        </Box>
      )}

      <Paper sx={{ width: "100%", mb: 2, overflow: "hidden", borderRadius: 2 }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader aria-label="tableau de données" size="medium">
            <EnhancedTableHead
              columns={columns}
              order={order}
              orderBy={orderBy}
              onSelectAllClick={handleSelectAllClick}
              onRequestSort={handleRequestSort}
              numSelected={selected.length}
              rowCount={data.length}
              selectable={selectable}
              actions={actions && (onEdit || onDelete || onView)}
            />
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)} align="center">
                    <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                      <CircularProgress />
                    </Box>
                  </TableCell>
                </TableRow>
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)} align="center">
                    <Typography variant="body1" sx={{ py: 5, color: "text.secondary" }}>
                      {emptyMessage}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row, index) => {
                  const isItemSelected = isSelected(row.id)
                  const labelId = `enhanced-table-checkbox-${index}`

                  return (
                    <TableRow
                      hover
                      onClick={(event) => handleClick(event, row.id)}
                      role={selectable ? "checkbox" : "row"}
                      aria-checked={isItemSelected}
                      tabIndex={-1}
                      key={row.id}
                      selected={isItemSelected}
                      sx={{ cursor: selectable || onRowClick ? "pointer" : "default" }}
                    >
                      {selectable && (
                        <TableCell padding="checkbox">
                          <Checkbox
                            color="primary"
                            checked={isItemSelected}
                            inputProps={{
                              "aria-labelledby": labelId,
                            }}
                          />
                        </TableCell>
                      )}
                      {columns.map((column) => (
                        <TableCell
                          key={`${row.id}-${column.id}`}
                          align={column.numeric ? "right" : "left"}
                          padding={column.disablePadding ? "none" : "normal"}
                        >
                          {renderCell(row, column)}
                        </TableCell>
                      ))}
                      {actions && (onEdit || onDelete || onView) && (
                        <TableCell align="right">
                          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                            {onView && (
                              <Tooltip title="Voir">
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onView(row.id)
                                  }}
                                  color="info"
                                >
                                  <VisibilityIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {onEdit && (
                              <Tooltip title="Modifier">
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onEdit(row.id)
                                  }}
                                  color="primary"
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {onDelete && (
                              <Tooltip title="Supprimer">
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onDelete(row.id)
                                  }}
                                  color="error"
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Lignes par page:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count}`}
        />
      </Paper>
    </Box>
  )
}

export default DataTable
