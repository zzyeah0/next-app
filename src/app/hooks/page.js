'use client';
import React, { useState, useEffect, useRef} from 'react';

const Timer = () => {
    useEffect(() => {
        const timer = setInterval(() => {
            console.log('타이머 돌아가는 중');
        }, 1000); 

        return () => {
            clearInterval(timer);
            console.log('timer is ended')
        }
    }, []);
    
    return (
        <div>
            <span>타이머를 시작합니다. 콘솔을 보세요!</span> 
        </div>
    )
};

export default function Hooks() {

    const [count, setCount] = useState(0);
    const [name, setName] = useState('');
    const countRef = useRef(0);
    let countVar = 0;
    const renderedCount = useRef(1);

    const inputRef = useRef();

    useEffect(() => {
        console.log(inputRef);
        inputRef.current.focus();
    }, [])

    const userNameAlert = () => {
        alert(`${inputRef.current.value}님 환영합니다.`);
    };

    const handleCountUpdate = () => {
        setCount(count + 1);
    };

    const handleInputChange = (e) => {
        setName(e.target.value);
    };

    // 렌더링 되어도 초기화 안됨
    const increaseRef = () => {
        countRef.current = countRef.current + 1;
        console.log("Ref", countRef);
    };

    // 렌더링 되면 초기화
    const increaseVar = () => {
        countVar += 1;
        console.log("Var", countVar);
    }

    // 렌더링 될 때마다 매번 실행됨
    useEffect(()=> {
        console.log('렌더링');
    }, [name]);

    // 무한 루프 발생X
    useEffect(() => {
        renderedCount.current = renderedCount.current + 1;
        console.log('렌더링 수', renderedCount.current)
    });    

    const [showTimer, setShowTimer] = useState(false);

    return (
        <>
            <div>
            <p>count: {count}</p>
            <p>Ref: {countRef.current}</p>
            <p>Var: {countVar}</p>
            <button onClick={handleCountUpdate}>COUNT++</button>
            <button onClick={increaseRef}>REF++</button>
            <button onClick={increaseVar}>VAR++</button>
            </div>
            <br/><br/>
            <div>
                <input type="text" onChange={handleInputChange} />
                <span>name: {name}</span>            
            </div>
            <br/><br/>
            <div>
            <button onClick={() => {setShowTimer(!showTimer)}}>Toggle Timer</button>
            {showTimer && <Timer/>}   
            </div>
            <br/><br/>
            <div>
                <input type="text" placeholder="username" ref={inputRef} />
                <button onClick={userNameAlert}>로그인</button>            
            </div>
        </>
    )
    

}