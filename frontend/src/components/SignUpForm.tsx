export default function SignUpForm() {
  return (
    <form className="form">
      <label>Full Name</label>
      <input type="text" required />

      <label>Email</label>
      <input type="email" required />

      <label>Password</label>
      <input type="password" required />

      <button className="primary-btn primary-btn-lg" type="submit">
        Create Account
      </button>
    </form>
  );
}
