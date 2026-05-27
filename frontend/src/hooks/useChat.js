import { useState, useCallback, useRef, useEffect } from 'react'
import { advisorApi } from '../services/api'

export function useChat(initialContext = null) {
  const [messages, setMessages] = useState([
    {
      id: 1, role: 'assistant',
      content: "What's up! I'm your Mod Advisor — tell me about your build. What car are you working with and what are you trying to do with it?",
      suggestions: ["I want more performance", "Budget build on $2k", "What should I do first?"]
    }
  ])
  const [loading, setLoading] = useState(false)
  const [context, setContext]  = useState(initialContext)
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const sendMessage = useCallback(async (text) => {
    const userMsg = { id: Date.now(), role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)
    try {
      const res = await advisorApi.chat(text, context)
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
  }, [context])

  const updateContext = useCallback((ctx) => setContext(ctx), [])

  return { messages, loading, sendMessage, updateContext, bottomRef }
}
