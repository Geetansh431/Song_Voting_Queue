import StreamView from "@/app/components/StreamView";

export default function Creator({
    params // Ensure params is awaited
}: {
    params: {
        creatorId: string;
    }
}) {
    const { creatorId } = params; // Await and extract creatorId

    return (
        <div>
            <StreamView creatorId={creatorId} playVideo={false} />
        </div>
    );
}
