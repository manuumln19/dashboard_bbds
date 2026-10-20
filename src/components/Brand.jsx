import { APP_NAME, LOCATION } from "../config";

export function Brand({ onClick }) {
  return (
    <button className="brand" type="button" onClick={onClick} aria-label="Ir a BBDS">
      <span className="brand__mark" aria-hidden="true">
        <span>B</span>
        <i />
      </span>
      <span className="brand__text">
        <strong>{APP_NAME}</strong>
        <span>{LOCATION.name}</span>
      </span>
    </button>
  );
}
