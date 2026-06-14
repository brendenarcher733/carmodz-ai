import { useState, useCallback, useMemo } from 'react'
import { MODIFICATIONS } from '../data/modifications'

const DEFAULTS = {
  paint: 'oxfordWhite',
  tint: 'none',
  wheels: 'stock',
  performance: [],
  exterior: [],
  customColor: '#c41230',
}

export function useCarConfig(initial = {}) {
  const [config, setConfig] = useState({ ...DEFAULTS, ...initial })

  const setSingle = useCallback((key, id) => {
    setConfig(prev => ({ ...prev, [key]: id }))
  }, [])

  const toggleMulti = useCallback((key, id) => {
    setConfig(prev => {
      const list = prev[key]
      return {
        ...prev,
        [key]: list.includes(id) ? list.filter(x => x !== id) : [...list, id],
      }
    })
  }, [])

  const setCustomColor = useCallback((color) => {
    setConfig(prev => ({ ...prev, customColor: color }))
  }, [])

  const summary = useMemo(() => {
    const items = []
    let total = 0

    const add = (catKey, id) => {
      const cat = MODIFICATIONS[catKey]
      const opt = cat?.options.find(o => o.id === id)
      if (opt && opt.price > 0) {
        items.push({ category: cat.label, label: opt.label, price: opt.price })
        total += opt.price
      }
    }

    add('paint', config.paint)
    add('tint', config.tint)
    add('wheels', config.wheels)
    config.performance.forEach(id => add('performance', id))
    config.exterior.forEach(id => add('exterior', id))

    return { items, total }
  }, [config])

  return { config, setSingle, toggleMulti, setCustomColor, summary }
}
