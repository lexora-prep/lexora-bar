"use client"

import { useState } from "react"

export default function UploadQuestionsPage(){

  const [file,setFile] = useState<File | null>(null)
  const [message,setMessage] = useState("")

  async function upload(){

    if(!file){
      alert("Select a CSV file")
      return
    }

    const formData = new FormData()
    formData.append("file",file)

    const res = await fetch("/api/admin/upload-questions",{
      method:"POST",
      body:formData
    })

    const data = await res.json()

    if(data.success){
      setMessage(`Inserted ${data.inserted} questions`)
    }else{
      setMessage("Upload failed")
    }

  }

  return(

    <div className="p-10 max-w-xl">

      <h1 className="text-2xl font-semibold mb-6">
        Upload Questions CSV
      </h1>

      <input
        type="file"
        accept=".csv"
        onChange={(e)=>{
          if(e.target.files){
            setFile(e.target.files[0])
          }
        }}
        className="mb-4"
      />

      <button
        onClick={upload}
        className="bg-blue-600 text-white px-6 py-3 rounded"
      >
        Upload CSV
      </button>

      {message && (
        <div className="mt-4 text-green-600">
          {message}
        </div>
      )}

    </div>

  )

}