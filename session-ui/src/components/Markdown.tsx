import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

function CodeBlock({ children, className }: { children?: React.ReactNode; className?: string }) {
  const [copied, setCopied] = useState(false)
  const text = String(children ?? '').replace(/\n$/, '')
  const lang = className?.replace('language-', '') || 'text'

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="my-3 rounded-lg border border-bdr bg-panel overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-bdr bg-black/30">
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted">
          {lang}
        </span>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted hover:text-brand transition"
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-xs font-mono text-brand/90 yk-scroll">
        <code>{text}</code>
      </pre>
    </div>
  )
}

export function Markdown({ content }: { content: string }) {
  return (
    <div className="text-[14.5px] leading-relaxed text-fg/90 break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-brand underline underline-offset-4 hover:brightness-110"
            >
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>
          ),
          h1: ({ children }) => (
            <h1 className="text-lg font-bold mt-4 mb-2 text-fg">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-bold mt-4 mb-2 text-fg">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-bold uppercase tracking-wider mt-3 mb-1.5 text-muted">
              {children}
            </h3>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-fg">{children}</strong>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-brand pl-3 my-3 text-muted italic">
              {children}
            </blockquote>
          ),
          code: ({ inline, className, children }: any) => {
            if (inline) {
              return (
                <code className="px-1.5 py-0.5 rounded bg-panel border border-bdr text-brand font-mono text-[12.5px]">
                  {children}
                </code>
              )
            }
            return <CodeBlock className={className}>{children}</CodeBlock>
          },
          pre: ({ children }) => <>{children}</>,
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto">
              <table className="w-full text-xs border border-bdr">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="px-3 py-1.5 text-left border border-bdr bg-panel font-bold uppercase text-[10px] tracking-wider">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-1.5 border border-bdr">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
