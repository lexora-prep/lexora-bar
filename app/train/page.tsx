"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

export default function TrainPage() {

  const params = useSearchParams()
  const ruleId = params.get("ruleId")

  const [rule,setRule] = useState<any>(null)

  useEffect(()=>{

    if(!ruleId) return

    fetch(`/api/rule?ruleId=${ruleId}`)
      .then(res=>res.json())
      .then(setRule)

  },[ruleId])

  if(!rule){
    return <div className="p-6">Loading...</div>
  }

  return(

    <div className="p-6 space-y-6">

      <div className="text-xl font-semibold">
        {rule.title}
      </div>

      <div className="text-gray-600">
        {rule.content}
      </div>

      <textarea
        placeholder="Type the rule from memory..."
        className="w-full border rounded-lg p-4 min-h-[150px]"
      />

      <button className="bg-blue-600 text-white px-4 py-2 rounded-lg">
        Submit
      </button>

    </div>

  )

}