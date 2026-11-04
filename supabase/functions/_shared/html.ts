import { parse, type DefaultTreeAdapterMap } from 'parse5';
export interface HtmlIssue {
    line: number;
    message: string;
}
type Node = DefaultTreeAdapterMap['node'];
const decodeCss = (value: string) => value.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\\([0-9a-f]{1,6})\s?|\\([^\r\n])/gi, (_match, hex: string | undefined, char: string | undefined) => hex ? String.fromCodePoint(Math.min(parseInt(hex, 16), 0x10ffff)) : char ?? '');
export function validateHtml(source: string): HtmlIssue[] {
    const issues: HtmlIssue[] = [];
    const root = parse(source, { sourceCodeLocationInfo: true });
    const add = (line: number, message: string) => {
        if (issues.length < 100)
            issues.push({ line, message });
    };
    const local = (value: string) => /^(?:data:|#|$)/i.test(value.trim());
    const css = (value: string, line: number) => {
        const decoded = decodeCss(value);
        if (/@import\b/i.test(decoded))
            add(line, 'CSS imports are not allowed. Embed styles directly.');
        for (const match of decoded.matchAll(/url\s*\(\s*(['"]?)(.*?)\1\s*\)/gi))
            if (!local(match[2] ?? ''))
                add(line, 'External CSS images or fonts are not allowed. Use data: URLs.');
    };
    const stack: Node[] = [root];
    let count = 0;
    while (stack.length) {
        const node = stack.pop()!;
        if (++count > 100000) {
            add(1, 'HTML has too many elements. Simplify the document.');
            break;
        }
        if ('childNodes' in node)
            for (const child of node.childNodes)
                stack.push(child);
        if (!('tagName' in node))
            continue;
        const line = node.sourceCodeLocation?.startLine ?? 1;
        const attrs = new Map(node.attrs.map(attr => [attr.name, attr.value]));
        if (['iframe', 'frame', 'frameset', 'object', 'embed', 'base'].includes(node.tagName))
            add(line, `<${node.tagName}> is not allowed.`);
        if (node.tagName === 'meta' && attrs.get('http-equiv')?.toLowerCase() === 'refresh')
            add(line, 'Meta refresh is not allowed.');
        for (const attr of node.attrs) {
            const attrLine = node.sourceCodeLocation?.attrs?.[attr.name]?.startLine ?? line;
            if (['src', 'href', 'poster', 'data', 'background', 'action', 'formaction'].includes(attr.name) && !local(attr.value) && node.tagName !== 'a')
                add(attrLine, `External ${node.tagName}[${attr.name}] is not allowed.`);
            if (attr.name === 'srcset')
                add(attrLine, 'Use a single data: image src instead of srcset.');
            if (attr.name === 'style')
                css(attr.value, attrLine);
        }
        if (node.tagName === 'style')
            css(node.childNodes.filter(child => 'value' in child).map(child => 'value' in child ? child.value : '').join(''), line);
        if ('content' in node && node.tagName === 'template')
            stack.push(node.content as Node);
    }
    return issues;
}
export function htmlWarnings(source: string): HtmlIssue[] {
    const result: HtmlIssue[] = [];
    source.split('\n').forEach((line, index) => {
        for (const pattern of [/\bfetch\s*\(/i, /\bXMLHttpRequest\b/i, /\bWebSocket\b/i, /\beval\s*\(/i, /\bcookie\b/i, /\b(?:parent|top)\s*(?:\.|\[)/i])
            if (pattern.test(line) && result.length < 200)
                result.push({ line: index + 1, message: `Review risky pattern: ${pattern.source}` });
    });
    return result;
}
