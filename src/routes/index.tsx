import { Navbar } from '#/components/web/Navbar'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: App })

function App() {
  return (
    <div>
      <Navbar />
      <h1>HELLO START</h1>
    </div>
  )
}
