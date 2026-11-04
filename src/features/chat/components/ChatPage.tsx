import { useSearchParams } from 'react-router-dom';
import ChatRoom from './ChatRoom';
export default function ChatPage() {
    const [params] = useSearchParams();
    const classId = params.get('class') ?? undefined;
    return <div className="feature-screen actual-chat-screen"><div className="page-heading"><div><h1>Group chat</h1><p></p></div></div><ChatRoom key={classId ?? 'shared'} classId={classId}/></div>;
}
