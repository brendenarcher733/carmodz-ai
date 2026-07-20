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
      content: "I'm your Performance Advisor. Tell me what platform you're building and what you're chasing — more power, better handling, a specific target? I'll tell you exactly where to start and what to skip.",
      suggestions: ["Where do I start with my WRX?", "Best mods under $1,500", "Is a tune worth it?"]
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

    // The assistant bubble is only added to the message list once the first
    // token actually arrives — until then the existing TypingIndicator shows,
    // completely unchanged. This keeps streaming a pure data-flow change:
    // no new components, no layout change, just when/how message.content
    // gets populated.
    const assistantId = Date.now() + 1
    let started = false

    await advisorApi.streamChat(text, sessionId.current, vehicle, null, {
      onToken: (chunk) => {
        if (!started) {
          started = true
          setLoading(false)
          setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: chunk, suggestions: null }])
        } else {
          setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: m.content + chunk } : m))
        }
      },
      onDone: (suggestions) => {
        setLoading(false)
        if (started) {
          setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, suggestions } : m))
        }
      },
      onError: () => {
        setLoading(false)
        if (started) {
          setMessages(prev => prev.map(m => m.id === assistantId
            ? { ...m, content: m.content || "Sorry, I hit a snag. Try again?" }
            : m))
        } else {
          setMessages(prev => [...prev, {
            id: assistantId, role: 'assistant',
            content: "Sorry, I hit a snag. Try again?", suggestions: null,
          }])
        }
      },
    })
  }, [vehicle])

  const updateVehicle = useCallback((v) => setVehicle(v), [])

  return { messages, loading, sendMessage, updateVehicle, vehicle, bottomRef }
}
