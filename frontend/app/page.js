"use client"
import { useState } from "react"

export default function Home() {

  const [projectName, setProjectName] = useState("")
  const [projects, setProjects] = useState([])

  const createProject = async () => {

    const res = await fetch("http://127.0.0.1:8000/api/create-folder/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        project_name: projectName
      })
    })

    const data = await res.json()
    alert(JSON.stringify(data))
  }

  const loadProjects = async () => {
    const res = await fetch("http://127.0.0.1:8000/api/list-projects/")
    const data = await res.json()
    alert(JSON.stringify(data))
    setProjects(data.projects)
  }

  return (<>

    <div style={{ padding: "50px" }}>

      <h2>Create Project</h2>

      <input
        type="text"
        placeholder="Enter project name"
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
      />

      <br /><br />

      <button onClick={createProject}>
        Create Folder
      </button>

      {/* list of projects */}

    </div>

    <div>
      <h2>List of Projects</h2>
      <button onClick={loadProjects}>
        load projects
      </button>
      <ul>
        {projects.map((project) => (
          <li key={project}>{project}</li>
        ))}
      </ul>
    </div>
  </>
  )
}