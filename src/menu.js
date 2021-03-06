import React from 'react';
import './App.css';
import "./menu.css";
import { io } from 'socket.io-client';

var socket = io("http://localhost:3333/");

export var amountTime = 10;
export var amountIncrement = 0;
export var whichTeam = "black";

class Menu extends React.Component {
    constructor(props){
        super(props);

        this.generateRoom = this.generateRoom.bind(this);

        this.state = {
            sizeTime:25,
            actualSliderValTime: 10,
            sizeIncrement:0,
            actualSliderValIncrement: 0,
            teamChosen: "random"
        }

        this.changeSliderTime = this.changeSliderTime.bind(this);
        this.changeSliderIncrement = this.changeSliderIncrement.bind(this);
        this.moveToAi = this.moveToAi.bind(this);
        this.moveToLocal = this.moveToLocal.bind(this);
        this.setSessionStorage = this.setSessionStorage.bind(this);
    }

    setSessionStorage(){
        window.sessionStorage.setItem("amountTime", this.state.actualSliderValTime * 60);
        window.sessionStorage.setItem("amountIncrement", this.state.actualSliderValIncrement);
        window.sessionStorage.setItem("whichTeam", this.state.teamChosen);

        console.log(window.sessionStorage.getItem("amountTime"));
    }

    generateRoom(){
        let randomId = parseInt(Math.random() * 1000000000);
        this.setSessionStorage()

        socket.emit("createRoom", (randomId), (returnData) =>{
            console.log(returnData);
        });

        window.location.assign("/game/" + randomId.toString());
    }

    moveToLocal(){
        this.setSessionStorage()
        window.location.assign("/local");
    }

    moveToAi(){
        this.setSessionStorage()
        window.location.assign("/ai");
    }

    changeSliderTime(event){
        //event is number from 1-100, percentage filled from left is event
        //choose index based on percentage
        
        let possibleSteps = 
        [
            "1/4", "1/2", 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25, 30,
            35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, "Infinity"
        ];
        let howMany = possibleSteps.length;
        let indexToChoose = Math.round((howMany - 1) * (event.target.value/100));

        this.setState({
            sizeTime : (indexToChoose / (howMany - 1)) * 100,
            actualSliderValTime : possibleSteps[indexToChoose]
        });
    }

    changeSliderIncrement(event){
        //event is number from 1-100, percentage filled from left is event
        //choose index based on percentage
        let possibleSteps = 
        [
            0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25, 30,
            35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180
        ];
        let howMany = possibleSteps.length;
        let indexToChoose = Math.round((howMany - 1) * (event.target.value/100));

        this.setState({
            sizeIncrement : (indexToChoose / (howMany - 1)) * 100,
            actualSliderValIncrement : possibleSteps[indexToChoose]
        });
    }

    changeTeam(team){
        this.setState({
            teamChosen:team
        });
    }

    render() {
        return(
            <div className = "containerEverythingMenu">
                <h1 className = "centered normalH1" style = {{marginTop:"5vh"}}>Chess Online</h1>
                
                <div className = "chooseGameType">
                    <div className = "Online normalDivider">

                        <button onClick = {this.generateRoom} className = "button">
                            <h1 className = "buttonText">Play Online</h1>
                        </button>

                    </div>
                    <div className = "VsAi normalDivider">

                        <button onClick = {this.moveToAi} className = "button">
                            <h1 className = "buttonText">Vs Ai</h1>
                        </button>

                    </div>
                    <div className = "Local normalDivider">
                        
                        <button onClick = {this.moveToLocal} className = "button">
                            <h1 className = "buttonText">Local</h1>
                        </button>

                    </div>
                </div>

                <div className = "options">
                    <div className = "timeOptions">
                        <h1 className = "sliderText">{this.state.actualSliderValTime} Minutes per side</h1>
                        <input type="range" value={this.state.sizeTime} onChange={this.changeSliderTime} style = {{width : "30vw"}}/>
                        <div style ={{height:"5vh"}} />
                        <h1 className = "sliderText">{this.state.actualSliderValIncrement} Second increment after move</h1>
                        <input type="range" value={this.state.sizeIncrement} onChange={this.changeSliderIncrement} style = {{width : "30vw"}}/>
                    </div>
                    <div className = "teamOptions">

                        <div className = {"padded " + (this.state.teamChosen === "white" ? "selectedButton" : "unSelected")}>
                            <button className = {"buttonChooseTeam "} onClick = {() => {this.changeTeam("white")}}>
                                <img src = "/images/whiteTeam.png" className = "fillToContainerImage"/>
                            </button>
                        </div>
                        
                        <div className = {"padded " + (this.state.teamChosen === "random" ? "selectedButton" : "unSelected")}>
                            <button className = {"buttonChooseTeam "} onClick = {() => {this.changeTeam("random")}}>
                                <img src = "/images/randomTeam.png" className = "fillToContainerImage"/>
                            </button>
                        </div>

                        <div className = {"padded " + (this.state.teamChosen === "black" ? "selectedButton" : "unSelected")}>
                            <button className = {"buttonChooseTeam "} onClick = {() => {this.changeTeam("black")}}>
                                <img src = "/images/blackTeam.png" className = "fillToContainerImage"/>
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        );
    }
}


export default Menu;
