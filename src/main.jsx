import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import AuthProvider from "./providers/Auth.jsx";
import axios from "axios";
import { BASEURL } from "./modules/envirnoment.js";

axios.defaults.baseURL = BASEURL;
axios.defaults.withCredentials = true;



ReactDOM.createRoot(document.getElementById("root")).render(
  // <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  // </React.StrictMode>
);
