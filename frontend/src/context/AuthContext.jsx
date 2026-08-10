import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  const getCurrentUser = async () => {
    try {
      const response = await api.get("/auth/me");

      // Handles either:
      // { user: {...} }
      // or direct user object
      setUser(response.data.user || response.data);
    } catch (error) {
      console.error("Could not load user:", error);

      localStorage.removeItem("token");
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      getCurrentUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    const response = await api.post("/auth/login", {
      email,
      password,
    });

    const receivedToken = response.data.token;

    if (!receivedToken) {
      throw new Error("Token was not returned by server.");
    }

    localStorage.setItem("token", receivedToken);
    setToken(receivedToken);

    return response.data;
  };

  const register = async (name, email, password) => {
    const response = await api.post("/auth/register", {
      name,
      email,
      password,
    });

    const receivedToken = response.data.token;

    if (receivedToken) {
      localStorage.setItem("token", receivedToken);
      setToken(receivedToken);
    }

    return response.data;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        getCurrentUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
