import { Link } from "@remix-run/react";
import type { ApiDiscourseConnectUser } from "~/types/apiDiscourse";
export interface HeaderProps {
  currentUser: ApiDiscourseConnectUser;
}

export default function Header({ currentUser }: HeaderProps) {
  const externalId = currentUser?.externalId;
  const avatarUrl = currentUser?.avatarUrl;
  const activeSession = externalId ? true : false;
  const logInOutLink = activeSession ? "/logout" : "/login";
  return (
    <header className="sticky top-0 z-10 w-full py-3 h-14 bg-cyan-700 text-slate-50">
      <div className="flex flex-row items-center justify-between mx-auto  max-w-screen-md">
        <div>
          <Link to="/">
            <h1 className="text-2xl">Recourse</h1>
          </Link>
        </div>
        <div className="flex flex-row w-fit">
          <Link
            className="inline-block px-2 text-lg rounded-sm bg-slate-50 text-slate-900"
            to={logInOutLink}
          >
            {activeSession ? "Log Out" : "Log In"}
          </Link>
          {activeSession && avatarUrl ? (
            <img className="w-8 h-8 ml-3 rounded-full" src={avatarUrl} alt="" />
          ) : (
            <div></div>
          )}
          <div></div>
        </div>
      </div>
    </header>
  );
}
