import { useOutletContext } from "@remix-run/react";

interface JsonifiedUser {
  username: string;
  avatarTemplate: string;
}

interface AvatarProps {
  user: JsonifiedUser;
  size?: string;
  className?: string;
  absoluteUrl?: boolean;
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

export default function Avatar({
  user,
  size,
  className,
  absoluteUrl = false,
}: AvatarProps) {
  const discourseData: DiscourseData = useOutletContext();
  const baseUrl = discourseData.baseUrl;

  const avatarUrl = absoluteUrl
    ? user.avatarTemplate
    : generateAvatarUrl(user.avatarTemplate, baseUrl, size);

  return (
    <img
      className={className || ""}
      src={avatarUrl}
      alt={`Avatar for ${user.username}`}
    />
  );
}
