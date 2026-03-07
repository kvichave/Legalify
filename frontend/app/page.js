"use client"
import { useState } from "react"

export default function Home() {

  const [folderName, setFolderName] = useState("")

  const createFolder = async () => {

    const res = await fetch("http://127.0.0.1:8000/api/create-folder/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        folder_name: folderName
      })
    })

    const data = await res.json()
    alert(JSON.stringify(data))
  }

  return (

    <div style={{ padding: "50px" }}>

      <h2>Create Folder</h2>

      <input
        type="text"
        placeholder="Enter folder name"
        value={folderName}
        onChange={(e) => setFolderName(e.target.value)}
      />

      <br /><br />

      <button onClick={createFolder}>
        Create Folder
      </button>

    </div>
  )
}