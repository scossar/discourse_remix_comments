import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

import { getRedisClient } from "~/services/redisClient.server";

export async function loader() {
  const client = await getRedisClient();
  const cacheKey = "stream:1";
  //const stream = [1, 2, 3, 4, 5, 6, 7, 10].map(String);
  client.del("topicStream");
  const stream = [
    696270, 1470085, 1470113, 1470120, 1470131, 1470134, 1470136, 1470137,
    1470139, 1470140, 1470141, 1470142, 1470144, 1470146, 1470150, 1470162,
    1470217, 1470270, 1470344, 1473868, 1473989, 1474236, 1477925, 1483682,
    1483701, 1483703, 1483715, 1483912, 1484084, 1484206, 1484612, 1491133,
    1491142, 1491148, 1491263, 1493394, 1493566,
  ];
  const stringifiedStream = stream.map(String);

  try {
    await client.rPush("topicStream", stringifiedStream);
    await client.lRem("topicStream", 0, String(1470139));
    let page = 1,
      chunkSize = 8;
    let start = page * chunkSize;
    let end = start + chunkSize - 1;
    let topicStream = await client.lRange("topicStream", start, end);
    console.log(`topicStream: ${topicStream}`);
  } catch (error) {
    console.error("something has gone wrong");
  }

  const postStream = {
    topicId: 1,
    title: "Test Topic Title",
    postStream: {
      posts: [{ id: 1, cooked: "<p>this is a test</p>" }],
      stream: [1],
    },
  };

  return json({ postStream });
}

export default function HelloRedis() {
  const { postStream } = useLoaderData<typeof loader>();
  return (
    <div className="max-w-screen-md mx-auto">
      <h1>{postStream.title}</h1>
    </div>
  );
}
