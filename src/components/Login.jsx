import  { useState } from 'react';
import styles from '../styles/Login.module.css';
import { useAuth } from '../providers/Auth';

function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [fallback, setFallback] = useState({state: false, message: ''});
    const {login} = useAuth();

    const handleUsernameChange = (event) => {
        setUsername(event.target.value);
    };

    const handlePasswordChange = (event) => {
        setPassword(event.target.value);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const message = await login(username, password);
        console.log(message);
        if(message) {
            setFallback({state: true, message: message});
        } else {
            setFallback({state: false, message: ''});
        }
    };

    return (
        <div className={styles.body}>
            <form onSubmit={handleSubmit} className={styles.loginForm}>
                <h1 className={styles.header}>Login to use AI VoiceChat</h1>
                <label>
                Username:
                <input type="text" value={username} onChange={handleUsernameChange} />
            </label>
            <br />
            <label>
                Password:
                <input type="password" value={password} onChange={handlePasswordChange} />
            </label>
            <br />
            <button type="submit">Login</button>
           {fallback.state &&  <h3 className={styles.fallback}>{fallback.message}</h3>}
            </form>
        </div>
    );
}

export default Login;