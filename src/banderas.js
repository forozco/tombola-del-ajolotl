// Las 16 banderas de la quiniela empacadas como data-URI dentro del bundle
// (importadas como texto crudo con ?raw). Así NO hay peticiones de red por
// bandera: se ven siempre, en cualquier teléfono, incluso sin señal buena.
import py from 'flag-icons/flags/1x1/py.svg?raw'
import fr from 'flag-icons/flags/1x1/fr.svg?raw'
import ca from 'flag-icons/flags/1x1/ca.svg?raw'
import ma from 'flag-icons/flags/1x1/ma.svg?raw'
import pt from 'flag-icons/flags/1x1/pt.svg?raw'
import es from 'flag-icons/flags/1x1/es.svg?raw'
import us from 'flag-icons/flags/1x1/us.svg?raw'
import be from 'flag-icons/flags/1x1/be.svg?raw'
import br from 'flag-icons/flags/1x1/br.svg?raw'
import no from 'flag-icons/flags/1x1/no.svg?raw'
import mx from 'flag-icons/flags/1x1/mx.svg?raw'
import gbEng from 'flag-icons/flags/1x1/gb-eng.svg?raw'
import ar from 'flag-icons/flags/1x1/ar.svg?raw'
import eg from 'flag-icons/flags/1x1/eg.svg?raw'
import ch from 'flag-icons/flags/1x1/ch.svg?raw'
import co from 'flag-icons/flags/1x1/co.svg?raw'

const dataUri = (svg) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`

export const FLAG_URLS = {
  py: dataUri(py),
  fr: dataUri(fr),
  ca: dataUri(ca),
  ma: dataUri(ma),
  pt: dataUri(pt),
  es: dataUri(es),
  us: dataUri(us),
  be: dataUri(be),
  br: dataUri(br),
  no: dataUri(no),
  mx: dataUri(mx),
  'gb-eng': dataUri(gbEng),
  ar: dataUri(ar),
  eg: dataUri(eg),
  ch: dataUri(ch),
  co: dataUri(co),
}
