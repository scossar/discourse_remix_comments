import { useCallback, useEffect, useState } from "react";
import type { ParsedDiscoursePost } from "~/types/parsedDiscourse";

export function useCombinedUniquePosts(initialPosts: ParsedDiscoursePost[]) {
  // on the offchance that initial posts contains duplicate values:
  const [posts, setPosts] = useState(() => {
    const uniquePostMap = new Map(initialPosts.map((post) => [post.id, post]));
    return Array.from(uniquePostMap.values());
  });
  // useCallback probably isn't doing anything here
  const combinePosts = useCallback(
    (newPosts: ParsedDiscoursePost[]) => {
      const uniquePostMap = new Map(posts.map((post) => [post.id, post]));
      newPosts.forEach((post) => {
        if (!uniquePostMap.has(post.id)) {
          uniquePostMap.set(post.id, post);
        }
      });
      setPosts(Array.from(uniquePostMap.values()));
    },
    [posts]
  );
  return { posts, combinePosts };
}
