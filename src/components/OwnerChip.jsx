// Chip pequeño con el nombre del amigo en su color. Se usa en las team-rows
// del match, en los "Coonstl" y en resúmenes. El color viene por CSS var
// para que las clases hijas puedan derivar variantes (bg tinted, etc).

export function OwnerChip({ owner, small }) {
  return (
    <span
      className={`owner-chip${small ? ' small' : ''}`}
      style={{ '--owner': owner.color }}
    >
      {owner.name}
    </span>
  )
}
