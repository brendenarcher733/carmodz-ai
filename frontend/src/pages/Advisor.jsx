import { useState, useRef, useEffect } from 'react'
import { useChat } from '../hooks/useChat'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import s from './Advisor.module.css'
import clsx from 'clsx'

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={clsx(s.msgWrap, isUser && s.msgUser)}>
      {!isUser && <div className={s.avatar}>⚙</div>}
      <div className={clsx(s.bubble, isUser ? s.bubbleUser : s.bubbleAdvisor)}>
        <p className={s.msgText}>{msg.content}</p>
        {msg.suggestions && (
          <div className={s.suggestions}>
            {msg.suggestions.map(sug => (
              <button key={sug} className={s.suggestion} data-sug={sug}>{sug}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className={s.msgWrap}>
      <div className={s.avatar}>⚙</div>
      <div className={clsx(s.bubble, s.bubbleAdvisor, s.typing)}>
        <span /><span /><span />
      </div>
    </div>
  )
}

export default function Advisor() {
  const { messages, loading, sendMessage, bottomRef } = useChat()
  const [input, setInput] = useState('')
  const inputRef = useRef(null)

  function handleSend() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    sendMessage(text)
    inputRef.current?.focus()
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  // Handle suggestion clicks bubbled from Message component
  function handleClick(e) {
    const sug = e.target.dataset.sug
    if (sug) sendMessage(sug)
  }

  const QUICK_STARTERS = [
    "Best mods under $1,000?",
    "What should I do first on a turbo car?",
    "Is a tune worth it?",
    "Coilovers vs lowering springs?",
    "How do I make my exhaust louder?",
  ]

  return (
    <div className={s.page}>
      <div className={`container ${s.inner}`}>
        {/* Sidebar */}
        <aside className={s.sidebar}>
          <Card padding="lg" className={s.aboutCard}>
            <div className={s.advisorAvatar}>⚙</div>
            <h2 className={s.advisorName}>Mod Advisor</h2>
            <p className={s.advisorDesc}>
              Your AI-powered car modification expert. Ask me anything — budget builds,
              mod order, brand recommendations, tradeoffs, and what to avoid.
            </p>
          </Card>
          <Card padding="md">
            <p className={s.sidebarLabel}>Quick Starters</p>
            <div className={s.quickStarters}>
              {QUICK_STARTERS.map(q => (
                <button key={q} className={s.starter} onClick={() => sendMessage(q)} disabled={loading}>
                  {q}
                </button>
              ))}
            </div>
          </Card>
          <Card padding="md">
            <p className={s.sidebarLabel}>Topics I Know</p>
            <div className={s.topics}>
              {['Intakes & Exhausts','ECU Tuning','Suspension','Brakes',
                'Turbos & Boost','Wheels & Tires','Sound Systems','Track Safety'].map(t => (
                <span key={t} className={s.topic}>{t}</span>
              ))}
            </div>
          </Card>
        </aside>

        {/* Chat panel */}
        <div className={s.chatPanel}>
          <div className={s.chatHeader}>
            <div className={s.onlineDot} />
            <span className={s.chatHeaderTitle}>Mod Advisor</span>
            <span className={s.chatHeaderSub}>Powered by CarMods AI</span>
          </div>

          <div className={s.messages} onClick={handleClick}>
            {messages.map(msg => <Message key={msg.id} msg={msg} />)}
            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          <div className={s.inputBar}>
            <textarea
              ref={inputRef}
              className={s.input}
              rows={1}
              placeholder="Ask about mods, budget, your car..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
            />
            <Button onClick={handleSend} disabled={!input.trim() || loading} className={s.sendBtn}>
              {loading ? <Spinner size="sm" /> : '→'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
