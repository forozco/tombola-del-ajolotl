// ── useResults ──
// Fuente única de verdad de los resultados guardados de cada partido.
// Modelo dual: con credenciales de Supabase sincroniza en tiempo real entre
// todos los teléfonos; sin ellas, funciona en modo local (localStorage).
//
// Devuelve:
//  - results: { matchId → winnerTeamId }
//  - detalles: { matchId → snapshot completo con goles }
//  - applyLive(id, teamId, marcador, detalle): registro automático desde ESPN
//  - pick(id, teamId): corrección manual (modo ?admin), toggle
//  - online: true si Supabase respondió al fetch inicial
//  - refetch(): re-consulta desde Supabase (usado por pull-to-refresh)

import { useCallback, useEffect, useState } from 'react'
import {
  hasSupabase,
  fetchResults,
  subscribeResults,
  saveResult,
  deleteResult,
} from '../sync.js'
import { ES_SIM } from '../lib/modes.js'
import {
  STORAGE_KEY,
  DETALLES_KEY,
  loadResults,
  loadDetalles,
} from '../lib/storage.js'

export function useResults() {
  const [results, setResults] = useState(ES_SIM ? {} : loadResults)
  const [detalles, setDetalles] = useState(ES_SIM ? {} : loadDetalles)
  const [online, setOnline] = useState(false)

  useEffect(() => {
    if (ES_SIM) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(results))
  }, [results])

  useEffect(() => {
    if (ES_SIM) return
    localStorage.setItem(DETALLES_KEY, JSON.stringify(detalles))
  }, [detalles])

  const refetch = useCallback(() => {
    if (!hasSupabase || ES_SIM) return Promise.resolve()
    return fetchResults()
      .then(({ results: remote, detalles: remoteDet }) => {
        setResults(remote)
        setDetalles(remoteDet)
        setOnline(true)
      })
      .catch(() => setOnline(false))
  }, [])

  // Suscripción realtime a los cambios de Supabase: eventos INSERT / UPDATE /
  // DELETE se aplican al estado local para reflejar cualquier cambio hecho
  // desde otro teléfono al instante.
  useEffect(() => {
    if (!hasSupabase || ES_SIM) return
    refetch()
    const unsubscribe = subscribeResults((payload) => {
      const row = payload.new ?? {}
      const oldId = payload.old?.match_id
      if (payload.eventType === 'DELETE') {
        setResults((prev) => {
          const next = { ...prev }
          delete next[oldId]
          return next
        })
        setDetalles((prev) => {
          const next = { ...prev }
          delete next[oldId]
          return next
        })
      } else {
        setResults((prev) => ({ ...prev, [row.match_id]: row.winner }))
        if (row.detalle) setDetalles((prev) => ({ ...prev, [row.match_id]: row.detalle }))
      }
    })
    return () => unsubscribe()
  }, [refetch])

  // Registro automático desde el marcador en vivo. useCallback con deps
  // vacías: la identidad estable permite listarla honestamente en las deps
  // del efecto que detecta el fin de un partido.
  const applyLive = useCallback((matchId, teamId, marcador, detalle) => {
    setResults((prev) => (prev[matchId] === teamId ? prev : { ...prev, [matchId]: teamId }))
    if (detalle) setDetalles((prev) => ({ ...prev, [matchId]: detalle }))
    if (hasSupabase && !ES_SIM) {
      saveResult(matchId, teamId, marcador, detalle).then(
        ({ error }) => error && console.error('Error al sincronizar:', error.message)
      )
    }
  }, [])

  // Corrección manual (solo con ?admin en la URL): toca para marcar, re-toca
  // para deshacer. También se sincroniza a Supabase cuando aplica.
  const pick = useCallback((matchId, teamId) => {
    setResults((prev) => {
      const undo = prev[matchId] === teamId
      const next = { ...prev }
      if (undo) delete next[matchId]
      else next[matchId] = teamId
      if (hasSupabase && !ES_SIM) {
        const op = undo ? deleteResult(matchId) : saveResult(matchId, teamId)
        op.then(({ error }) => error && console.error('Error al sincronizar:', error.message))
      }
      return next
    })
  }, [])

  return { results, detalles, applyLive, pick, online, refetch }
}
