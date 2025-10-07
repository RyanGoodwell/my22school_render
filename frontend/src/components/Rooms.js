import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../constants';
import { useNavigate } from 'react-router-dom';

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [name, setName] = useState('');
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) { navigate('/'); return; }
    axios.get(`${API_URL}/rooms`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setRooms(res.data))
      .catch(() => navigate('/'));
  }, []);

  const createRoom = async () => {
    try {
      const res = await axios.post(`${API_URL}/rooms`, { name, type: 'chat' }, { headers: { Authorization: `Bearer ${token}` } });
      navigate(`/chat/${res.data.roomId}`);
    } catch {
      alert('Ошибка создания комнаты');
    }
  };

  return (
    <div style={{maxWidth:600, margin:'40px auto'}}>
      <h2>Комнаты</h2>
      <div>
        <input placeholder="Название комнаты" value={name} onChange={e => setName(e.target.value)} />
        <button onClick={createRoom}>Создать</button>
      </div>
      <ul>
        {rooms.map(r => <li key={r.roomId} style={{cursor:'pointer'}} onClick={() => navigate(`/chat/${r.roomId}`)}>{r.name}</li>)}
      </ul>
      <div>
        <button onClick={() => navigate('/profile')}>Профиль</button>
      </div>
    </div>
  );
}
