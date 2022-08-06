import React, { useEffect, useState, useRef } from 'react';
import './App.css';
import { auth, firestore } from './helpers/firebase';
import { useAuthState } from 'react-firehooks/auth';
import { getAuth, signOut } from '@firebase/auth';

import Auth from './components/Auth/Auth';
import Table from './components/BlackjackTable/BlackjackTable';
import { Socket } from 'socket.io-client';
import Coinflip from './components/Coinflip/Coinflip';
import {useToasts } from 'react-toast-notifications';
import { AnimatePresence, motion } from 'framer-motion';
import { getUser, updateUser } from './helpers/user';
import { Timestamp } from 'firebase/firestore';

let developer = true;

enum Game{
  Blackjack = 0,
  Coinflip,
  Crash,
}
  //TODO: Move socket to games individually, it will be chaotic if it stays here
  //      Improve dropdown menu
function App() {  
  const [user, loading, error] = useAuthState(auth);
  const [currentGame, setCurrentGame] = useState<Game>(Game.Blackjack);
  const [changeVal, setChangeVal] = useState(0);
  const [dailyBonusAvailable, setDailyBonusAvailable] = useState(false);
  const [dailyBonusCooldown, setDailyBonusCooldown] = useState<string | null>(null);
  const [playerInformation, setPlayerInformation] = useState<any>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const { addToast } = useToasts();

  useEffect(() => {
    if(!loading && user){

      getUser(user.uid).then((res) => {
        if (res?.data()?.tag == 'ADMIN'){
            setIsAdmin(true);
        }
        const formatSeconds = (secs: number) => {
                function pad(n : any) {
                  return (n < 10 ? "0" + n : n);
                }
              
                var h = Math.floor(secs / 3600);
                var m = Math.floor(secs / 60) - (h * 60);
                var s = Math.floor(secs - h * 3600 - m * 60);
              
                return pad(h) +":"+ pad(m) +":"+ pad(s);
              
        }
        
        let dataToWrite : any = res.data();
        let dateDailyBonus = dataToWrite.dailyBonus.toDate()
        let compareDate = (dateDailyBonus.getTime() - new Date(Date.now()).getTime())/1000;
        if (dateDailyBonus > new Date(Date.now())){
            setInterval(() => {
                compareDate = (dateDailyBonus.getTime() - new Date(Date.now()).getTime())/1000;
                if (compareDate > 0){
                    setDailyBonusCooldown(formatSeconds(compareDate));
                }
            }, 1000)
        }

        setDailyBonusAvailable(dateDailyBonus < new Date(Date.now()))

        dataToWrite.firebaseId = res.id;
        setPlayerInformation(dataToWrite);
    });
  
    };
  }, [user]) 

  const claimDailyBonus = () => {
    if (user == null){
      return alert("Something went wrong. (US404)");
    }
    getUser(user.uid).then((res) => {
        if (res?.data()?.tag == 'ADMIN'){
            setIsAdmin(true);
        }
        const formatSeconds = (secs: number) => {
                function pad(n : any) {
                  return (n < 10 ? "0" + n : n);
                }
              
                var h = Math.floor(secs / 3600);
                var m = Math.floor(secs / 60) - (h * 60);
                var s = Math.floor(secs - h * 3600 - m * 60);
              
                return pad(h) +":"+ pad(m) +":"+ pad(s);
              
        }
        
        let dataToWrite : any = res.data();
        let dateDailyBonus = dataToWrite.dailyBonus.toDate()
        let compareDate = (dateDailyBonus.getTime() - new Date(Date.now()).getTime())/1000;
        if (dateDailyBonus > new Date(Date.now())){
            setInterval(() => {
                compareDate = (dateDailyBonus.getTime() - new Date(Date.now()).getTime())/1000;
                if (compareDate > 0){
                    setDailyBonusCooldown(formatSeconds(compareDate));
                }
            }, 1000)
        }

        if (dateDailyBonus < new Date(Date.now())){
            let currDate = new Date(Date.now())
            currDate.setDate(currDate.getDate()+1);
    
            updateUser(user.uid,{
                dailyBonus: Timestamp.fromDate(currDate)
            })
    
            socket?.emit('force-add', 2000)
            addToast('Claimed daily bonus of 2000$.', {appearance: 'success'});
            setDailyBonusAvailable(false);
        }

        dataToWrite.firebaseId = res.id;
        setPlayerInformation(dataToWrite);
    });


}


  const logOut = () => {
    const auth = getAuth();
    signOut(auth).then(() => {
        console.log("logged out!");
        if (socket?.connected)
            socket.disconnect();  
    }).catch((error) => {
        alert("Something went wrong. (Error: " + error + ")");
    });
  }


  return (
    <>
      {user && <div className="top-bar">
          <div className="center-flex">
              <span>{playerInformation.tag && `[${playerInformation.tag}]`}{playerInformation.username || ""}</span>
              <button className="daily-button" onClick={claimDailyBonus} disabled={!dailyBonusAvailable}>{
              dailyBonusAvailable ? 
              "Claim daily bonus!" :
              dailyBonusCooldown
              }</button>
          </div>

          <div className="money-top-part center-flex">
              <span>Balance: {playerInformation.balance}$</span>
              <AnimatePresence>
                  {changeVal != 0 && (
                      <motion.div
                      className="change-val"
                      initial={{ opacity: 0, y: '10vh' }}
                      animate={{ opacity: 1, y: '-1px' }}
                      exit={{ opacity: 0 }}
                      transition={{duration: 1}}>
                          <small style={{color: changeVal>0 ? "green" : "red"}}>{(changeVal<0?"":"+")+changeVal}</small>

                      </motion.div>
                  )}
              </AnimatePresence>
          </div>

          <div className='menu-dropdown' onClick={() => setShowMenu(oldVal => !oldVal)}>
            <div className="bar1"></div>
            <div className="bar2"></div>
            <div className="bar3"></div>
            <AnimatePresence>
                    {showMenu == true && <motion.div className="dropdown-menu-box"
                    initial={{opacity: 0, width: 0, height: 0}}
                    animate={{opacity: 1, width: '5em', height: '10em'}}
                    exit={{opacity: 0, width: 0, height: 0}}
                    transition={{duration: 0.2}}>
                      <span onClick={() => setCurrentGame(Game.Blackjack)}>Blackjack</span>
                      <span onClick={() => setCurrentGame(Game.Coinflip)}>Coinflip</span>
                      <span onClick={() => setCurrentGame(Game.Crash)}>Crash</span>
                      <span className="log-out" onClick={logOut}>Log out</span>
                    </motion.div>}
            </AnimatePresence>
          </div>

      </div>}
      <div className="main">
        {user 
        && currentGame == Game.Blackjack ? 
        <Table user={user} developer={developer} setMainSocket={setSocket} setChangeVal={setChangeVal} playerInformation={playerInformation} setPlayerInformation={setPlayerInformation} isAdmin={isAdmin}/> 
        : currentGame == Game.Coinflip ? 
        <Coinflip/>
        : 
        <Auth/>}
      </div>
    </>

    
  );  
}

export default App;
