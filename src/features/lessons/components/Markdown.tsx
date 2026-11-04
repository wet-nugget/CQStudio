import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
export default function Markdown({ source }: {
    source: string;
}) {
    return <div className="markdown"><ReactMarkdown skipHtml remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]} urlTransform={defaultUrlTransform} components={{ img: ({ alt }) => <span className="fine-print">[Image omitted{alt ? `: ${alt}` : ''}]</span>, a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>, table: ({ children }) => <div className="table-scroll"><table>{children}</table></div> }}>{source}</ReactMarkdown></div>;
}
