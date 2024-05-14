export default function CommentsGap({ missingPage }: { missingPage: number }) {
  return (
    <div className="w-full bg-red-700">
      <div>missing comments for page: {missingPage}</div>
    </div>
  );
}
