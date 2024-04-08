import { useOutletContext } from "@remix-run/react";

interface JsonifiedUser {
  username: string;
  avatarTemplate: string;
}

interface AvatarProps {
  user: JsonifiedUser;
  size?: string;
  className?: string;
}

interface DiscourseData {
  baseUrl: string;
}

function generateAvatarUrl(
  avatarTemplate: string,
  baseUrl: string,
  size = "48"
) {
  const sized = avatarTemplate.replace("{size}", size);
  return `${baseUrl}${sized}`;
}

export default function Avatar({ user, size, className }: AvatarProps) {
  const discourseData: DiscourseData = useOutletContext();
  const baseUrl = discourseData.baseUrl;

  return (
    <img
      className={className || ""}
      src={generateAvatarUrl(user.avatarTemplate, baseUrl, size)}
      alt={`Avatar for ${user.username}`}
    />
  );
}
