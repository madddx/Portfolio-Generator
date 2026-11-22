/*  Sample portfolio for "Try with sample data". Fictional person; images are drawn on a canvas. */
(function () {
  'use strict';
  function art(w, h, c1, c2, kind) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var x = c.getContext('2d'), g = x.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, c1); g.addColorStop(1, c2); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(255,255,255,.22)'; x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = Math.max(2, w / 160);
    var i;
    if (kind === 'person') {
      x.beginPath(); x.arc(w / 2, h * .38, w * .17, 0, 7); x.fill();
      x.beginPath(); x.ellipse(w / 2, h * .98, w * .36, h * .36, 0, Math.PI, 0); x.fill();
    } else if (kind === 'bars') {
      for (i = 0; i < 7; i++) { var bh = h * (.25 + ((i * 37) % 55) / 100); x.fillRect(w * (.1 + i * .115), h * .88 - bh, w * .07, bh); }
      x.beginPath(); x.moveTo(w * .08, h * .5); x.bezierCurveTo(w * .3, h * .2, w * .55, h * .7, w * .92, h * .25); x.stroke();
    } else if (kind === 'nodes') {
      var pts = [[.2, .3], [.45, .2], [.7, .35], [.3, .65], [.58, .7], [.82, .62]];
      pts.forEach(function (p, a) { pts.forEach(function (q, b) { if (b > a && (a + b) % 2) { x.beginPath(); x.moveTo(p[0] * w, p[1] * h); x.lineTo(q[0] * w, q[1] * h); x.stroke(); } }); });
      pts.forEach(function (p) { x.beginPath(); x.arc(p[0] * w, p[1] * h, w * .03, 0, 7); x.fill(); x.stroke(); });
    } else {
      for (i = 0; i < 6; i++) { x.fillRect(w * .1, h * (.14 + i * .13), w * (.3 + ((i * 29) % 50) / 100), h * .06); }
    }
    return c.toDataURL('image/jpeg', .82);
  }
  function logo(t, bg) {
    var c = document.createElement('canvas'); c.width = 160; c.height = 160;
    var x = c.getContext('2d'); x.fillStyle = bg; x.beginPath(); x.arc(80, 80, 72, 0, 7); x.fill();
    x.fillStyle = '#fff'; x.font = '700 64px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(t, 80, 84);
    return c.toDataURL('image/png');
  }

  window.PF_SAMPLE = function () {
    return {
      version: 1,
      meta: { title: '', description: '', year: '' },
      design: { style: 'aurora', mode: 'auto', accent: '', toggle: true },
      sections: window.PF.emptyData().sections,
      hero: {
        name: 'Nila Raman', headline: 'Full-stack developer & data engineer',
        typed: ['Full-stack developer', 'Data engineer', 'Open-source tinkerer'],
        bio: 'Final-year computer science student who likes turning messy data into dependable products. I build web apps end to end and write pipelines that keep running when nobody is watching.',
        photo: art(640, 800, '#3b6df0', '#14c8c0', 'person'), location: 'Bengaluru, India', resume: 'https://example.com/nila-raman-resume.pdf',
        stats: [{ num: '12', label: 'Projects shipped' }, { num: '3', label: 'Internships' }, { num: '9.1', label: 'CGPA' }],
        badges: ['Azure certified', 'Hackathon winner']
      },
      socials: { linkedin: 'https://www.linkedin.com/in/nila-raman', github: 'https://github.com/nila-raman', x: 'https://x.com/nilaraman', website: 'https://nila.example.com' },
      about: {
        paragraphs: [
          'I started with a broken laptop and a library book on Python, and never stopped taking things apart. Today I split my time between React and Node on the front, and Spark and SQL behind the scenes.',
          'Outside of code I run a small study group for first-year students, sketch badly, and cook a very serious sambar.'
        ],
        facts: [{ label: 'Based in', value: 'Bengaluru, India' }, { label: 'Studying', value: 'B.Tech, Computer Science' }, { label: 'Open to', value: 'Internships & junior roles' }, { label: 'Languages', value: 'English, Tamil, Hindi' }],
        interests: ['Data pipelines', 'Web performance', 'Teaching', 'Chess']
      },
      education: [
        { institution: 'Northfield Institute of Technology', link: 'https://example.edu', degree: 'B.Tech — Computer Science and Engineering', period: '2023 — 2027', logo: logo('N', '#3b6df0'), courses: ['Algorithms', 'Databases', 'Distributed systems', 'Machine learning'] },
        { institution: 'Lakeview Senior Secondary School', link: '', degree: 'Higher secondary — Mathematics & Computer Science', period: '2021 — 2023', logo: '', courses: [] }
      ],
      experience: [
        { org: 'Brightwave Analytics', link: 'https://example.com', role: 'Data engineering intern', period: 'Jun 2026 — Aug 2026', bullets: ['Rebuilt a nightly ingestion job in PySpark, cutting runtime from 95 to 22 minutes.', 'Added data-quality checks that caught 14 upstream schema changes before they reached dashboards.', 'Documented the pipeline so the next intern could ship on day two.'] },
        { org: 'Campus Coding Club', link: '', role: 'Lead organiser', period: 'Aug 2024 — Present', bullets: ['Run weekly workshops for 60+ students on Git, SQL and system design.', 'Organised a 24-hour hackathon with 18 teams and four industry mentors.'] },
        { org: 'Freelance', link: '', role: 'Web developer', period: '2023 — 2024', bullets: ['Built booking and inventory sites for three local businesses using React and Node.'] }
      ],
      projects: [
        { title: 'Tracewell', desc: 'A job scheduler with retries, priorities and a live dashboard. Handles 5,000 jobs a minute on a single small VM.', img: art(900, 560, '#7a4dff', '#ff6b9e', 'nodes'), tags: ['Node.js', 'TypeScript', 'Redis', 'React'], link: 'https://github.com/example/tracewell', demo: 'https://example.com/tracewell' },
        { title: 'Ledgerlens', desc: 'Turns bank statement PDFs into categorised spending charts, entirely in the browser so nothing is uploaded.', img: art(900, 560, '#0ea5a4', '#3b82f6', 'bars'), tags: ['React', 'PDF.js', 'D3'], link: 'https://github.com/example/ledgerlens', demo: '' },
        { title: 'Campus Pulse', desc: 'Real-time crowd estimates for the library and canteens from anonymised Wi-Fi counts.', img: art(900, 560, '#f59e0b', '#ef4444', 'grid'), tags: ['Python', 'FastAPI', 'PostgreSQL'], link: 'https://github.com/example/campus-pulse', demo: '' }
      ],
      skills: [
        { category: 'Languages', items: ['Python', 'JavaScript', 'TypeScript', 'SQL', 'Java', 'C++'] },
        { category: 'Web', items: ['React', 'Node.js', 'HTML', 'CSS', 'FastAPI'] },
        { category: 'Data & cloud', items: ['PySpark', 'Databricks', 'Azure', 'Docker', 'PostgreSQL', 'Git'] }
      ],
      certifications: [
        { name: 'Azure Fundamentals (AZ-900)', issuer: 'Microsoft', img: logo('M', '#2563eb'), link: 'https://example.com/cert/az900' },
        { name: 'Databricks Lakehouse Fundamentals', issuer: 'Databricks', img: logo('D', '#ef4444'), link: '' }
      ],
      publications: [{ year: '2026', title: 'Cheaper schema-drift detection for batch pipelines', venue: 'Student Research Symposium, Northfield', link: 'https://example.com/paper' }],
      awards: [{ icon: '🏆', title: 'First place, Northfield Hack 2025', detail: '120 teams', link: '' }, { icon: '🎓', title: 'Dean’s list, four semesters', detail: '', link: '' }],
      learning: [{ title: 'Distributed Systems', platform: 'MIT OpenCourseWare', img: logo('M', '#a31f34'), link: 'https://example.com/6824' }],
      links: [{ title: 'Writing', desc: 'Notes on pipelines and performance', url: 'https://medium.com/@nila' }, { title: 'LeetCode', desc: '400+ problems solved', url: 'https://leetcode.com/u/nila' }],
      contact: { intro: 'I’m looking for a data or full-stack internship starting early 2027. If you have something interesting, write to me.', email: 'nila@example.com', phone: '+91 90000 00000', location: 'Bengaluru, India', form: true }
    };
  };
})();
