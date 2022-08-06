import { useState, useEffect } from 'react'
import './BlackjackTable.css';
import { increment } from '@firebase/firestore';
import PlayerSpace from '../PlayerSpace/PlayerSpace';
import DealerSpace from '../DealerSpace/DealerSpace';
import { getUser, updateUser, userWin } from '../../helpers/user';
import {motion } from 'framer-motion';
import { useToasts } from 'react-toast-notifications';
import socketIoClient, { Socket } from 'socket.io-client';

function Chip(props : any){
    return(
        <motion.div className={`chip`} onClick={props.onClick} style={{border: `${props.color} 0.5vw dashed`}} whileTap={{scale: 0.9}} whileHover={{scale: 1.1, boxShadow: '0px 0px 10px rgb(255, 255, 255)'}}>{props.value}</motion.div>
    )
}

function BlackjackTable({developer, user, setMainSocket, setChangeVal, playerInformation, setPlayerInformation, isAdmin} : any) {
    const { addToast } = useToasts();

    const [players, setPlayers] = useState<any[]>([]);
    const [dealer, setDealer] = useState<any[]>([]);
    const [gameData, setGameData] = useState<any>({});
    const [betAmount, setBetAmount] = useState(0);
    const [countdown, setCountdown] = useState(0);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [gameResult, setGameResult] = useState('Please wait... Others are playing their turn.');
    const [firstJoinData, setFirstJoinData] = useState(false);
    const [sentJoin, setSentJoin] = useState(false);
    const [lastGameState, setLastGameState] = useState('');
    useEffect(() => {
        const socket = socketIoClient(developer ? 'http://localhost:8080': `https://blackjack-sostmi.herokuapp.com/`);
        setSocket(socket);
        setMainSocket(socket);
        setFirstJoinData(true);
    }, [])
    useEffect(() => {
        
        if (playerInformation.balance && firstJoinData == true && user && sentJoin == false){
            if(playerInformation.username == ""){
                let newUsername = prompt("You need to set your username first: ");
                if (newUsername != null){
                    updateUser(user.uid, {
                         username: newUsername
                     }).then(() => {
                         window.location.reload();
                     }) 
                }
            }
            addToast(`Welcome back, ${playerInformation.username}!`, {appearance: 'success'}); 
            socket?.emit('join', playerInformation)
            setSentJoin(true);
        }
    
    },[firstJoinData, playerInformation])

    useEffect(() => {
        if(socket == null){
            return;
        }
        socket.on('game-update', (data : any) => {
            setPlayers([]);
            setGameData([]);
            //TODO ADD ID TO THE VALUES
            setPlayers(Object.values(data.players));
            if (data.dealer.length > 0){
                setDealer(data.dealer);
            }
            setGameData(data.game);
        })
        socket.on('countdown', (data : any) => {
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
        socket.on('alert-kick', () => {
            alert("You have been kicked!")
        })
        socket.on('add', (val : number) => {
            userWin(user.uid, val)
            setChangeVal(val);
            setTimeout(() => {
                setChangeVal(0);
            }, 5000);

        })
        socket.on('deduct', (val : number) => {  

            updateUser(user.uid, {
                balance: increment(-val)
            })
            setChangeVal(-val);
            setTimeout(() => {
                setChangeVal(0);
            }, 5000);

        })
    }, [socket])


    useEffect(() => {

        if (gameData.gameState == 'finished' && lastGameState != gameData.gameState){
            for(let i=0; i<players.length; i++){
                if(players[i].id == socket?.id){
                    setPlayerInformation(players[i]);
                    let state = players[i]['state'];
                    if (state == 'lose' || state == 'bust'){
                        addToast(`You lost ${players[i]['bet']}$!`, {appearance: 'error'});
                    }else if(state == 'win'){
                        addToast(`You won ${players[i]['bet']*2}$!`, {appearance: 'success'})
                    }else if(state == 'bj'){
                        addToast(`You got blackjack and won ${players[i]['bet']*1.5}$!`, {appearance: 'success'})
                    }
                }
            }
        }
        setLastGameState(gameData.gameState);

    }, [gameData.gameState])
    useEffect(() => {
        for(let i=0; i<players.length; i++){
            if(players[i].id == socket?.id){
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

    
    const handleBetValue = (amount : any) => {
        if (betAmount+amount <= playerInformation.balance){
            setBetAmount(betAmount => betAmount+amount);
        }
    }
    

    const betAccept = () => {
        if(betAmount < 1){
            return alert("You cannot bet nothing.");
        }
        getUser(user.uid).then((result) => {
            if (result?.data()?.balance < betAmount){
                setBetAmount(0);
                setPlayerInformation({...playerInformation, balance: result.data()?.balance});
                return alert("You do not have enough balance for that.")
            }

            socket?.emit('bet', betAmount);
            setBetAmount(0);
            setPlayerInformation({...playerInformation, balance: result.data()?.balance-betAmount});
        })

    }

    
    return (
        <div>
            {socket && socket.connected ? 
            <div className="blackjack-wrapper">
                <div className="playing-space">
                    <DealerSpace cards={dealer || []} canShow={gameData.turnId == "Dealer"} />
                    <div className="separator"> <small style={{textTransform: 'uppercase'}}>{gameData.gameState} {countdown > 0 && gameData.gameState == "starting" ? `in ${countdown} seconds` : ''}</small></div>
                    <div className="players">
                        {players.length > 0 && players.map((player) => <PlayerSpace playerTurn={gameData.turnId == player.id} isLocal={player.id == socket.id} player={player}
                        key={player.id} isAdmin={isAdmin} socket={socket} gameData={gameData}/>)}
                        
                    </div>
                </div>
                {(gameData.gameState == "underway" || gameData.gameState == 'finished') && <div className="play-buttons">
                    
                    {gameData.turnId == socket.id ? <div>
                        <button onClick={() => socket.emit('stand')}><span className="big-icon">✋</span><br/>STAND</button>
                        <button onClick={() => socket.emit('hit')}><span className="big-icon">👉</span><br/>HIT</button>
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
            </div> : 
            <>
                <span>Connecting to server...</span>
            </>} 
        </div>
  

    )
}

export default BlackjackTable;
