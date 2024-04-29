interface JsonifiedUser {
  username: string;
  avatarTemplate: string;
}

interface AvatarProps {
  user: JsonifiedUser;
  className?: string;
}

export default function Avatar({ user, className }: AvatarProps) {
  return (
    <img
      className={className || ""}
      src={user.avatarTemplate}
      alt={`Avatar for ${user.username}`}
    />
  );
}
