import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const { user, isLoading, error, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const onSubmit = (e) => {
    e.preventDefault();
    login(formData);
  };

  if (isLoading) return <h1>Loading...</h1>;

  return (
    <div>
      <h1>Login (Context API)</h1>
      {error && <p style={{color: 'red'}}>{error}</p>}
      <form onSubmit={onSubmit}>
        <input
          type="email"
          name="email"
          value={formData.email}
          placeholder="Enter email"
          onChange={(e) => setFormData({...formData, email: e.target.value})}
        />
         <input
          type="password"
          name="password"
          value={formData.password}
          placeholder="Enter password"
          onChange={(e) => setFormData({...formData, password: e.target.value})}
        />
        <button type="submit">Login</button>
      </form>
    </div>
  );
}

export default Login;
