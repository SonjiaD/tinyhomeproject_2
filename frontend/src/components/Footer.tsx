import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="bg-primary-900 text-primary-100 py-8 mt-auto">
      <div className="max-w-6xl mx-auto px-6 text-center text-sm">
        <p>&copy; Tiny Home Project. A research tool by the Kalyan Lab at UBC.</p>
        <p className="mt-2 flex items-center justify-center gap-4">
          <Link to="/privacy" className="text-primary-300 hover:text-white transition-colors">
            Privacy
          </Link>
          <Link to="/terms" className="text-primary-300 hover:text-white transition-colors">
            Terms
          </Link>
        </p>
      </div>
    </footer>
  )
}
