import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faSignOutAlt, faBars, faUser } from '@fortawesome/free-solid-svg-icons';
import styles from './navbar.module.css';

const Navbar = () => {
  const [name, setName] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const storedName = localStorage.getItem('name');
    if (storedName) {
      setName(storedName);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('username');
    localStorage.removeItem('name');
    localStorage.removeItem('token');
    localStorage.removeItem('rol');
    localStorage.removeItem('origen');
    window.location.href = '/';
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className={styles.navbar}>
      <span className={styles.navbarBrand}>CUBYLAM & CHALET</span>

      <button className={styles.menuButton} onClick={toggleMenu}>
        <FontAwesomeIcon icon={faBars} />
      </button>

      <div className={`${styles.navbarNav} ${isMenuOpen ? styles.showMenu : ''}`}>
        {name ? (
          <>
            <span className={styles.navLink}>
              <FontAwesomeIcon icon={faUser} className={styles.userIcon} /> Hola, {name}
            </span>
            <Link href="/dashboard">
              <p className={styles.navLink}>
                <FontAwesomeIcon icon={faHome} /> 
              </p>
            </Link>
            <p className={styles.navLink} onClick={handleLogout}>
              <FontAwesomeIcon icon={faSignOutAlt} /> Cerrar sesión
            </p>
          </>
        ) : (
          <Link href="/">
            <button className={`${styles.button} ${styles.loginButton}`}>Iniciar sesión</button>
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
