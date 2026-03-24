export default function Header() {
  return (
    <header className="reviewer-header">
      <div>
        <h1 className="reviewer-header-title">Reviewer Dashboard</h1>
        <p className="reviewer-header-sub">
          Evaluate scholarship applications with transparency
        </p>
      </div>

      <div className="reviewer-header-right">
        <div className="reviewer-user">
          <div className="reviewer-avatar">DR</div>
          <div>
            <div className="reviewer-user-name">Dr. Alex Rivera</div>
            <div className="reviewer-user-role">Senior Reviewer</div>
          </div>
        </div>
      </div>
    </header>
  );
}
