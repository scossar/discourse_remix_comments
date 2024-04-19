import type {LoaderFunctionArgs, MetaFunction} from "@remix-run/node";
import {json, redirect} from "@remix-run/node";
import {
  isRouteErrorResponse, useFetcher,
  useLoaderData,
  useRouteError,
} from "@remix-run/react";
import {useEffect, useState} from "react";

import {discourseSessionStorage} from "~/services/session.server";

import {fetchCommentsForUser} from "~/services/fetchCommentsForUser.server";
import Avatar from "~/components/Avatar";
import {ApiDiscourseConnectUser} from "~/types/apiDiscourse";
import {ParsedPagedDiscourseTopic} from "~/types/parsedDiscourse";

export const meta: MetaFunction = () => {
  return [
    {title: "Comments"},
    {name: "description", content: "comments for..."},
  ];
};

export async function loader({request, params}: LoaderFunctionArgs) {
  const userSession = await discourseSessionStorage.getSession(
    request.headers.get("Cookie"),
  );
  const user: ApiDiscourseConnectUser = {
    externalId: userSession.get("external_id"),
    avatarUrl: userSession.get("avatar_url"),
    admin: userSession.get("admin"),
    username: userSession.get("username"),
  };

  const topicId = Number(params?.topicId);
  const slug = params?.slug;
  if (!slug || !topicId) {
    throw new Response("Required 'slug' and 'topicId' params not set", {
      status: 500,
    });
  }

  const {searchParams} = new URL(request.url);
  // note that you're updating this manually for testing
  const page = Number(searchParams.get("page")) || 0;
  const currentUsername = user?.username ?? null;

  let postStreamForUser;
  let errorMessage;
  try {
    postStreamForUser = await fetchCommentsForUser(
      topicId,
      currentUsername,
      page,
    );
  } catch {
    errorMessage = "Comments could not be loaded";
  }

  // tmp workaround
  if (!postStreamForUser) {
    return redirect("/")
  }

  return json(
    {postStreamForUser, errorMessage, user},
    {
      headers: {
        "Set-Cookie": await discourseSessionStorage.commitSession(userSession),
      },
    },
  );
}


export default function DiscourseComments() {
  const {postStreamForUser} = useLoaderData<typeof loader>();
  const fetcher = useFetcher<ParsedPagedDiscourseTopic>();
  const [pages, setPages] = useState(postStreamForUser);

  useEffect(() => {
    if (fetcher?.data) {
      console.log(JSON.stringify(fetcher.data, null, 2))
    }
  }, [fetcher.data])

  return (
    <div className="divide-y divide-cyan-800">
      <div className="divide-y divide-cyan-500">
        {Object.entries(pages).map(([currentPage, topicData]) => (
          <div key={currentPage}>
            {topicData?.postStream?.posts?.map((post) => (
              <div key={post.id} className="my-6 discourse-comment flex">
                <Avatar
                  user={{
                    username: post.username,
                    avatarTemplate: post.avatarUrl,
                  }}
                  absoluteUrl={true}
                  className="rounded-full w-8 h-8 object-contain mt-2"
                />
                <div className="ml-2 w-full">
                  <div className="w-full my-3">
                    <span className="bg-slate-50 text-slate-900 inline-block p-1">
                      {post.postNumber}
                    </span>
                    <div dangerouslySetInnerHTML={{__html: post.cooked}}/>
                  </div>
                  <div className="flex justify-end w-full items-center">
                    <button
                      className="mr-2 px-2 py-1 bg-slate-50 hover:bg-slate-200 text-cyan-950 rounded-sm">
                      Reply
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ErrorBoundary() {
  const error: any = useRouteError();
  const status = error?.status;

  if (isRouteErrorResponse(error) && error?.data) {
    const errorMessage = error?.data;

    return (
      <div>
        <h1>Error Boundary Template</h1>
        <p>todo: be careful about what error messages get displayed:</p>
        <p>{errorMessage}</p>
      </div>
    );
  } else if (status && status === 404) {
    return <div>The page you were looking for could not be found</div>;
  } else {
    return (
      <div>
        <h1>Error Boundary Template</h1>
        <p>todo: this is just a template</p>
      </div>
    );
  }
}
