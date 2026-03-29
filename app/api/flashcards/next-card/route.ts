import { NextResponse } from "next/server"

export async function POST(req: Request) {

  const body = await req.json()

  const { deck, index } = body

  const nextIndex = index + 1

  if (nextIndex >= deck.length) {

    return NextResponse.json({
      done: true
    })

  }

  return NextResponse.json({
    done: false,
    card: deck[nextIndex],
    index: nextIndex
  })

}