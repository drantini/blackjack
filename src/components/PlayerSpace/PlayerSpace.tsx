import React, {useState} from 'react'
import { useEffect } from 'react';
import './PlayerSpace.css';
import {setDoc, doc, getDoc, updateDoc} from 'firebase/firestore';
import { firestore } from '../../helpers/firebase';
import { increment } from 'firebase/firestore';
import { AnimatePresence, motion } from 'framer-motion';


function PlayerSpace(props : any) {

    const [cardValue, setCardValue] = useState(0);
    const [colorName, setColorName] = useState('white');
    const [showMenu, setShowMenu] = useState(false);

    useEffect(() => {
        if (!props.player.cards || props.player.cards.length == 0){
            return;
        }
        setCardValue(0);
        
        const countHandValue = (cardsOnHand : any) => {
            const hasAceInHand = (cardsOnHand : any) => {
                for (const card of cardsOnHand) {
                  if (card.value === "ACE") {
                    return true;
                  }
                }
                return false;
            }
            let sum = 0;
            let i=0;
            for (const card of cardsOnHand) {

              sum = sum + (card.value == 'ACE' ? 11 : (card.value == "KING" || card.value == "QUEEN" || card.value == "JACK") ? 10 : parseInt(card.value));

              i++;
            }
            if (sum > 21 && hasAceInHand(cardsOnHand)) {
                // Transfer Ace's face value from 11 to 1
                sum -= 10; // - 11 + 1
            }
            return sum;
    
        }
   
        setCardValue(countHandValue(props.player.cards));
        if (cardValue > 21){
            setColorName('red');
        }
    }, [props.player.cards, props.canShow])

    useEffect(() => {

        if (props.player.state != null){
  
            if(props.player.state == 'win'){
                setColorName('green');
            }else if(props.player.state == 'bj'){
                setColorName('gold');
            }else if(props.player.state == 'lose' || props.player.state == 'bust'){
                setColorName('red');
            }else if (props.player.state == 'push'){
                setColorName('yellow');
            }else if(props.playerTurn == true){
                setColorName('orange');
            }else{
                setColorName('')
            }
            
        }
    }, [props.player.state, props.playerTurn])


    const giveBalance = () => {
        let userRef = doc(firestore, 'users', props.player.firebaseId);
        updateDoc(userRef, {
            balance: increment(5000)
        }).catch((e) =>{
            console.error(e);
        })
    }

    const forceHit = () => {
        props.socket.emit('force-hit', props.player.id)
    }
    const forceStand = () => {
        props.socket.emit('force-stand', props.player.id)
    }    
    
    const kickPerson = () => {
        props.socket.emit('disconnect-player', props.player.id);
    }

    return (
        <div className="player-space" style={{borderBottom: props.player.bet>0 ? `2px solid ${colorName}` : 'none'}}>
            {(props.player.cards && props.player.cards.length > 0) && <div className="cards">
                {props.player.cards.map((card : any, cardIdx : number) => <motion.img className="card" key={cardIdx} src={card.image} style={{zIndex: cardIdx}}/>)}
            </div>
            }
            <div className="player-information" onClick={() => setShowMenu(oldMenu => !oldMenu)}>
                <span>{cardValue}</span>
                <div className="bet-box"><small>{props.player.bet || "0"}$</small></div>
                <span>{props.player.tag != "" ? `[${props.player.tag}]` : ''}{props.player.username}</span>
                <AnimatePresence>
                    {showMenu == true && <motion.div className="player-box-information"
                    initial={{opacity: 0, width: 0, height: 0}}
                    animate={{opacity: 1, width: '20vw', height: '18vh'}}
                    exit={{opacity: 0, width: 0, height: 0}}
                    transition={{duration: 0.2}}>
                        <small>Balance: {props.player.balance}$</small>
                        {props.player.stats && Object.keys(props.player.stats).map((stat : any) => <small key={stat}>Session {stat}: {props.player.stats[stat]}</small>)}

                        {props.isAdmin && <div className="player-box-buttons">
                            <button onClick={kickPerson}>Kick</button>
                            <button onClick={giveBalance}>Give 5k$</button>
                            {/*TODO: FINISH THIS BUTTONS*/}
                            <button onClick={forceHit}>Force Hit</button>
                            <button onClick={forceStand}>Force Stand</button>

                        </div>
                        }
                    </motion.div>}
                </AnimatePresence>

            </div>


        </div>
    )
}

export default PlayerSpace;
