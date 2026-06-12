function AuthInput({ icon: Icon, label, ...inputProps }) {
  return (
    <label className="auth-field">
      <span>{label}</span>
      <div className="auth-input">
        {Icon && <Icon aria-hidden="true" />}
        <input {...inputProps} />
      </div>
    </label>
  );
}

export default AuthInput;
