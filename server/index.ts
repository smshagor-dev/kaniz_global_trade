import express from 'express'
import { createServer } from 'http'
import { Server as SocketServer } from 'socket.io'
import { initSocketServer } from './socket/index'

const app = express()
const httpServer = createServer(app)

const io = new SocketServer(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})

// Make io globally accessible for notification service
global.io = io

initSocketServer(io)

const PORT = process.env.SOCKET_PORT || 3001

httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`)
})

export { io }
