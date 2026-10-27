import { io } from 'socket.io-client';
import { API_URL } from './api/axios';

// One shared connection, opened only when a seat map is on screen
const socket = io(API_URL, { autoConnect: false, transports: ['websocket', 'polling'] });

export default socket;
