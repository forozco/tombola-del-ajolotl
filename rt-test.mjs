// Prueba temporal de realtime: se suscribe al canal y luego inserta un
// resultado de prueba; si el evento llega por websocket, el realtime funciona.
import { createClient } from '@supabase/supabase-js'

const URL = 'https://tkmyfdyduqlmbvyssynd.supabase.co'
const KEY = 'sb_publishable_UURHxlCvgxHi-nkpTfsu0w_AVuiCyim'
const supabase = createClient(URL, KEY)

const timeout = setTimeout(() => {
  console.log('FALLO: no llegó el evento realtime en 20s')
  process.exit(1)
}, 20000)

const channel = supabase
  .channel('rt-test')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'resultados' }, async (payload) => {
    console.log(`EVENTO RECIBIDO EN VIVO: ${payload.eventType}`, payload.new)
    clearTimeout(timeout)
    await supabase.from('resultados').delete().eq('match_id', 'prueba-rt')
    await supabase.removeChannel(channel)
    console.log('OK: realtime funcionando, fila de prueba borrada')
    process.exit(0)
  })
  .subscribe(async (status) => {
    console.log('Estado de suscripción:', status)
    if (status === 'SUBSCRIBED') {
      await supabase.from('resultados').insert({ match_id: 'prueba-rt', winner: 'mex' })
    }
  })
