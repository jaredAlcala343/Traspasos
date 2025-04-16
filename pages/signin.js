"use client";
import { useState, useEffect } from 'react';
import Image from "next/image";
import { useRouter } from 'next/navigation';
import styles from './signin.module.css';

export default function SignIn() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  useEffect(() => {
    const handleUserInteraction = () => {
      const audio = new Audio('/loginsound.mp3');
      audio.play().catch((error) => console.error('Error al reproducir el sonido:', error));

      document.removeEventListener('click', handleUserInteraction);
    };

    document.addEventListener('click', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (response.ok && data.userData) {
      localStorage.setItem('token', data.userData.token);
      localStorage.setItem('username', username);
      localStorage.setItem('name', data.userData.name);  // Asegurar que se guarda el nombre
      localStorage.setItem('rol', data.userData.rol);
      localStorage.setItem('almacen', data.userData.origen);

      router.push('/dashboard');
    } else {
      alert(data.message || 'Login failed');
    }
  };

  return (
    <div className={styles.loginContainer}>
      <form onSubmit={handleSubmit} className={styles.loginForm}>
        <h1>Traspasos Internos</h1>
        <h4>POR FAVOR INGRESE SUS CREDENCIALES</h4>

        <label>
          Ingrese su correo:
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <label>
          Contraseña:
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button type="submit">Login</button>
      </form>
      <div className={styles.loginImage}>
        <Image
          className={styles.loginImage}
          src="/logoSt.jpg"
          alt="Imagen de inicio"
          width={650}
          height={400}
        />
      </div>
    </div>
  );
}
