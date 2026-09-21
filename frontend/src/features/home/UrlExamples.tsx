export function UrlExamples() {
  return (
    <div
      className="url-examples"
      aria-label="Illustrative URL shortening examples"
    >
      <p className="muted">Long destinations. Short links.</p>
      <div className="url-example">
        <span>example.com/guides/a-long-web-address</span>
        <span aria-hidden="true">→</span>
        <strong>ushly.example/aB3x7Qz</strong>
      </div>
      <div className="url-example">
        <span>example.com/events/summer-workshop</span>
        <span aria-hidden="true">→</span>
        <strong>ushly.example/k9P2mRt</strong>
      </div>
      <small className="muted">
        Illustrations only; these are not live links.
      </small>
    </div>
  );
}
