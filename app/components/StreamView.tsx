"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
//@ts-ignore
import { ChevronUp, ChevronDown, Share2, PlayCircle } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Appbar } from "../components/Appbar";
import LiteYouTubeEmbed from "react-lite-youtube-embed";
import "react-lite-youtube-embed/dist/LiteYouTubeEmbed.css";
import { YT_REGEX } from "../lib/utils";
//@ts-ignore
import YouTubePlayer from "youtube-player";

interface Video {
  id: string;
  type: string;
  url: string;
  extractedId: string;
  title: string;
  smallImg: string;
  bigImg: string;
  active: boolean;
  userId: string;
  upvotes: number;
  haveUpvoted: boolean;
}

const REFRESH_INTERVAL_MS = 10 * 1000;

export default function StreamView({
  creatorId,
  playVideo = false,
}: {
  creatorId: string;
  playVideo: boolean;
}) {
  const [inputLink, setInputLink] = useState("");
  const [queue, setQueue] = useState<Video[]>([]);
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(false);
  const [playNextLoader, setPlayNextLoader] = useState(false);
  const videoPlayerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  const refreshStreams = async () => {
    const res = await fetch(`/api/streams/?creatorId=${creatorId}`, {
      credentials: "include",
    });
    const json = await res.json();
    
    // Sort queue by upvotes
    const sortedStreams = json.streams.sort((a: any, b: any) => b.upvotes - a.upvotes);
    setQueue(sortedStreams);

    // Only update current video if it's different
    if (json.activeStream?.stream && (!currentVideo || currentVideo.id !== json.activeStream.stream.id)) {
      setCurrentVideo(json.activeStream.stream);
    }
  };

  // Initialize player once
  useEffect(() => {
    if (!videoPlayerRef.current || !playVideo) return;

    playerRef.current = YouTubePlayer(videoPlayerRef.current, {
      videoId: currentVideo?.extractedId,
      playerVars: {
        autoplay: 1,
        controls: 1,
        modestbranding: 1,
      },
    });

    playerRef.current.on('stateChange', (event: any) => {
      if (event.data === 0) {  // Video ended
        playNext();
      }
    });

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [videoPlayerRef.current, playVideo]);

  // Handle current video changes
  useEffect(() => {
    if (currentVideo && playerRef.current && playVideo) {
      playerRef.current.loadVideoById(currentVideo.extractedId);
    }
  }, [currentVideo, playVideo]);

  // Refresh streams periodically
  useEffect(() => {
    refreshStreams();
    const interval = setInterval(refreshStreams, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputLink.match(YT_REGEX)) {
      toast.error("Please enter a valid YouTube URL");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/streams/", {
        method: "POST",
        body: JSON.stringify({
          creatorId,
          url: inputLink,
        }),
      });
      if (!res.ok) throw new Error('Failed to add stream');
      const newStream = await res.json();
      setQueue(prevQueue => [...prevQueue, newStream].sort((a, b) => b.upvotes - a.upvotes));
      toast.success("Song added to queue!");
      setInputLink("");
    } catch (error) {
      toast.error("Failed to add song to queue");
    }
    setLoading(false);
  };

  const handleVote = async (videoId: string, isUpvote: boolean) => {
    try {
      const response = await fetch(`/api/streams/${isUpvote ? "upvote" : "downvote"}`, {
        method: "POST",
        body: JSON.stringify({
          streamId: videoId,
        }),
      });

      if (!response.ok) throw new Error('Failed to vote');

      // Update the video's vote count and sort the queue
      const updatedQueue = queue.map(video => {
        if (video.id === videoId) {
          return {
            ...video,
            upvotes: isUpvote ? video.upvotes + 1 : video.upvotes - 1,
            haveUpvoted: isUpvote,
          };
        }
        return video;
      }).sort((a, b) => b.upvotes - a.upvotes);

      setQueue(updatedQueue);
      await refreshStreams(); // Refresh to ensure we have the latest state
    } catch (error) {
      toast.error(`Failed to ${isUpvote ? 'upvote' : 'downvote'} the song`);
    }
  };

  const playNext = async () => {
    if (queue.length === 0) {
      toast.info("No more songs in the queue!");
      return;
    }

    try {
      setPlayNextLoader(true);
      const response = await fetch("/api/streams/next", {
        method: "GET",
      });
      
      if (!response.ok) throw new Error('Failed to play next song');
      
      const json = await response.json();
      if (json.stream) {
        setCurrentVideo(json.stream);
        setQueue(prevQueue => prevQueue.filter(video => video.id !== json.stream.id));
        toast.success("Playing next song!");
      }
    } catch (error) {
      console.error("Error playing next video:", error);
      toast.error("Error playing next video. Please try again.");
    } finally {
      setPlayNextLoader(false);
    }
  };

  const handleShare = () => {
    const shareableLink = `${window.location.origin}/creator/${creatorId}`;
    navigator.clipboard.writeText(shareableLink).then(
      () => toast.success("Link copied to clipboard!"),
      () => toast.error("Failed to copy link. Please try again.")
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-[rgb(10,10,10)] text-gray-200">
      <Appbar />
      
      {/* Video Player Section */}
      {playVideo && (
        <div className="w-full bg-black py-4">
          <div className="max-w-screen-xl mx-auto px-4">
            <div ref={videoPlayerRef} className="aspect-video w-full"></div>
          </div>
        </div>
      )}

      <div className="flex justify-center px-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5 w-full max-w-screen-xl pt-8">
          <div className="col-span-3">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Upcoming Songs</h2>
                {playVideo && (
                  <Button
                    onClick={playNext}
                    disabled={playNextLoader || queue.length === 0}
                    className="bg-purple-700 hover:bg-purple-800 text-white"
                  >
                    <PlayCircle className="mr-2 h-4 w-4" />
                    {playNextLoader ? "Loading..." : "Play Next"}
                  </Button>
                )}
              </div>

              {/* Current Video Display */}
              {currentVideo && (
                <Card className="bg-gray-900 border-gray-800">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-white mb-2">Now Playing</h3>
                    <div className="flex items-center space-x-4">
                      <img
                        src={currentVideo.smallImg}
                        alt={`Thumbnail for ${currentVideo.title}`}
                        className="w-30 h-20 object-cover rounded"
                      />
                      <div className="flex-grow">
                        <h4 className="font-medium text-white">{currentVideo.title}</h4>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Queue Display */}
              {queue.length === 0 ? (
                <Card className="bg-gray-900 border-gray-800 w-full">
                  <CardContent className="p-4">
                    <p className="text-center py-8 text-gray-400">
                      No videos in queue
                    </p>
                  </CardContent>
                </Card>
              ) : (
                queue.map((video) => (
                  <Card key={video.id} className="bg-gray-900 border-gray-800">
                    <CardContent className="p-4 flex items-center space-x-4">
                      <img
                        src={video.smallImg}
                        alt={`Thumbnail for ${video.title}`}
                        className="w-30 h-20 object-cover rounded"
                      />
                      <div className="flex-grow">
                        <h3 className="font-semibold text-white">
                          {video.title}
                        </h3>
                        <div className="flex items-center space-x-2 mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleVote(video.id, true)}
                            className={`flex items-center space-x-1 bg-gray-800 border-gray-700 hover:bg-gray-700 ${
                              video.haveUpvoted ? 'text-purple-400' : 'text-white'
                            }`}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <span className="text-white">{video.upvotes}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleVote(video.id, false)}
                            className={`flex items-center space-x-1 bg-gray-800 border-gray-700 hover:bg-gray-700 ${
                              !video.haveUpvoted ? 'text-purple-400' : 'text-white'
                            }`}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Add Song Section */}
          <div className="col-span-2">
            <div className="max-w-4xl mx-auto p-4 space-y-6 w-full">
              <div className="flex justify-between items-center">
                <h1 className="text-xl font-bold text-white">Add a song</h1>
                <Button
                  onClick={handleShare}
                  className="bg-purple-700 hover:bg-purple-800 text-white"
                >
                  <Share2 className="mr-2 h-4 w-4" /> Share
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-2">
                <Input
                  type="text"
                  placeholder="Paste YouTube link here"
                  value={inputLink}
                  onChange={(e) => setInputLink(e.target.value)}
                  className="bg-gray-900 text-white border-gray-700 placeholder-gray-500"
                />
                <Button
                  disabled={loading}
                  type="submit"
                  className="w-full bg-purple-700 hover:bg-purple-800 text-white"
                >
                  {loading ? "Loading..." : "Add to Queue"}
                </Button>
              </form>

              {inputLink && inputLink.match(YT_REGEX) && !loading && (
                <Card className="bg-gray-900 border-gray-800">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-white">Preview</h3>
                    <div className="mt-2">
                      <LiteYouTubeEmbed
                        title=""
                        id={YT_REGEX.exec(inputLink)?.[1] || ""}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}