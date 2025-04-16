
import React from 'react';

const Footer = () => {
  return (
    <footer style={styles.footer}>
      <p>&copy; {new Date().getFullYear()} Inventarios. Todos los derechos reservados.</p>
    </footer>
  );
};

const styles = {
  footer: {
    fontFamily: 'Arial, sans-serif',
    backgroundColor: '#053160', 
    color: '#fff', 
    textAlign: 'center', 
    padding: '20px 0', 
    position: 'relative', 
    width: '100%',
    bottom: '-10px', 
  },
};

export default Footer;
