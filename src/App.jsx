import "./App.css";
import SpeechToText from "./components/SpeechToText";
import { useState } from "react";
// import Avatar from "./components/Avatar";
import Login from "./components/Login";
import { useAuth } from "./providers/Auth";
import { BASEURL } from "./modules/envirnoment";

function App() {


   const [greeted, setGreeted] = useState(true);

  const handleGreeted = () => {
    console.log("Greeted now");
    setGreeted(true);
  };

  const { user } = useAuth();

  return user ? <SpeechToText greeted={greeted} handleGreeted={handleGreeted}/> : <Login />;
}

export default App;
