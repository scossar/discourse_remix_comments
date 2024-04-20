export type ReplyButtonProps = {
  handleReplyClick: (postId: number) => void;
  postId: number;
};

export default function ReplyButton({
  handleReplyClick,
  postId,
}: ReplyButtonProps) {
  return (
    <>
      <button
        onClick={() => handleReplyClick(postId)}
        className="mr-2 px-2 py-1 bg-slate-50 hover:bg-slate-200 text-cyan-950 rounded-sm"
      >
        Reply
      </button>
    </>
  );
}
