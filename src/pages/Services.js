import React from "react";

const services = [
  { title: "Design", desc: "UI systems, component libraries, and UX." },
  { title: "Development", desc: "React apps with clean architecture." },
  { title: "Consulting", desc: "Performance, accessibility, and best practices." },
];

export default function Services() {
  return (
    <div className="page">
      <div className="grid">
        {services.map((s) => (
          <div className="card" key={s.title}>
            <div className="card-title">{s.title}</div>
            <p className="muted" style={{ marginTop: 8 }}>
              {s.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}