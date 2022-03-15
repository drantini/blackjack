import React, { useEffect, useState, useRef } from 'react';
import './App.css';
import { readFileSync } from 'fs';
import { auth, firestore } from './helpers/firebase';
import { useAuthState } from 'react-firehooks/auth';

import Auth from './components/Auth/Auth';
import Table from './components/Table/Table';
import socketIoClient, { Socket } from 'socket.io-client';
let developer = false;

function App() {
  const [user, loading, error] = useAuthState(auth);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if(!loading){
      const socket = socketIoClient(developer ? 'http://localhost:8080': `https://blackjack-sostmi.herokuapp.com/`);
      setSocket(socket);
  
  
    };


  }, [user]) 


  return (
   <div className="Blackjack">
      {user && socket ? <Table user={user} socket={socket}/> : <Auth/>}
    </div>
    
  );
}

export default App;
