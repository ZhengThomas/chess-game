import React from 'react';
import { ChessPiece } from './chessPiece';
import { Square } from './square';
import { knightMoves, rookMoves, bishopMoves, queenMoves, kingMoves } from './boardLogic/precomputedData';
import { CustomDragLayer } from './customDrag';
import { Promotion } from './promotion';
import { ThemeConsumer } from 'react-bootstrap/esm/ThemeProvider';
import { checkPinned } from './boardLogic/checkPinned';
import { generateAllLegal } from './boardLogic/moveGenerator';
import { io } from 'socket.io-client';
import WaitForOther from './waitForOther.js';
import { convertSeconds } from './convertTime';
import { biggestDepth, decideBestAiMoveAspiration, decideBestAiMoveButBad, imTrans, makeBoardMove, oldBest, unMakeBoardMove } from './ai/aiBullshit';
import { decideBestAiMove } from './ai/aiBullshit';
import { bestMove } from './ai/aiBullshit';
import { resetGlobalVar } from './ai/aiBullshit';
import { fuckMe } from './ai/aiBullshit';
import { orderlessDecideBestAiMove } from './ai/aiBullshit';
import { findingHash, generateRandomNumsZobrist} from './ai/zobristHashGenerator';
import "./board.css";

var socket = io("http://localhost:3333/");
var alreadyJoined = false;
var everyoneIn = false;
var roomFull = false;
var roomNonexist = false;
var finishedJoining = false;

export class Board extends React.Component {

    constructor(props){

        console.log(convertSeconds(3601));
        generateRandomNumsZobrist();
        

        super(props);
        let myTeam = this.props.myTeam
        if(this.props.myTeam === "random"){
            if(Math.random() > 0.5) myTeam = "black";
            else myTeam = "white";
        }
        let startingTime = this.props.startingTime;
        let infTime = false;
        if(startingTime == "1/2") startingTime = 30;
        else if(startingTime == "1/4") startingTime = 15;
        else if(startingTime == "Infinity") infTime = true;
        else startingTime = parseInt(startingTime)

        if(this.props.gamemode === "local" || this.props.gamemode === "ai"){
            finishedJoining = true;
            alreadyJoined = true;
            everyoneIn = true;
        }

        let fakeBoard = [];
        for(let i = 0; i < 64; i++){
            fakeBoard.push("em");
        }

        let startingPieces = [
            {piece:"rook", key:0, team:"black", pinned:false, moved:false},
            {piece:"knight", key:1, team:"black", pinned:false},
            {piece:"bishop", key:2, team:"black", pinned:false},
            {piece:"queen", key:3, team:"black", pinned:false},
            {piece:"king", key:4, team:"black", pinned:false, moved:false},
            {piece:"bishop", key:5, team:"black", pinned:false},
            {piece:"knight", key:6, team:"black", pinned:false},
            {piece:"rook", key:7, team:"black", pinned:false, moved:false},

            {piece:"pawn", key:8, team:"black", pinned:false, moved:false, doublejumped: -1},
            {piece:"pawn", key:9, team:"black", pinned:false, moved:false, doublejumped: -1},
            {piece:"pawn", key:10, team:"black", pinned:false, moved:false, doublejumped: -1},
            {piece:"pawn", key:11, team:"black", pinned:false, moved:false, doublejumped: -1},
            {piece:"pawn", key:12, team:"black", pinned:false, moved:false, doublejumped: -1},
            {piece:"pawn", key:13, team:"black", pinned:false, moved:false, doublejumped: -1},
            {piece:"pawn", key:14, team:"black", pinned:false, moved:false, doublejumped: -1},
            {piece:"pawn", key:15, team:"black", pinned:false, moved:false, doublejumped: -1},

            {piece:"pawn", key:48, team:"white", pinned:false, moved:false, doublejumped: -1},
            {piece:"pawn", key:49, team:"white", pinned:false, moved:false, doublejumped: -1},
            {piece:"pawn", key:50, team:"white", pinned:false, moved:false, doublejumped: -1},
            {piece:"pawn", key:51, team:"white", pinned:false, moved:false, doublejumped: -1},
            {piece:"pawn", key:52, team:"white", pinned:false, moved:false, doublejumped: -1},
            {piece:"pawn", key:53, team:"white", pinned:false, moved:false, doublejumped: -1},
            {piece:"pawn", key:54, team:"white", pinned:false, moved:false, doublejumped: -1},
            {piece:"pawn", key:55, team:"white", pinned:false, moved:false, doublejumped: -1},

            {piece:"rook", key:56, team:"white", pinned:false, moved:false},
            {piece:"knight", key:57, team:"white", pinned:false},
            {piece:"bishop", key:58, team:"white", pinned:false},
            {piece:"queen", key:59, team:"white", pinned:false},
            {piece:"king", key:60, team:"white", pinned:false, moved:false},
            {piece:"bishop", key:61, team:"white", pinned:false},
            {piece:"knight", key:62, team:"white", pinned:false},
            {piece:"rook", key:63, team:"white", pinned:false, moved:false},
        ] 

        for(let i = 0; i < startingPieces.length; i++){
            fakeBoard[startingPieces[i]["key"]] = startingPieces[i];
        }

        this.state = {
            board:fakeBoard,
            turnNum:1,
            whitesTurn: true,
            choosingPromotion : -1,
            gamemode: this.props.gamemode,
            secondsLeftWhite : startingTime,
            secondsLeftBlack : startingTime,
            gaming: true,
            winner : null,
            myTeam : myTeam,
            infTime : infTime,
            preparedResign : false,
            previousSpot : -1,
            spotNow : -1,
            underCheck : -1,
            aiWillMove : false
        }

        this.movePiece = this.movePiece.bind(this);
        this.genValidMovesKnight = this.genValidMovesKnight.bind(this);
        this.promotePawn = this.promotePawn.bind(this);
        this.timerBlack = null;
        this.timerWhite = null;
    }

    movePiece(from, to){

        if(!this.state.gaming) return;

        if(this.state.myTeam === "black"){
            from = 63 - from;
            to = 63 - to;
        }

        let fakeBoard = this.state.board;
        let oldBoardState = JSON.parse(JSON.stringify(this.state.board));
        let pieceMove = fakeBoard[from];

        let kingOrNot = false;
        
        if(this.state.choosingPromotion > 0) return;
        if(this.state.gamemode === "multiplayer" && this.state.board[from].team !== this.state.myTeam) return;
        
        if(this.state.whitesTurn){
            if(pieceMove.team === "black") return;
        }
        else if(!this.state.whitesTurn){
            if(pieceMove.team === "white") return;
        }

        let kingsSquare = 0;
        let teamMoving = "black";
        if(this.state.whitesTurn) teamMoving = "white";

        for(let i = 0; i < 64; i++){
            if(fakeBoard[i].piece === "king" && fakeBoard[i].team == teamMoving){
                kingsSquare = i;
            }
        }
        
        if(pieceMove.piece === "knight"){
            if(!this.checkValidKnight(from, to)) return;
        }

        if(pieceMove.piece === "rook"){
            if(!this.checkValidRookBishopQueen(from, to, 'rook')) return;
        }

        if(pieceMove.piece === "bishop"){
            if(!this.checkValidRookBishopQueen(from, to, 'bishop')) return;
        }

        if(pieceMove.piece === "queen"){
            if(!this.checkValidRookBishopQueen(from, to, 'queen')) return;
        }
        

        let changePositions = true;
        if(pieceMove.piece === "king"){
            let board = fakeBoard;
            let kingsMove = this.checkValidKing(from, to);
            console.log(kingsMove);
            changePositions = false;

            if(kingsMove === "black left"){
                board[2] = board[from]
                board[3] = board[to]
                board[from] = 'em'
                board[to] = 'em'
            }
            if(kingsMove === "black right"){
                board[6] = board[from]
                board[5] = board[to]
                board[to] = 'em'
                board[from] = 'em'
            }
            if(kingsMove == "white left"){
                board[58] = board[from]
                board[59] = board[to]
                board[from] = 'em'
                board[to] = 'em'
            }
            if(kingsMove == "white right"){
                console.log("asd");
                board[62] = board[from]
                board[61] = board[to]
                board[to] = 'em'
                board[from] = 'em'
            }
            if(!kingsMove) return;
            if(kingsMove === true){ 
                changePositions = true;
            }
            
            kingsSquare = to;
        }

        if(pieceMove.piece === "pawn"){
            let pawnMove = this.checkValidPawn(from, to)
            if(pawnMove === "double"){
                //setting as turn number since boolean would mean i would need to set false later
                if(pieceMove.moved) return;
                fakeBoard[from].doublejumped = this.state.turnNum;
            }
            else if(pawnMove === true){
                //dont do anything
            }
            else if(pawnMove !== false){
                //must mean its an integer referring to direction on the en passant
                fakeBoard[to - (pawnMove * 8)] = "em";
            }
            else return;

            pieceMove.moved = true;
            pieceMove.movedBefore = true;

            if((-1 < to && to < 8) || (55 < to && to < 64)){
                fakeBoard[from] = "em";
                fakeBoard[to] = pieceMove;
                this.setState({
                    "board": fakeBoard,
                    choosingPromotion : to,
                    previousSpot : from
                });
                return;
            }

        }
        
        if(changePositions){
        fakeBoard[from] = "em";
        fakeBoard[to] = pieceMove;
        }

        if(!this.checkLegal(kingsSquare, teamMoving, fakeBoard)){
            this.setState({"board":oldBoardState});
            return;
        }

        let currentTurn = this.state.turnNum;



        if(this.props.gamemode === "local"){

            if(!this.state.infTime){

                if(this.state.whitesTurn){
                    this.timerBlack = setInterval(() => {
                        this.setState(state => ({
                        secondsLeftBlack : state.secondsLeftBlack - 1
                        }));
                        if(this.state.secondsLeftBlack === 0) this.checkmate("White");
                    }, 1000);
                    clearInterval(this.timerWhite);
                    console.log(this.state.secondsLeftWhite);
                    console.log(this.state.secondsLeftWhite + parseInt(this.props.timeRestored));
                    this.setState(state => ({
                        secondsLeftWhite : state.secondsLeftWhite + parseInt(this.props.timeRestored)
                    }));
                }
                else{
                    this.timerWhite = setInterval(() => {
                        this.setState(state => ({
                        secondsLeftWhite : state.secondsLeftWhite - 1
                        }));
                        if(this.state.secondsLeftWhite === 0) this.checkmate("Black");
                    }, 1000);
                    clearInterval(this.timerBlack);
                    this.setState(state => ({
                        secondsLeftBlack : state.secondsLeftBlack + parseInt(this.props.timeRestored)
                    }));
                }
            }
        }

        pieceMove.moved = true;
        pieceMove.movedBefore = true;

        let enemyTeam = !this.state.whitesTurn ? "white" : "black";
        let movingTeam = this.state.whitesTurn ? "White" : "Black";

        console.log(enemyTeam);

        let potentialEnemyMoves = generateAllLegal(fakeBoard, enemyTeam, this.state.turnNum);
        if(potentialEnemyMoves == "checkmate") this.checkmate(movingTeam);
        if(potentialEnemyMoves == "stalemate") this.stalemate();

        let enemyCheck = -1;
        if(potentialEnemyMoves[3]){
            //if my king is under check after that move, find king
            for(let i = 0; i < 64; i++){
                if(fakeBoard[i] != "em" && fakeBoard[i].piece == "king" && fakeBoard[i].team == enemyTeam){
                    enemyCheck = i;
                    break;
                }
            }
        }
        
        this.setState(prevState => {
            return({
            "board": fakeBoard,
            turnNum: prevState.turnNum + 1,
            whitesTurn : !prevState.whitesTurn,
            previousSpot : from,
            spotNow : to,
            underCheck : enemyCheck
            });
        });
        
        if(this.props.gamemode === "ai"){
            
            resetGlobalVar("black", true);
            
            /*
            let returnVal = 0;
            for(let i = 1; i < 10; i++){
                resetGlobalVar("black", true);
                let returnVal = decideBestAiMoveButBad([...fakeBoard], 'black', this.state.turnNum, i, -10000000, 100000000);
                if(returnVal === "failed") {console.log(i); break;}
                oldBest = [...bestMove];
            }
            //if(returnVal === "failed") decideBestAiMoveButBad([...fakeBoard], 'black', this.state.turnNum, 3, -10000000, 100000000);
            this.movePieceAi(oldBest[0], oldBest[1]);
            console.log(fuckMe);
            console.log(imTrans);
            */
            
            
            //console.log(findingHash([...fakeBoard], this.state.turnNum, "black"));
            //console.log(findingHash([...fakeBoard], this.state.turnNum, "black"));

            /*
            resetGlobalVar("black");
            orderlessDecideBestAiMove([...fakeBoard], "black", this.state.turnNum, 6, -10000000, 10000000);
            console.log(fuckMe);
            let fuck2 = fuckMe;
            if(fuck1 < fuck2) {
                console.log("ordering was good, helped by " + (fuck2 - fuck1).toString());
                console.log("was originally " + (fuck2).toString())
            }
            */

            /*
            this.setState({
                aiWillMove:true
            });
            
            
            resetGlobalVar("black", true);
            for(let i = 1; i < 10; i++){
                resetGlobalVar("black", false);
                let returnVal = decideBestAiMoveButBad([...fakeBoard], 'black', this.state.turnNum, i, -10000000, 100000000, 0);
                if(returnVal === "failed"){ console.log(i - 1); break; }
            }
            this.movePieceAi(oldBest[0], oldBest[1]);
            */
            
        }
        
        if(this.props.gamemode === "multiplayer"){
            socket.emit("sendInfo", {"room" : this.props.match.params.id, state : this.state});
        }
    }

    checkmate(who){
        this.setState({
            winner : who,
            gaming : false
        });
        clearInterval(this.timerBlack);
        clearInterval(this.timerWhite);
    }

    stalemate(){
        console.log("stalemate");
        clearInterval(this.timerBlack);
        clearInterval(this.timerWhite);
    }

    movePieceAi(from, to){
        //console.log(from, to);
        let fakeBoard = this.state.board;
        let fuck = to;
        if(from == null || to == null){
            //youre ion checkmate
            return;
        }

        if(to === "right castle") {
            fakeBoard[from + 2] = fakeBoard[from];
            fakeBoard[from + 1] = fakeBoard[from + 3];
            fakeBoard[from + 1].moved = true;
            fakeBoard[from + 2].moved = true;

            fakeBoard[from + 3] = "em";
            fakeBoard[from] = "em";
        }
        else if(to === "left castle"){
            fakeBoard[from - 2] = fakeBoard[from];
            fakeBoard[from - 1] = fakeBoard[from - 4];
            fakeBoard[from - 1].moved = true;
            fakeBoard[from - 2].moved = true;

            fakeBoard[from - 4] = "em";
            fakeBoard[from] = "em";
        }

        if(fakeBoard[from] != "em" && fakeBoard[from].piece == "pawn" && Array.isArray(to)){
            if(to[0] === "en passant"){
                let pawnDirection = (to[1] - from) / Math.abs(to[1] - from);
                fakeBoard[to[1] - (8 * pawnDirection)] = "em";
            }
            else{
                switch(to[1]){
                    case "promote queen": fakeBoard[from].piece = "queen"; break;
                    case "promote rook": fakeBoard[from].piece = "rook"; break;
                    case "promote bishop": fakeBoard[from].piece = "bishop"; break;
                    case "promote knight": fakeBoard[from].piece = "knight"; break;
                }
            }
            to = to[0];
        }

        fakeBoard[to] = fakeBoard[from];
        fakeBoard[from] = "em";
        

        if(fakeBoard[to] != "em"){
            fakeBoard[to].moved = true;
            fakeBoard[to].movedBefore = true;
        }

        if(fakeBoard[to].piece === "pawn"){
            if(Math.abs(to - from) == 16){
                fakeBoard[to].doublejumped = this.state.turnNum;
            }
        }

        let enemyTeam = !this.state.whitesTurn ? "white" : "black";
        let movingTeam = this.state.whitesTurn ? "White" : "Black";

        let potentialEnemyMoves = generateAllLegal(fakeBoard, enemyTeam, this.state.turnNum);
        if(potentialEnemyMoves == "checkmate") this.checkmate(movingTeam);
        if(potentialEnemyMoves == "stalemate") this.stalemate();

        let enemyCheck = -1;
        if(potentialEnemyMoves[3]){
            //if my king is under check after that move, find king
            for(let i = 0; i < 64; i++){
                if(fakeBoard[i] != "em" && fakeBoard[i].piece == "king" && fakeBoard[i].team == enemyTeam){
                    enemyCheck = i;
                    break;
                }
            }
        }
        this.setState(prevState => {
            return({
            "board": fakeBoard,
            turnNum: prevState.turnNum + 1,
            whitesTurn : !prevState.whitesTurn,
            previousSpot : from,
            spotNow : to,
            underCheck: enemyCheck,
            aiWillMove : false
            });
        });

    }

    genValidMovesKnight(pos){
        if(this.state.existingPiece[this.state.board[pos]].pinned) return [];

        let valid = []
        let existingPiece = this.state.existingPiece;
        let board = this.state.board;
        for(let i = 0; i < knightMoves[pos].length; i++){
            //if destination is empty or desitnation is not same team
            if(board[knightMoves[pos][i]] === "em" || existingPiece[board[knightMoves[pos][i]]].team != existingPiece[board[pos]].team){
                valid.push(knightMoves[pos][i]);
            } 
        }
        return valid;
    }

    checkValidKnight(start, stop) {
        let board = this.state.board;
        if(board[stop] === "em" || board[stop].team != board[start].team){

            let distY = Math.abs(parseInt(start / 8) - parseInt(stop / 8));
            let distX = Math.abs((start % 8) - (stop % 8));
            return (distY == 2 && distX == 1) || (distX == 2 && distY == 1) ;
        }
        return false;
    }

    checkValidRookBishopQueen(start, stop, pieceName) {

        let pieceMove = null
        if (pieceName === 'bishop') {
            pieceMove = bishopMoves 
        } 

        else if (pieceName === 'rook') {
            pieceMove = rookMoves
        }

        else if (pieceName === 'queen') {
            pieceMove = queenMoves
        }

        let board = this.state.board;
        let where = []

        

        if(board[stop] === "em" || board[stop].team != board[start].team){ 

            // finding where the stop is located within the precomputed data
            for (let i = 0; i < pieceMove[start].length; i++) {
                for (let j = 0; j < pieceMove[start][i].length; j++) {
                    if (pieceMove[start][i][j] === stop) {
                        where = [i, j]
                    }
                }
            }

            if (where.length === 0) {
                return false
            }
            
            // checking for enemies
            for (let i = 0; i < where[1]; i++) {
                if (board[pieceMove[start][where[0]][i]] != 'em'){
                    return false
                }
            }
            return true;
        }
        return false;

        
    }

    checkValidPawn(start, stop){
        //forward mvoement check
        let board = this.state.board;
        

        //1 means down
        let movementDir = 1;
        if(board[start].team === "white"){
            movementDir = -1;
        }

        if(board[start] === "em") return false;
        //if the start and stop is on the same row, required due to quriks of making board 1 layer
        if(Math.floor(stop / 8) == Math.floor(start / 8)) return false;
        if(Math.abs(Math.floor(stop / 8) - Math.floor(start/8)) == 2){
            if(stop === start + (16 * movementDir) && board[stop] === "em" && board[stop - (8 * movementDir)] === "em"){
                return "double";
            }
            else return false;
        }

        //vertical movement
        if(stop === start + (8 * movementDir) && board[stop] === "em"){
            return true;
        }

        //diag movement
        if(stop === start + (7 * movementDir) && board[stop].team !== board[start].team && board[stop] !== "em"){
            return true;
        }
        if(stop === start + (9 * movementDir) && board[stop].team !== board[start].team && board[stop] !== "em"){
            return true;
        }
        //en passant
        //if pawn to my left or right double jumped last turn
        if(board[start - (1 * movementDir)].doublejumped === this.state.turnNum - 1){
            if(stop === start + (7 * movementDir) && board[stop] === "em"){
                return movementDir;
            }
        }

        if(board[start + (1 * movementDir)].doublejumped === this.state.turnNum - 1){
            if(stop === start + (9 * movementDir) && board[stop] === "em"){
                return movementDir;
            }
        }

        return false
    }

    checkLegal(kingSquare, kingTeam, boardState){
        //makes the king pretend to be every piece in the game, and checks if it can run into the piece its imitating
        //first checks for sliding pieces

        let possibleLines = queenMoves[kingSquare];
        let board = boardState;
        for(let i = 0; i < 4; i++){
            let currentDir = possibleLines[i];
            for(let j = 0; j < currentDir.length; j++){
                if(board[currentDir[j]] != "em"){
                    if(board[currentDir[j]].piece === "queen" || board[currentDir[j]].piece === "rook"){
                        if(board[currentDir[j]].team != kingTeam){
                            return false
                        } else break
                    } else break
                }
            }

        }
        for(let i = 4; i < 8; i++){
            let currentDir = possibleLines[i];
            for(let j = 0; j < currentDir.length; j++){
                if(board[currentDir[j]] != "em"){
                    if(board[currentDir[j]].piece === "queen" || board[currentDir[j]].piece === "bishop"){
                        if(board[currentDir[j]].team != kingTeam){
                            return false
                        } else break
                    }else break
                }
            }
        }

        for(let i = 0; i < knightMoves[kingSquare].length; i++){
            let pieceToCheck = board[knightMoves[kingSquare][i]]
            if(pieceToCheck !== "em" && pieceToCheck.team != kingTeam && pieceToCheck.piece === "knight"){
                return false
            }
        }

        let enemyPawnMoveDir = 1;
        if(kingTeam === "black") enemyPawnMoveDir = -1;

        for(let i = 0; i < kingMoves[kingSquare].length; i++){
            let squareToMove = kingMoves[kingSquare][i];
            let moveDiff = Math.abs(squareToMove - kingSquare);
            let pieceOnSquare = board[squareToMove];
            if(moveDiff == 9 || moveDiff == 7){
                if(pieceOnSquare !== "em" && (pieceOnSquare.piece === "king" || pieceOnSquare.piece === "pawn") && pieceOnSquare.team !== kingTeam){
                    return false;
                }
            }
            else{
                if(pieceOnSquare !== "em" && pieceOnSquare.piece === "king" && pieceOnSquare.team !== kingTeam){
                    return false;
                }
            }
        }

        return true;
    }

    checkValidKing(start, stop){
        let board = this.state.board;
        if((board[stop] === "em" || board[stop].team != board[start].team) && kingMoves[start].includes(stop)) {
            return true;
        } 

        else if (board[stop].team === board[start].team && board[stop].piece === 'rook' && !board[stop].moved && !board[start].moved) {
            if (board[start].team === 'black') {
                if (start - stop > 0 && board[1] === 'em' && board[2] === 'em' && board[3] === 'em') {
                    return "black left"
                }

                else if (start - stop < 0 && board[6] === 'em' && board[5] === 'em') {
                    return "black right"
                }
            }

            else if (board[start].team === 'white') {
                if (start - stop > 0 && board[59] === 'em' && board[58] === 'em' && board[57] === 'em') {
                    return "white left";
                }

                else if (start - stop < 0 && board[62] === 'em' && board[61] === 'em') {
                    return "white right"
                }
            }
        }
        return false
    }

    promotePawn(what){
        //what is what you want the pawn to be

        let fakeBoard = this.state.board;
        fakeBoard[this.state.choosingPromotion].piece = what;
        let newSpot = this.state.choosingPromotion;

        //due to the nature of setstate being an async functions, i cant rely on it finishing before the socket emit runs
        //because of that i change what i need to over here first before changing state
        let fakeState = this.state;
        fakeState.board = fakeBoard;
        fakeState.turnNum = this.state.turnNum + 1;
        fakeState.whitesTurn = !this.state.whitesTurn;
        fakeState.choosingPromotion = -1;

        socket.emit("sendInfo", {"room" : this.props.match.params.id, state : fakeState});

        let enemyTeam = this.state.whitesTurn ? "white" : "black";
        let movingTeam = !this.state.whitesTurn ? "White" : "Black";

        let potentialEnemyMoves = generateAllLegal([...fakeBoard], enemyTeam, this.state.turnNum);
        if(potentialEnemyMoves == "checkmate") this.checkmate(movingTeam);
        if(potentialEnemyMoves == "stalemate") this.stalemate();

        let enemyCheck = -1;
        if(potentialEnemyMoves[3]){
            //if my king is under check after that move, find king
            for(let i = 0; i < 64; i++){
                if(fakeBoard[i] != "em" && fakeBoard[i].piece == "king" && fakeBoard[i].team == enemyTeam){
                    enemyCheck = i;
                    break;
                }
            }
        }

        this.setState(prevState => {
            return({
            "board": fakeBoard,
            turnNum: prevState.turnNum + 1,
            whitesTurn: prevState.whitesTurn,
            choosingPromotion : -1,
            spotNow : newSpot,
            underCheck : enemyCheck
            });
        });

        if(this.props.gamemode === "ai"){
            resetGlobalVar();

            decideBestAiMove([...fakeBoard], 'black', this.state.turnNum, 3, -10000000, 100000000);
            this.movePieceAi(bestMove[0], bestMove[1]);

            
            this.setState(prevState => {
                return({
                whitesTurn : !prevState.whitesTurn,
                });
            });
        }
        //functions also does the things that the movepiece didnt do since promoting a pawn pauses the game
    }

    componentDidUpdate(){
        if(this.props.gamemode == "ai"){
            let aiTeam = this.state.myTeam == "white" ? "black" : "white"
            console.log(aiTeam)
            if((this.state.whitesTurn && this.state.myTeam != "white") || (!this.state.whitesTurn && this.state.myTeam == "white")){
                resetGlobalVar(aiTeam, true);
                for(let i = 1; i < 10; i++){
                    resetGlobalVar(aiTeam, false);
                    
                    let returnVal = decideBestAiMoveButBad([...this.state.board], aiTeam, this.state.turnNum, i, -100000000, 100000000, 0);
                    if(returnVal === "failed"){ console.log(i - 1); break; }
                }
                this.movePieceAi(oldBest[0], oldBest[1]);
            }
        }
    }

    componentDidMount(){
        if(this.props.gamemode == "ai"){
            let aiTeam = this.state.myTeam == "white" ? "black" : "white"
            console.log("asd")
            if((this.state.whitesTurn && this.state.myTeam != "white") || (!this.state.whitesTurn && this.state.myTeam == "white")){
                resetGlobalVar(aiTeam, true);
                for(let i = 1; i < 10; i++){
                    resetGlobalVar(aiTeam, false);
                    
                    let returnVal = decideBestAiMoveButBad([...this.state.board], aiTeam, this.state.turnNum, i, -10000000, 100000000, 0);
                    if(returnVal === "failed"){ console.log(i - 1); break; }
                }
                this.movePieceAi(oldBest[0], oldBest[1]);
            }
        }
    }

    componentWillMount() {
        
        if(!alreadyJoined && this.state.gamemode === "multiplayer"){
            alreadyJoined = true;
            socket.emit("joinRoom", this.props.match.params.id, this.state.myTeam, (returnData) =>{
                finishedJoining = true;

                if(returnData == "room full"){
                    roomFull = true;
                }
                else if(returnData == "nonexistent"){
                    roomNonexist = true;
                }
                else if(returnData == "joined black"){
                    this.setState({
                        myTeam : "black"
                    });
                    return;
                }
                else if(returnData == "joined white"){
                    this.setState({
                        myTeam : "white"
                    });
                    return;
                }

                this.forceUpdate();  
            });
        }

        socket.on("changeState", (data) => {
            if(!this.state.gaming) return;
            let currentTeam = this.state.myTeam;
            data.myTeam = currentTeam;
            if(this.state.secondsLeftWhite < data.secondsLeftWhite) data.secondsLeftWhite = this.state.secondsLeftWhite;
            if(this.state.secondsLeftBlack < data.secondsLeftBlack) data.secondsLeftBlack = this.state.secondsLeftBlack;

            clearInterval(this.timerBlack);
            clearInterval(this.timerWhite);

            if(!data.whitesTurn){
                this.timerBlack = setInterval(() => {
                    this.setState(state => ({
                    secondsLeftBlack : state.secondsLeftBlack - 1
                    }));
                }, 1000);
            }
            else{
                this.timerWhite = setInterval(() => {
                    this.setState(state => ({
                    secondsLeftWhite : state.secondsLeftWhite - 1
                    }));
                }, 1000);
            }

            this.setState(data);
        });

        socket.on("playerJoined", (data) => {
            if(data.players == 2){
                everyoneIn = true;
                this.forceUpdate();
            }
        });
    }

    render() {
        if(!finishedJoining) return(
            <div></div>
        );

        if(roomFull){
            return (
                <h1>room is full</h1>
            )
        }
        else if(roomNonexist){
            return (
                <h1>room doesn't exist</h1>
            )
        }

        else if(!everyoneIn){
            return (
                <WaitForOther />
            );
        }

        let entireBoard = [];

        console.log(this.state.previousSpot);
        console.log(this.state.spotNow)

        for(let i = 0; i < 8; i ++){
            let currentRow = [];
            for(let j = 0; j < 8; j++){
                let squareIndex = (i * 8) + j;
                let realSquareInd = squareIndex;
                console.log()
                if(this.state.myTeam === "black") squareIndex = 63 - squareIndex;

                let highlight = false;
                let checkHigh = false;
                if(this.state.spotNow == squareIndex || this.state.previousSpot == squareIndex) highlight = true;
                if(this.state.underCheck == squareIndex) checkHigh = true;

                let squareProps = {row : i, col : j, board:this, highlight : highlight, checkHighlight : checkHigh};

                if(this.state.board[squareIndex] === "em"){
                    currentRow.push(<Square props = {squareProps} />);
                }
                else if(this.state.choosingPromotion === squareIndex){
                    currentRow.push(
                    <Square props = {squareProps} >
                        <Promotion 
                            promoteFunc = {this.promotePawn}
                            team = {this.state.board[squareIndex].team}
                            whichWay = {realSquareInd < 8 ? "down" : "up"}
                        />
                    </Square>
                    );
                }
                else{
                    currentRow.push(
                    <Square props = {squareProps} >
                        <ChessPiece 
                        index = {(i * 8) + j}
                        team = {this.state.board[squareIndex]["team"]}
                        piece = {this.state.board[squareIndex]["piece"]}
                        key = {this.state.board[squareIndex]["key"]}
                        />
                    </Square>);
                }
            }
            entireBoard.push(<div style = {{display:"flex"}}>{currentRow}</div>);
        }

        let gameState = (
        <div className = "gameStateContainer">
            <h1 style = {{fontSize:"min(4vw, 4vh)", fontWeight:"200"}}>{(this.state.whitesTurn ? "White" : "Black") + " To Move"}</h1>
        </div>
        );
        if(!this.state.gaming){
            let winner = this.state.winner;
            gameState = (
            <div className = "gameStateContainer">
                <h1 style = {{fontSize:"2vw", fontWeight:"200"}}>{winner} Wins</h1>
            </div>);
        }

        //handles the resign button stuff
        //if prepared to resign then show the cvancel and resign buttonl, otherwise just normal get prepared
        let resignStuff;
        if(!this.state.gaming){
            resignStuff = (
                <div className = "resignHolders">

                </div>
            );
        }
        else if(this.state.preparedResign){
            resignStuff = (
                <div className = "resignHolders">

                    <button 
                        onClick = {() => {this.setState({preparedResign : false})}}
                        className = "resignButtons"
                    >
                        <img src = "/images/x.png" className = "fillToFit"/>
                    </button>

                    <button 
                        onClick = {() => {
                            if(this.props.gamemode === "local"){
                                this.checkmate((this.state.whitesTurn ? "Black" : "White"));
                                return;
                            }
                            this.checkmate((this.state.myTeam === "white" ? "Black" : "White"));
                        }}
                        className = "resignButtonsRed"
                    >
                        <img src = "/images/flag.png" className = "fillToFit"/>
                    </button>

                </div>
            );
        }
        else{
            resignStuff = (
                <div className = "resignHolders">
                    <button 
                        onClick = {() => {this.setState({preparedResign : true})}}
                        className = "resignButtons"
                    >
                        <img src = "/images/flag.png" className = "fillToFit"/>
                    </button>
                    <div style = {{height:"40%", marginTop:"10%"}}/>
                </div>
            );
        }

        

        return(
            <div style = {{width:"100%", height:"100%", display:"flex", alignItems:"center", paddingTop:"3vh"}}>
            <CustomDragLayer />
            <div style = {{width : "min(44vw, 44vh)"}} />
                <div className = "boardContainer">
                    {entireBoard}
                </div>

            <div className = "uiStuff">
            
                {(this.props.gamemode !== "ai" && !this.state.infTime) ? 
                <div className = "timeContainer">
                    <h1 style = {{fontSize : "6vh", marginLeft:"0.5vw", marginRight:"0.5vw", fontWeight:"400"}}>
                        {this.state.myTeam === "white" ? convertSeconds(this.state.secondsLeftBlack) : convertSeconds(this.state.secondsLeftWhite)}
                    </h1> 
                </div>
                : <div />}
                {/*i dont know how good of a system this is but i put empty divs between the time and the opther stuff*/}
                <div style = {{height:"20%"}} />
                
                {gameState}

                {resignStuff}
                <div style = {{height:"33%"}} />

                {(this.props.gamemode !== "ai" && !this.state.infTime) ? 
                <div className = "timeContainer">
                    <h1 style = {{fontSize : "6vh", marginLeft:"0.5vw", marginRight:"0.5vw", fontWeight:"400"}}>
                        {this.state.myTeam === "white" ? convertSeconds(this.state.secondsLeftWhite) : convertSeconds(this.state.secondsLeftBlack)}
                    </h1> 
                </div>
                : <div />}

            </div>

            </div>
        );
    }
}

{/* huge penis */}