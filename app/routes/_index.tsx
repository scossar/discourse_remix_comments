import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [
    { title: "Discourse Auth for Remix" },
    { name: "description", content: "Discourse auth for Remix" },
  ];
};

export default function Index() {
  return (
    <div className="p-3">
      <h1 className="text-3xl">Discourse Auth Test</h1>
    </div>
  );
}
