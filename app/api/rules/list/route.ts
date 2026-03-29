import { NextResponse } from "next/server"

export async function GET(){

  const demoRules = [

    {
      drill:"Silence is not acceptance unless there is a prior course of ______.",
      answer:"dealing"
    },

    {
      drill:"A contract requires offer, acceptance, and ______.",
      answer:"consideration"
    }

  ]

  return NextResponse.json({
    rules:demoRules
  })

}