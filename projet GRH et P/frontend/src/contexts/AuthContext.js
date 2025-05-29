"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import { API_URL } from "../config"

// Création du contexte d'authentification
const AuthContext = createContext()

// Hook personnalisé pour utiliser le contexte d'authentification
export const useAuth = () => useContext(AuthContext)

// Fournisseur du contexte d'authentification
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const navigate = useNavigate()

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token")
      if (token) {
        try {
          const response = await axios.get(`${API_URL}/auth/verify-token`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })

          if (response.data.valid) {
            // Récupérer les informations complètes de l'utilisateur, y compris la photo de profil
            const userResponse = await axios.get(`${API_URL}/users/profile/me`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            })

            setUser(userResponse.data)
            setIsAuthenticated(true)
          } else {
            setIsAuthenticated(false)
            setUser(null)
            localStorage.removeItem("token")
          }
        } catch (error) {
          console.error("Erreur lors de la vérification du token:", error)
          setIsAuthenticated(false)
          setUser(null)
          localStorage.removeItem("token")
        } finally {
          setLoading(false)
        }
      } else {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  // Fonction de connexion
  const login = async (email, motDePasse) => {
    try {
      setError(null)
      const response = await axios.post(`${API_URL}/auth/login`, { email, motDePasse })
      localStorage.setItem("token", response.data.token)

      // Récupérer les informations complètes de l'utilisateur après la connexion
      const userResponse = await axios.get(`${API_URL}/users/profile/me`, {
        headers: {
          Authorization: `Bearer ${response.data.token}`,
        },
      })

      setUser(userResponse.data)
      setIsAuthenticated(true)
      return userResponse.data // Return the complete user object
    } catch (error) {
      console.error("Erreur lors de la connexion:", error)
      setError(error.response?.data?.message || "Identifiants incorrects")
      return null // Return null in case of error
    }
  }

  // Fonction de déconnexion
  const logout = () => {
    localStorage.removeItem("token")
    setUser(null)
    setIsAuthenticated(false)
    navigate("/login")
  }

  // Fonction de mise à jour du profil
  const updateProfile = (updatedUser) => {
    setUser(updatedUser)
  }

  // Valeurs exposées par le contexte
  const value = {
    user,
    isAuthenticated,
    loading,
    error,
    setError,
    login,
    logout,
    updateProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
