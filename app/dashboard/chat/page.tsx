'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { get, post } from '@/lib/utils/api-client'
import { useAuthStore } from '@/store/auth'
import { io, Socket } from 'socket.io-client'
import {
  MessageSquare, Send, Loader2, Paperclip, Search,
  Circle, CheckCheck, Image as ImageIcon, X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useLanguage } from '@/lib/i18n'

interface ChatRoom {
  id: string; lastMessage?: string; lastMsgAt?: string
  participants: { user: { id: string; firstName: string; lastName: string; avatar?: string } }[]
  _count: { messages: number }
  messages: { content: string; sender: { firstName: string } }[]
}

interface Message {
  id: string; content: string; type: string; createdAt: string
  senderId: string
  sender: { id: string; firstName: string; lastName: string; avatar?: string }
  attachments: { url: string; name: string }[]
  readReceipts: { userId: string }[]
}

let socket: Socket | null = null

export default function ChatPage() {
  const { user, accessToken } = useAuthStore()
  const { language } = useLanguage()
  const [activeRoom, setActiveRoom]   = useState<string | null>(null)
  const [messages, setMessages]       = useState<Message[]>([])
  const [input, setInput]             = useState('')
  const [typing, setTyping]           = useState(false)
  const [remoteTyping, setRemoteTyping] = useState(false)
  const [connected, setConnected]     = useState(false)
  const [search, setSearch]           = useState('')
  const [translatingId, setTranslatingId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeout  = useRef<NodeJS.Timeout>()

  // Get chat rooms
  const { data: roomsData, refetch: refetchRooms } = useQuery({
    queryKey: ['chat-rooms'],
    queryFn:  () => get<ChatRoom[]>('/chat/rooms'),
    refetchInterval: 15000,
  })
  const rooms = (roomsData?.data as unknown as { data: ChatRoom[] })?.data || []

  // Get messages for active room
  const { data: msgsData, isLoading: loadingMsgs } = useQuery({
    queryKey: ['chat-messages', activeRoom],
    queryFn:  () => get<Message[]>(`/chat/rooms/${activeRoom}/messages?limit=50`),
    enabled:  !!activeRoom,
  })

  useEffect(() => {
    const fetched = (msgsData?.data as unknown as { data: Message[] })?.data
    if (fetched) setMessages(fetched)
  }, [msgsData])

  // Connect socket
  useEffect(() => {
    if (!accessToken) return

    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      auth: { token: accessToken },
      transports: ['websocket'],
    })

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('message:new', (msg: Message) => {
      setMessages((prev) => [...prev, msg])
      refetchRooms()
    })

    socket.on('typing:start', ({ userId }: { userId: string }) => {
      if (userId !== user?.id) setRemoteTyping(true)
    })
    socket.on('typing:stop', ({ userId }: { userId: string }) => {
      if (userId !== user?.id) setRemoteTyping(false)
    })

    return () => { socket?.disconnect() }
  }, [accessToken, refetchRooms, user?.id])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Join room on select
  useEffect(() => {
    if (activeRoom && socket?.connected) {
      socket.emit('chat:join', { roomId: activeRoom })
    }
  }, [activeRoom])

  function sendMessage() {
    if (!input.trim() || !activeRoom || !socket) return
    socket.emit('message:send', { roomId: activeRoom, content: input.trim() })
    setInput('')
    // Stop typing indicator
    socket.emit('typing:stop', { roomId: activeRoom })
  }

  async function translateMessage(messageId: string, content: string) {
    try {
      setTranslatingId(messageId)
      const result = await post<{ translatedText: string }>('/translate', { text: content, targetLanguage: language })
      const translated = result.data as { translatedText: string }
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, content: `${msg.content}\n\n[${language.toUpperCase()}] ${translated.translatedText}` }
            : msg
        )
      )
    } catch {
      toast.error('Translation failed')
    } finally {
      setTranslatingId(null)
    }
  }

  function handleInputChange(val: string) {
    setInput(val)
    if (!activeRoom || !socket) return
    if (!typing) {
      setTyping(true)
      socket.emit('typing:start', { roomId: activeRoom })
    }
    clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(() => {
      setTyping(false)
      socket!.emit('typing:stop', { roomId: activeRoom })
    }, 2000)
  }

  const filteredRooms = rooms.filter((r) =>
    r.participants.some((p) =>
      `${p.user.firstName} ${p.user.lastName}`.toLowerCase().includes(search.toLowerCase())
    )
  )

  const activeRoomData = rooms.find((r) => r.id === activeRoom)
  const otherParticipant = activeRoomData?.participants.find((p) => p.user.id !== user?.id)

  return (
    <div className="h-[calc(100vh-7rem)] flex bg-white border border-gray-100 rounded-xl overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 border-r border-gray-100 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900">Messages</h2>
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-gray-300'}`} title={connected ? 'Connected' : 'Offline'} />
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredRooms.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 text-gray-200" />
              <p className="text-sm">No conversations</p>
            </div>
          ) : filteredRooms.map((room) => {
            const other = room.participants.find((p) => p.user.id !== user?.id)
            return (
              <button
                key={room.id}
                onClick={() => setActiveRoom(room.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left border-b border-gray-50 hover:bg-gray-50 transition-colors ${activeRoom === room.id ? 'bg-blue-50' : ''}`}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                    {other?.user.firstName?.[0]}{other?.user.lastName?.[0]}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {other?.user.firstName} {other?.user.lastName}
                    </p>
                    {room.lastMsgAt && (
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {new Date(room.lastMsgAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {room.lastMessage || 'No messages yet'}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Chat area */}
      {activeRoom ? (
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="h-16 border-b border-gray-100 flex items-center px-5 gap-3 flex-shrink-0">
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
              {otherParticipant?.user.firstName?.[0]}{otherParticipant?.user.lastName?.[0]}
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">
                {otherParticipant?.user.firstName} {otherParticipant?.user.lastName}
              </p>
              {remoteTyping && <p className="text-xs text-blue-500">typing...</p>}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 chat-scroll">
            {loadingMsgs ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-blue-400 animate-spin" /></div>
            ) : messages.map((msg) => {
              const isOwn = msg.senderId === user?.id
              return (
                <div key={msg.id} className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                  {!isOwn && (
                    <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-600 font-medium flex-shrink-0 mb-1">
                      {msg.sender.firstName[0]}
                    </div>
                  )}
                  <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                    <div className={`px-4 py-2.5 rounded-2xl text-sm ${isOwn ? 'bg-blue-700 text-white rounded-br-sm' : 'bg-gray-100 text-gray-900 rounded-bl-sm'}`}>
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    </div>
                    {!isOwn && language !== 'en' && (
                      <button onClick={() => translateMessage(msg.id, msg.content)} className="text-xs text-blue-600 hover:underline px-1" disabled={translatingId === msg.id}>
                        {translatingId === msg.id ? 'Translating...' : `Translate to ${language.toUpperCase()}`}
                      </button>
                    )}
                    {msg.attachments.map((att) => (
                      <a key={att.url} href={att.url} target="_blank" rel="noopener noreferrer"
                        className={`flex items-center gap-2 text-xs px-3 py-2 rounded-xl ${isOwn ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                      >
                        <Paperclip className="w-3.5 h-3.5" /> {att.name}
                      </a>
                    ))}
                    <p className={`text-xs text-gray-400 px-1 ${isOwn ? 'text-right' : ''}`}>
                      {new Date(msg.createdAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                      {isOwn && msg.readReceipts.length > 1 && <CheckCheck className="inline w-3 h-3 ml-1 text-blue-400" />}
                    </p>
                  </div>
                </div>
              )
            })}
            {remoteTyping && (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-600 font-medium">
                  {otherParticipant?.user.firstName?.[0]}
                </div>
                <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 p-4">
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-2.5">
              <input
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                placeholder="Type a message..."
                className="flex-1 bg-transparent text-sm outline-none"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim()}
                className="p-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
          <MessageSquare className="w-16 h-16 text-gray-200 mb-4" />
          <h3 className="text-lg font-semibold text-gray-600">Select a conversation</h3>
          <p className="text-sm mt-1">Choose a chat from the left to start messaging</p>
        </div>
      )}
    </div>
  )
}
