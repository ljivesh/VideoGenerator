import "./App.css";
import SpeechToText from "./components/SpeechToText";
import Login from "./components/Login";
import { useAuth } from "./providers/Auth";
import { BASEURL } from "./modules/envirnoment";

function App() {
  const { user } = useAuth();

  return user ? <SpeechToText /> : <Login />;
}

export default App;
