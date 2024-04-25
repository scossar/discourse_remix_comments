export type ReplyButtonProps = {
  handleReplyClick: (postNumber: string) => void;
  postNumber: string;
};

export default function ReplyButton({
  handleReplyClick,
  postNumber,
}: ReplyButtonProps) {
  return (
    <>
      <button
        onClick={() => handleReplyClick(postNumber)}
        className="px-2 py-1 mr-2 rounded-sm bg-slate-50 hover:bg-slate-200 text-cyan-950"
      >
        Reply
      </button>
    </>
  );
}
