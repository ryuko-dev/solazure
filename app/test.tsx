export default function TestPage() {
  return (
    <div>
      <h1>Test Page - If you see this, routing works!</h1>
      <p>Current time: {new Date().toISOString()}</p>
      <p>This is a simple test to verify Next.js routing is working.</p>
    </div>
  )
}
