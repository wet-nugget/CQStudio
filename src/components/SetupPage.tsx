import { Link } from 'react-router-dom';
import { BrandMark } from './ui/Avatar';
import { Footer } from './Footer';
export default function SetupPage() {
    return <div className="setup-layout minimal-setup">
        <header className="setup-header"><Link to="/setup" className="brand"><BrandMark/><span>CQStudio</span></Link><Link className="button button-secondary" to="/login">Sign in</Link></header>
        <main className="setup-content">
            <div className="setup-heading"><h1>Set up CQStudio</h1><p>Connect Supabase to use your private workspace, or explore the interface with sample data.</p><Link className="button" to="/preview">Open preview</Link></div>
            <ol className="setup-instructions">
                <li><h2>Connect your project</h2><p>Add the development project URL and browser-safe anon key to <code>.env.local</code>. Service-role credentials belong in Edge Function secrets.</p></li>
                <li><h2>Apply the migrations</h2><p>Follow README.md to deploy the schema and Edge Functions, then configure Auth and SMTP.</p><code>supabase db push</code></li>
                <li><h2>Invite the first administrator</h2><p>Run the bootstrap script, accept the invitation, then remove the one-time bootstrap secret.</p><code>npm run bootstrap</code></li>
            </ol>
            <p className="setup-footnote">Supabase is not configured. No live workspace data is displayed.</p>
        </main><Footer/>
    </div>;
}
