export default function Loader({ text = 'Loading' }) {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center py-5 gap-3" role="status">
      <div className="spinner-border" style={{ color: 'var(--brass)' }} />
      <span className="meta">{text}</span>
    </div>
  );
}
