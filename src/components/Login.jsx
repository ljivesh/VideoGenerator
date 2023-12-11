import { useEffect, useState } from "react";
import styles from "../styles/Login.module.css";
import { useAuth } from "../providers/Auth";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isLogin, setIsLogin] = useState(true);

  const [fallback, setFallback] = useState({ state: false, message: "" });
  const { login, register } = useAuth();

  const handleUsernameChange = (event) => {
    setUsername(event.target.value);
  };

  const handlePasswordChange = (event) => {
    setPassword(event.target.value);
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    const message = await login(username, password);
    console.log(message);
    if (message) {
      setFallback({ state: true, message: message });
    } else {
      setFallback({ state: false, message: "" });
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    if (password === confirmPassword) {
      const message = await register(username, password);
      if (message) {
        setFallback({ state: true, message: message });
      } else {
        setFallback({ state: false, message: "" });
      }
    } else {
      setFallback({ state: true, message: "Passwords do not match" });
    }
  };

  useEffect(() => {
    setFallback({ state: false, message: "" });
  }, [isLogin, username, password, confirmPassword]);

  return (
    <div className={styles.body}>
      <form
        onSubmit={isLogin ? handleLogin : handleRegister}
        className={styles.loginForm}
      >
        <h1 className={styles.header}>Login to use AI VoiceChat</h1>
        <label>
          Username:
          <input type="text" value={username} onChange={handleUsernameChange} />
        </label>
        <br />
        <label>
          Password:
          <input
            type="password"
            value={password}
            onChange={handlePasswordChange}
          />
        </label>
        {!isLogin && (
          <label>
            Confirm Password:
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </label>
        )}
        <br />
        <button type="submit">{isLogin ? "Login" : "Register"}</button>
        <p className={styles.toggle} onClick={() => setIsLogin(!isLogin)}>
          {isLogin
            ? "Don't have an account? Register here"
            : "Already have an account? Login here"}
        </p>
        {fallback.state && (
          <h3 className={styles.fallback}>{fallback.message}</h3>
        )}
      </form>
    </div>
  );
}

export default Login;
