"use client";
import { useEffect, useState } from 'react';
import StreamView from '../components/StreamView';

const REFRESH_INTERVAL_MS = 10 * 1000;

export default function Component() {
    const [creatorId, setCreatorId] = useState<string | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const data = await fetch("/api/user").then(res => res.json());
                setCreatorId(data.user.id);
            } catch (error) {
                console.error("Failed to fetch user data", error);
                // Handle error
            }
        };

        fetchUser();

        // Optionally refresh data at regular intervals
        const interval = setInterval(fetchUser, REFRESH_INTERVAL_MS);
        return () => clearInterval(interval);
    }, []);

    if (!creatorId) {
        return <p>Loading...</p>; // or a loading spinner
    }

    return <StreamView creatorId={creatorId} playVideo={true} />;
}
