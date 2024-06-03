import { LoaderFunctionArgs, json } from "@remix-run/node";
import { getRedisClient } from "~/services/redis/redisClient.server";
import { getApiResponseKey } from "~/services/redis/redisKeys.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const jobId = url.searchParams.get("jobId");
  console.log(`in api.getCommentResponse loader, jobId: ${jobId}`);

  if (!jobId) {
    throw new Response("jobId parameter is required", { status: 400 });
  }

  let apiResponse;
  try {
    const client = await getRedisClient();
    const apiResponseKey = getApiResponseKey(jobId);
    apiResponse = await client.get(apiResponseKey);
    if (apiResponse) {
      await client.del(apiResponseKey);
      const jsonResponse = JSON.parse(apiResponse);
      console.log(JSON.stringify(jsonResponse, null, 2));
      return json({ message: "success" });
    } else {
      return json({ message: "pending" });
    }
  } catch (error) {
    console.error(`error fetching cached apiResponse: ${error}`);
    return json({ message: "error" });
  }
}
