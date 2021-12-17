import { Server } from 'socket.io';
const io = new Server(8888, {
    cors: {
        origin: ['http://localhost:3000']
    }
});
import fetch from 'node-fetch'
let maxPlayers = 8;
let database = {
    "game":{
        gameState: "waiting",
        turnId: "", //socket id of player who is about to play
        deckId: "",
        remaining: 0 //deck id to use for API
    }, 
"dealer":{},
"players":{}};
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
async function newDeck(){
    await fetch('https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=6').then((response) => response.json()).then((data) => {
        if(data.success == true){
            database['game'].deckId = data.deck_id;
            database['game'].remaining = data.remaining;
        }
    })
}
const hasAceInHand = (cardsOnHand) => {
    for (const card of cardsOnHand) {
      if (card.value === "ACE") {
        return true;
      }
    }
    return false;
}
function getCardValue(cardsOnHand){

    let sum = 0;
    for (const card of cardsOnHand) {
      sum = sum + (card.value == 'ACE' ? 11 : (card.value == "KING" || card.value == "QUEEN" || card.value == "JACK") ? 10 : parseInt(card.value));

    }
    if (sum > 21 && hasAceInHand(cardsOnHand)) {
        // Transfer Ace's face value from 11 to 1
        sum -= 10; // - 11 + 1
    }
    return sum;

}
async function getNextPlayer(){
    database['game']['turnId'] = "Dealer";
    for(const id in database['players']){
        if (database['players'][id].bet > 0 && database['players'][id]['state'] == 'wait'){
            database['game']['turnId'] = id;

            io.emit('game-update', database);
            break;
        }
    }
    io.emit('game-update', database);
    await sleep(1000);

    if (database['game']['turnId'] == "Dealer"){
        while(getCardValue(database['dealer']) <= 16){
            await fetch(`https://deckofcardsapi.com/api/deck/${database['game']['deckId']}/draw/?count=1`).then((response) => response.json()).then((data) => {
                database['dealer'].push(data.cards[0]);
            })
            await sleep(500);
        }
        for(const id in database['players']){
            if (getCardValue(database['dealer'])>21 && database['players'][id].bet > 0 && database['players'][id]['state'] == 'stand'){
                database['players'][id]['state'] = 'win';
                database['players'][id]['stats']['wins'] += 1;
                io.to(id).emit('add', database['players'][id]['bet']*2);
                database['players'][id]['balance'] += database['players'][id]['bet']*2

            }
            else if (database['players'][id].bet > 0 && database['players'][id]['state'] == 'stand'){
                if (getCardValue(database['dealer']) > getCardValue(database['players'][id]['cards'])){
                    database['players'][id]['state'] = 'lose';
                    database['players'][id]['stats']['loses'] += 1;
                }else if (getCardValue(database['dealer']) == getCardValue(database['players'][id]['cards'])){
                    database['players'][id]['state'] = 'push';
                    io.to(id).emit('add', database['players'][id]['bet']);
                    database['players'][id]['balance'] += database['players'][id]['bet']

                }else{
                    io.to(id).emit('add', database['players'][id]['bet']*2);
                    database['players'][id]['balance'] += database['players'][id]['bet']*2

                    database['players'][id]['state'] = 'win';
                    database['players'][id]['stats']['wins'] += 1;
                }
                
            }
        }
        database['game'].gameState = 'finished';
        io.emit('game-update', database);
        setTimeout(() => {
            database['game'].gameState = 'waiting';
            database['dealer'] = {};
            database['game'].turnId = '';
            for(const id in database['players']){
                database['players'][id]['cards'] = [];
                database['players'][id]['bet'] = 0;
                database['players'][id]['state'] = 'wait';
            }
            io.emit('game-update', database);
            
        }, 10 * 1000)

    }
}
async function startGame(force){
    if (database['game'].deckId == "" || database['game'].remaining < 5 || force == true){
        await newDeck();
    }
    database['dealer'] = {};
    database['game'].gameState = 'underway';
    io.emit('game-update', database);
    await fetch(`https://deckofcardsapi.com/api/deck/${database['game']['deckId']}/draw/?count=2`).then((response) => response.json()).then((data) => {
        database['dealer'] = data.cards;
        database['game']['remaining'] = data.remaining;
        console.log(getCardValue(database['dealer']))
        if (getCardValue(database['dealer'])==21){
            for(const id in database['players']){
                if (database['players'][id].bet > 0 && database['players'][id]['state'] == 'wait'){
                    io.to(id).emit('deduct', database['players'][id]['bet'])
                    database['players'][id]['balance'] -= database['players'][id]['bet']
                    database['players'][id]['state'] = 'lose';
                    database['players'][id]['stats']['loses'] += 1;

                }
            }
            
            getNextPlayer();

            return;
        }else{

        }
        io.emit('game-update', database);

    })
    for(const id in database['players']){
        if (database['players'][id].bet > 0){
            await fetch(`https://deckofcardsapi.com/api/deck/${database['game']['deckId']}/draw/?count=2`).then((response) => response.json()).then((data) => {
                database['players'][id]['cards'] = data.cards;
                database['game']['remaining'] = data.remaining;
                if (getCardValue(database['players'][id]['cards']) == 21){
                    io.to(id).emit('add', database['players'][id]['bet']*1.5);
                    database['players'][id]['balance'] += database['players'][id]['bet']*1.5

                    database['players'][id]['state'] = 'bj';
                    database['players'][id]['stats']['blackjacks'] += 1;
                }else{
                    console.log("DEDUCT " + id + ": " + database['players'][id]['bet']);
                    io.to(id).emit('deduct', database['players'][id]['bet'])
                    database['players'][id]['balance'] -= database['players'][id]['bet']
                    database['players'][id]['state'] = 'wait';
                }
                io.emit('game-update', database);
            }).catch((e) => {

                console.log("ERROR WHILE DRAWING: " + e)
                console.log(`https://deckofcardsapi.com/api/deck/${database['game']['deckId']}/draw/?count=2`)
                startGame(true);
                return;
            })
        }
    }

    getNextPlayer();

}

let countdown;
io.on('connection', socket => {

    socket.on('join', (data) => {
        if (Object.keys(database['players']).length >= maxPlayers){
            return;
        }
        let playerInfo = data;
        database["players"][socket.id] = playerInfo;
        database["players"][socket.id].bet = 0;
        database['players'][socket.id]['stats'] = {
            "wins": 0,
            "loses": 0,
            "blackjacks": 0,

        };
        database["players"][socket.id].id = socket.id;
        console.log('Joined: ' + playerInfo.username);
        io.emit('game-update', database);
    })
    
    socket.on('disconnect', () => {
        console.log('Disconnected: ' + socket.id);
        delete database["players"][socket.id];
        //TODO: Change this to players with bet
        if (Object.keys(database['players']).length <= 0){
            database['game'].gameState = 'waiting';
            database['dealer'] = {};
            database['game'].turnId = '';
            for(const id in database['players']){
                database['players'][id]['cards'] = [];
                database['players'][id]['bet'] = 0;
                database['players'][id]['state'] = 'wait';
            }
            io.emit('game-update', database);

        }
        io.emit('game-update', database);
    })

    socket.on('bet', (betAmount) => {
        if(database['game'].gameState == "waiting"){
            database['game'].gameState = 'starting';
            io.emit('countdown', '45');
            countdown = setTimeout(() => {
                startGame();
            }, 45 * 1000)
        }

        database['players'][socket.id].bet = betAmount;
        let canStart = true;
        for(const id in database['players']){
            if (database['players'][id].bet <= 0){
                canStart = false;
            }
        }
        if(canStart){
            if(countdown){
                clearTimeout(countdown);
            }
            startGame();
        }
        io.emit('game-update', database);
    })
    socket.on('force-add', (amount) => {
        io.to(socket.id).emit('add', amount);
        database['players'][id]['balance'] += amount
        io.emit('game-update', database);
    })
    socket.on('hit', async () => {
        if (database['game']['turnId'] == socket.id && database['players'] != null){
            await fetch(`https://deckofcardsapi.com/api/deck/${database['game']['deckId']}/draw/?count=1`).then((response) => response.json()).then((data) => {
                database['players'][socket.id]['cards'].push(data.cards[0]);
            })
        
            if (getCardValue(database['players'][socket.id]['cards'])>21){
                database['players'][socket.id]['state'] = 'bust';
                database['players'][socket.id]['stats']['loses'] += 1;

                getNextPlayer();
            }

            io.emit('game-update', database);
        }

    })
    socket.on('stand', () => {
        if (database['game']['turnId'] == socket.id  && database['players'] != null){

            database['players'][socket.id]['state'] = 'stand';
            getNextPlayer();
            io.emit('game-update', database);
        }
    })
    socket.on('force-hit', async (id) => {
        if (database['game']['turnId'] == id && database['players'] != null){
            await fetch(`https://deckofcardsapi.com/api/deck/${database['game']['deckId']}/draw/?count=1`).then((response) => response.json()).then((data) => {
                database['players'][id]['cards'].push(data.cards[0]);
            })
        
            if (getCardValue(database['players'][id]['cards'])>21){
                database['players'][id]['state'] = 'bust';
                database['players'][id]['stats']['loses'] += 1;

                getNextPlayer();
            }

            io.emit('game-update', database);
        }
    })
    socket.on('force-stand', (id) => {
        if(database['game']['turnId'] == id && database['players'] != null){
            database['players'][id]['state'] = 'stand';
            getNextPlayer();
            io.emit('game-update', database);
        }
    })
    socket.on('disconnect-player', (id) => {
        delete database["players"][id];
        if (Object.keys(database['players']).length <= 0){
            database['game'].gameState = 'waiting';
            database['dealer'] = {};
            database['game'].turnId = '';
            for(const id in database['players']){
                database['players'][id]['cards'] = [];
                database['players'][id]['bet'] = 0;
                database['players'][id]['state'] = 'wait';
            }
            io.to(id).emit('alert-kick')
            io.emit('game-update', database);

        }
        io.emit('game-update', database);    
    })

});
