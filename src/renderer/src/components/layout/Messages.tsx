interface MessagesProps {
  error: string | null
  notice: string | null
}

export function Messages({ error, notice }: MessagesProps) {
  return (
    <>
      {error && (
        <p className="message message--error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="message" role="status">
          {notice}
        </p>
      )}
    </>
  )
}
