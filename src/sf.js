// ── Street Fighter · Tómbola Edition ──
// Cada amigo de la tómbola es un peleador del arcade. La asignación es por
// afinidad de color de su chip (y ajustes a pedido de los coonstl).
// Assets en public/sf/:
//   stance : GIF animado de la postura de pelea (idle del arcade)
//   vs     : retrato de la pantalla VS (cuando la pelea está por empezar)
//   ko     : retrato golpeado del continue screen (cuando ya perdió)
//   stage  : el escenario del peleador (la pelea se juega "en casa" del
//            peleador local, como en el juego) + su ubicación en el mapa

export const FIGHTERS = {
  rajatl:   { fighter: 'Ken',      stance: '/sf/ken.gif',     vs: '/sf/ken-vs.gif',     ko: '/sf/ken-ko.png',
              stage: '/sf/stages/ken.gif',     city: 'USA' },
  israeltl: { fighter: 'Ryu',      stance: '/sf/ryu.gif',     vs: '/sf/ryu-vs.gif',     ko: '/sf/ryu-ko.gif',
              stage: '/sf/stages/ryu.jpg',     city: 'JAPAN · SUZAKU CASTLE' },
  phoccotl: { fighter: 'Blanka',   stance: '/sf/blanka.gif',  vs: '/sf/blanka-vs.gif',  ko: '/sf/blanka-ko.png',
              stage: '/sf/stages/blanka.jpg',  city: 'BRAZIL · AMAZON RIVER' },
  margotl:  { fighter: 'M. Bison', stance: '/sf/bison.gif',   vs: '/sf/bison-vs.png',   ko: '/sf/bison-ko.png',
              stage: '/sf/stages/bison.gif',   city: 'THAILAND · SHADALOO' },
  cuernotl: { fighter: 'Dhalsim',  stance: '/sf/dhalsim.gif', vs: '/sf/dhalsim-vs.gif', ko: '/sf/dhalsim-ko.png',
              stage: '/sf/stages/dhalsim.jpg', city: 'INDIA · MAHARAJA PALACE' },
  fertl:    { fighter: 'E. Honda', stance: '/sf/honda.gif',   vs: '/sf/honda-vs.gif',   ko: '/sf/honda-ko.png',
              stage: '/sf/stages/honda.jpg',   city: 'JAPAN · KAPUKON YU' },
  dantl:    { fighter: 'Zangief',  stance: '/sf/zangief.gif', vs: '/sf/zangief-vs.gif', ko: '/sf/zangief-ko.png',
              stage: '/sf/stages/zangief.jpg', city: 'U.S.S.R. · FACTORY' },
  gorlytl:  { fighter: 'Guile',    stance: '/sf/guile.gif',   vs: '/sf/guile-vs.gif',   ko: '/sf/guile-ko.png',
              stage: '/sf/stages/guile.jpg',   city: 'USA · AIR FORCE BASE' },
}
