import React, { useEffect, useState, useRef } from 'react';
import './App.css';
import { readFileSync } from 'fs';
import { auth, firestore } from './helpers/firebase';
import { useAuthState } from 'react-firehooks/auth';

import Auth from './components/Auth/Auth';
import Table from './components/Table/Table';
import socketIoClient, { Socket } from 'socket.io-client';


function App() {
  const [user, loading, error] = useAuthState(auth);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if(!loading){
      const socket = socketIoClient(`https://168.119.6.40:29084`,
      {
        rejectUnauthorized: false //TODO: Fix this, it is not recommended.
      });
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
