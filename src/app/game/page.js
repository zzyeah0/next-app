'use client';
import React, { useState, useEffect, useRef } from 'react';
import { FaUndo } from 'react-icons/fa';
import { FcIdea } from 'react-icons/fc';
import 'public/game.css';

const COLS = 10;
const MAX_HINTS = 3;
const FLY_MS = 1300; // 완성 세트가 날아가는 전체 시간 (CSS 애니메이션과 맞출 것)
const CARD_W = 80;
const CARD_H = 128; // 이미지 비율(256x409) 기준
// 열 10개(칸 테두리 2px*2 포함)와 간격 10px을 합친 보드 너비
const BOARD_W = COLS * (CARD_W + 4) + (COLS - 1) * 10;
const UP_GAP = 34;
const DOWN_GAP = 14;

const imgOf = val => '/' + String(val).padStart(2, '0') + '.png';

const shuffle = arr => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

// 열의 idx번째 카드부터 맨 위까지 연속 내림차순(앞면)인지
const isRun = (col, idx) => {
    for (let i = idx; i < col.length; i++) {
        if (!col[i].up) return false;
        if (i > idx && col[i - 1].val - col[i].val !== 1) return false;
    }
    return true;
};

// 맨 위 카드가 뒷면이면 뒤집기
const flipTop = col => {
    if (col.length > 0 && !col[col.length - 1].up) {
        col[col.length - 1] = { ...col[col.length - 1], up: true };
    }
};

// K~A 13장이 완성된 열이 있으면 제거하고, 제거한 세트 정보를 반환
// (날아가는 애니메이션용으로 열 번호와 각 카드의 열 안 위치(top)를 함께 담음)
const removeCompleted = cols => {
    const sets = [];
    cols.forEach((col, c) => {
        if (col.length < 13) return;
        const tail = col.slice(-13);
        if (tail.every((card, i) => card.up && card.val === 13 - i)) {
            const startIdx = col.length - 13;
            let base = 0;
            for (let i = 0; i < startIdx; i++) base += col[i].up ? UP_GAP : DOWN_GAP;
            sets.push({ col: c, tops: tail.map((_, k) => base + k * UP_GAP), vals: tail.map(card => card.val) });
            col.splice(startIdx, 13);
            flipTop(col);
        }
    });
    return sets;
};

// 의미 있는 이동 중 가장 좋은 것을 찾음 (없으면 null)
// 점수: 뒷면 카드를 뒤집는 이동 > 카드가 있는 열로 이동 > 빈 열로 이동
const findMove = cols => {
    let best = null;
    for (let c = 0; c < cols.length; c++) {
        const col = cols[c];
        for (let idx = 0; idx < col.length; idx++) {
            if (!col[idx].up || !isRun(col, idx)) continue;
            const first = col[idx];
            // 이미 같은 순서로 이어진 카드 위에서 옮기는 건 의미 없는 이동
            if (idx > 0 && col[idx - 1].up && col[idx - 1].val - first.val === 1) continue;
            const flips = idx > 0 && !col[idx - 1].up;
            for (let t = 0; t < cols.length; t++) {
                if (t === c) continue;
                const dest = cols[t];
                let score;
                if (dest.length === 0) {
                    if (idx === 0) continue; // 열 전체를 빈 열로 옮기는 건 의미 없음
                    score = 1;
                } else if (dest[dest.length - 1].val - first.val === 1) {
                    score = 10;
                } else {
                    continue;
                }
                if (flips) score += 100;
                if (!best || score > best.score) best = { from: c, idx, to: t, score };
            }
        }
    }
    return best;
};

const hasMove = cols => findMove(cols) !== null;

export default function Game() {
    const [started, setStarted] = useState(false);
    const [cols, setCols] = useState([]);
    const [stock, setStock] = useState([]);
    const [completed, setCompleted] = useState(0);
    const [selected, setSelected] = useState(null); // { col, idx }
    const [prev, setPrev] = useState(null); // 직전 상태 1개 (되돌리기용)
    const [streak, setStreak] = useState(0); // 연속 성공 횟수
    const [hintsUsed, setHintsUsed] = useState(0); // 이번 판에서 쓴 힌트 횟수
    const [hint, setHint] = useState(null); // { from: {col, idx}, to } 또는 { deal: true }
    const [flying, setFlying] = useState(null); // 완성 덱으로 날아가는 중인 세트들
    const [dealtIds, setDealtIds] = useState(null); // 방금 나눠준 카드 id (애니메이션용)

    // 애니메이션이 끝나면 날아가던 카드를 치움
    useEffect(() => {
        if (!flying) return;
        const timer = setTimeout(() => setFlying(null), FLY_MS);
        return () => clearTimeout(timer);
    }, [flying]);

    // 완성 덱 개수를 갱신하고, 8개가 되면 연속 성공 횟수를 올림
    const applyCompleted = sets => {
        const total = completed + sets.length;
        setCompleted(total);
        if (total === 8) setStreak(streak + 1);
        // 완성된 세트가 완성 덱으로 날아가는 애니메이션 시작
        if (sets.length) setFlying(sets.map((set, i) => ({ ...set, pileIdx: completed + i })));
    };

    const saveUndo = () => setPrev({ cols, stock, completed });

    const undo = () => {
        if (!prev) return;
        setCols(prev.cols);
        setStock(prev.stock);
        setCompleted(prev.completed);
        setSelected(null);
        setDealtIds(null);
        setFlying(null);
        setHint(null);
        setPrev(null);
    };

    const showHint = () => {
        if (hintsUsed >= MAX_HINTS) return;
        const move = findMove(cols);
        if (move) {
            setHint({ from: { col: move.from, idx: move.idx }, to: move.to });
        } else if (stock.length > 0 && cols.every(c => c.length > 0)) {
            setHint({ deal: true }); // 옮길 카드가 없으면 새 카드를 나눠주라고 안내
        } else {
            return;
        }
        setSelected(null);
        setHintsUsed(hintsUsed + 1);
    };

    // resetStreak: 실패 후 다시 시작할 때 연속 기록 초기화
    const startGame = (resetStreak = false) => {
        if (resetStreak) setStreak(0);
        const deck = [];
        for (let i = 0; i < 104; i++) {
            deck.push({ id: i, val: (i % 13) + 1, up: false });
        }
        const shuffled = shuffle(deck);

        const newCols = [];
        let pos = 0;
        for (let c = 0; c < COLS; c++) {
            const n = c < 4 ? 6 : 5;
            const col = shuffled.slice(pos, pos + n);
            pos += n;
            col[col.length - 1] = { ...col[col.length - 1], up: true };
            newCols.push(col);
        }

        setCols(newCols);
        setStock(shuffled.slice(pos)); // 50장
        setCompleted(0);
        setSelected(null);
        setPrev(null);
        setDealtIds(null);
        setFlying(null);
        setHint(null);
        setHintsUsed(0);
        setStarted(true);
    };

    const dealStock = () => {
        if (stock.length === 0) return;
        if (cols.some(c => c.length === 0)) {
            alert('빈 열이 있으면 카드를 나눠줄 수 없습니다.');
            return;
        }
        saveUndo();
        const next = cols.map(c => [...c]);
        const dealt = stock.slice(-COLS);
        dealt.forEach((card, i) => next[i].push({ ...card, up: true }));
        const removed = removeCompleted(next);

        setCols(next);
        setStock(stock.slice(0, -COLS));
        applyCompleted(removed);
        setDealtIds(dealt.map(card => card.id));
        setHint(null);
        setSelected(null);
    };

    const moveTo = (target, from, idx) => {
        saveUndo();
        const next = cols.map(c => [...c]);
        const moving = next[from].splice(idx);
        next[target].push(...moving);
        flipTop(next[from]);
        const removed = removeCompleted(next);

        setCols(next);
        applyCompleted(removed);
        setDealtIds(null);
        setHint(null);
        setSelected(null);
    };

    // from 열의 idx번째 카드(묶음)를 target 열로 옮길 수 있는지
    const canMove = (from, idx, target) => {
        if (target === from) return false;
        const dest = cols[target];
        if (dest.length === 0) return true;
        const first = cols[from][idx];
        return dest[dest.length - 1].val - first.val === 1;
    };

    // ---- 드래그 앤 드롭 (포인터 이벤트: 마우스/터치 공통) ----
    const boardRef = useRef(null);
    const dragRef = useRef(null); // { col, idx, startX, startY, grabX, grabY, active }
    const lastDragEnd = useRef(0); // 드롭 직후 발생하는 click 무시용
    const latest = useRef(null); // 윈도우 리스너가 항상 최신 상태를 쓰도록 매 렌더마다 갱신
    const [dragView, setDragView] = useState(null); // { col, idx, x, y, grabX, grabY, hover }

    // 포인터 위치 아래의 열 중, 드롭 가능한 열 번호 (없으면 null)
    const dropTarget = (e, d) => {
        if (!boardRef.current) return null;
        const rect = boardRef.current.getBoundingClientRect();
        if (e.clientY < rect.top + CARD_H + 10) return null; // 위쪽 줄(완성 덱/추가 카드) 위는 제외
        const c = Math.floor((e.clientX - rect.left + 5) / (CARD_W + 14));
        if (c < 0 || c >= COLS) return null;
        return latest.current.canMove(d.col, d.idx, c) ? c : null;
    };

    const onCardPointerDown = (e, c, idx) => {
        if (e.button !== 0 || flying) return;
        const col = cols[c];
        if (!col[idx].up || !isRun(col, idx)) return;
        const rect = e.currentTarget.getBoundingClientRect();
        dragRef.current = {
            col: c, idx,
            startX: e.clientX, startY: e.clientY,
            grabX: e.clientX - rect.left, grabY: e.clientY - rect.top,
            active: false,
        };
    };

    useEffect(() => {
        const onMove = e => {
            const d = dragRef.current;
            if (!d) return;
            if (!d.active) {
                // 살짝 움직인 건 클릭으로 취급
                if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 6) return;
                d.active = true;
                latest.current.clearSelection();
            }
            setDragView({ col: d.col, idx: d.idx, x: e.clientX, y: e.clientY, grabX: d.grabX, grabY: d.grabY, hover: dropTarget(e, d) });
        };
        const onUp = e => {
            const d = dragRef.current;
            dragRef.current = null;
            if (!d || !d.active) return;
            lastDragEnd.current = Date.now();
            setDragView(null);
            const t = dropTarget(e, d);
            if (t !== null) latest.current.moveTo(t, d.col, d.idx);
        };
        const onCancel = () => {
            dragRef.current = null;
            setDragView(null);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onCancel);
        return () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onCancel);
        };
    }, []);

    latest.current = { canMove, moveTo, clearSelection: () => setSelected(null) };

    // 카드(또는 빈 열) 클릭
    const handleClick = (c, idx) => {
        if (Date.now() - lastDragEnd.current < 150) return; // 드롭 직후의 click은 무시
        const card = cols[c][idx];
        const canPick = card && card.up && isRun(cols[c], idx);

        if (!selected) {
            if (canPick) setSelected({ col: c, idx });
            return;
        }
        if (selected.col === c && selected.idx === idx) {
            setSelected(null);
            return;
        }
        if (canMove(selected.col, selected.idx, c)) {
            moveTo(c, selected.col, selected.idx);
        } else if (canPick) {
            setSelected({ col: c, idx });
        } else {
            setSelected(null);
        }
    };

    if (!started) {
        return (
            <div className="Game start-screen">
                <h1 className="start-title">Spider Solitaire</h1>
                <button className="start-button" onClick={() => startGame()}>START</button>
            </div>
        );
    }

    // 날아오는 중인 세트는 도착한 뒤에 완성 덱에 표시
    const shownCompleted = completed - (flying ? flying.length : 0);
    const won = shownCompleted === 8;
    const canDeal = stock.length > 0 && cols.every(c => c.length > 0);
    const stuck = !won && !canDeal && !hasMove(cols);

    // 칸은 카드 한 장 크기로 고정이라, 쌓인 카드가 칸 밖으로 넘치는 높이만큼 아래 여백 확보
    const maxExtra = Math.max(
        0,
        ...cols.map(col => col.reduce((sum, card) => sum + (card.up ? UP_GAP : DOWN_GAP), 0) - (col.length ? (col[col.length - 1].up ? UP_GAP : DOWN_GAP) : 0))
    );

    return (
        <div className="Game">
            <h1>Spider Solitaire</h1>
            <button className="undo-button" onClick={undo} disabled={!prev}><FaUndo /></button>
            <button className="hint-button" onClick={showHint} disabled={hintsUsed >= MAX_HINTS}><FcIdea /> {hintsUsed}/{MAX_HINTS}</button>
            <span className="streak">연속 성공: {streak}회</span>

            {won && (
                <div className="overlay">
                    <h2>축하합니다! 클리어!</h2>
                    <p>연속 {streak}회 성공</p>
                    <button className="start-button" onClick={() => startGame()}>새로운 게임 시작</button>
                </div>
            )}
            {stuck && (
                <div className="overlay">
                    <h2>더 이상 움직일 수 있는 카드가 없습니다</h2>
                    <p>연속 성공 기록: {streak}회 (다시 시작하면 0으로 초기화됩니다)</p>
                    <button className="start-button" onClick={() => startGame(true)}>다시 시작하기</button>
                </div>
            )}

            <div ref={boardRef} style={{ position: 'relative', width: BOARD_W, margin: '0 auto' }}>
            {flying && flying.map(set => set.vals.map((val, k) => {
                // 열 안의 현재 위치 -> 완성 덱 위치 (완성 덱은 보드 왼쪽 위, 카드마다 25px씩 겹침)
                const sx = set.col * (CARD_W + 14) + 2;
                const sy = CARD_H + 22 + set.tops[k];
                return (
                    <img
                        key={set.col + '-' + k}
                        src={imgOf(val)}
                        width={CARD_W}
                        className="fly-card"
                        style={{
                            left: sx,
                            top: sy,
                            '--dx': (set.pileIdx * (CARD_W - 55) - sx) + 'px',
                            '--dy': (0 - sy) + 'px',
                            animationDelay: (12 - k) * 45 + 'ms',
                            zIndex: 50 + k,
                        }}
                    />
                );
            }))}
            <div style={{ display: 'flex', justifyContent: 'space-between', width: BOARD_W, marginBottom: 20, minHeight: CARD_H }}>
                <div style={{ display: 'flex' }}>
                    {Array.from({ length: shownCompleted }, (_, i) => (
                        <img key={i} src={imgOf(13)} width={CARD_W} className="pile-card" style={{ marginRight: i === shownCompleted - 1 ? 0 : -55 }} />
                    ))}
                </div>
                <div style={{ display: 'flex' }}>
                    {Array.from({ length: stock.length / COLS }, (_, i) => (
                        <button
                            key={i}
                            onClick={dealStock}
                            disabled={i !== stock.length / COLS - 1}
                            style={{ marginRight: i === stock.length / COLS - 1 ? 0 : -55, padding: 0, border: 'none', background: 'none' }}
                        >
                            <img src="/00.png" width={CARD_W} className={'pile-card' + (hint && hint.deal && i === stock.length / COLS - 1 ? ' hint' : '')} />
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ display: 'flex', gap: 10, paddingBottom: maxExtra + 20 }}>
                {cols.map((col, c) => {
                    let top = 0;
                    const tops = col.map(card => {
                        const t = top;
                        top += card.up ? UP_GAP : DOWN_GAP;
                        return t;
                    });
                    return (
                        <div
                            key={c}
                            className={'slot' + (col.length === 0 ? ' empty' : '') + (hint && !hint.deal && hint.to === c && col.length === 0 ? ' hint' : '') + (dragView && dragView.hover === c ? ' drop-ok' : '')}
                            onClick={col.length === 0 ? () => handleClick(c, 0) : undefined}
                            style={{ width: CARD_W, height: CARD_H }}
                        >
                            {col.map((card, idx) => {
                                const isSel = selected && selected.col === c && idx >= selected.idx;
                                const isHint = hint && !hint.deal && (
                                    (hint.from.col === c && idx >= hint.from.idx) ||
                                    (hint.to === c && idx === col.length - 1)
                                );
                                const dealtIdx = dealtIds ? dealtIds.indexOf(card.id) : -1;
                                const cardStyle = { top: tops[idx] };
                                if (dealtIdx >= 0) {
                                    // 추가 카드 묶음 위치에서 이 자리까지 날아오는 애니메이션
                                    cardStyle['--dx'] = (BOARD_W - CARD_W - (c * (CARD_W + 14) + 2)) + 'px';
                                    cardStyle['--dy'] = -(CARD_H + 22 + tops[idx]) + 'px';
                                    cardStyle.animationDelay = c * 70 + 'ms';
                                }
                                return (
                                    <img
                                        key={card.id}
                                        src={card.up ? imgOf(card.val) : '/00.png'}
                                        width={CARD_W}
                                        className={'card' + (card.up ? ' up' : '') + (isSel ? ' selected' : '') + (dealtIdx >= 0 ? ' dealt' : '') + (isHint ? ' hint' : '') + (dragView && dragView.col === c && idx >= dragView.idx ? ' drag-src' : '')}
                                        draggable={false}
                                        onPointerDown={e => onCardPointerDown(e, c, idx)}
                                        onClick={() => handleClick(c, idx)}
                                        style={cardStyle}
                                    />
                                );
                            })}
                        </div>
                    );
                })}
            </div>
            </div>

            {dragView && cols[dragView.col] && cols[dragView.col].slice(dragView.idx).map((card, k) => (
                <img
                    key={card.id}
                    src={imgOf(card.val)}
                    width={CARD_W}
                    className="drag-card"
                    draggable={false}
                    style={{ left: dragView.x - dragView.grabX, top: dragView.y - dragView.grabY + k * UP_GAP, zIndex: 200 + k }}
                />
            ))}
        </div>
    );
}
