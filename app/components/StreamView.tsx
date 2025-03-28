'use client'
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronUp, ChevronDown, Share2, PlayCircle, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

const REFRESH_INTERVAL_MS = 10 * 1000;
const YT_REGEX = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;

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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Create a ref for the iframe
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(7);
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const refreshStreams = async () => {
    try {
      const res = await fetch(`/api/streams/?creatorId=${creatorId}`, {
        credentials: "include",
      });
      const json = await res.json();
      
      const sortedStreams = json.streams.sort((a: any, b: any) => b.upvotes - a.upvotes);
      setQueue(sortedStreams);

      if (json.activeStream?.stream && (!currentVideo || currentVideo.id !== json.activeStream.stream.id)) {
        setCurrentVideo(json.activeStream.stream);
      }
    } catch (err) {
      showNotification("Failed to refresh streams", "error");
    }
  };

  useEffect(() => {
    refreshStreams();
    const interval = setInterval(refreshStreams, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputLink.match(YT_REGEX)) {
      showNotification("Please enter a valid YouTube URL", "error");
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
      showNotification("Song added to queue!", "success");
      setInputLink("");
    } catch (error) {
      showNotification("Failed to add song to queue", "error");
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
      await refreshStreams();
    } catch (error) {
      showNotification(`Failed to ${isUpvote ? 'upvote' : 'downvote'} the song`, "error");
    }
  };

  const playNext = async () => {
    if (queue.length === 0) {
      showNotification("No more songs in the queue!", "info");
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
        showNotification("Playing next song!", "success");
      }
    } catch (error) {
      showNotification("Error playing next video. Please try again.", "error");
    } finally {
      setPlayNextLoader(false);
    }
  };

  const handleShare = () => {
    const shareableLink = `${window.location.origin}/creator/${creatorId}`;
    navigator.clipboard.writeText(shareableLink).then(
      () => showNotification("Link copied to clipboard!", "success"),
      () => showNotification("Failed to copy link. Please try again.", "error")
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-950 text-gray-200">
      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map(({ id, message, type }) => (
          <Alert
            key={id}
            variant={type === 'error' ? 'destructive' : 'default'}
            className={`${
              type === 'success' ? 'border-green-500 bg-green-950' :
              type === 'info' ? 'border-blue-500 bg-blue-950' :
              'border-red-500 bg-red-950'
            } w-72 flex justify-between items-center`}
          >
            <AlertDescription>{message}</AlertDescription>
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={() => removeNotification(id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </Alert>
        ))}
      </div>

      {/* Rest of the component remains the same... */}
      <nav className="border-b border-gray-800 bg-gray-900 p-4">
        <div className="max-w-screen-xl mx-auto">
          <h1 className="text-xl font-bold text-white">Stream View</h1>
        </div>
      </nav>
      
      {/* Video Player Section */}
      {playVideo && currentVideo && (
        <div className="w-full bg-black py-4">
          <div className="max-w-screen-xl mx-auto px-4">
            <iframe
              ref={iframeRef}
              className="w-full aspect-video"
              src={`https://www.youtube.com/embed/${currentVideo.extractedId}?autoplay=1&enablejsapi=1`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex justify-center px-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5 w-full max-w-screen-xl pt-8">
          {/* Queue Section */}
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
                <Card className="bg-gray-900 border-gray-800">
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
                    <div className="mt-2 aspect-video">
                      <iframe
                        className="w-full h-full"
                        src={`https://www.youtube.com/embed/${YT_REGEX.exec(inputLink)?.[1]}`}
                        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}