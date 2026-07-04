// ── Street Fighter · Tómbola Edition ──
// Cada amigo de la tómbola es un peleador del arcade. La asignación es por
// afinidad de color de su chip (y por el chiste obligado Dantl → Dan).
// Assets en public/sf/:
//   stance : GIF animado de la postura de pelea (idle del arcade)
//   vs     : retrato de la pantalla VS (cuando la pelea está por empezar)
//   ko     : retrato golpeado del continue screen (cuando ya perdió)

export const FIGHTERS = {
  rajatl:   { fighter: 'Ken',      stance: '/sf/ken.gif',     vs: '/sf/ken-vs.gif',     ko: '/sf/ken-ko.png' },
  israeltl: { fighter: 'Ryu',      stance: '/sf/ryu.gif',     vs: '/sf/ryu-vs.gif',     ko: '/sf/ryu-ko.gif' },
  phoccotl: { fighter: 'Blanka',   stance: '/sf/blanka.gif',  vs: '/sf/blanka-vs.gif',  ko: '/sf/blanka-ko.png' },
  margotl:  { fighter: 'M. Bison', stance: '/sf/bison.gif',   vs: '/sf/bison-vs.png',   ko: '/sf/bison-ko.png' },
  cuernotl: { fighter: 'Dhalsim',  stance: '/sf/dhalsim.gif', vs: '/sf/dhalsim-vs.gif', ko: '/sf/dhalsim-ko.png' },
  fertl:    { fighter: 'E. Honda', stance: '/sf/honda.gif',   vs: '/sf/honda-vs.gif',   ko: '/sf/honda-ko.png' },
  dantl:    { fighter: 'Zangief',  stance: '/sf/zangief.gif', vs: '/sf/zangief-vs.gif', ko: '/sf/zangief-ko.png' },
  gorlytl:  { fighter: 'Guile',    stance: '/sf/guile.gif',   vs: '/sf/guile-vs.gif',   ko: '/sf/guile-ko.png' },
}
