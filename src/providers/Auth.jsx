import { createContext, useState, useContext } from "react";
import axios from "axios";
import cookieParser from "cookie-parser";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user")) || null
  );

  const login = async (email, password) => {
    // Your login logic here
    try {
      const user = { email, password };
      const response = await axios.post("/api/user/login", user);
      console.log("here");
      console.log(response.data);

      localStorage.setItem("user", JSON.stringify(response.data.user));
      setUser(response.data.user);
      return null;
    } catch (error) {
      console.error(error);
      console.log(error.response.data.message);
      return error.response.data.message;
    }
  };

  const logout = async () => {
    try {
      // Send a request to the logout endpoint
      const response = await axios.post("/api/user/logout");

      if (response.status === 200) {
        // Clear the user from the application's state
        localStorage.removeItem("user");
        document.cookie = 'speech-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        setUser(null);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const value = {
    user,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
