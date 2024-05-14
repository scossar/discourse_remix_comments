type CommentsGapProps = {
  missingPage: number;
  getCommentsForPage: (commentPage: number) => void;
  state: "idle" | "loading" | "submitting";
};

export default function CommentsGap({
  missingPage,
  getCommentsForPage,
  state,
}: CommentsGapProps) {
  return (
    <div className="w-full p-2 bg-red-700">
      Comments {missingPage * 20} to {missingPage * 20 + 20}{" "}
      <button onClick={() => getCommentsForPage(missingPage)}>
        {state === "idle" ? "load comments" : "loading"}
      </button>
    </div>
  );
}
