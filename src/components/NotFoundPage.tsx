import { Link } from 'react-router-dom';
export default function NotFoundPage() {
    return <main className="auth-card"><h1>Page not found</h1><p>That page doesn’t exist. Head back to your workspace.</p><Link to="/" className="button">Back home</Link></main>;
}
