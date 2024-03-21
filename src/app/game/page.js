'use client';
import React, { useState, useEffect, useRef } from 'react';
import 'public/game.css';

export default function Game() {

    const [started, setStarted] = useState(false);
    const [compCardCnt, setCompCardCnt] = useState(0);
    const [newDeckCnt, setNewDeckCnt] = useState(5);

    const [bottom, setBottom] = useState([]);
    const [newDeck, setNewDeck] = useState([]);

    const firstCard = useRef([]);

    const startGame = () => {
        setStarted(true);
        scatterCard();
    }

    const scatterCard = () => {
        let wholeDeck = [];

        for (let i = 0; i < 104; i++) {
            ((i + 1) % 13 == 0) ? wholeDeck.push({ val: 13, show: false, img: '/00.png', check:false }) : wholeDeck.push({ val: (i + 1) % 13, show: false, img: '/00.png', check:false });
        }

        wholeDeck.sort(() => Math.random() - 0.5);

        const newArr = [wholeDeck.slice(0, 10)
            , wholeDeck.slice(10, 20)
            , wholeDeck.slice(20, 30)
            , wholeDeck.slice(30, 40)
            , wholeDeck.slice(40, 50)];

        setNewDeck(newArr);

        const bottomArr = [wholeDeck.slice(50, 56),
        wholeDeck.slice(56, 62),
        wholeDeck.slice(62, 68),
        wholeDeck.slice(68, 74),
        wholeDeck.slice(74, 79),
        wholeDeck.slice(79, 84),
        wholeDeck.slice(84, 89),
        wholeDeck.slice(89, 94),
        wholeDeck.slice(94, 99),
        wholeDeck.slice(99, 104)];

        for (let i = 0; i < 10; i++) {
            for (let j = 0; j < bottomArr[i].length; j++) {
                if (j == 0) {
                    bottomArr[i][j].show = true;
                }
            }
        }

        setBottom(bottomArr);
    }

    const handleCompletedDeck = () => {
        let compDeck = [];
        for (let i = 0; i < compCardCnt; i++) {
            compDeck.push(<img key={"new"+compCardCnt} src={'/13.png'} width="70px" style={{marginRight:-50}} />)
        }        
        return (
            <>
                {compDeck}
            </>
        )
    }

    const scatterNewCard = idx => {
        setNewDeckCnt(idx);

        for (let i = 0; i < 10; i++) {
            newDeck[idx][i].show = true;
            bottom[i].unshift(newDeck[idx][i]);
            
            if(bottom[i][0].val == "empty"){
                bottom[i].shift();
            }else{
                if(bottom[i][1].val - bottom[i][0].val != 1) {
                   for(let j=0; j<bottom[i].length; j++) {
                      if(bottom[i][j].show){
                          bottom[i][j].check = true;
                      }
                   }
                    bottom[i][0].check = false;
               }
            }
        }
    }

    const handleNewDeck = () => {
        let newCardArr = [];        
        for (let i=0; i<newDeckCnt; i++) {
            let selectable = true;
            if(i==newDeckCnt-1){
                selectable = false;
            }
            newCardArr.push(<button key={i} disabled={selectable} onClick={() => { scatterNewCard(i) }} style={{marginRight:-50}}><img src={'./00.png'} width="65px"/></button>);
        }
        return (
            <>
                {newCardArr}
            </>
        )
    }

    const completeDeck = idx => {
        for(let i=0; i<13; i++) {
            bottom[idx].shift();
        }

        if(bottom[idx].length == 0) {
            bottom[idx][0] = {val:"empty", show:false, img:'/empty.png', check:false}            
        }

        bottom[idx][0].show = true;     
        setCompCardCnt(compCardCnt+1);
    }

    let clicked = [];
    const cardMove = e => {        
        if (clicked.length == 0) {
            clicked.push(e.target);
        } else if (clicked.length == 1) {
            if (e.target.checked) {
                clicked.push(e.target);

                const arr1 = clicked[0].value.split(',');
                const arr2 = clicked[1].value.split(',');

                const from = arr1[arr1.length - 1] * 1;
                const to = arr2[arr2.length - 1] * 1;
                
                const fromIdx = clicked[0].id.split(',')[0];
                const toIdx = clicked[1].id.split(',')[0];
                const clmnIdx = clicked[0].id.split(',')[1];
                
                let clone = [];
                if (to-from == 1 || bottom[toIdx][0].val == "empty") {
                    if(bottom[toIdx][0].val == "empty") {
                        bottom[toIdx].shift();
                    }

                    if(clmnIdx > 0) {                                                                        
                        for(let i=0; i<=clmnIdx; i++){                                
                           clone.push(bottom[fromIdx].shift());                           
                        }  
                        for(let i=clone.length-1; i>=0; i-- ){
                            bottom[toIdx].unshift(clone[i]);
                        }
                    }else{
                        bottom[toIdx].unshift(bottom[fromIdx].shift());
                    }

                    if(bottom[fromIdx].length == 0) {
                        bottom[fromIdx][0] = {val:"empty", show:false, img:'/empty.png', check:false}
                    }else{
                        bottom[fromIdx][0].show=true;
                        bottom[fromIdx][0].check=false;
                    }

                    setBottom([...bottom]);

                    clicked[0].checked = false;
                    clicked[1].checked = false;
                                       
                    let beforeValFrom = bottom[fromIdx][0].val;                    
                    for(let i=1; i<bottom[fromIdx].length; i++){                        
                        if(bottom[fromIdx][i].val-beforeValFrom == 1) {
                            bottom[fromIdx][i].check = false;
                            beforeValFrom = bottom[fromIdx][i].val;
                        }else{
                            break;   
                        }
                    }
                                        
                    let beforeValTo = bottom[toIdx][0].val;
                    let cardCnt = 1;
                    if(beforeValTo == 1) {
                        for(let i=1; i<bottom[toIdx].length; i++){
                            if(bottom[toIdx][i].val - beforeValTo == 1){                                
                                cardCnt++;
                                beforeValTo = bottom[toIdx][i].val;
                                if(bottom[toIdx][i].val == 13 && cardCnt == 13) {
                                    completeDeck(toIdx);
                                    bottom[toIdx][0].check=false;
                                    break;
                                }else{                                
                                    continue;
                                }
                            }else{
                                break;
                            }
                        }
                    }              
                    
                    
                } else {
                    alert('이동 불가');
                    clicked[0].checked = false;
                    clicked[1].checked = false;
                    clicked = [];
                    clicked.length = 0;
                }

            } else {
                clicked = [];
                clicked.length = 0;
            }
        }           
        
        console.log(bottom)
    }

    const showCard = () => {
        let uls = [];

        for (let i = 0; i < 10; i++) {
           
            let lis = [];
            for (let j=bottom[i].length-1; j>=0 ; j--) {          
                if (bottom[i][j].show) {
                    switch (bottom[i][j].val) {
                        case 1:
                            bottom[i][j].img = '/01.png'
                            break;
                        case 2:
                            bottom[i][j].img = '/02.png'
                            break;
                        case 3:
                            bottom[i][j].img = '/03.png'
                            break;
                        case 4:
                            bottom[i][j].img = '/04.png'
                            break;
                        case 5:
                            bottom[i][j].img = '/05.png'
                            break;
                        case 6:
                            bottom[i][j].img = '/06.png'
                            break;
                        case 7:
                            bottom[i][j].img = '/07.png'
                            break;
                        case 8:
                            bottom[i][j].img = '/08.png'
                            break;
                        case 9:
                            bottom[i][j].img = '/09.png'
                            break;
                        case 10:
                            bottom[i][j].img = '/10.png'
                            break;
                        case 11:
                            bottom[i][j].img = '/11.png'
                            break;
                        case 12:
                            bottom[i][j].img = '/12.png'
                            break;
                        case 13:
                            bottom[i][j].img = '/13.png'
                            break;
                    }
                }

                //to-do 빈칸일때 제어
                if(bottom[i][j].show) {                    
                    lis.push(<li key={"["+i+"]["+j+"]"} style={{listStyleType:'none'}}><label><input type="checkbox" disabled={bottom[i][j].check} className="firstCard" id={i+","+j} onClick={e => cardMove(e)} value={bottom[i][j].val}/><img src={bottom[i][j].img} width="65px" style={{marginBottom:-70}}/></label></li>);                
                }else{
                    if(bottom[i][j].val == "empty"){
                        lis.push(<li key={"["+i+"]["+j+"]"} style={{listStyleType:'none'}}><label><input type="checkbox" disabled={bottom[i][j].check} id={i+","+j} onClick={e => cardMove(e)} value={bottom[i][j].val}/><img src={bottom[i][j].img} width="65px" style={{marginBottom:-70}}/></label></li>);                
                    }else{
                        lis.push(<li key={"["+i+"]["+j+"]"} style={{marginBottom:-70, listStyleType:'none'}}><img src={bottom[i][j].img} width="65px"/></li>);                
                    }
                }
            }
            uls.push(lis);
        }
        
        const field = <tr>
            <td><ul>{uls[0]}</ul></td>
            <td><ul>{uls[1]}</ul></td>
            <td><ul>{uls[2]}</ul></td>
            <td><ul>{uls[3]}</ul></td>
            <td><ul>{uls[4]}</ul></td>
            <td><ul>{uls[5]}</ul></td>
            <td><ul>{uls[6]}</ul></td>
            <td><ul>{uls[7]}</ul></td>
            <td><ul>{uls[8]}</ul></td>
            <td><ul>{uls[9]}</ul></td>   
        </tr>;
       
        return field;
    }

    if (!started) {
        return (
            <>
                <button onClick={() => { startGame() }}>START</button>
            </>
        )
    } else {
        if (bottom) {
            return (
                <>
                    <h1>Spider Solitaire</h1>
                    <table>
                        <thead>
                            <tr>
                                <td colSpan="5">{handleCompletedDeck()}</td>
                                <td colSpan="5">{handleNewDeck()}</td>
                            </tr>
                        </thead>
                        <tbody>
                            {showCard()}
                        </tbody>
                    </table>

                </>
            )
        } else {
            //로딩중
        }
    }

}