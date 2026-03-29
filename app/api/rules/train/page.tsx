"use client"

import { useEffect, useState } from "react"

export default function RuleTrainingPage(){

  const [rules,setRules] = useState<any[]>([])
  const [index,setIndex] = useState(0)
  const [input,setInput] = useState("")
  const [result,setResult] = useState("")

  useEffect(()=>{

    async function loadRules(){

      const res = await fetch("/api/rules/list")
      const data = await res.json()

      setRules(data.rules || [])

    }

    loadRules()

  },[])

  if(!rules.length){
    return <div style={{padding:40}}>No saved rules yet.</div>
  }

  const rule = rules[index]

  function checkAnswer(){

    if(input.trim().toLowerCase() === rule.answer.toLowerCase()){
      setResult("Correct ✓")
    }else{
      setResult("Incorrect. Correct answer: " + rule.answer)
    }

  }

  function next(){

    setInput("")
    setResult("")
    setIndex(i => Math.min(i+1, rules.length-1))

  }

  return(

    <div className="max-w-3xl mx-auto p-10 space-y-6">

      <div className="text-2xl font-bold">
        Rule Training
      </div>

      <div className="text-sm text-gray-500">
        Rule {index+1} of {rules.length}
      </div>

      <div className="text-lg border rounded p-6 bg-gray-50">

        {rule.drill}

      </div>

      <input
        value={input}
        onChange={(e)=>setInput(e.target.value)}
        className="border rounded p-3 w-full"
        placeholder="Type missing word..."
      />

      <button
        onClick={checkAnswer}
        className="px-6 py-2 bg-slate-700 text-white rounded"
      >
        Check Answer
      </button>

      {result && (

        <div className="text-lg">
          {result}
        </div>

      )}

      <button
        onClick={next}
        className="px-6 py-2 border rounded"
      >
        Next Rule
      </button>

    </div>

  )

}