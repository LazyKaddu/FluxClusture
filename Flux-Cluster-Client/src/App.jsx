import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

// Connect to the local Node.js server
const socket = io('http://localhost:8080');

export default function App() {
  const [roomId, setRoomId] = useState('room-7b9X');
  const [isConnected, setIsConnected] = useState(false);
  const [swarmState, setSwarmState] = useState({});
  const [activeTask, setActiveTask] = useState(null);

  useEffect(() => {
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    
    socket.on('SWARM_STATE_UPDATE', (state) => {
      console.log('Swarm updated:', state);
      setSwarmState(state);
    });

    socket.on('ASSIGN_TASK', (task) => {
      console.log('Task received:', task);
      setActiveTask(task);
    });

    socket.on('WAIT', (msg) => {
      console.log(msg.reason);
      setActiveTask(null);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('SWARM_STATE_UPDATE');
      socket.off('ASSIGN_TASK');
      socket.off('WAIT');
    };
  }, []);

  const joinRoom = () => socket.emit('JOIN_ROOM', { roomId });
  
  const initJob = () => {
    socket.emit('INIT_JOB', {
      roomId,
      clip: 'Walk_Cycle',
      frames: 10,
      gridCols: 4,
      gridRows: 4,
      masterHash: 'dummy-hash-123'
    });
  };

  const requestTask = () => socket.emit('REQUEST_TASK');

  const completeTask = () => {
    if (!activeTask) return;
    socket.emit('ACK_TILE', activeTask);
    setActiveTask(null);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>FluxCluster Control Plane Test</h1>
      <p>Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'} ({socket.id})</p>

      <div style={{ marginBottom: '20px' }}>
        <input 
          value={roomId} 
          onChange={(e) => setRoomId(e.target.value)} 
          style={{ padding: '5px', marginRight: '10px' }}
        />
        <button onClick={joinRoom}>1. Join Room</button>
      </div>

      <div style={{ marginBottom: '20px', gap: '10px', display: 'flex' }}>
        <button onClick={initJob}>2. Init Render Job (10 Frames)</button>
        <button onClick={requestTask}>3. Request Task</button>
        <button onClick={completeTask} disabled={!activeTask}>4. Complete Task (ACK)</button>
      </div>

      {activeTask && (
        <div style={{ background: '#e0f7fa', padding: '10px', marginBottom: '20px' }}>
          <strong>Working on:</strong> {activeTask.id} (Frame {activeTask.frame})
        </div>
      )}

      <h3>Live Swarm State (Redis Hash Map)</h3>
      <pre style={{ background: '#333', color: '#0f0', padding: '15px' }}>
        {JSON.stringify(swarmState, null, 2)}
      </pre>
    </div>
  );
}