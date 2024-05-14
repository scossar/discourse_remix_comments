type CommentsGapProps = {
  missingPage: number;
  getCommentsForPage: (commentPage: number) => void;
};

export default function CommentsGap({
  missingPage,
  getCommentsForPage,
}: CommentsGapProps) {
  return (
    <div className="w-full bg-red-700">
      <div>
        missing comments for page: {missingPage}
        <button onClick={() => getCommentsForPage(missingPage)}>
          load comments
        </button>
      </div>
    </div>
  );
}
