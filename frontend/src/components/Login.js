import React, { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../constants';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      if (isRegister) {
        await axios.post(`${API_URL}/register`, { email, password, name });
      }
      const res = await axios.post(`${API_URL}/login`, { email, password });
      localStorage.setItem('token', res.data.token);
      navigate('/rooms');
    } catch (err) {
      alert(err.response?.data || 'Ошибка');
    }
  };

  return (
    <div style={{maxWidth:400, margin:'40px auto'}}>
      <h2>{isRegister ? 'Регистрация' : 'Вход'}</h2>
      <form onSubmit={handleSubmit}>
        {isRegister && <div><input placeholder="Имя" value={name} onChange={e => setName(e.target.value)} /></div>}
        <div><input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} /></div>
        <div><input type="password" placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)} /></div>
        <div style={{marginTop:10}}>
          <button type="submit">{isRegister ? 'Зарегистрироваться' : 'Войти'}</button>
        </div>
      </form>
      <div style={{marginTop:10}}>
        <button onClick={() => setIsRegister(!isRegister)}>
          {isRegister ? 'Уже есть аккаунт?' : 'Создать аккаунт'}
        </button>
      </div>
    </div>
  );
}
