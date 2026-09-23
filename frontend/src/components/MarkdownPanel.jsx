import ReactMarkdown from 'react-markdown'

import '../css/Markdown.css'

export default function MarkdownPanel({ content }) {
  if (!content || !content.trim()) {
    return (
      <div className="empty-state">
        <p className="empty-state__title">—</p>
      </div>
    )
  }

  return (
    <div className="markdown-body">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  )
}
