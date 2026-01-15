'use client';

import Image from 'next/image';
import styles from './Login.module.scss';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export default function LoginPage() {
  return (
    <div className={styles.loginContainer}>
      <div className={styles.card}>
        <div className={styles.logoWrapper}>
          <Image
            src="/orbit_finances_logo.png"
            alt="Orbit Finances Logo"
            className={styles.logo}
            width={200}
            height={200}
            priority
            style={{ width: 'auto', height: 'auto' }} 
          />
        </div>

        <p className={styles.description}>
          Assuma o controle do seu universo financeiro.
          <br />
          Projete, analise e evolua com clareza.
        </p>

        <a href={`${apiUrl}/auth/google`} className={styles.btnGoogle}>
          <Image
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            alt="Google"
            className={styles.googleIcon}
            width={24}
            height={24}
          />
          Entrar com Google
        </a>
      </div>
    </div>
  );
}