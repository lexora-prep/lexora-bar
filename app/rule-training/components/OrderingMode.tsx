"use client"

import { useEffect, useState } from "react"

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core"

import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy
} from "@dnd-kit/sortable"

import { CSS } from "@dnd-kit/utilities"

type Props = {
  ruleText: string
  keywords: string[]
  onNextRule: () => void
}

const MAX_ATTEMPTS = 3

function SortableItem({
  id,
  index,
  submitted,
  correct
}:{
  id:string
  index:number
  submitted:boolean
  correct:boolean
}){

  const {attributes,listeners,setNodeRef,transform,transition} = useSortable({id})

  const style={
    transform:CSS.Transform.toString(transform),
    transition
  }

  let border="#CBD5E1"
  let bg="#FFFFFF"
  let color="#334155"

  if(submitted){

    if(correct){
      border="#10B981"
      bg="#ECFDF5"
      color="#065F46"
    }else{
      border="#EF4444"
      bg="#FEF2F2"
      color="#991B1B"
    }

  }

  return(

  <div
  ref={setNodeRef}
  style={{
  ...style,
  padding:"12px 18px",
  borderRadius:12,
  border:`2px solid ${border}`,
  background:bg,
  color:color,
  fontWeight:700,
  fontSize:15,
  cursor:"grab",
  userSelect:"none"
  }}
  {...attributes}
  {...listeners}
  >
  {index+1}. {id}
  </div>

  )

}

export default function OrderingMode({keywords,onNextRule}:Props){

  const [items,setItems]=useState<string[]>([])
  const [submitted,setSubmitted]=useState(false)
  const [attempts,setAttempts]=useState(0)

  const [reportOpen,setReportOpen]=useState(false)
  const [reportText,setReportText]=useState("")

  const sensors = useSensors(useSensor(PointerSensor))

  useEffect(()=>{

    const shuffled=[...keywords].sort(()=>Math.random()-0.5)

    setItems(shuffled)
    setSubmitted(false)
    setAttempts(0)

  },[keywords])

  function handleDragEnd(event:any){

    if(submitted) return

    const {active,over}=event

    if(active.id!==over?.id){

      const oldIndex=items.indexOf(active.id)
      const newIndex=items.indexOf(over.id)

      setItems(arrayMove(items,oldIndex,newIndex))

    }

  }

  function submit(){

    const correctCount=items.filter((k,i)=>k===keywords[i]).length
    const percent=Math.round((correctCount/keywords.length)*100)

    if(percent !== 100){
      setAttempts(prev=>prev+1)
    }

    setSubmitted(true)

  }

  function tryAgain(){

    if(attempts >= MAX_ATTEMPTS) return

    const shuffled=[...keywords].sort(()=>Math.random()-0.5)
    setItems(shuffled)
    setSubmitted(false)

  }

  function correct(i:number){
    return items[i]===keywords[i]
  }

  const correctCount=items.filter((k,i)=>k===keywords[i]).length
  const percent=Math.round((correctCount/keywords.length)*100)

  const failedAllAttempts = attempts >= MAX_ATTEMPTS && percent !== 100

  return(

  <div>

  <div
  style={{
  border:"1px solid #CBD5E1",
  borderRadius:16,
  padding:24,
  background:"#F8FAFC",
  marginBottom:20
  }}
  >

  <div
  style={{
  fontSize:12,
  letterSpacing:"0.1em",
  fontWeight:700,
  color:"#94A3B8",
  marginBottom:6
  }}
  >
  DRAG KEYWORDS INTO THE CORRECT RULE ORDER
  </div>

  {/* Correct order reference */}

  {submitted && (

  <div
  style={{
  fontSize:14,
  color:"#64748B",
  marginBottom:18
  }}
  >
  Correct: {keywords.join(" → ")}
  </div>

  )}

  <DndContext
  sensors={sensors}
  collisionDetection={closestCenter}
  onDragEnd={handleDragEnd}
  >

  <SortableContext
  items={items}
  strategy={verticalListSortingStrategy}
  >

  <div
  style={{
  display:"grid",
  gap:14
  }}
  >

  {items.map((word,i)=>(
  <SortableItem
  key={word}
  id={word}
  index={i}
  submitted={submitted}
  correct={correct(i)}
  />
  ))}

  </div>

  </SortableContext>

  </DndContext>

  </div>

  {!submitted && (

  <button
  onClick={submit}
  style={{
  background:"#3451D1",
  color:"white",
  padding:"10px 18px",
  borderRadius:10,
  border:"none",
  fontWeight:700,
  fontSize:14,
  cursor:"pointer"
  }}
  >
  Submit Rule
  </button>

  )}

  {submitted && (

  <>

  <div
  style={{
  marginTop:20,
  border: percent===100?"1px solid #A7F3D0":"1px solid #FCA5A5",
  background: percent===100?"#F0FDF4":"#FEF2F2",
  borderRadius:16,
  padding:18,
  marginBottom:16
  }}
  >

  <div
  style={{
  fontSize:26,
  fontWeight:700,
  color:percent===100?"#059669":"#DC2626"
  }}
  >
  {percent}%
  </div>

  <div
  style={{
  fontSize:18,
  fontWeight:700
  }}
  >
  {percent===100?"Excellent recall!! ✓":"Needs review"}
  </div>

  <div
  style={{
  marginTop:4,
  fontSize:14,
  color:"#64748B"
  }}
  >
  Attempt {Math.min(attempts+1,MAX_ATTEMPTS)} of {MAX_ATTEMPTS}
  </div>

  </div>

  {failedAllAttempts && (

  <div
  style={{
  border:"1px solid #FCA5A5",
  background:"#FEF2F2",
  borderRadius:14,
  padding:16,
  marginBottom:16
  }}
  >

  <div style={{fontWeight:700,marginBottom:8}}>
  Correct order
  </div>

  {keywords.map((k,i)=>(
  <div key={i}>{i+1}. {k}</div>
  ))}

  </div>

  )}

  <div
  style={{
  display:"flex",
  gap:10,
  alignItems:"center"
  }}
  >

  {!failedAllAttempts && percent!==100 && (

  <button
  onClick={tryAgain}
  style={{
  padding:"10px 16px",
  borderRadius:10,
  border:"1px solid #CBD5E1",
  background:"#FFFFFF",
  fontWeight:600,
  fontSize:14
  }}
  >
  ↺ Try Again
  </button>

  )}

  <button
  onClick={onNextRule}
  style={{
  padding:"10px 18px",
  borderRadius:10,
  border:"none",
  background:"#3451D1",
  color:"white",
  fontWeight:700,
  fontSize:14
  }}
  >
  Next Rule →
  </button>

  <button
  onClick={()=>setReportOpen(!reportOpen)}
  style={{
  marginLeft:"auto",
  padding:"10px 14px",
  borderRadius:10,
  border:"1px solid #CBD5E1",
  background:"#FFFFFF",
  fontWeight:600,
  fontSize:13
  }}
  >
  ⚑ Report
  </button>

  </div>

  {reportOpen && (

  <div
  style={{
  marginTop:14,
  border:"1px solid #E2E8F0",
  borderRadius:12,
  padding:14,
  background:"#FFFFFF",
  maxWidth:600
  }}
  >

  <textarea
  value={reportText}
  onChange={(e)=>setReportText(e.target.value)}
  placeholder="Tell the admin what is wrong..."
  style={{
  width:"100%",
  minHeight:100,
  border:"1px solid #CBD5E1",
  borderRadius:10,
  padding:10
  }}
  />

  <button
  style={{
  marginTop:10,
  padding:"10px 16px",
  borderRadius:10,
  border:"none",
  background:"#3451D1",
  color:"white",
  fontWeight:700
  }}
  >
  Send report
  </button>

  </div>

  )}

  </>

  )}

  </div>

  )

}