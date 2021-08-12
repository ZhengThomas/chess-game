import React from 'react';
import { ChessPiece } from './chessPiece';
import { Square } from './square';
import { knightMoves, rookMoves, bishopMoves } from './precomputedData';
import { CustomDragLayer } from './customDrag';

export class Board extends React.Component {
    constructor(props){
        super(props);

        let fakeBoard = [];
        for(let i = 0; i < 64; i++){
            fakeBoard.push("em");
        }

        let startingPieces = [
            {piece:"rook", key:0, team:"black", pinned:false},
            {piece:"knight", key:1, team:"black", pinned:false},
            {piece:"bishop", key:2, team:"black", pinned:false},
            {piece:"queen", key:3, team:"black", pinned:false},
            {piece:"king", key:4, team:"black", pinned:false},
            {piece:"bishop", key:5, team:"black", pinned:false},
            {piece:"knight", key:6, team:"black", pinned:false},
            {piece:"rook", key:7, team:"black", pinned:false},

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

            {piece:"rook", key:56, team:"white", pinned:false},
            {piece:"knight", key:57, team:"white", pinned:false},
            {piece:"bishop", key:58, team:"white", pinned:false},
            {piece:"queen", key:59, team:"white", pinned:false},
            {piece:"king", key:60, team:"white", pinned:false},
            {piece:"bishop", key:61, team:"white", pinned:false},
            {piece:"knight", key:62, team:"white", pinned:false},
            {piece:"rook", key:63, team:"white", pinned:false},
            
        ] 

        for(let i = 0; i < startingPieces.length; i++){
            
            fakeBoard[startingPieces[i]["key"]] = startingPieces[i];
        }

        console.log(fakeBoard)

        this.state = {
            board:fakeBoard,
            turnNum:0
        }

        this.movePiece = this.movePiece.bind(this);
        this.genValidMovesKnight = this.genValidMovesKnight.bind(this);
    }

    movePiece(from, to){
        let fakeBoard = this.state.board;
        let pieceMove = fakeBoard[from];

        if(pieceMove.piece === "knight"){
            if(!this.checkValidKnight(from, to)) return;
        }

        if(pieceMove.piece === "rook"){
            if(!this.checkValidRook(from, to)) return;
        }

        if(pieceMove.piece === "bishop"){
            if(!this.checkValidBishop(from, to)) return;
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
        }

        fakeBoard[from] = "em";
        fakeBoard[to] = pieceMove;
        let currentTurn = this.state.turnNum
        this.setState(prevState => {
            return({
            "board": fakeBoard,
            turnNum: prevState.turnNum + 1
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

    checkValidRook(start, stop) {
        let board = this.state.board;
        let where = []
        if(board[stop] === "em" || board[stop].team != board[start].team){ 

            // finding where the stop is located within the precomputed data
            for (let i = 0; i < rookMoves[start].length; i++) {
                for (let j = 0; j < rookMoves[start][i].length; j++) {
                    if (rookMoves[start][i][j] === stop) {
                        where = [i, j]
                    }
                }
            }

            if (where.length === 0) {
                return false
            }
            
            // checking for enemies
            for (let i = 0; i < where[1]; i++) {
                if (board[rookMoves[start][where[0]][i]] != 'em'){
                    return false
                }
            }
        } 

        return true
    }

    checkValidBishop(start, stop) {
        let board = this.state.board;
        let where = []
        if(board[stop] === "em" || board[stop].team != board[start].team){ 

            // finding where the stop is located within the precomputed data
            for (let i = 0; i < bishopMoves[start].length; i++) {
                for (let j = 0; j < bishopMoves[start][i].length; j++) {
                    if (bishopMoves[start][i][j] === stop) {
                        where = [i, j]
                    }
                }
            }

            console.log(where)

            if (where.length === 0) {
                return false
            }
            
            // checking for enemies
            for (let i = 0; i < where[1]; i++) {
                if (board[bishopMoves[start][where[0]][i]] != 'em'){
                    return false
                }
            }
        } 

        return true
    }

    checkValidPawn(start, stop){
        //forward mvoement check
        let board = this.state.board;

        console.log(this.state.turnNum);

        //1 means down
        let movementDir = 1;
        if(board[start].team === "white"){
            movementDir = -1;
        }

        //vertical movement
        if(stop === start + (8 * movementDir) && board[stop] === "em"){
            return true;
        }
        if(stop === start + (16 * movementDir) && board[stop] === "em"){
            return "double";
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

    render() {
        let entireBoard = [];

        for(let i = 0; i < 8; i ++){
            let currentRow = [];
            for(let j = 0; j < 8; j++){
                let squareProps = {row : i, col : j, board:this};

                if(this.state.board[(i * 8) + j] === "em"){
                    currentRow.push(<Square props = {squareProps} />);
                }
                else{
                    currentRow.push(
                    <Square props = {squareProps} >
                        <ChessPiece 
                        index = {(i * 8) + j}
                        team = {this.state.board[(i * 8) + j]["team"]}
                        piece = {this.state.board[(i * 8) + j]["piece"]}
                        key = {this.state.board[(i * 8) + j]["key"]}
                        />
                    </Square>);
                }
            }
            entireBoard.push(<div style = {{display:"flex"}}>{currentRow}</div>);
        }

        return(
            <div style = {{width:"100%", height:"100%"}}>
            <CustomDragLayer />
            {entireBoard}
            </div>
        );
    }
}

{/* huge penis */}