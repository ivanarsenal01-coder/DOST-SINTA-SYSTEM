import React from "react";

import michaelImg from "./team/michael.png";
import ivanImg from "./team/ivan.png";
import arjeyImg from "./team/arjey.png";
import geamboyImg from "./team/geamboy.png";
import cecilioImg from "./team/cecilio.png";
import catherineImg from "./team/catherine.png";

export default function Promo() {
  const teamMembers = [
    {
      name: "MICHAEL JOHN MAQUILING",
      role: "Project Adviser & System Consultant",
      contribution: "Overall Supervision & System Direction",
      description:
        "Provided overall supervision, system requirements, recommendations, and direction throughout the planning, development, and improvement of DOST-SINTA.",
      image: michaelImg,
      tag: "Main Adviser",
    },
    {
      name: "IVAN JEROME ARSENAL",
      role: "Full-Stack Developer",
      contribution: "System Functionality & Database Integration",
      description:
        "Handled system functionality, backend development, database integration, and technical implementation to support the core operations of DOST-SINTA.",
      image: ivanImg,
      tag: "Development",
    },
    {
      name: "ARJEY DE GUZMAN",
      role: "Frontend Developer / UI-UX Designer",
      contribution: "Interface Design & Frontend Experience",
      description:
        "Designed and developed the user interface, page layouts, visual styling, and frontend user experience of DOST-SINTA.",
      image: arjeyImg,
      tag: "Design",
    },
    {
      name: "GEAMBOY MORATA",
      role: "Program Module Adviser / Layout Consultant",
      contribution: "Program Workflow & Layout Recommendations",
      description:
        "Provided program-specific guidance and layout recommendations to ensure that selected modules follow the actual workflow, data requirements, and documentation practices of the office.",
      image: geamboyImg,
      tag: "Module Adviser",
    },
    {
      name: "CECILIO REPANCOL",
      role: "Program Module Adviser / Layout Consultant",
      contribution: "Module Review & Field Arrangement",
      description:
        "Assisted in reviewing module layouts, field arrangements, and program-related forms to improve the usability and accuracy of the system based on actual office operations.",
      image: cecilioImg,
      tag: "Module Adviser",
    },
    {
      name: "CATHERINE LICTAO",
      role: "Program Module Adviser / Layout Consultant",
      contribution: "Program Structure & Documentation Support",
      description:
        "Contributed recommendations for the structure, presentation, and organization of selected program modules to support proper monitoring and documentation.",
      image: catherineImg,
      tag: "Module Adviser",
    },
  ];

  const timeline = [
    {
      phase: "Planning",
      title: "System Planning and Requirements",
      description:
        "The project requirements, system flow, user roles, pages, and monitoring needs were identified and organized.",
    },
    {
      phase: "Design",
      title: "Interface and Layout Design",
      description:
        "The layout, dashboard structure, page design, buttons, cards, tables, and user interface were prepared for the system.",
    },
    {
      phase: "Build",
      title: "System Development",
      description:
        "The frontend, backend, database, and system functions were developed to support project monitoring and reporting.",
    },
    {
      phase: "Test",
      title: "Testing and Improvement",
      description:
        "The system was reviewed, tested, and improved to make the website more consistent, functional, and ready for use.",
    },
  ];

  return (
    <div className="about-us-page">
      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:wght@700;800;900&display=swap");

        * {
          box-sizing: border-box;
        }

        .about-us-page {
          position: relative;
          width: 100%;
          min-height: 100vh;
          overflow: hidden;
          padding: 28px;
          font-family: "Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
            "Segoe UI", Roboto, Arial, sans-serif;
          color: #1f2937;
          background:
            radial-gradient(circle at top left, rgba(255, 255, 255, 0.14), transparent 24%),
            radial-gradient(circle at bottom right, rgba(255, 255, 255, 0.14), transparent 22%),
            linear-gradient(135deg, #2f63d9 0%, #3f7fe0 52%, #5ca7eb 100%);
        }

        .about-us-page::before {
          content: "";
          position: absolute;
          width: 260px;
          height: 260px;
          top: -90px;
          left: -70px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          pointer-events: none;
        }

        .about-us-page::after {
          content: "";
          position: absolute;
          width: 330px;
          height: 330px;
          bottom: -140px;
          right: -110px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.12);
          pointer-events: none;
        }

        .about-container {
          position: relative;
          z-index: 1;
          width: min(1320px, 100%);
          margin: 0 auto;
        }

        .about-hero {
          position: relative;
          overflow: hidden;
          border-radius: 32px;
          padding: 46px;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.10));
          border: 1px solid rgba(255, 255, 255, 0.28);
          backdrop-filter: blur(10px);
          box-shadow: 0 22px 46px rgba(20, 55, 120, 0.22);
          color: #ffffff;
          margin-bottom: 26px;
        }

        .about-hero::after {
          content: "";
          position: absolute;
          right: -48px;
          top: -48px;
          width: 240px;
          height: 240px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.08);
        }

        .about-badge {
          position: relative;
          z-index: 1;
          display: inline-flex;
          align-items: center;
          padding: 9px 15px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.18);
          border: 1px solid rgba(255, 255, 255, 0.2);
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.4px;
          margin-bottom: 18px;
        }

        .about-hero h1 {
          position: relative;
          z-index: 1;
          margin: 0 0 10px;
          font-family: "Playfair Display", Georgia, "Times New Roman", serif;
          font-size: clamp(44px, 5vw, 68px);
          line-height: 0.98;
          font-weight: 900;
          letter-spacing: -0.04em;
        }

        .hero-subtitle {
          position: relative;
          z-index: 1;
          margin: 0 0 14px;
          max-width: 860px;
          font-size: 18px;
          line-height: 1.65;
          color: rgba(255, 255, 255, 0.98);
          font-weight: 700;
        }

        .about-hero p {
          position: relative;
          z-index: 1;
          margin: 0;
          max-width: 980px;
          font-size: 17px;
          line-height: 1.8;
          color: rgba(255, 255, 255, 0.94);
        }

        .hero-highlights {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-top: 30px;
        }

        .hero-mini-card {
          padding: 20px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.16);
          border: 1px solid rgba(255, 255, 255, 0.18);
          box-shadow: 0 10px 20px rgba(16, 45, 105, 0.08);
        }

        .hero-mini-card strong {
          display: block;
          font-size: 22px;
          margin-bottom: 5px;
          color: #ffffff;
          font-weight: 900;
        }

        .hero-mini-card span {
          display: block;
          font-size: 13.5px;
          line-height: 1.55;
          color: rgba(255, 255, 255, 0.9);
        }

        .section-card,
        .about-card,
        .purpose-card,
        .closing-card,
        .identity-card {
          background: rgba(255, 255, 255, 0.96);
          border: 1px solid rgba(255, 255, 255, 0.55);
          box-shadow: 0 12px 30px rgba(20, 55, 120, 0.12);
        }

        .identity-grid {
          display: grid;
          grid-template-columns: 0.85fr 1.15fr;
          gap: 22px;
          margin-bottom: 24px;
        }

        .identity-card {
          position: relative;
          overflow: hidden;
          border-radius: 28px;
          padding: 30px;
        }

        .identity-card::after {
          content: "";
          position: absolute;
          right: -70px;
          top: -90px;
          width: 180px;
          height: 180px;
          border-radius: 50%;
          background: rgba(36, 89, 203, 0.08);
        }

        .identity-card h2 {
          position: relative;
          z-index: 1;
          margin: 0 0 12px;
          color: #1148a6;
          font-family: "Playfair Display", Georgia, "Times New Roman", serif;
          font-size: 31px;
          font-weight: 900;
          letter-spacing: -0.03em;
        }

        .identity-card p {
          position: relative;
          z-index: 1;
          margin: 0;
          color: #4b5563;
          line-height: 1.75;
          font-size: 15.5px;
        }

        .prepared-card {
          background: linear-gradient(135deg, #113f95, #2f70dd);
          color: #ffffff;
        }

        .prepared-card h2,
        .prepared-card p {
          color: #ffffff;
        }

        .prepared-for {
          position: relative;
          z-index: 1;
          display: inline-flex;
          padding: 9px 14px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.16);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #ffffff;
          font-size: 12px;
          font-weight: 850;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        .section-card {
          border-radius: 28px;
          padding: 30px;
          margin-bottom: 24px;
        }

        .section-heading {
          display: grid;
          grid-template-columns: 1.1fr 1fr;
          gap: 24px;
          align-items: start;
          margin-bottom: 24px;
        }

        .section-label {
          display: inline-flex;
          align-items: center;
          padding: 7px 12px;
          border-radius: 999px;
          background: #e8f0ff;
          color: #2459cb;
          font-size: 12px;
          font-weight: 850;
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .section-heading h2,
        .about-card h2,
        .closing-card h2 {
          margin: 0;
          color: #1148a6;
          font-family: "Playfair Display", Georgia, "Times New Roman", serif;
          font-size: 32px;
          font-weight: 900;
          letter-spacing: -0.03em;
          line-height: 1.08;
        }

        .section-heading p,
        .about-card p,
        .purpose-card p,
        .closing-card p {
          color: #4b5563;
          line-height: 1.75;
          font-size: 15.2px;
        }

        .section-heading p {
          margin: 18px 0 0;
          max-width: 620px;
        }

        .team-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 18px;
        }

        .team-card {
          position: relative;
          display: grid;
          grid-template-columns: 200px 1fr;
          gap: 26px;
          align-items: center;
          padding: 24px;
          border-radius: 24px;
          background:
            linear-gradient(90deg, rgba(36, 89, 203, 0.06), transparent 38%),
            #f8fbff;
          border: 1px solid #dce8fa;
          border-left: 7px solid #2459cb;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .team-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 32px rgba(30, 76, 160, 0.12);
        }

        .team-photo-wrap {
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .team-photo-frame {
          padding: 7px;
          border-radius: 25px;
          background:
            linear-gradient(135deg, #ffffff, #eaf2ff);
          box-shadow: 0 14px 26px rgba(41, 95, 210, 0.18);
        }

        .team-photo {
          display: block;
          width: 170px;
          height: 125px;
          object-fit: cover;
          object-position: center;
          border-radius: 19px;
          border: 2px solid #ffffff;
          background: #dbeafe;
          filter: saturate(1.05) contrast(1.03);
        }

        .team-top {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 8px;
        }

        .team-info h3 {
          margin: 0;
          color: #0f172a;
          font-size: 23px;
          font-weight: 950;
          letter-spacing: -0.02em;
        }

        .team-tag {
          display: inline-flex;
          padding: 6px 11px;
          border-radius: 999px;
          background: #eaf2ff;
          color: #2459cb;
          font-size: 11px;
          font-weight: 850;
          text-transform: uppercase;
          letter-spacing: 0.45px;
        }

        .team-role {
          margin: 0 0 8px;
          color: #2459cb;
          font-size: 16px;
          font-weight: 850;
        }

        .team-contribution {
          margin: 0 0 10px;
          color: #334155;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.2px;
          text-transform: uppercase;
        }

        .team-description {
          margin: 0;
          color: #4b5563;
          line-height: 1.72;
          font-size: 15px;
        }

        .about-grid {
          display: grid;
          grid-template-columns: 1.05fr 0.95fr;
          gap: 22px;
          margin-bottom: 24px;
        }

        .about-card {
          border-radius: 28px;
          padding: 30px;
        }

        .about-card h2 {
          margin-bottom: 12px;
          font-size: 30px;
        }

        .about-card p {
          margin: 0 0 14px;
          font-size: 15.8px;
        }

        .about-card p:last-child {
          margin-bottom: 0;
        }

        .timeline {
          display: grid;
          gap: 14px;
          margin-top: 8px;
        }

        .timeline-item {
          display: grid;
          grid-template-columns: 84px 1fr;
          gap: 14px;
          align-items: flex-start;
          padding: 16px;
          border-radius: 18px;
          background: #f8fbff;
          border: 1px solid #dce8fa;
        }

        .timeline-phase {
          min-width: 84px;
          min-height: 52px;
          border-radius: 15px;
          display: grid;
          place-items: center;
          text-align: center;
          background: linear-gradient(135deg, #295fd2, #5aa4ea);
          color: #ffffff;
          font-weight: 900;
          font-size: 12px;
          padding: 8px;
        }

        .timeline-item h3 {
          margin: 0 0 5px;
          font-size: 17px;
          color: #111827;
        }

        .timeline-item p {
          margin: 0;
          font-size: 14.5px;
          line-height: 1.6;
          color: #4b5563;
        }

        .purpose-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
          margin-bottom: 24px;
        }

        .purpose-card {
          border-radius: 24px;
          padding: 24px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .purpose-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 32px rgba(30, 76, 160, 0.11);
        }

        .purpose-icon {
          width: 58px;
          height: 58px;
          border-radius: 18px;
          display: grid;
          place-items: center;
          font-size: 26px;
          background: linear-gradient(135deg, #eaf2ff, #f5f9ff);
          color: #2459cb;
          margin-bottom: 14px;
        }

        .purpose-card h3 {
          margin: 0 0 9px;
          font-size: 19px;
          color: #111827;
          font-weight: 900;
        }

        .closing-card {
          border-radius: 28px;
          padding: 34px;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.97), rgba(245, 249, 255, 0.96));
        }

        .closing-card h2 {
          margin: 0 0 10px;
          font-size: 32px;
        }

        .closing-card p {
          margin: 0;
          max-width: 980px;
        }

        @media (max-width: 1080px) {
          .hero-highlights,
          .about-grid,
          .purpose-grid,
          .section-heading,
          .identity-grid {
            grid-template-columns: 1fr;
          }

          .section-heading p {
            margin-top: 0;
          }

          .team-card {
            grid-template-columns: 170px 1fr;
          }

          .team-photo {
            width: 145px;
            height: 110px;
          }
        }

        @media (max-width: 700px) {
          .about-us-page {
            padding: 16px;
          }

          .about-hero,
          .section-card,
          .about-card,
          .purpose-card,
          .closing-card,
          .identity-card {
            padding: 22px;
            border-radius: 18px;
          }

          .about-hero h1 {
            font-size: 42px;
          }

          .team-card {
            grid-template-columns: 1fr;
            text-align: center;
            border-left: 1px solid #dce8fa;
            border-top: 7px solid #2459cb;
          }

          .team-top {
            justify-content: center;
          }

          .team-photo {
            width: 178px;
            height: 132px;
          }

          .timeline-item {
            grid-template-columns: 1fr;
          }

          .timeline-phase {
            width: fit-content;
          }
        }
      `}</style>

      <main className="about-container">
        <section className="about-hero">
          <div className="about-badge">DOST-SINTA</div>
          <h1>About Us</h1>
          <div className="hero-subtitle">
            Built for organized monitoring, reliable documentation, and better access to
            project information.
          </div>
          <p>
            DOST-SINTA is a web-based system intended for DOST Pangasinan / PSTO
            Pangasinan. Created in 2026, the system was developed to support the
            monitoring, documentation, and management of DOST-assisted programs,
            projects, and interventions through a more organized digital platform for
            project records, reports, targets, accomplishments, and office monitoring
            activities.
          </p>

          <div className="hero-highlights">
            <div className="hero-mini-card">
              <strong>Created in 2026</strong>
              <span>
                The year DOST-SINTA was developed for DOST Pangasinan / PSTO
                Pangasinan project monitoring and documentation.
              </span>
            </div>

            <div className="hero-mini-card">
              <strong>6 Members</strong>
              <span>Project advisers, module advisers, and system developers.</span>
            </div>

            <div className="hero-mini-card">
              <strong>DOST-SINTA</strong>
              <span>A centralized website for organized records, monitoring, and reporting.</span>
            </div>
          </div>
        </section>

        <section className="identity-grid">
          <div className="identity-card prepared-card">
            <span className="prepared-for">Prepared For</span>
            <h2>DOST Pangasinan / PSTO Pangasinan</h2>
            <p>
              This system was prepared to support office monitoring activities, reporting
              needs, and documentation of DOST-assisted projects and interventions in
              Pangasinan.
            </p>
          </div>

          <div className="identity-card">
            <span className="section-label">System Identity</span>
            <h2>What SINTA Means</h2>
            <p>
              SINTA stands for Science, Technology, and Innovation Interventions Tracker
              and Analytics. It reflects the purpose of the system: to help organize,
              monitor, track, and analyze DOST-assisted programs and interventions in one
              digital platform.
            </p>
          </div>
        </section>

        <section className="section-card">
          <div className="section-heading">
            <div>
              <span className="section-label">Project Team</span>
              <h2>Meet the People Behind DOST-SINTA</h2>
            </div>
            <p>
              DOST-SINTA was developed through the guidance, layout recommendations,
              technical implementation, and design efforts of the following project members.
            </p>
          </div>

          <div className="team-grid">
            {teamMembers.map((member) => (
              <div className="team-card" key={member.name}>
                <div className="team-photo-wrap">
                  <div className="team-photo-frame">
                    <img src={member.image} alt={member.name} className="team-photo" />
                  </div>
                </div>

                <div className="team-info">
                  <div className="team-top">
                    <h3>{member.name}</h3>
                    <span className="team-tag">{member.tag}</span>
                  </div>

                  <p className="team-role">{member.role}</p>
                  <p className="team-contribution">{member.contribution}</p>
                  <p className="team-description">{member.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="about-grid">
          <div className="about-card">
            <span className="section-label">Who We Are</span>
            <h2>The Team Behind the System</h2>
            <p>
              The development of DOST-SINTA was guided by the goal of creating a practical,
              user-friendly, and organized system for project monitoring and office
              documentation of DOST Pangasinan / PSTO Pangasinan.
            </p>
            <p>
              The team worked on planning the system structure, designing the interface,
              building the system functions, preparing the database support, and improving
              the overall user experience.
            </p>
            <p>
              With the help of program module advisers, the layout and structure of selected
              program pages were improved based on actual office workflow and documentation
              needs.
            </p>
          </div>

          <div className="about-card">
            <span className="section-label">Created in 2026</span>
            <h2>How DOST-SINTA Was Created</h2>

            <div className="timeline">
              {timeline.map((item) => (
                <div className="timeline-item" key={item.title}>
                  <div className="timeline-phase">{item.phase}</div>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="purpose-grid">
          <div className="purpose-card">
            <div className="purpose-icon">🎯</div>
            <h3>Why We Built It</h3>
            <p>
              DOST-SINTA was developed to reduce manual monitoring, centralize project
              records, and make project information easier to manage and retrieve for
              DOST Pangasinan / PSTO Pangasinan.
            </p>
          </div>

          <div className="purpose-card">
            <div className="purpose-icon">👥</div>
            <h3>Who It Is For</h3>
            <p>
              It is intended for authorized users of DOST Pangasinan / PSTO Pangasinan,
              including Super Admins, Admins, and Staff who are responsible for managing,
              monitoring, and reviewing project data.
            </p>
          </div>

          <div className="purpose-card">
            <div className="purpose-icon">💻</div>
            <h3>How It Helps</h3>
            <p>
              It helps users encode records, organize data, track yearly targets and
              accomplishments, and generate reports for documentation and decision-making.
            </p>
          </div>
        </section>

        <section className="closing-card">
          <h2>Our Commitment</h2>
          <p>
            DOST-SINTA was created to provide DOST Pangasinan / PSTO Pangasinan with a
            more efficient and organized way of handling project monitoring activities.
            The team is committed to delivering a reliable and user-friendly system that
            supports documentation, reporting, monitoring, and access to important project
            information.
          </p>
        </section>
      </main>
    </div>
  );
}
