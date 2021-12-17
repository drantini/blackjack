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
        ca: `-----BEGIN CERTIFICATE-----
        MIIDWDCCAkACCQDq7UZdnCITCjANBgkqhkiG9w0BAQUFADBuMQswCQYDVQQGEwJT
        SzEPMA0GA1UECAwGS3NvaWNlMRMwEQYDVQQHDApNaWNoYWxvdmNlMREwDwYDVQQK
        DAhEcmFudGluaTEmMCQGCSqGSIb3DQEJARYXZHJhbnRpbmlAcHJvdG9ubWFpbC5j
        b20wHhcNMjExMjE3MTQ1NDExWhcNMjIxMjE3MTQ1NDExWjBuMQswCQYDVQQGEwJT
        SzEPMA0GA1UECAwGS3NvaWNlMRMwEQYDVQQHDApNaWNoYWxvdmNlMREwDwYDVQQK
        DAhEcmFudGluaTEmMCQGCSqGSIb3DQEJARYXZHJhbnRpbmlAcHJvdG9ubWFpbC5j
        b20wggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDBoyrmcDfBhNB2vWQH
        mEzeOnANmkFjvwQWoPOVGyVoPhLSz8XWlG7OcRrNLPeZXAwCLYXJUpKv6GApPlN/
        bWcyXUcNKcGQrSudB86K8iw7kqKpJTzLc8KTYSJArA6Zfb7yOs5QXPjPLf3NFxBZ
        +mFGsjxk8jI/YjWDcB29dMihicZgAfmPTnmg3TK785hQZwe15O19Y+TYyGzvClnA
        iCLGTcdbixbQ1iJkrCABjMv+EF7wqZvp8NymGeCmh1Tggv9QffWCsSMkMgfG/BbQ
        9cI/tCYbIfvWugLNxMwDCFlR5sMl6FBaOGMMaVyY7apNVJfLx4d3zsc63rC4SpWu
        ahVbAgMBAAEwDQYJKoZIhvcNAQEFBQADggEBAEr1OMdwKa/UL+yl01UqN8PY2vlY
        q8HPPPYEQPHHVFwK1870rb9Y1YrrxpeXAWphKr0niIO18mUyt4j5vML9G6Q9loMv
        P9vkssmB2Tp+czCEF2f2gTG3E8ICaMCusNvMnWZEPs4nZRuW+2iBCRnnWc5qh8Fb
        RGvUH0WgtlH0FCX43oh+epR57GmdCLLP85gRhMxUTha8ANQxsexJuUS2H3yiytMH
        VwvIWnWM4X9vsymxlZMhk44vknoruTjna1asjrdz3jR3QUtYK8hgU7hlMOxmccBI
        ySrs5D3v3OQMFBBkJO9Ef47UL83XwJXjt1pvUrfySwKwoeGCClFJlHt5/fQ=
        -----END CERTIFICATE-----
        `
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
