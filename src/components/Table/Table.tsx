import React, {useState, useEffect} from 'react'
import { firestore, auth } from '../../helpers/firebase';
import './Table.css';
import { getDoc, doc, setDoc, updateDoc, increment, Timestamp } from '@firebase/firestore';
import { getAuth, signOut } from '@firebase/auth';
import PlayerSpace from '../PlayerSpace/PlayerSpace';
import DealerSpace from '../DealerSpace/DealerSpace';
import { AnimatePresence, motion } from 'framer-motion';

function Chip(props : any){
    return(
        <motion.div className={`chip`} onClick={props.onClick} style={{border: `${props.color} 0.69vw dashed`}} whileTap={{scale: 0.9}} whileHover={{scale: 1.1, boxShadow: '0px 0px 10px rgb(255, 255, 255)'}}>{props.value}</motion.div>
    )
}

function Table(props : any) {

    const [playerInformation, setPlayerInformation] = useState<any>({});
    const [firstJoinData, setFirstJoinData] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [players, setPlayers] = useState<any[]>([]);
    const [dealer, setDealer] = useState<any[]>([]);
    const [gameData, setGameData] = useState<any>({});
    const [betAmount, setBetAmount] = useState(0);
    const [countdown, setCountdown] = useState(0);
    const [gameResult, setGameResult] = useState('wait');
    const [changeVal, setChangeVal] = useState(0);
    const [dailyBonusAvailable, setDailyBonusAvailable] = useState(false);
    const [dailyBonusCooldown, setDailyBonusCooldown] = useState<string | null>(null);
    useEffect(() => {
        const userRef = doc(firestore, 'users', props.user.uid);
        getDoc(userRef).then((res) => {
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
            setFirstJoinData(true);
        });

    }, [])


    useEffect(() => {
        props.socket.on('game-update', (data : any) => {
            setPlayers([]);
            setGameData([]);
            //TODO ADD ID TO THE VALUES
            setPlayers(Object.values(data.players));
            if (data.dealer.length > 0){
                setDealer(data.dealer);
            }
            setGameData(data.game);
        })
        props.socket.on('countdown', (data : any) => {
            let time = parseInt(data);
            setCountdown(time);
            let countdownInt = setInterval(() => {
                setCountdown(time => time-1);
            }, 1000)
            setTimeout(() => {
                setCountdown(0);
                clearInterval(countdownInt);
            }, time * 1000)
        })
        props.socket.on('alert-kick', () => {
            alert("You have been kicked!")
        })
        props.socket.on('add', (val : number) => {
            console.log("add: " + val);
            let userRef = doc(firestore, 'users', props.user.uid) 
            updateDoc(userRef, {
                balance: increment(val),
                xp: increment(val/10)
            })
            setChangeVal(val);
            setTimeout(() => {
                setChangeVal(0);
            }, 5000);
        })
        props.socket.on('deduct', (val : number) => {  
            console.log("deduct: " + val);
            let userRef = doc(firestore, 'users', props.user.uid) 

            updateDoc(userRef, {
                balance: increment(-val)
            })
            setChangeVal(-val);
            setTimeout(() => {
                setChangeVal(0);
            }, 5000);
        })
    }, [props.socket])

    useEffect(() => {
        for(let i=0; i<players.length; i++){
            if(players[i].id == props.socket.id){
                setPlayerInformation(players[i]);
                let state = players[i]['state'];
                if (state == 'lose' || state == 'bust'){
                    setGameResult(`You lost! Better luck next time. (-${players[i]['bet']}$)`);
                }else if(state == 'win'){
                    setGameResult(`You won! ${players[i]['bet']}$ was added to your balance.`);
                }else if(state == 'bj'){
                    setGameResult(`You got blackjack! ${players[i]['bet']*1.5}$ was added to your balance.`)
                }else if(state == 'stand'){
                    setGameResult('Please wait... Others are playing their turn.');
                }else if(state == 'push'){
                    setGameResult(`You pushed with dealer! ${players[i]['bet']}$ was refunded to your balance.`)
                }
                else{
                    setGameResult('Please wait for your turn...');
                }
            }
        }
    }, [players])
    
    useEffect(() => {
        
        if (firstJoinData == true){
            if(playerInformation.username == ""){
                let newUsername = prompt("You need to set your username first: ");
                if (newUsername != null){
                    const docRef = doc(firestore, 'users', props.user.uid)
                    updateDoc(docRef, {
                         username: newUsername
                     }).then(() => {
                         window.location.reload();
                     }) 
                }
            }
            props.socket.emit('join', playerInformation)
        }

    },[firstJoinData])
    
    const handleBetValue = (amount : any) => {
        if (betAmount+amount <= playerInformation.balance){
            setBetAmount(betAmount => betAmount+amount);
        }
    }
    

    const betAccept = () => {
        if(betAmount < 1){
            return alert("You cannot bet nothing.");
        }
        const docRef = doc(firestore, 'users', props.user.uid);
        getDoc(docRef).then((result) => {
            if (result?.data()?.balance < betAmount){
                setBetAmount(0);
                setPlayerInformation({...playerInformation, balance: result.data()?.balance});
                return alert("You do not have enough balance for that.")
            }


            props.socket.emit('bet', betAmount);
            setBetAmount(0);
            setPlayerInformation({...playerInformation, balance: result.data()?.balance-betAmount});
        })

    }

    const claimDailyBonus = () => {
        const userRef = doc(firestore, 'users', props.user.uid);
        getDoc(userRef).then((res) => {
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
        
                updateDoc(userRef,{
                    dailyBonus: Timestamp.fromDate(currDate)
                })
        
                props.socket.emit('force-add', 2000)
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
            if (props.socket.connected)
                props.socket.disconnect();  
        }).catch((error) => {
            alert("Something went wrong. (Error: " + error + ")");
        });
    }
    
//TODO: add setplayerbalance to update it
    return (
        <div>
            <div className="top-bar">
                <div>
                    <small>[{playerInformation.tag || ""}]{playerInformation.username || ""}</small>
                    <button className="daily-button" onClick={claimDailyBonus} disabled={!dailyBonusAvailable}>{
                    dailyBonusAvailable ? 
                    "Claim daily bonus!" :
                    dailyBonusCooldown
                    }</button>
                </div>

                <div className="money-top-part">
                    <small>Balance: {playerInformation.balance-betAmount}$</small>
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
                <small className="log-out" onClick={logOut}>Log out</small>
            </div>
            <>
                <div className="playing-space">
                    <DealerSpace cards={dealer || []} canShow={gameData.turnId == "Dealer"} />
                    <div className="separator"> <small style={{textTransform: 'uppercase'}}>{gameData.gameState} {countdown > 0 && gameData.gameState == "starting" ? `in ${countdown} seconds` : ''}</small></div>
                    <div className="players">
                        {players.length > 0 && players.map((player) => <PlayerSpace playerTurn={gameData.turnId == player.id} isLocal={player.id == props.socket.id} player={player}
                        key={player.id} isAdmin={isAdmin} socket={props.socket} gameData={gameData}/>)}
                        
                    </div>
                </div>
                {(gameData.gameState == "underway" || gameData.gameState == 'finished') && <div className="play-buttons">
                    
                    {gameData.turnId == props.socket.id ? <div>
                        <button onClick={() => props.socket.emit('stand')}><span className="big-icon">✋</span><br/>STAND</button>
                        <button onClick={() => props.socket.emit('hit')}><span className="big-icon">👉</span><br/>HIT</button>
                    </div> : <span>{gameResult}</span>}
                </div>}
                {(gameData.gameState == "waiting" || gameData.gameState == "starting") && 
                <div className="betting">
                    <div className="betting-row">
                        <small>Betting: {betAmount}$</small>&nbsp;
                    </div>
                    <div className="betting-row">
                        <button onClick={() => setBetAmount(0)}>CLEAR</button>
                        <button className="bet-button" disabled={!(gameData.gameState == "waiting" || gameData.gameState == "starting")} onClick={betAccept}>BET</button>
                    </div>


                    <Chip color="green" value="10" onClick={() => handleBetValue(10)}/>
                    <Chip color="red" value="100" onClick={() => handleBetValue(100)}/>
                    <Chip color="navy" value="500" onClick={() => handleBetValue(500)}/>
                    <Chip color="orange" value="1K" onClick={() => handleBetValue(1000)}/>
                    <Chip color="purple" value="5K" onClick={() =>handleBetValue(5000)}/>

                    <Chip color="black" value="MAX" onClick={() => handleBetValue(playerInformation.balance)}/>
    

                </div>}
            </>
        </div>
  

    )
}

export default Table
