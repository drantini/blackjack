import React, {useState} from 'react'
import { useEffect } from 'react';
import '../PlayerSpace/PlayerSpace.css';



function DealerSpace(props : any) {

    const [cardValue, setCardValue] = useState(0);


    useEffect(() => {
        if (!props.cards || props.cards.length == 0){
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
                if(i==0&&props.canShow == false){
                    i++;
                    continue;
                }
              sum = sum + (card.value == 'ACE' ? 11 : (card.value == "KING" || card.value == "QUEEN" || card.value == "JACK") ? 10 : parseInt(card.value));

              i++;
            }
            if (sum > 21 && hasAceInHand(cardsOnHand)) {
                // Transfer Ace's face value from 11 to 1
                sum -= 10; // - 11 + 1
            }
            return sum;
    
        }
   
        setCardValue(countHandValue(props.cards));
 
    }, [props.cards, props.canShow])



    return (
        <div className="player-space">
            {(props.cards && props.cards.length > 0) && <div className="cards" style={{marginLeft: 30*props.cards.length}}>
                {props.cards.map((card : any, cardIdx : number) => <img className="card" key={cardIdx} src={(props.canShow==true&&cardIdx==0)||cardIdx>0 ? card.image : 'http://chetart.com/blog/wp-content/uploads/2012/05/playing-card-back.jpg'} style={{zIndex: cardIdx}}/>)}
            </div>
            }
            <div className="player-information">
                <span>{cardValue}</span>
                <span>Dealer</span>

            </div>


        </div>
    )
}

export default DealerSpace;
