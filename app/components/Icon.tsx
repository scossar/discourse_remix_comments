interface IconProps {
  id: "hamburger" | "arrow-left" | "arrow-right" | "empty-heart" | "full-heart";
  className?: string;
  x?: number;
  y?: number;
}

export function Icon({ id, x = 0, y = 0, className }: IconProps): JSX.Element {
  return (
    <svg className={className}>
      <use href={`/sprite.svg#${id}`} x={`${x}`} y={`${y}`} />
    </svg>
  );
}
