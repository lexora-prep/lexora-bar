"use client"

import { useEffect, useState } from "react"

type Props = {
  ruleText: string
  keywords: string[]
  onNextRule: () => void
}

export default function FillBlankMode({
  ruleText,
  keywords,
  onNextRule
}: Props) {

  const [answers, setAnswers] = useState<string[]>([])
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    setAnswers(new Array(keywords.length).fill(""))
    setChecked(false)
  }, [ruleText, keywords])

  function updateAnswer(index:number,value:string){
    const copy=[...answers]
    copy[index]=value
    setAnswers(copy)
  }

  function submit(){
    setChecked(true)
  }

  function tryAgain(){
    setAnswers(new Array(keywords.length).fill(""))
    setChecked(false)
  }

  function buildSentence(){

    let text = ruleText

    keywords.forEach((kw,i)=>{
      text = text.replace(kw,`__BLANK_${i}__`)
    })

    const parts = text.split(/(__BLANK_\d+__)/g)

    return parts.map((part,i)=>{

      const match = part.match(/__BLANK_(\d+)__/)

      if(!match) return <span key={i}>{part}</span>

      const index = Number(match[1])

      const correct = keywords[index].toLowerCase()
      const user = (answers[index]||"").toLowerCase()

      const isCorrect = correct === user

      return(

        <input
  key={i}
  value={answers[index] || ""}
  disabled={checked}
  placeholder={"_ ".repeat(20)}
  onChange={(e)=>updateAnswer(index,e.target.value)}
  style={{
    width:190,
    padding:"10px 14px",
    margin:"0 6px",
    borderRadius:10,
    border:checked
      ?isCorrect
        ?"2px solid #22C55E"
        :"2px solid #EF4444"
      :"2px solid #93C5FD",
    background:"#FFFFFF",

    fontSize:16,
    fontWeight:800,        // makes typed text bold
    color:"#1E40AF",       // dark blue typed text
    letterSpacing:"0.5px",

    fontFamily:"ui-sans-serif, system-ui",
    outline:"none"
  }}
/>

      )

    })

  }

  return(

  <div>

  {/* RULE BOX */}

  <div
  style={{
  border:"1px solid #BFDBFE",
  borderRadius:14,
  padding:22,
  background:"#EFF6FF",
  fontSize:17,
  lineHeight:1.7,
  color:"#1E293B",
  marginBottom:20
  }}
  >

  <div
  style={{
  fontSize:12,
  letterSpacing:"0.08em",
  fontWeight:700,
  color:"#3B82F6",
  marginBottom:10
  }}
  >
  RULE TO MEMORIZE
  </div>

  {buildSentence()}

  </div>

  {/* KEYWORDS */}

  <div
  style={{
  marginBottom:18
  }}
  >

  <div
  style={{
  fontSize:12,
  letterSpacing:"0.08em",
  color:"#94A3B8",
  marginBottom:6,
  fontWeight:700
  }}
  >
  KEYWORDS:
  </div>

  <div
  style={{
  display:"flex",
  flexWrap:"wrap",
  gap:8
  }}
  >

  {keywords.map((k,i)=>(
  <div
  key={i}
  style={{
  background:"#E2E8F0",
  padding:"6px 10px",
  borderRadius:999,
  fontSize:13,
  fontWeight:600,
  color:"#334155",
  fontFamily:"ui-monospace, SFMono-Regular, Menlo"
  }}
  >
  {k}
  </div>
  ))}

  </div>

  </div>

  {/* SUBMIT BUTTON */}

  {!checked && (

  <button
  onClick={submit}
  style={{
  background:"#3B5BDB",
  color:"white",
  padding:"12px 22px",
  borderRadius:10,
  border:"none",
  fontWeight:700,
  fontSize:15,
  cursor:"pointer"
  }}
  >
  Submit Rule
  </button>

  )}

  {/* RESULT PANEL */}

  {checked && (

  <div
  style={{
  marginTop:24,
  border:"1px solid #FCA5A5",
  background:"#FEF2F2",
  padding:20,
  borderRadius:14
  }}
  >

  <div
  style={{
  fontWeight:700,
  color:"#DC2626",
  marginBottom:10
  }}
  >
  Needs review
  </div>

  <div
  style={{
  fontSize:14,
  color:"#7F1D1D",
  marginBottom:14
  }}
  >
  Missing keywords:
  </div>

  <div
  style={{
  display:"flex",
  flexWrap:"wrap",
  gap:8
  }}
  >

  {keywords.map((k,i)=>(
  <div
  key={i}
  style={{
  background:"#FECACA",
  padding:"6px 10px",
  borderRadius:999,
  fontSize:13,
  fontWeight:600,
  color:"#7F1D1D"
  }}
  >
  {k}
  </div>
  ))}

  </div>

  {/* BUTTONS */}

  <div
  style={{
  display:"flex",
  gap:10,
  marginTop:20
  }}
  >

  <button
  onClick={tryAgain}
  style={{
  padding:"10px 16px",
  borderRadius:10,
  border:"1px solid #CBD5E1",
  background:"#F8FAFC",
  cursor:"pointer",
  fontWeight:600
  }}
  >
  Try Again
  </button>

  <button
  style={{
  padding:"10px 16px",
  borderRadius:10,
  border:"1px solid #CBD5E1",
  background:"#F8FAFC",
  cursor:"pointer",
  fontWeight:600
  }}
  >
  Save
  </button>

  <button
  onClick={onNextRule}
  style={{
  padding:"10px 18px",
  borderRadius:10,
  background:"#3B5BDB",
  color:"white",
  border:"none",
  fontWeight:700,
  cursor:"pointer"
  }}
  >
  Next Rule →
  </button>

  </div>

  </div>

  )}

  </div>

  )

}