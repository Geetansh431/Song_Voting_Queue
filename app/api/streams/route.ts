import { prismaClient } from "@/app/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod"

const CreateStreamSchema = z.object({
    creatorId: z.string(),
    url: z.string()
});

export async function POST(req: NextResponse) {
    try {
        const data = CreateStreamSchema.parse(await req.json());
        prismaClient.stream.create({
            userId: data.creatorId,

        })
    } catch (e) {
        console.log(e);
        return NextResponse.json({
            message: "Error while adding a stream"
        }, {
            status: 411
        })
    }


}