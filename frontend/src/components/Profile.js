import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../constants';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const [user, setUser] = useState({});
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) { navigate('/'); return; }
    axios.get(`${API_URL}/profile`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setUser(res.data))
      .catch(() => navigate('/'));
  }, []);

  const handleSave = async () => {
    try {
      await axios.put(`${API_URL}/profile`, user, { headers: { Authorization: `Bearer ${token}` } });
      alert('Сохранено');
    } catch {
      alert('Ошибка');
    }
  };

  return (
    <div style={{maxWidth:500, margin:'40px auto'}}>
      <h2>Профиль</h2>
      <div>
        <input value={user.name || ''} onChange={e => setUser({ ...user, name: e.target.value })} placeholder="Имя" />
      </div>
      <div>
        <input value={user.avatar || ''} onChange={e => setUser({ ...user, avatar: e.target.value })} placeholder="Аватар (URL)" />
      </div>
      <div style={{marginTop:10}}>
        <button onClick={handleSave}>Сохранить</button>
        <button onClick={() => navigate('/rooms')} style={{marginLeft:10}}>Назад</button>
      </div>
    </div>
  );
}
