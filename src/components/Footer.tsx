import { Link } from 'react-router-dom';
export function Footer() {
    return <footer><span>CQStudio <span aria-hidden="true">·</span> Private workspace</span><nav aria-label="Legal"><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><Link to="/storage">Browser storage</Link></nav></footer>;
}
