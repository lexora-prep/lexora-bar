"use client"

import { useEffect, useState, useMemo } from "react"
import AddRuleModal from "@/app/components/AddRuleModal"

type Keyword = {
  id: number
  keyword: string
}

type Rule = {
  id: number
  title: string
  ruleText: string
  applicationExample?: string
  subtopic?: string
  subject: { name: string }
  topic?: { name: string }
  keywords: Keyword[]
}

const MBE_SUBJECTS = [
"Civil Procedure",
"Constitutional Law",
"Contracts",
"Criminal Law and Procedure",
"Evidence",
"Real Property",
"Torts"
]

function subjectColor(subject: string){

switch(subject){

case "Contracts":
return "bg-blue-100 text-blue-600"

case "Torts":
return "bg-purple-100 text-purple-600"

case "Evidence":
return "bg-cyan-100 text-cyan-600"

case "Civil Procedure":
return "bg-green-100 text-green-600"

case "Criminal Law and Procedure":
return "bg-red-100 text-red-600"

case "Real Property":
return "bg-amber-100 text-amber-600"

case "Business Associations":
return "bg-pink-100 text-pink-600"

case "Family Law":
return "bg-teal-100 text-teal-600"

case "Trusts":
return "bg-orange-100 text-orange-600"

case "Secured Transactions":
return "bg-yellow-100 text-yellow-700"

case "Conflict of Laws":
return "bg-slate-200 text-slate-700"

default:
return "bg-slate-100 text-slate-600"

}
}

function highlightBuzzwords(text:string, keywords:string[]) {

if(!keywords || keywords.length === 0) return text

let result = text

const sorted = [...keywords].sort((a,b)=>b.length - a.length)

sorted.forEach(word => {

const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

const regex = new RegExp(`(${escaped})`, "gi")

result = result.replace(
regex,
`<span class="bg-blue-200 text-blue-900 px-2 py-[2px] rounded-md font-semibold font-mono tracking-tight">$1</span>`
)

})

return result
}

export default function RuleBankPage() {

const [rules, setRules] = useState<Rule[]>([])
const [expanded, setExpanded] = useState<number | null>(null)
const [showModal, setShowModal] = useState(false)

const [search,setSearch] = useState("")
const [examType,setExamType] = useState("all")
const [subjectFilter,setSubjectFilter] = useState("all")

useEffect(() => {

async function load(){

const res = await fetch("/api/rule-bank")
const data = await res.json()

const flattened:any[] = []

data.subjects.forEach((subject:any)=>{
subject.topics.forEach((topic:any)=>{
topic.rules.forEach((rule:any)=>{
flattened.push({
...rule,
subject,
topic
})
})
})
})

setRules(flattened)

}

load()

},[])

const subjects = useMemo(()=>{
const unique = new Set<string>()
rules.forEach(r=>unique.add(r.subject.name))
return Array.from(unique)
},[rules])

const filteredRules = useMemo(()=>{

let result = [...rules]

const q = search.toLowerCase()

if(search){

result = result.filter(rule =>

rule.title.toLowerCase().includes(q) ||
rule.ruleText.toLowerCase().includes(q) ||
rule.subject.name.toLowerCase().includes(q) ||
rule.topic?.name.toLowerCase().includes(q) ||
rule.keywords.some(k=>k.keyword.toLowerCase().includes(q))

)

}

if(subjectFilter !== "all"){

result = result.filter(rule => rule.subject.name === subjectFilter)

}

if(examType === "mbe"){

result = result.filter(rule =>
MBE_SUBJECTS.includes(rule.subject.name)
)

}

if(examType === "mee"){

result = result.filter(rule =>
!MBE_SUBJECTS.includes(rule.subject.name)
)

}

return result

},[rules,search,examType,subjectFilter])

function toggleRule(id:number){

if(expanded === id){
setExpanded(null)
}else{
setExpanded(id)
}

}

return (

<div className="p-8">

<div className="flex items-center justify-between mb-6">

<div>
<h1 className="text-2xl font-semibold">Rule Bank</h1>
<p className="text-sm text-slate-500 mt-1">
{filteredRules.length} rules
</p>
</div>

<button
onClick={()=>setShowModal(true)}
className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
>
+ Add Rule
</button>

</div>

<div className="flex gap-4 mb-6">

<input
placeholder="Search rules, buzzwords..."
className="flex-1 border border-slate-200 rounded-lg px-4 py-2 text-sm"
value={search}
onChange={(e)=>setSearch(e.target.value)}
/>

<div className="flex border rounded-lg overflow-hidden">

<button
onClick={()=>setExamType("all")}
className={`px-4 py-2 text-sm ${examType==="all"?"bg-blue-600 text-white":"bg-white"}`}
>
All
</button>

<button
onClick={()=>setExamType("mbe")}
className={`px-4 py-2 text-sm ${examType==="mbe"?"bg-blue-600 text-white":"bg-white"}`}
>
MBE
</button>

<button
onClick={()=>setExamType("mee")}
className={`px-4 py-2 text-sm ${examType==="mee"?"bg-blue-600 text-white":"bg-white"}`}
>
MEE
</button>

</div>

<select
value={subjectFilter}
onChange={(e)=>setSubjectFilter(e.target.value)}
className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
>

<option value="all">All Subjects</option>

{subjects.map(subject=>(
<option key={subject} value={subject}>
{subject}
</option>
))}

</select>

</div>

<div className="bg-white border border-slate-200 rounded-xl overflow-hidden">

<div className="grid grid-cols-[160px_180px_1fr_300px_40px] text-xs text-slate-400 uppercase px-6 py-3 border-b">

<div>Subject</div>
<div>Topic</div>
<div>Rule Title</div>
<div>Keywords</div>
<div></div>

</div>

{filteredRules.map((rule)=>{

const isOpen = expanded === rule.id

return(

<div key={rule.id} className="border-b last:border-b-0">

<div
className="grid grid-cols-[160px_180px_1fr_300px_40px] items-center px-6 py-4 hover:bg-slate-50 cursor-pointer"
onClick={()=>toggleRule(rule.id)}
>

<div>

<span className={`text-xs px-2 py-1 rounded-full ${subjectColor(rule.subject?.name)}`}>
{rule.subject?.name}
</span>

</div>

<div className="text-sm text-slate-500">
{rule.topic?.name}
</div>

<div className="text-[15px] font-medium text-slate-800">
{rule.title}
</div>

<div className="flex flex-wrap gap-1">

{rule.keywords.slice(0,2).map(k=>(
<span key={k.id} className="text-xs bg-slate-100 px-2 py-1 rounded font-mono tracking-tight">
{k.keyword}
</span>
))}

{rule.keywords.length>2 &&(
<span className="text-xs text-slate-400">
+{rule.keywords.length-2}
</span>
)}

</div>

<div className="text-slate-400">
▾
</div>

</div>

{isOpen &&(

<div className="px-6 pb-6">

<div className="grid grid-cols-2 gap-6">

<div className="border rounded-xl p-5 bg-slate-50">

<div className="text-xs text-slate-400 mb-2 uppercase">
Rule Statement
</div>

<div
className="text-[18px] leading-8 text-slate-800"
dangerouslySetInnerHTML={{
__html:highlightBuzzwords(
rule.ruleText,
rule.keywords.map(k=>k.keyword)
)
}}
/>

<div className="flex flex-wrap gap-2 mt-4">

{rule.keywords.map(k=>(
<span key={k.id} className="bg-indigo-100 text-indigo-700 px-2 py-1 text-xs rounded font-mono tracking-tight">
{k.keyword}
</span>
))}

</div>

</div>

<div className="border rounded-xl p-5 bg-slate-50">

<div className="text-xs text-slate-400 mb-2 uppercase">
Application Example
</div>

<div className="text-[16px] text-slate-700 leading-7 whitespace-pre-wrap">
{rule.applicationExample || "No example added"}
</div>

</div>

</div>

</div>

)}

</div>

)

})}

</div>

<AddRuleModal
open={showModal}
onClose={()=>setShowModal(false)}
onCreated={()=>window.location.reload()}
/>

</div>

)
}