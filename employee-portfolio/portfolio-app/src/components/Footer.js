import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  return (
    <footer>
      <p>Email: [employee.email@example.com]</p>
      <p>LinkedIn: <a href="https://www.linkedin.com/in/[linkedinusername]" target="_blank" rel="noopener noreferrer">[linkedinusername]</a></p>
      <p>GitHub: <a href="https://github.com/[githubusername]" target="_blank" rel="noopener noreferrer">[githubusername]</a></p>
      <p>&copy; {currentYear} [Employee Name]</p>
    </footer>
  );
};

export default Footer;
