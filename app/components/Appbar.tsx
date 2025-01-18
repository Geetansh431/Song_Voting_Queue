"use client";
import { signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link"

//@ts-ignore
import { Music } from "lucide-react"

export function Appbar() {
    const session = useSession();
    return <div className="flex justify-between px-20 pt-4">
        <div className="text-lg font-bold flex flex-col justify-center text-black">
            Muzer
        </div>
        <div>
            {session.data?.user && <button className="m-2 p-2 bg-blue-400" onClick={() => signOut()}>Logout</button>}
            {!session.data?.user && <button className="m-2 p-2 bg-blue-400" onClick={() => signIn()}>Signin</button>}
        </div>
    </div>
}