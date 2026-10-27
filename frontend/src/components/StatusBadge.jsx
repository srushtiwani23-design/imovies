export default function StatusBadge({ status }) {
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : '';
  return <span className={`status status-${status}`}>{label}</span>;
}
