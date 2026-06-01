import { useState, useCallback, useRef, useEffect } from 'react'
import { advisorApi } from '../services/api'

function generateSessionId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

export function useChat(initialVehicle = null) {
  const [messages, setMessages] = useState([
    {
      id: 1, role: 'assistant',
      content: "What's up! I'm your Mod Advisor — tell me about your build. What car are you working with and what are you trying to do with it?",
      suggestions: ["I want more performance", "Budget build on $2k", "What should I do first?"]
    }
  ])
  const [loading, setLoading]   = useState(false)
  const [vehicle, setVehicle]   = useState(initialVehicle)
  const sessionId               = useRef(generateSessionId())
  const bottomRef               = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const sendMessage = useCallback(async (text) => {
    const userMsg = { id: Date.now(), role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)
    try {
      const res = await advisorApi.chat(text, sessionId.current, vehicle)
      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: 'assistant',
        content: res.response, suggestions: res.suggestions
      }])
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: 'assistant',
        content: "Sorry, I hit a snag. Try again?", suggestions: null
      }])
    } finally { setLoading(false) }
  }, [vehicle])

  const updateVehicle = useCallback((v) => setVehicle(v), [])

  return { messages, loading, sendMessage, updateVehicle, vehicle, bottomRef }
}
