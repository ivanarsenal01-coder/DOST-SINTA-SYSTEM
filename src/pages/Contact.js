import React from "react";

export default function Contact() {
  return (
    <div className="page">
      <div className="card">
        <div className="card-title">Contact</div>
        <p className="muted" style={{ marginTop: 8 }}>
          Drop a message and we’ll get back to you.
        </p>

        <form className="form" onSubmit={(e) => e.preventDefault()}>
          <label>
            <span>Name</span>
            <input placeholder="Jane Doe" />
          </label>
          <label>
            <span>Email</span>
            <input placeholder="jane@domain.com" type="email" />
          </label>
          <label>
            <span>Message</span>
            <textarea placeholder="How can we help?" rows={5} />
          </label>
          <button className="pill primary" type="submit">
            Send
          </button>
        </form>
      </div>
    </div>
  );
}