import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { API_URL } from '../constants';
import { useParams, useNavigate } from 'react-router-dom';

export default function Chat() {
  const { roomId } = useParams();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const token = localStorage.getItem('token');
  const socketRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) { navigate('/'); return; }
    socketRef.current = io(API_URL);
    socketRef.current.emit('joinRoom', { roomId, token });
    axios.get(`${API_URL}/messages/${roomId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setMessages(res.data))
      .catch(() => navigate('/rooms'));

    socketRef.current.on('newMessage', msg => {
      setMessages(prev => [...prev, msg]);
    });

    return () => socketRef.current.disconnect();
  }, [roomId]);

  const send = () => {
    if (!text) return;
    socketRef.current.emit('sendMessage', { roomId, text }, (res) => {
      // optional callback
    });
    setText('');
  };

  return (
    <div style={{maxWidth:800, margin:'20px auto'}}>
      <h2>Комната</h2>
      <div style={{height:300, overflowY:'auto', border:'1px solid #ddd', padding:10}}>
        {messages.map((m, i) => (
          <div key={i} style={{marginBottom:8}}>
            <b>{m.name || 'User'}:</b> {m.text}
          </div>
        ))}
      </div>
      <div style={{marginTop:10}}>
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Сообщение..." style={{width:'70%'}} />
        <button onClick={send}>Отправить</button>
      </div>
      <div style={{marginTop:10}}>
        <button onClick={() => navigate('/rooms')}>Выйти</button>
      </div>
    </div>
  );
}
