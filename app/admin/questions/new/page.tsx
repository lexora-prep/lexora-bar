"use client"

import { useState } from "react"

export default function NewQuestionPage() {

  const [question,setQuestion] = useState("")
  const [subject,setSubject] = useState("")
  const [topic,setTopic] = useState("")
  const [answerA,setAnswerA] = useState("")
  const [answerB,setAnswerB] = useState("")
  const [answerC,setAnswerC] = useState("")
  const [answerD,setAnswerD] = useState("")
  const [correctAnswer,setCorrectAnswer] = useState("")
  const [explanation,setExplanation] = useState("")

  async function submitQuestion(){

    const res = await fetch("/api/admin/add-question",{
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        subject,
        topic,
        questionText:question,
        answerA,
        answerB,
        answerC,
        answerD,
        correctAnswer,
        explanation
      })
    })

    const data = await res.json()

    if(data.success){
      alert("Question added!")

      setQuestion("")
      setAnswerA("")
      setAnswerB("")
      setAnswerC("")
      setAnswerD("")
      setExplanation("")
    }

  }

  return(

    <div className="p-10 max-w-3xl">

      <h1 className="text-2xl font-semibold mb-6">
        Add MBE Question
      </h1>

      <div className="space-y-4">

        <input
          placeholder="Subject (Contracts, Torts, etc)"
          value={subject}
          onChange={e=>setSubject(e.target.value)}
          className="border p-3 w-full rounded"
        />

        <input
          placeholder="Topic (Formation, Negligence, etc)"
          value={topic}
          onChange={e=>setTopic(e.target.value)}
          className="border p-3 w-full rounded"
        />

        <textarea
          placeholder="Question text"
          value={question}
          onChange={e=>setQuestion(e.target.value)}
          className="border p-3 w-full rounded"
        />

        <input
          placeholder="Answer A"
          value={answerA}
          onChange={e=>setAnswerA(e.target.value)}
          className="border p-3 w-full rounded"
        />

        <input
          placeholder="Answer B"
          value={answerB}
          onChange={e=>setAnswerB(e.target.value)}
          className="border p-3 w-full rounded"
        />

        <input
          placeholder="Answer C"
          value={answerC}
          onChange={e=>setAnswerC(e.target.value)}
          className="border p-3 w-full rounded"
        />

        <input
          placeholder="Answer D"
          value={answerD}
          onChange={e=>setAnswerD(e.target.value)}
          className="border p-3 w-full rounded"
        />

        <input
          placeholder="Correct Answer (A/B/C/D)"
          value={correctAnswer}
          onChange={e=>setCorrectAnswer(e.target.value)}
          className="border p-3 w-full rounded"
        />

        <textarea
          placeholder="Explanation"
          value={explanation}
          onChange={e=>setExplanation(e.target.value)}
          className="border p-3 w-full rounded"
        />

        <button
          onClick={submitQuestion}
          className="bg-blue-600 text-white px-6 py-3 rounded"
        >
          Add Question
        </button>

      </div>

    </div>

  )

}