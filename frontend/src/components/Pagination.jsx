export default function Pagination({ page, pages, onChange }) {
  if (!pages || pages <= 1) return null;
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  const nums = Array.from({ length: Math.min(5, pages) }, (_, i) => start + i);

  return (
    <nav className="d-flex justify-content-center mt-4" aria-label="Pages">
      <div className="d-flex gap-2 flex-wrap">
        <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Previous
        </button>
        {nums.map((n) => (
          <button
            key={n}
            className={`btn btn-sm ${n === page ? 'btn-brass' : 'btn-ghost'}`}
            onClick={() => onChange(n)}
            aria-current={n === page ? 'page' : undefined}
          >
            {n}
          </button>
        ))}
        <button className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Next
        </button>
      </div>
    </nav>
  );
}
